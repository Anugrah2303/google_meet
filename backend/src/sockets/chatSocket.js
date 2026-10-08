import Message from "../models/Message.js";
import ApiError from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { messageSchema } from "../validations/message.validation.js";
import {
  createMeetingMessage,
  deleteMeetingMessage,
  getMessageHistory,
} from "../services/message.service.js";
import { getMeetingContext, safeHandler } from "./socketUtils.js";

export function registerChatHandlers(io, socket) {
  // send-message: Client -> { meetingId, message }. The sender comes from socket.user, not from the client.
  socket.on(
    "send-message",
    safeHandler(socket, "send-message", async ({ meetingId, message }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);

      const parsed = messageSchema.safeParse({ message });
      if (!parsed.success) throw new ApiError(422, parsed.error.issues[0].message);

      // Saves to MongoDB and emits "new-message" to the whole room
      await createMeetingMessage(io, meeting, participant, parsed.data.message);
    })
  );

  // message-history: Client -> { meetingId, limit?, before? }. Answer goes only to the asker.
  socket.on(
    "message-history",
    safeHandler(socket, "message-history", async ({ meetingId, limit, before }) => {
      const { meeting } = await getMeetingContext(socket, meetingId);
      const messages = await getMessageHistory(meeting._id, { limit, before });
      socket.emit("message-history", { meetingId: String(meeting._id), messages });
    })
  );

  // delete-message: Client -> { meetingId, messageId }
  socket.on(
    "delete-message",
    safeHandler(socket, "delete-message", async ({ meetingId, messageId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      validateObjectId(messageId, "messageId");

      const message = await Message.findOne({ _id: messageId, meeting: meeting._id });
      if (!message) throw new ApiError(404, "Message not found");

      await deleteMeetingMessage(io, meeting, participant, message);
    })
  );
}
