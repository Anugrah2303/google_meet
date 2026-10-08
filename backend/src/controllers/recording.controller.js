import Recording from "../models/Recording.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { idOf } from "../utils/formatters.js";
import { isValidObjectId } from "../utils/validateObjectId.js";
import { MEETING_STATUS, PARTICIPANT_ROLES, RECORDING_STATUS } from "../constants/index.js";
import { cleanMime } from "../middlewares/upload.middleware.js";
import { deleteStoredFile, removeLocalFile, saveUploadedFile } from "../services/storage.service.js";
import { getMemberForMeeting } from "../services/meeting.service.js";

/*
  Recording lifecycle (the BROWSER records with MediaRecorder, the server only stores the result):

  start    -> status RECORDING   (emits recording-started)
  upload   -> status PROCESSING  (emits recording-stopped, recording-processing)
  complete -> status COMPLETED   (emits recording-completed)
  If storing the file fails -> status FAILED
*/

const isRecorderOrHost = (recording, participant, user) =>
  idOf(recording.recordedBy) === idOf(user._id) || participant.role === PARTICIPANT_ROLES.HOST;

// Route: auth -> loadMeetingMember -> CAN_RECORD -> this
export const startRecording = asyncHandler(async (req, res) => {
  if (req.meeting.status !== MEETING_STATUS.LIVE) {
    throw new ApiError(409, "You can only record a live meeting");
  }

  const active = await Recording.findOne({ meeting: req.meeting._id, status: RECORDING_STATUS.RECORDING });
  if (active) throw new ApiError(409, "This meeting is already being recorded");

  const recording = await Recording.create({
    meeting: req.meeting._id,
    recordedBy: req.user._id,
    status: RECORDING_STATUS.RECORDING,
    startedAt: new Date(),
  });

  req.app.get("io").to(String(req.meeting._id)).emit("recording-started", {
    meetingId: String(req.meeting._id),
    recordingId: String(recording._id),
    startedBy: { participantId: String(req.participant._id), name: req.participant.displayName },
    startedAt: recording.startedAt,
  });

  sendResponse(res, 201, "Recording started", { recording });
});

// Route: auth -> loadMeetingMember -> multer (field "recording") -> this
export const uploadRecording = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, "Please attach the recording (form field name: recording)");

  const reject = async (status, message) => {
    await removeLocalFile(req.file.path);
    throw new ApiError(status, message);
  };

  const { recordingId } = req.body;
  if (!isValidObjectId(recordingId)) await reject(400, "recordingId is required");

  const recording = await Recording.findOne({ _id: recordingId, meeting: req.meeting._id });
  if (!recording) await reject(404, "Recording not found");
  if (!isRecorderOrHost(recording, req.participant, req.user)) await reject(403, "Only the person who started the recording can upload it");
  if (recording.status !== RECORDING_STATUS.RECORDING) await reject(409, `Recording is already ${recording.status}`);

  const io = req.app.get("io");
  const room = String(req.meeting._id);

  recording.endedAt = new Date();
  io.to(room).emit("recording-stopped", { meetingId: room, recordingId: String(recording._id) });

  try {
    const stored = await saveUploadedFile({
      file: req.file,
      folder: `meetings/${room}/recordings`,
      resourceType: "video",
    });

    recording.set({
      fileName: stored.fileName,
      url: stored.url,
      publicId: stored.publicId,
      resourceType: stored.resourceType,
      storageProvider: stored.storageProvider,
      size: req.file.size,
      duration: Number(req.body.duration) > 0 ? Number(req.body.duration) : 0,
      status: RECORDING_STATUS.PROCESSING,
    });
    await recording.save();
  } catch (error) {
    recording.status = RECORDING_STATUS.FAILED;
    await recording.save();
    throw error;
  }

  io.to(room).emit("recording-processing", { meetingId: room, recordingId: String(recording._id) });
  sendResponse(res, 200, "Recording uploaded and is being processed", { recording });
});

export const completeRecording = asyncHandler(async (req, res) => {
  const recording = await Recording.findOne({ _id: req.params.recordingId, meeting: req.meeting._id });
  if (!recording) throw new ApiError(404, "Recording not found");
  if (!isRecorderOrHost(recording, req.participant, req.user)) throw new ApiError(403, "You cannot complete this recording");
  if (recording.status !== RECORDING_STATUS.PROCESSING) {
    throw new ApiError(409, "Upload the recording file before completing it");
  }

  const duration = Number(req.body?.duration);
  if (duration > 0) recording.duration = duration;
  recording.status = RECORDING_STATUS.COMPLETED;
  await recording.save();

  req.app.get("io").to(String(req.meeting._id)).emit("recording-completed", {
    meetingId: String(req.meeting._id),
    recordingId: String(recording._id),
    url: recording.url,
    duration: recording.duration,
  });

  sendResponse(res, 200, "Recording completed", { recording });
});

export const getRecordings = asyncHandler(async (req, res) => {
  const recordings = await Recording.find({ meeting: req.meeting._id })
    .sort({ createdAt: -1 })
    .populate("recordedBy", "name avatar");
  sendResponse(res, 200, "Recordings fetched", { recordings });
});

export const deleteRecording = asyncHandler(async (req, res) => {
  const recording = await Recording.findById(req.params.recordingId);
  if (!recording) throw new ApiError(404, "Recording not found");

  const { participant } = await getMemberForMeeting(recording.meeting, req.user._id);
  if (!isRecorderOrHost(recording, participant, req.user)) {
    throw new ApiError(403, "Only the host or the person who recorded can delete this recording");
  }

  await deleteStoredFile(recording);
  await recording.deleteOne();
  sendResponse(res, 200, "Recording deleted successfully");
});
