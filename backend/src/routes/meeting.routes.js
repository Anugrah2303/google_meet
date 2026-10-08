import express from "express";
import { PERMISSIONS } from "../constants/index.js";
import { protect } from "../middlewares/auth.middleware.js";
import { loadMeetingMember, requireHost, requirePermission } from "../middlewares/meeting.middleware.js";
import { uploadMeetingFile, uploadRecordingFile } from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { validateIdParam } from "../utils/validateObjectId.js";
import {
  createMeetingSchema,
  joinMeetingSchema,
  meetingCodeSchema,
  permissionsSchema,
  updateMeetingSchema,
} from "../validations/meeting.validation.js";
import { messageSchema } from "../validations/message.validation.js";
import {
  createMeeting,
  deleteMeeting,
  endMeeting,
  getIceServersController,
  getMeetingByCode,
  getMeetingById,
  getMeetingHistory,
  getMyMeetings,
  joinMeeting,
  leaveMeetingRest,
  updateMeeting,
} from "../controllers/meeting.controller.js";
import {
  demote,
  feature,
  getParticipant,
  getParticipants,
  mute,
  promote,
  remove,
  unfeature,
  updatePermissions,
} from "../controllers/participant.controller.js";
import { getMessages, sendMessage } from "../controllers/message.controller.js";
import { getFiles, uploadFile } from "../controllers/file.controller.js";
import {
  completeRecording,
  getRecordings,
  startRecording,
  uploadRecording,
} from "../controllers/recording.controller.js";

const router = express.Router();

router.use(protect);
router.param("meetingId", validateIdParam);
router.param("participantId", validateIdParam);
router.param("recordingId", validateIdParam);

// ----- Meetings (fixed paths first, otherwise "history" would be read as a :meetingId) -----
router.post("/", validate(createMeetingSchema), createMeeting);
router.get("/", getMyMeetings);
router.get("/history", getMeetingHistory);
router.get("/ice-servers", getIceServersController);
router.get("/code/:meetingCode", validate(meetingCodeSchema, "params"), getMeetingByCode);

router.post("/:meetingId/join", validate(joinMeetingSchema), joinMeeting);
router.get("/:meetingId", loadMeetingMember, getMeetingById);
router.post("/:meetingId/leave", loadMeetingMember, leaveMeetingRest);
router.patch("/:meetingId", loadMeetingMember, validate(updateMeetingSchema), updateMeeting);
router.post("/:meetingId/end", loadMeetingMember, requireHost, endMeeting);
router.delete("/:meetingId", loadMeetingMember, requireHost, deleteMeeting);

// ----- Participants -----
router.get("/:meetingId/participants", loadMeetingMember, getParticipants);
router.get("/:meetingId/participants/:participantId", loadMeetingMember, getParticipant);
router.post("/:meetingId/participants/:participantId/feature", loadMeetingMember, feature);
router.delete("/:meetingId/participants/:participantId/feature", loadMeetingMember, unfeature);
router.post("/:meetingId/participants/:participantId/promote", loadMeetingMember, promote);
router.post("/:meetingId/participants/:participantId/demote", loadMeetingMember, demote);
router.post("/:meetingId/participants/:participantId/remove", loadMeetingMember, remove);
router.post("/:meetingId/participants/:participantId/mute", loadMeetingMember, mute);
router.patch(
  "/:meetingId/participants/:participantId/permissions",
  loadMeetingMember,
  validate(permissionsSchema),
  updatePermissions
);

// ----- Messages -----
router.get("/:meetingId/messages", loadMeetingMember, getMessages);
router.post("/:meetingId/messages", loadMeetingMember, validate(messageSchema), sendMessage);

// ----- Files (permission is checked BEFORE multer, so forbidden uploads are never stored) -----
router.get("/:meetingId/files", loadMeetingMember, getFiles);
router.post(
  "/:meetingId/files",
  loadMeetingMember,
  requirePermission(PERMISSIONS.CAN_SEND_FILE),
  uploadMeetingFile,
  uploadFile
);

// ----- Recordings -----
router.get("/:meetingId/recordings", loadMeetingMember, getRecordings);
router.post(
  "/:meetingId/recordings/start",
  loadMeetingMember,
  requirePermission(PERMISSIONS.CAN_RECORD),
  startRecording
);
router.post("/:meetingId/recordings/upload", loadMeetingMember, uploadRecordingFile, uploadRecording);
router.post("/:meetingId/recordings/:recordingId/complete", loadMeetingMember, completeRecording);

export default router;
