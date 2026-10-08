import Participant from "../models/Participant.js";
import ApiError from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { formatParticipant } from "../utils/formatters.js";
import { getEffectivePermissions, hasPermission } from "../utils/permissions.js";
import { getSocketIdByParticipant } from "../sockets/state.js";
import { DEFAULT_CO_HOST_PERMISSIONS, PARTICIPANT_ROLES, PERMISSIONS } from "../constants/index.js";

/*
  Every function here:
  1. checks permission (never trusts the frontend)
  2. updates MongoDB
  3. tells the whole meeting room with io.to(roomId).emit(...)

  REST controllers and Socket.IO handlers both call these functions.
  "actor" = the participant doing the action, "target" = the participant it is done to.
*/

const roomOf = (meeting) => String(meeting._id);

export async function findTarget(meeting, participantId) {
  validateObjectId(participantId, "participantId");
  const target = await Participant.findOne({ _id: participantId, meeting: meeting._id });
  if (!target) throw new ApiError(404, "Participant not found");
  return target;
}

// Host can manage everybody. Co-hosts can only manage normal participants.
function assertCanManage(meeting, actor, target, permission) {
  if (!hasPermission(actor, meeting, permission)) {
    throw new ApiError(403, "You are not allowed to perform this action");
  }
  if (String(actor._id) === String(target._id)) return;
  if (target.role === PARTICIPANT_ROLES.HOST) throw new ApiError(403, "You cannot do this to the host");
  if (actor.role === PARTICIPANT_ROLES.CO_HOST && target.role !== PARTICIPANT_ROLES.PARTICIPANT) {
    throw new ApiError(403, "Co-hosts can only manage regular participants");
  }
}

export { assertCanManage };

// ---------- mic / camera ----------
export async function setMic(io, meeting, participant, isMuted, mutedBy = null) {
  if (!isMuted && !hasPermission(participant, meeting, PERMISSIONS.CAN_UNMUTE)) {
    throw new ApiError(403, "The host has disabled unmuting");
  }
  participant.isMuted = isMuted;
  await participant.save();

  io.to(roomOf(meeting)).emit("participant-mic-changed", {
    meetingId: roomOf(meeting),
    participantId: String(participant._id),
    isMuted,
    mutedBy,
  });
}

export async function setCamera(io, meeting, participant, isCameraOff) {
  if (!isCameraOff && !hasPermission(participant, meeting, PERMISSIONS.CAN_ENABLE_CAMERA)) {
    throw new ApiError(403, "The host has disabled cameras");
  }
  participant.isCameraOff = isCameraOff;
  await participant.save();

  io.to(roomOf(meeting)).emit("participant-camera-changed", {
    meetingId: roomOf(meeting),
    participantId: String(participant._id),
    isCameraOff,
  });
}

// Host / co-host mutes somebody else
export async function muteParticipant(io, meeting, actor, target) {
  assertCanManage(meeting, actor, target, PERMISSIONS.CAN_MANAGE_PARTICIPANTS);
  if (!target.isOnline) throw new ApiError(400, "Participant is not in the meeting");
  await setMic(io, meeting, target, true, String(actor._id));
}

// ---------- screen sharing ----------
// The backend only stores the state. The browser captures the screen with getDisplayMedia().
export async function startScreenShare(io, meeting, participant) {
  if (!hasPermission(participant, meeting, PERMISSIONS.CAN_SCREEN_SHARE)) {
    throw new ApiError(403, "Screen sharing is not allowed in this meeting");
  }

  const otherSharer = await Participant.findOne({
    meeting: meeting._id,
    isScreenSharing: true,
    isOnline: true,
    _id: { $ne: participant._id },
  });
  if (otherSharer) throw new ApiError(409, `${otherSharer.displayName} is already presenting`);

  participant.isScreenSharing = true;
  await participant.save();

  io.to(roomOf(meeting)).emit("screen-share-started", {
    meetingId: roomOf(meeting),
    participantId: String(participant._id),
    socketId: participant.socketId,
    displayName: participant.displayName,
  });
}

export async function stopScreenShare(io, meeting, participant) {
  participant.isScreenSharing = false;
  await participant.save();

  io.to(roomOf(meeting)).emit("screen-share-stopped", {
    meetingId: roomOf(meeting),
    participantId: String(participant._id),
  });
}

// ---------- hand raise ----------
export async function setHandRaised(io, meeting, actor, target, raised) {
  const isSelf = String(actor._id) === String(target._id);

  if (!isSelf) {
    // Only host/co-host can lower somebody else's hand, nobody can raise it for them
    if (raised) throw new ApiError(403, "You can only raise your own hand");
    if (!hasPermission(actor, meeting, PERMISSIONS.CAN_MANAGE_PARTICIPANTS)) {
      throw new ApiError(403, "You can only lower your own hand");
    }
  }

  target.isHandRaised = raised;
  await target.save();

  const payload = { meetingId: roomOf(meeting), participantId: String(target._id), displayName: target.displayName };
  if (raised) io.to(roomOf(meeting)).emit("hand-raised", payload);
  else io.to(roomOf(meeting)).emit("hand-lowered", { ...payload, loweredBy: String(actor._id) });
}

// ---------- featured / pinned participant ----------
// "Featured" is only application state. The frontend decides how to show it.
export async function featureParticipant(io, meeting, actor, target, featured) {
  if (!hasPermission(actor, meeting, PERMISSIONS.CAN_MANAGE_PARTICIPANTS)) {
    throw new ApiError(403, "Only the host or a co-host can feature participants");
  }

  if (!featured) {
    target.isFeatured = false;
    await target.save();
    io.to(roomOf(meeting)).emit("participant-unfeatured", { meetingId: roomOf(meeting), participantId: String(target._id) });
    return;
  }

  if (!target.isOnline) throw new ApiError(400, "Participant is not in the meeting");

  // Only ONE participant can be featured, so clear the previous one first
  const previous = await Participant.find({ meeting: meeting._id, isFeatured: true, _id: { $ne: target._id } });
  await Participant.updateMany({ meeting: meeting._id, isFeatured: true }, { isFeatured: false });

  target.isFeatured = true;
  await target.save();

  io.to(roomOf(meeting)).emit("participant-featured", {
    meetingId: roomOf(meeting),
    participantId: String(target._id),
    previousParticipantIds: previous.map((p) => String(p._id)),
  });
}

// ---------- roles ----------
function announceRoleChange(io, meeting, target) {
  const payload = {
    meetingId: roomOf(meeting),
    participantId: String(target._id),
    role: target.role,
    permissions: getEffectivePermissions(target, meeting),
  };
  io.to(roomOf(meeting)).emit("participant-role-changed", payload);
  io.to(roomOf(meeting)).emit("participant-updated", { meetingId: roomOf(meeting), participant: formatParticipant(target) });
}

export async function promoteParticipant(io, meeting, actor, target) {
  if (actor.role !== PARTICIPANT_ROLES.HOST) throw new ApiError(403, "Only the host can assign co-hosts");
  if (target.role === PARTICIPANT_ROLES.HOST) throw new ApiError(400, "The host is already the host");
  if (target.role === PARTICIPANT_ROLES.CO_HOST) throw new ApiError(409, "Participant is already a co-host");

  target.role = PARTICIPANT_ROLES.CO_HOST;
  target.permissions = DEFAULT_CO_HOST_PERMISSIONS;
  await target.save();
  announceRoleChange(io, meeting, target);
}

export async function demoteParticipant(io, meeting, actor, target) {
  if (actor.role !== PARTICIPANT_ROLES.HOST) throw new ApiError(403, "Only the host can remove co-host rights");
  if (target.role !== PARTICIPANT_ROLES.CO_HOST) throw new ApiError(400, "Participant is not a co-host");

  target.role = PARTICIPANT_ROLES.PARTICIPANT;
  target.permissions = [];
  await target.save();
  announceRoleChange(io, meeting, target);
}

// Host decides exactly what a co-host may do
export async function updateCoHostPermissions(io, meeting, actor, target, permissions) {
  if (actor.role !== PARTICIPANT_ROLES.HOST) throw new ApiError(403, "Only the host can change co-host permissions");
  if (target.role !== PARTICIPANT_ROLES.CO_HOST) throw new ApiError(400, "Only co-hosts have configurable permissions");

  target.permissions = permissions;
  await target.save();

  announceRoleChange(io, meeting, target);
  const socketId = target.socketId || getSocketIdByParticipant(meeting._id, target._id);
  if (socketId) {
    io.to(socketId).emit("permissions-updated", {
      meetingId: roomOf(meeting),
      settings: meeting.toObject().settings,
      permissions: getEffectivePermissions(target, meeting),
      updatedBy: String(actor._id),
    });
  }
}
