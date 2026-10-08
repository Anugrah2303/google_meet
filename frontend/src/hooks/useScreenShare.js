import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { socket, emitRoom } from "@/lib/socket";
import { useMeetingStore } from "@/stores/meetingStore";

/*
  Screen sharing with replaceTrack: the screen video replaces the camera video inside the
  existing peer connections, so no new offer/answer is needed. The server only keeps the
  "isScreenSharing" state (and rejects it if someone else is presenting or it is not allowed).
*/
export function useScreenShare({ stream, replaceVideoTrack }) {
  const [screenStream, setScreenStream] = useState(null);
  const screenTrackRef = useRef(null);
  const stopRef = useRef(null);

  // Stop capturing and send the camera again. Returns true if we were really sharing.
  const cleanup = useCallback(() => {
    const track = screenTrackRef.current;
    if (!track) return false;
    track.onended = null;
    track.stop();
    screenTrackRef.current = null;
    setScreenStream(null);
    const cameraTrack = stream?.getVideoTracks()[0];
    if (cameraTrack) replaceVideoTrack(cameraTrack);
    return true;
  }, [stream, replaceVideoTrack]);

  const stop = useCallback(() => {
    if (cleanup()) emitRoom("stop-screen-share");
  }, [cleanup]);

  useEffect(() => {
    stopRef.current = stop;
  }, [stop]);

  const start = useCallback(async () => {
    if (screenTrackRef.current) return;
    if (!navigator.mediaDevices?.getDisplayMedia) {
      toast.error("Your browser does not support screen sharing");
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = display.getVideoTracks()[0];
      screenTrackRef.current = track;
      // Fires when the user clicks the browser's own "Stop sharing" button
      track.onended = () => stopRef.current?.();
      setScreenStream(new MediaStream([track]));
      replaceVideoTrack(track);
      emitRoom("start-screen-share");
    } catch (error) {
      if (error.name !== "NotAllowedError") toast.error("Could not start screen sharing");
      // NotAllowedError = the user closed the picker, nothing to report
    }
  }, [replaceVideoTrack]);

  useEffect(() => {
    // The server refused (someone else is presenting / not allowed): undo everything
    const onError = ({ event }) => {
      if (event === "start-screen-share") cleanup();
    };
    // The server stopped MY sharing (e.g. the host switched screen sharing off)
    const onStopped = ({ participantId }) => {
      if (participantId === useMeetingStore.getState().meId && screenTrackRef.current) {
        cleanup();
        toast.info("Your screen sharing was stopped");
      }
    };
    socket.on("socket-error", onError);
    socket.on("screen-share-stopped", onStopped);
    return () => {
      socket.off("socket-error", onError);
      socket.off("screen-share-stopped", onStopped);
    };
  }, [cleanup]);

  // Leaving the room: release the screen capture
  useEffect(
    () => () => {
      const track = screenTrackRef.current;
      if (track) {
        track.onended = null;
        track.stop();
        screenTrackRef.current = null;
      }
    },
    []
  );

  return { screenStream, isSharing: Boolean(screenStream), start, stop };
}
