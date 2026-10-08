import Meeting from "../models/Meeting.js";
import Participant from "../models/Participant.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { generateUniqueMeetingCode } from "../utils/generateMeetingCode.js";
import { formatMeeting, formatParticipant } from "../utils/formatters.js";
import { getEffectivePermissions } from "../utils/permissions.js";
import { getIceServers } from "../configs/iceServers.js";
import { MEETING_STATUS, PARTICIPANT_ROLES } from "../constants/index.js";
import {
  deleteMeetingData,
  endMeeting as endMeetingService,
  leaveMeeting,
  registerParticipant,
} from "../services/meeting.service.js";
import { updateMeetingSettings } from "../services/permission.service.js";

export const createMeeting = asyncHandler(async (req, res) => {
  const { title, scheduledAt, settings } = req.body;

  // A meeting scheduled in the future waits for the host. Otherwise it starts right away.
  const isScheduledForLater = scheduledAt && scheduledAt.getTime() > Date.now();

  const meeting = await Meeting.create({
    meetingCode: await generateUniqueMeetingCode(),
    title,
    host: req.user._id,
    participants: [req.user._id],
    status: isScheduledForLater ? MEETING_STATUS.SCHEDULED : MEETING_STATUS.LIVE,
    scheduledAt: scheduledAt || null,
    startedAt: isScheduledForLater ? null : new Date(),
    settings,
  });

  // The host is always a member
  await Participant.create({
    meeting: meeting._id,
    user: req.user._id,
    displayName: req.user.name,
    role: PARTICIPANT_ROLES.HOST,
  });

  await meeting.populate("host", "name avatar");
  sendResponse(res, 201, "Meeting created successfully", { meeting: formatMeeting(meeting) });
});

export const getMyMeetings = asyncHandler(async (req, res) => {
  const query = { $or: [{ host: req.user._id }, { participants: req.user._id }] };
  if (req.query.status && Object.values(MEETING_STATUS).includes(req.query.status)) {
    query.status = req.query.status;
  }

  const meetings = await Meeting.find(query).sort({ createdAt: -1 }).populate("host", "name avatar");
  sendResponse(res, 200, "Meetings fetched", { meetings: meetings.map(formatMeeting) });
});

// Meetings the user actually joined, with durations
export const getMeetingHistory = asyncHandler(async (req, res) => {
  const records = await Participant.find({ user: req.user._id, joinedAt: { $ne: null } })
    .sort({ joinedAt: -1 })
    .populate({ path: "meeting", populate: { path: "host", select: "name avatar" } });

  const history = records
    .filter((record) => record.meeting) // meeting may have been deleted
    .map((record) => {
      const meeting = record.meeting;
      const leftAt = record.leftAt || (meeting.endedAt ?? null);
      return {
        meetingId: String(meeting._id),
        title: meeting.title,
        meetingCode: meeting.meetingCode,
        host: { id: String(meeting.host._id), name: meeting.host.name },
        status: meeting.status,
        joinedAt: record.joinedAt,
        leftAt: record.isOnline ? null : leftAt,
        // seconds the user spent in the meeting (null while still inside)
        durationSeconds: record.isOnline || !leftAt ? null : Math.max(0, Math.round((leftAt - record.joinedAt) / 1000)),
        // seconds the whole meeting lasted
        meetingDurationSeconds:
          meeting.startedAt && meeting.endedAt ? Math.round((meeting.endedAt - meeting.startedAt) / 1000) : null,
      };
    });

  sendResponse(res, 200, "Meeting history fetched", { history });
});

export const getIceServersController = asyncHandler(async (req, res) => {
  sendResponse(res, 200, "ICE servers fetched", { iceServers: getIceServers() });
});

// Anyone logged in can look up a meeting by its code, but they only see public info
export const getMeetingByCode = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({ meetingCode: req.params.meetingCode }).populate("host", "name avatar");
  if (!meeting) throw new ApiError(404, "Meeting not found");

  const membership = await Participant.findOne({ meeting: meeting._id, user: req.user._id });
  const { id, meetingCode, title, host, status, scheduledAt } = formatMeeting(meeting);

  sendResponse(res, 200, "Meeting found", {
    meeting: { id, meetingCode, title, host, status, scheduledAt },
    isMember: Boolean(membership && !membership.isRemoved),
  });
});

export const getMeetingById = asyncHandler(async (req, res) => {
  await req.meeting.populate("host", "name avatar");

  sendResponse(res, 200, "Meeting fetched", {
    meeting: formatMeeting(req.meeting),
    me: formatParticipant(req.participant),
    permissions: getEffectivePermissions(req.participant, req.meeting),
  });
});

// REST join = "register me as a member". Going live in the room happens with Socket.IO "join-meeting".
export const joinMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findById(req.params.meetingId);
  if (!meeting) throw new ApiError(404, "Meeting not found");

  const participant = await registerParticipant(meeting, req.user, req.body.displayName);
  await meeting.populate("host", "name avatar");

  sendResponse(res, 200, "Joined meeting successfully. Now connect with Socket.IO event join-meeting", {
    meeting: formatMeeting(meeting),
    participant: formatParticipant(participant),
    permissions: getEffectivePermissions(participant, meeting),
    iceServers: getIceServers(),
  });
});

export const leaveMeetingRest = asyncHandler(async (req, res) => {
  const io = req.app.get("io");

  if (req.participant.socketId) {
    await leaveMeeting(io, req.participant.socketId, "left");
  } else {
    req.participant.isOnline = false;
    req.participant.leftAt = new Date();
    await req.participant.save();
  }

  sendResponse(res, 200, "You left the meeting");
});

export const updateMeeting = asyncHandler(async (req, res) => {
  const { title, scheduledAt, settings } = req.body;
  const meeting = req.meeting;

  if (meeting.status === MEETING_STATUS.ENDED) throw new ApiError(409, "This meeting has ended");

  if (title !== undefined || scheduledAt !== undefined) {
    if (req.participant.role !== PARTICIPANT_ROLES.HOST) {
      throw new ApiError(403, "Only the host can change the title or schedule");
    }
    if (title !== undefined) meeting.title = title;
    if (scheduledAt !== undefined) {
      if (meeting.status !== MEETING_STATUS.SCHEDULED) throw new ApiError(409, "Only scheduled meetings can be rescheduled");
      meeting.scheduledAt = scheduledAt;
    }
    await meeting.save();
  }

  // Settings go through the permission service so connected clients get "permissions-updated"
  if (settings) await updateMeetingSettings(req.app.get("io"), meeting, req.participant, settings);

  await meeting.populate("host", "name avatar");
  sendResponse(res, 200, "Meeting updated successfully", { meeting: formatMeeting(meeting) });
});

export const endMeeting = asyncHandler(async (req, res) => {
  if (req.meeting.status === MEETING_STATUS.ENDED) throw new ApiError(409, "Meeting already ended");

  await endMeetingService(req.app.get("io"), req.meeting);
  sendResponse(res, 200, "Meeting ended successfully", { meeting: formatMeeting(req.meeting) });
});

export const deleteMeeting = asyncHandler(async (req, res) => {
  await deleteMeetingData(req.app.get("io"), req.meeting);
  sendResponse(res, 200, "Meeting deleted successfully");
});
