import ApiError from "../utils/ApiError.js";
import { removeParticipant } from "../services/meeting.service.js";
import {
  assertCanManage,
  demoteParticipant,
  featureParticipant,
  findTarget,
  muteParticipant,
  promoteParticipant,
  setCamera,
  setHandRaised,
  setMic,
  startScreenShare,
  stopScreenShare,
} from "../services/participant.service.js";
import { PERMISSIONS } from "../constants/index.js";
import { getMeetingContext, safeHandler } from "./socketUtils.js";

/*
  All handlers follow the same 3 steps:
  1. getMeetingContext  -> who am I and which meeting? (from the server, not the client)
  2. call a service     -> checks permission, saves to MongoDB, emits to the room
  The service emits the event the other clients listen to (participant-mic-changed, hand-raised, ...)
*/
export function registerParticipantHandlers(io, socket) {
  // toggle-mic: { meetingId, isMuted? }  (without isMuted it flips the current value)
  socket.on(
    "toggle-mic",
    safeHandler(socket, "toggle-mic", async ({ meetingId, isMuted }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const next = typeof isMuted === "boolean" ? isMuted : !participant.isMuted;
      await setMic(io, meeting, participant, next);
    })
  );

  socket.on(
    "toggle-camera",
    safeHandler(socket, "toggle-camera", async ({ meetingId, isCameraOff }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const next = typeof isCameraOff === "boolean" ? isCameraOff : !participant.isCameraOff;
      await setCamera(io, meeting, participant, next);
    })
  );

  // Screen sharing: the browser captures the screen, we only keep the state and tell the room
  socket.on(
    "start-screen-share",
    safeHandler(socket, "start-screen-share", async ({ meetingId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      await startScreenShare(io, meeting, participant);
    })
  );

  socket.on(
    "stop-screen-share",
    safeHandler(socket, "stop-screen-share", async ({ meetingId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      await stopScreenShare(io, meeting, participant);
    })
  );

  // raise-hand: { meetingId }.  lower-hand: { meetingId, participantId? } (host can lower others)
  socket.on(
    "raise-hand",
    safeHandler(socket, "raise-hand", async ({ meetingId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      await setHandRaised(io, meeting, participant, participant, true);
    })
  );

  socket.on(
    "lower-hand",
    safeHandler(socket, "lower-hand", async ({ meetingId, participantId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const target = participantId ? await findTarget(meeting, participantId) : participant;
      await setHandRaised(io, meeting, participant, target, false);
    })
  );

  // Featured participant (host / co-host only, checked inside the service)
  socket.on(
    "feature-participant",
    safeHandler(socket, "feature-participant", async ({ meetingId, participantId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const target = await findTarget(meeting, participantId);
      await featureParticipant(io, meeting, participant, target, true);
    })
  );

  socket.on(
    "unfeature-participant",
    safeHandler(socket, "unfeature-participant", async ({ meetingId, participantId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const target = await findTarget(meeting, participantId);
      await featureParticipant(io, meeting, participant, target, false);
    })
  );

  // Host tools
  socket.on(
    "mute-participant",
    safeHandler(socket, "mute-participant", async ({ meetingId, participantId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const target = await findTarget(meeting, participantId);
      await muteParticipant(io, meeting, participant, target);
    })
  );

  socket.on(
    "remove-participant",
    safeHandler(socket, "remove-participant", async ({ meetingId, participantId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const target = await findTarget(meeting, participantId);

      assertCanManage(meeting, participant, target, PERMISSIONS.CAN_REMOVE_PARTICIPANT);
      if (String(target._id) === String(participant._id)) throw new ApiError(400, "Use leave-meeting to leave");

      await removeParticipant(io, meeting, target, participant._id);
    })
  );

  socket.on(
    "promote-participant",
    safeHandler(socket, "promote-participant", async ({ meetingId, participantId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const target = await findTarget(meeting, participantId);
      await promoteParticipant(io, meeting, participant, target);
    })
  );

  socket.on(
    "demote-participant",
    safeHandler(socket, "demote-participant", async ({ meetingId, participantId }) => {
      const { meeting, participant } = await getMeetingContext(socket, meetingId);
      const target = await findTarget(meeting, participantId);
      await demoteParticipant(io, meeting, participant, target);
    })
  );
}
