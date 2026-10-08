import ApiError from "../utils/ApiError.js";
import { validateObjectId } from "../utils/validateObjectId.js";
import { getSocketInfo } from "./state.js";
import { safeHandler } from "./socketUtils.js";

/*
  WebRTC signaling. The server NEVER sees audio or video.
  It only carries small text messages between browsers so they can set up a direct connection:

    Browser A --webrtc-offer--> Server --webrtc-offer--> Browser B
    Browser B --webrtc-answer-> Server --webrtc-answer-> Browser A
    Both       --ice-candidate-> Server --ice-candidate-> the other one

  Mesh design: every pair of participants has its own RTCPeerConnection.
  A newcomer receives "participants-list" and sends an offer to each person in it.
  Messages go to ONE target socket (toSocketId), never back to the sender.
*/

// Checks that sender and receiver are in the same meeting (using server memory)
function checkPeers(socket, meetingId, toSocketId) {
  validateObjectId(meetingId, "meetingId");
  if (typeof toSocketId !== "string" || !toSocketId) throw new ApiError(400, "toSocketId is required");
  if (toSocketId === socket.id) throw new ApiError(400, "You cannot signal yourself");

  const me = getSocketInfo(socket.id);
  if (!me || me.meetingId !== String(meetingId)) throw new ApiError(403, "You have not joined this meeting");

  const target = getSocketInfo(toSocketId);
  if (!target || target.meetingId !== me.meetingId) {
    throw new ApiError(404, "That participant is not in this meeting");
  }
  return me;
}

export function registerSignalingHandlers(io, socket) {
  // SDP offer: describes what media the caller wants to send/receive
  socket.on(
    "webrtc-offer",
    safeHandler(socket, "webrtc-offer", async ({ meetingId, toSocketId, sdp, streamType }) => {
      const me = checkPeers(socket, meetingId, toSocketId);
      if (!sdp) throw new ApiError(400, "sdp is required");

      console.log(`WebRTC offer received: ${socket.id} -> ${toSocketId}`);
      io.to(toSocketId).emit("webrtc-offer", {
        meetingId,
        fromSocketId: socket.id,
        fromParticipantId: me.participantId,
        sdp,
        streamType: streamType || "camera", // "camera" or "screen"
      });
    })
  );

  // SDP answer: the receiver's reply to an offer
  socket.on(
    "webrtc-answer",
    safeHandler(socket, "webrtc-answer", async ({ meetingId, toSocketId, sdp, streamType }) => {
      const me = checkPeers(socket, meetingId, toSocketId);
      if (!sdp) throw new ApiError(400, "sdp is required");

      console.log(`WebRTC answer received: ${socket.id} -> ${toSocketId}`);
      io.to(toSocketId).emit("webrtc-answer", {
        meetingId,
        fromSocketId: socket.id,
        fromParticipantId: me.participantId,
        sdp,
        streamType: streamType || "camera",
      });
    })
  );

  // ICE candidate: one possible network route (IP + port) the browsers can try
  socket.on(
    "ice-candidate",
    safeHandler(socket, "ice-candidate", async ({ meetingId, toSocketId, candidate }) => {
      const me = checkPeers(socket, meetingId, toSocketId);
      if (!candidate) throw new ApiError(400, "candidate is required");

      console.log(`ICE candidate received: ${socket.id} -> ${toSocketId}`);
      io.to(toSocketId).emit("ice-candidate", {
        meetingId,
        fromSocketId: socket.id,
        fromParticipantId: me.participantId,
        candidate,
      });
    })
  );

  // peer-ready: "my camera/mic is ready, you can negotiate with me".
  // With toSocketId it goes to one peer, without it goes to the whole room except me.
  socket.on(
    "peer-ready",
    safeHandler(socket, "peer-ready", async ({ meetingId, toSocketId }) => {
      validateObjectId(meetingId, "meetingId");
      const me = getSocketInfo(socket.id);
      if (!me || me.meetingId !== String(meetingId)) throw new ApiError(403, "You have not joined this meeting");

      const payload = { meetingId, socketId: socket.id, participantId: me.participantId };

      if (toSocketId) {
        checkPeers(socket, meetingId, toSocketId);
        io.to(toSocketId).emit("peer-ready", payload);
      } else {
        socket.to(String(meetingId)).emit("peer-ready", payload);
      }
    })
  );
}
