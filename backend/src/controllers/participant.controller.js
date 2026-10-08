import Participant from "../models/Participant.js";
import ApiError from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/sendResponse.js";
import { formatParticipant } from "../utils/formatters.js";
import { hasPermission } from "../utils/permissions.js";
import { PERMISSIONS } from "../constants/index.js";
import { removeParticipant as removeParticipantService } from "../services/meeting.service.js";
import {
  assertCanManage,
  demoteParticipant,
  featureParticipant,
  findTarget,
  muteParticipant,
  promoteParticipant,
  updateCoHostPermissions,
} from "../services/participant.service.js";

export const getParticipants = asyncHandler(async (req, res) => {
  const query = { meeting: req.meeting._id };
  if (req.query.online === "true") query.isOnline = true;

  const participants = await Participant.find(query).populate("user", "name avatar").sort({ createdAt: 1 });
  sendResponse(res, 200, "Participants fetched", { participants: participants.map(formatParticipant) });
});

export const getParticipant = asyncHandler(async (req, res) => {
  const participant = await Participant.findOne({
    _id: req.params.participantId,
    meeting: req.meeting._id,
  }).populate("user", "name avatar");
  if (!participant) throw new ApiError(404, "Participant not found");

  sendResponse(res, 200, "Participant fetched", { participant: formatParticipant(participant) });
});

export const feature = asyncHandler(async (req, res) => {
  const target = await findTarget(req.meeting, req.params.participantId);
  await featureParticipant(req.app.get("io"), req.meeting, req.participant, target, true);
  sendResponse(res, 200, "Participant featured", { participant: formatParticipant(target) });
});

export const unfeature = asyncHandler(async (req, res) => {
  const target = await findTarget(req.meeting, req.params.participantId);
  await featureParticipant(req.app.get("io"), req.meeting, req.participant, target, false);
  sendResponse(res, 200, "Participant is no longer featured", { participant: formatParticipant(target) });
});

export const promote = asyncHandler(async (req, res) => {
  const target = await findTarget(req.meeting, req.params.participantId);
  await promoteParticipant(req.app.get("io"), req.meeting, req.participant, target);
  sendResponse(res, 200, "Participant is now a co-host", { participant: formatParticipant(target) });
});

export const demote = asyncHandler(async (req, res) => {
  const target = await findTarget(req.meeting, req.params.participantId);
  await demoteParticipant(req.app.get("io"), req.meeting, req.participant, target);
  sendResponse(res, 200, "Co-host rights removed", { participant: formatParticipant(target) });
});

export const remove = asyncHandler(async (req, res) => {
  const target = await findTarget(req.meeting, req.params.participantId);

  assertCanManage(req.meeting, req.participant, target, PERMISSIONS.CAN_REMOVE_PARTICIPANT);
  if (String(target._id) === String(req.participant._id)) throw new ApiError(400, "Use the leave endpoint to leave");
  if (!hasPermission(req.participant, req.meeting, PERMISSIONS.CAN_REMOVE_PARTICIPANT)) {
    throw new ApiError(403, "You are not allowed to remove participants");
  }

  await removeParticipantService(req.app.get("io"), req.meeting, target, req.participant._id);
  sendResponse(res, 200, "Participant removed", { participant: formatParticipant(target) });
});

export const mute = asyncHandler(async (req, res) => {
  const target = await findTarget(req.meeting, req.params.participantId);
  await muteParticipant(req.app.get("io"), req.meeting, req.participant, target);
  sendResponse(res, 200, "Participant muted", { participant: formatParticipant(target) });
});

export const updatePermissions = asyncHandler(async (req, res) => {
  const target = await findTarget(req.meeting, req.params.participantId);
  await updateCoHostPermissions(req.app.get("io"), req.meeting, req.participant, target, req.body.permissions);
  sendResponse(res, 200, "Co-host permissions updated", { participant: formatParticipant(target) });
});
