import { useCallback, useEffect, useRef } from "react";
import { socket, emitRoom } from "@/lib/socket";
import { useMeetingStore } from "@/stores/meetingStore";

/*
  WebRTC "mesh": every participant has ONE RTCPeerConnection to EVERY other participant.
  With N people each browser uploads its video N-1 times, so CPU and upload bandwidth grow fast.
  It is fine for small calls (up to ~5-6 people). Bigger meetings need an SFU server
  (a media server that receives one stream and forwards it). We do not build that here.

  The backend only relays small signaling messages (offer / answer / ICE candidates).
  Audio and video travel directly browser <-> browser.

  Rule: the NEWCOMER always sends the offer (when it receives "participants-list"),
  people already inside only answer.

  peersRef: Map(remoteSocketId -> { pc, participantId, pendingCandidates, ignoreOffer, fallbackStream })
*/
export function useWebRTC({ localStreamRef }) {
  const peersRef = useRef(new Map());
  // The video track we are sending right now: the camera, or the screen while presenting
  const videoTrackRef = useRef(null);

  const closePeer = useCallback((socketId) => {
    const entry = peersRef.current.get(socketId);
    if (!entry) return;

    // Detach handlers first so a closing connection cannot update the UI
    entry.pc.onicecandidate = null;
    entry.pc.ontrack = null;
    entry.pc.onconnectionstatechange = null;
    entry.pc.close();
    peersRef.current.delete(socketId);

    // The same person may still have another connection (e.g. they reconnected with a new socket)
    const stillConnected = [...peersRef.current.values()].some((p) => p.participantId === entry.participantId);
    if (!stillConnected) useMeetingStore.getState().removeRemoteStream(entry.participantId);
  }, []);

  const closeAll = useCallback(() => {
    for (const socketId of [...peersRef.current.keys()]) closePeer(socketId);
  }, [closePeer]);

  const createPeer = useCallback((remoteSocketId, remoteParticipantId, asOfferer) => {
    const store = useMeetingStore.getState();
    const pc = new RTCPeerConnection({ iceServers: store.iceServers });
    const entry = { pc, participantId: remoteParticipantId, pendingCandidates: [], ignoreOffer: false, fallbackStream: null };
    peersRef.current.set(remoteSocketId, entry);

    const local = localStreamRef.current;
    const audioTrack = local?.getAudioTracks()[0] || null;
    const videoTrack = videoTrackRef.current || local?.getVideoTracks()[0] || null;
    if (audioTrack) pc.addTrack(audioTrack, local);
    if (videoTrack) pc.addTrack(videoTrack, local || new MediaStream([videoTrack]));

    // Someone without a camera or mic must still RECEIVE audio/video, so the offerer asks for it.
    // (The answerer does not need this: it gets matching receivers from the offer.)
    if (asOfferer) {
      if (!audioTrack) pc.addTransceiver("audio", { direction: "recvonly" });
      if (!videoTrack) pc.addTransceiver("video", { direction: "recvonly" });
    }

    // Each possible network route found by the browser is sent to the other side via the backend
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        emitRoom("ice-candidate", { toSocketId: remoteSocketId, candidate: event.candidate.toJSON() });
      }
    };

    // Remote audio/video arrived. Both the audio and the video track belong to the same stream.
    pc.ontrack = (event) => {
      let stream = event.streams[0];
      if (!stream) {
        entry.fallbackStream ??= new MediaStream();
        entry.fallbackStream.addTrack(event.track);
        stream = entry.fallbackStream;
      }
      useMeetingStore.getState().setRemoteStream(entry.participantId, stream);
    };

    pc.onconnectionstatechange = () => {
      useMeetingStore.getState().setPeerState(entry.participantId, pc.connectionState);
    };

    return entry;
  }, [localStreamRef]);

  // ICE candidates can arrive before setRemoteDescription finished. They must wait in a queue.
  const flushCandidates = useCallback(async (entry) => {
    const queued = entry.pendingCandidates;
    entry.pendingCandidates = [];
    for (const candidate of queued) {
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn("Could not add queued ICE candidate", error);
      }
    }
  }, []);

  // Swap the video we send (camera <-> screen) without renegotiating.
  // Tradeoff: replaceTrack is simple, but the screen replaces the camera for everybody
  // (no camera + screen at the same time). Sending both would need a second track and a new offer.
  const replaceVideoTrack = useCallback((track) => {
    videoTrackRef.current = track;
    for (const { pc } of peersRef.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === "video");
      sender?.replaceTrack(track).catch((error) => console.error("replaceTrack failed", error));
    }
  }, []);

  useEffect(() => {
    const callPeer = async (participant) => {
      const entry = createPeer(participant.socketId, participant.participantId, true);
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      emitRoom("webrtc-offer", {
        toSocketId: participant.socketId,
        sdp: { type: offer.type, sdp: offer.sdp },
        streamType: "camera",
      });
    };

    // I just joined: start a connection to everybody who is already inside
    const onParticipantsList = async ({ participants }) => {
      closeAll(); // also covers a re-join after the network dropped
      await Promise.all(
        participants
          .filter((p) => p.socketId)
          .map((p) => callPeer(p).catch((error) => console.error("Could not call peer", error)))
      );
    };

    const onOffer = async ({ fromSocketId, fromParticipantId, sdp }) => {
      try {
        const entry = peersRef.current.get(fromSocketId) || createPeer(fromSocketId, fromParticipantId, false);
        const { pc } = entry;

        // "Glare": both sides sent an offer at the same time (two people joined together).
        // The side with the smaller socket id is "polite" and gives up its own offer.
        const polite = socket.id < fromSocketId;
        const collision = pc.signalingState !== "stable";
        entry.ignoreOffer = collision && !polite;
        if (entry.ignoreOffer) return;
        if (collision) await pc.setLocalDescription({ type: "rollback" });

        await pc.setRemoteDescription(sdp);
        await flushCandidates(entry);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        emitRoom("webrtc-answer", { toSocketId: fromSocketId, sdp: { type: answer.type, sdp: answer.sdp } });
      } catch (error) {
        console.error("Failed to handle offer", error);
      }
    };

    const onAnswer = async ({ fromSocketId, sdp }) => {
      const entry = peersRef.current.get(fromSocketId);
      if (!entry || entry.pc.signalingState !== "have-local-offer") return;
      try {
        await entry.pc.setRemoteDescription(sdp);
        await flushCandidates(entry);
      } catch (error) {
        console.error("Failed to handle answer", error);
      }
    };

    const onIceCandidate = async ({ fromSocketId, candidate }) => {
      const entry = peersRef.current.get(fromSocketId);
      if (!entry || entry.ignoreOffer || !candidate) return;
      if (!entry.pc.remoteDescription) {
        entry.pendingCandidates.push(candidate); // too early, keep it for later
        return;
      }
      try {
        await entry.pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn("Could not add ICE candidate", error);
      }
    };

    const onPeerDisconnected = ({ socketId }) => closePeer(socketId);

    const onParticipantGone = ({ participantId }) => {
      for (const [socketId, entry] of [...peersRef.current.entries()]) {
        if (entry.participantId === participantId) closePeer(socketId);
      }
    };

    socket.on("participants-list", onParticipantsList);
    socket.on("webrtc-offer", onOffer);
    socket.on("webrtc-answer", onAnswer);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("peer-disconnected", onPeerDisconnected);
    socket.on("participant-left", onParticipantGone);
    socket.on("participant-removed", onParticipantGone);

    return () => {
      socket.off("participants-list", onParticipantsList);
      socket.off("webrtc-offer", onOffer);
      socket.off("webrtc-answer", onAnswer);
      socket.off("ice-candidate", onIceCandidate);
      socket.off("peer-disconnected", onPeerDisconnected);
      socket.off("participant-left", onParticipantGone);
      socket.off("participant-removed", onParticipantGone);
      closeAll(); // StrictMode runs this once in dev, so everything must be re-creatable
    };
  }, [closeAll, closePeer, createPeer, flushCandidates]);

  return { replaceVideoTrack };
}
