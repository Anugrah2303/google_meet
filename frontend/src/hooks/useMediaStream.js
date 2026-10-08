import { useCallback, useEffect, useRef, useState } from "react";

function describeError(error) {
  switch (error?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Camera and microphone access is blocked. Allow it in your browser's address bar, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No camera or microphone was found. You can still join and listen.";
    case "NotReadableError":
      return "Your camera or microphone is being used by another app.";
    default:
      return error?.message || "Could not access your camera or microphone.";
  }
}

// Asks the browser for camera + mic. If one device is missing we still try the other one,
// so a laptop without a webcam can still join with audio.
const UNSUPPORTED = "This browser cannot access the camera here. Use localhost or HTTPS.";
const isSupported = () => Boolean(navigator.mediaDevices?.getUserMedia);

export function useMediaStream() {
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(() => (isSupported() ? "" : UNSUPPORTED));
  const [loading, setLoading] = useState(isSupported);

  const streamRef = useRef(null);
  const runRef = useRef(0); // identifies the latest request, so old async results can be thrown away

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  // Asks the browser for the devices. State is only set after the await (never during the effect).
  const request = useCallback(async () => {
    if (!isSupported()) return;
    const runId = ++runRef.current;

    const attempts = [
      { video: true, audio: true },
      { video: true, audio: false },
      { video: false, audio: true },
    ];

    let result = null;
    let lastError = null;
    for (const constraints of attempts) {
      try {
        result = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastError = err;
        // If the user clicked "Block", the other attempts would fail too
        if (err.name === "NotAllowedError" || err.name === "SecurityError") break;
      }
    }

    // StrictMode / unmount happened while the browser was showing the permission prompt
    if (runId !== runRef.current) {
      result?.getTracks().forEach((track) => track.stop());
      return;
    }

    stopStream();
    streamRef.current = result;
    setStream(result);
    setError(result ? "" : describeError(lastError));
    setLoading(false);
  }, [stopStream]);

  const retry = useCallback(() => {
    setLoading(true);
    setError("");
    request();
  }, [request]);

  useEffect(() => {
    const run = runRef;
    request();
    return () => {
      run.current++; // invalidate any request still in flight
      stopStream(); // turns the camera light off
    };
  }, [request, stopStream]);

  return {
    stream,
    error,
    loading,
    retry,
    hasAudio: Boolean(stream?.getAudioTracks().length),
    hasVideo: Boolean(stream?.getVideoTracks().length),
  };
}
