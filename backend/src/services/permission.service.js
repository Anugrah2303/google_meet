import ApiError from "../utils/ApiError.js";
import { getEffectivePermissions, hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/index.js";
import { getOnlineParticipants } from "./meeting.service.js";

/*
  Hot permission update:
  1. check that the actor may change settings
  2. save new settings
  3. fix anybody who is now breaking a rule (e.g. unmuted while unmuting is disabled)
  4. send every connected client its own, freshly calculated permission list
*/
export async function updateMeetingSettings(io, meeting, actor, settings) {
  if (!hasPermission(actor, meeting, PERMISSIONS.CAN_MANAGE_PARTICIPANTS)) {
    throw new ApiError(403, "You are not allowed to change meeting permissions");
  }

  for (const [key, value] of Object.entries(settings)) {
    meeting.set(`settings.${key}`, value);
  }
  await meeting.save();

  const roomId = String(meeting._id);
  const online = await getOnlineParticipants(roomId);

  for (const p of online) {
    const base = { meetingId: roomId, participantId: String(p._id) };

    if (!p.isMuted && !hasPermission(p, meeting, PERMISSIONS.CAN_UNMUTE)) {
      p.isMuted = true;
      await p.save();
      io.to(roomId).emit("participant-mic-changed", { ...base, isMuted: true, mutedBy: String(actor._id) });
    }

    if (!p.isCameraOff && !hasPermission(p, meeting, PERMISSIONS.CAN_ENABLE_CAMERA)) {
      p.isCameraOff = true;
      await p.save();
      io.to(roomId).emit("participant-camera-changed", { ...base, isCameraOff: true });
    }

    if (p.isScreenSharing && !hasPermission(p, meeting, PERMISSIONS.CAN_SCREEN_SHARE)) {
      p.isScreenSharing = false;
      await p.save();
      io.to(roomId).emit("screen-share-stopped", base);
    }
  }

  // Each person gets THEIR permission list (a co-host and a participant see different results)
  const plainSettings = meeting.toObject().settings;
  for (const p of online) {
    if (!p.socketId) continue;
    io.to(p.socketId).emit("permissions-updated", {
      meetingId: roomId,
      settings: plainSettings,
      permissions: getEffectivePermissions(p, meeting),
      updatedBy: String(actor._id),
    });
  }
}
