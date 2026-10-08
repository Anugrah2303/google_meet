import Message from "../models/Message.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import {
  createMeetingMessage,
  deleteMeetingMessage,
  getMessageHistory,
} from "../services/message.service.js";
import { getMemberForMeeting } from "../services/meeting.service.js";

export const getMessages = asyncHandler(async (req, res) => {
  const messages = await getMessageHistory(req.meeting._id, {
    limit: req.query.limit,
    before: req.query.before,
  });
  sendResponse(res, 200, "Messages fetched", { messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await createMeetingMessage(req.app.get("io"), req.meeting, req.participant, req.body.message);
  sendResponse(res, 201, "Message sent", { message });
});

export const deleteMessage = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) throw new ApiError(404, "Message not found");

  const { meeting, participant } = await getMemberForMeeting(message.meeting, req.user._id);
  await deleteMeetingMessage(req.app.get("io"), meeting, participant, message);

  sendResponse(res, 200, "Message deleted");
});
