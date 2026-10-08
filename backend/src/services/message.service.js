import Message from "../models/Message.js";
import ApiError from "../utils/ApiError.js";
import { formatMessage, idOf } from "../utils/formatters.js";
import { hasPermission } from "../utils/permissions.js";
import { MESSAGE_TYPES, PERMISSIONS } from "../constants/index.js";

// Used by both REST and Socket.IO, so chat works the same everywhere
export async function createMeetingMessage(io, meeting, participant, text) {
  if (!hasPermission(participant, meeting, PERMISSIONS.CAN_CHAT)) {
    throw new ApiError(403, "Chat is disabled in this meeting");
  }

  const message = await Message.create({
    meeting: meeting._id,
    sender: participant.user,
    message: text,
    type: MESSAGE_TYPES.TEXT,
  });
  await message.populate("sender", "name avatar");

  const payload = formatMessage(message);
  io.to(String(meeting._id)).emit("new-message", payload); // everyone in the room, including the sender
  return payload;
}

export async function getMessageHistory(meetingId, { limit = 50, before } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const query = { meeting: meetingId };
  if (before && !Number.isNaN(new Date(before).getTime())) query.createdAt = { $lt: new Date(before) };

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(safeLimit)
    .populate("sender", "name avatar");

  return messages.reverse().map(formatMessage); // oldest first
}

export async function deleteMeetingMessage(io, meeting, participant, message) {
  const isOwner = message.sender && idOf(message.sender) === idOf(participant.user);
  const canModerate = hasPermission(participant, meeting, PERMISSIONS.CAN_MANAGE_PARTICIPANTS);

  if (!isOwner && !canModerate) throw new ApiError(403, "You can only delete your own messages");

  await message.deleteOne();
  io.to(String(meeting._id)).emit("message-deleted", {
    meetingId: String(meeting._id),
    messageId: String(message._id),
    deletedBy: String(participant._id),
  });
}
