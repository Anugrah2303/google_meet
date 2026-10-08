import Meeting from "../models/Meeting.js";
import Participant from "../models/Participant.js";
import Message from "../models/Message.js";
import FileModel from "../models/File.js";
import Recording from "../models/Recording.js";
import ApiError from "../utils/ApiError.js";
import { idOf } from "../utils/formatters.js";
import { MEETING_STATUS, PARTICIPANT_ROLES } from "../constants/index.js";
import { addToRoom, clearRoom, getRoomMembers, getSocketInfo, removeFromRoom } from "../sockets/state.js";
import { deleteStoredFile } from "./storage.service.js";

// Used by REST controllers that are not under /:meetingId middleware
export async function getMemberForMeeting(meetingId, userId) {
  const meeting = await Meeting.findById(meetingId);
  if (!meeting) throw new ApiError(404, "Meeting not found");

  const participant = await Participant.findOne({ meeting: meeting._id, user: userId });
  if (!participant || participant.isRemoved) throw new ApiError(403, "You are not a member of this meeting");

  return { meeting, participant };
}

/*
  Makes sure the user has a Participant record for this meeting.
  It does NOT mark the user online. Going online happens in the socket "join-meeting" event.
*/
export async function registerParticipant(meeting, user, displayName) {
  if (meeting.status === MEETING_STATUS.ENDED) throw new ApiError(409, "This meeting has ended");

  const isHost = idOf(meeting.host) === idOf(user._id);

  if (meeting.status === MEETING_STATUS.SCHEDULED) {
    if (!isHost) throw new ApiError(403, "The host has not started this meeting yet");
    meeting.status = MEETING_STATUS.LIVE;
    meeting.startedAt = new Date();
    await meeting.save();
  }

  let participant = await Participant.findOne({ meeting: meeting._id, user: user._id });

  if (participant?.isRemoved) throw new ApiError(403, "You were removed from this meeting");

  if (!participant) {
    participant = await Participant.create({
      meeting: meeting._id,
      user: user._id,
      displayName: displayName || user.name,
      role: isHost ? PARTICIPANT_ROLES.HOST : PARTICIPANT_ROLES.PARTICIPANT,
    });
  } else if (displayName && displayName !== participant.displayName) {
    participant.displayName = displayName;
    await participant.save();
  }

  await Meeting.updateOne({ _id: meeting._id }, { $addToSet: { participants: user._id } });
  return participant;
}

// Marks a socket as inside the meeting room (DB + in-memory)
export async function markParticipantOnline(participant, socket, initialState = {}) {
  participant.set({
    socketId: socket.id,
    isOnline: true,
    joinedAt: new Date(),
    leftAt: null,
    isHandRaised: false,
    isScreenSharing: false,
    isMuted: initialState.isMuted,
    isCameraOff: initialState.isCameraOff,
  });
  await participant.save();

  socket.join(String(participant.meeting)); // Socket.IO room named after the meeting id
  addToRoom(participant.meeting, socket.id, participant._id, participant.user);
}

// Participants who are connected right now, based on in-memory state
export async function getOnlineParticipants(meetingId) {
  const ids = getRoomMembers(meetingId).map((m) => m.participantId);
  if (ids.length === 0) return [];
  return Participant.find({ _id: { $in: ids } }).populate("user", "name avatar");
}

/*
  Removes one socket from its meeting. Used by:
  - leave-meeting event
  - REST /leave
  - socket disconnect (browser closed, network lost)
*/
export async function leaveMeeting(io, socketId, reason = "left") {
  const info = removeFromRoom(socketId);
  if (!info) return null; // this socket was not inside a meeting

  const { meetingId, participantId } = info;
  const participant = await Participant.findById(participantId);
  if (!participant) return null;

  // If the same user already reconnected with another socket, don't touch the new state
  if (participant.socketId && participant.socketId !== socketId) return null;

  const wasSharing = participant.isScreenSharing;
  const wasFeatured = participant.isFeatured;

  participant.set({
    isOnline: false,
    socketId: null,
    leftAt: new Date(),
    isHandRaised: false,
    isScreenSharing: false,
    isFeatured: false,
  });
  await participant.save();

  io.to(socketId).emit("meeting-left", { meetingId, reason });
  io.in(socketId).socketsLeave(meetingId); // leave the Socket.IO room

  // Tell everybody who is still inside
  io.to(meetingId).emit("peer-disconnected", { meetingId, socketId, participantId });
  io.to(meetingId).emit("participant-left", {
    meetingId,
    participantId,
    displayName: participant.displayName,
    reason,
  });
  if (wasSharing) io.to(meetingId).emit("screen-share-stopped", { meetingId, participantId });
  if (wasFeatured) io.to(meetingId).emit("participant-unfeatured", { meetingId, participantId });

  console.log(`User left meeting: ${participant.displayName} (${reason})`);
  return participant;
}

export async function endMeeting(io, meeting) {
  const meetingId = String(meeting._id);

  meeting.status = MEETING_STATUS.ENDED;
  meeting.endedAt = new Date();
  await meeting.save();

  await Participant.updateMany(
    { meeting: meeting._id, isOnline: true },
    { isOnline: false, socketId: null, leftAt: new Date(), isHandRaised: false, isScreenSharing: false, isFeatured: false }
  );

  io.to(meetingId).emit("meeting-ended", { meetingId, endedAt: meeting.endedAt });
  io.in(meetingId).socketsLeave(meetingId); // everybody leaves the room
  clearRoom(meetingId);
  console.log(`Meeting ended: ${meeting.meetingCode}`);
}

// Host removes someone. They cannot come back.
export async function removeParticipant(io, meeting, target, removedByParticipantId) {
  const meetingId = String(meeting._id);
  const oldSocketId = target.socketId;

  target.set({
    isRemoved: true,
    isOnline: false,
    socketId: null,
    leftAt: new Date(),
    isHandRaised: false,
    isScreenSharing: false,
    isFeatured: false,
  });
  await target.save();

  const payload = { meetingId, participantId: String(target._id), displayName: target.displayName, removedBy: String(removedByParticipantId) };

  if (oldSocketId && getSocketInfo(oldSocketId)) {
    io.to(meetingId).emit("participant-removed", payload); // the removed user receives it too
    removeFromRoom(oldSocketId);
    io.in(oldSocketId).socketsLeave(meetingId);
    io.to(meetingId).emit("peer-disconnected", { meetingId, socketId: oldSocketId, participantId: payload.participantId });
  }
}

// Used by DELETE /meetings/:id. Removes the meeting and everything that belongs to it.
export async function deleteMeetingData(io, meeting) {
  if (meeting.status !== MEETING_STATUS.ENDED) await endMeeting(io, meeting);

  const files = await FileModel.find({ meeting: meeting._id });
  const recordings = await Recording.find({ meeting: meeting._id });
  for (const item of [...files, ...recordings]) await deleteStoredFile(item);

  await Promise.all([
    Participant.deleteMany({ meeting: meeting._id }),
    Message.deleteMany({ meeting: meeting._id }),
    FileModel.deleteMany({ meeting: meeting._id }),
    Recording.deleteMany({ meeting: meeting._id }),
  ]);
  await meeting.deleteOne();
}
