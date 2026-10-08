import path from "path";
import FileModel from "../models/File.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { idOf } from "../utils/formatters.js";
import { hasPermission } from "../utils/permissions.js";
import { MEETING_STATUS, PERMISSIONS } from "../constants/index.js";
import { cleanMime } from "../middlewares/upload.middleware.js";
import { deleteStoredFile, removeLocalFile, saveUploadedFile } from "../services/storage.service.js";
import { getMemberForMeeting } from "../services/meeting.service.js";

// Route order: auth -> loadMeetingMember -> CAN_SEND_FILE check -> multer -> this controller
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Please choose a file (form field name: file)");

  if (req.meeting.status === MEETING_STATUS.ENDED) {
    await removeLocalFile(req.file.path);
    throw new ApiError(409, "This meeting has ended");
  }

  const mimeType = cleanMime(req.file.mimetype);
  const stored = await saveUploadedFile({
    file: req.file,
    folder: `meetings/${req.meeting._id}/files`,
    resourceType: mimeType.startsWith("image/") ? "image" : "raw",
  });

  const file = await FileModel.create({
    meeting: req.meeting._id,
    uploadedBy: req.user._id,
    originalName: path.basename(req.file.originalname),
    fileName: stored.fileName,
    mimeType,
    size: req.file.size,
    url: stored.url,
    storageProvider: stored.storageProvider,
    publicId: stored.publicId,
    resourceType: stored.resourceType,
  });

  req.app.get("io").to(String(req.meeting._id)).emit("file-shared", {
    meetingId: String(req.meeting._id),
    file,
    uploadedByName: req.participant.displayName,
  });

  sendResponse(res, 201, "File uploaded successfully", { file });
});

export const getFiles = asyncHandler(async (req, res) => {
  const files = await FileModel.find({ meeting: req.meeting._id })
    .sort({ createdAt: -1 })
    .populate("uploadedBy", "name avatar");
  sendResponse(res, 200, "Files fetched", { files });
});

export const deleteFile = asyncHandler(async (req, res) => {
  const file = await FileModel.findById(req.params.fileId);
  if (!file) throw new ApiError(404, "File not found");

  const { meeting, participant } = await getMemberForMeeting(file.meeting, req.user._id);

  const isOwner = idOf(file.uploadedBy) === idOf(req.user._id);
  const canManage = hasPermission(participant, meeting, PERMISSIONS.CAN_MANAGE_PARTICIPANTS);
  if (!isOwner && !canManage) throw new ApiError(403, "You can only delete your own files");

  await deleteStoredFile(file);
  await file.deleteOne();

  req.app.get("io").to(String(meeting._id)).emit("file-deleted", {
    meetingId: String(meeting._id),
    fileId: String(file._id),
    deletedBy: String(participant._id),
  });

  sendResponse(res, 200, "File deleted successfully");
});
