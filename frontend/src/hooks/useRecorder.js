import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { completeRecording, startRecordingApi, uploadRecording } from "@/api/recordings";
import { getErrorMessage } from "@/lib/errors";
import { useMeetingStore } from "@/stores/meetingStore";

const pickMimeType = () =>
  ["video/webm;codecs=vp9,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type)) || "";

/*
  The BROWSER records, the server only stores the file.

  MediaRecorder records ONE stream, but a meeting has many audio tracks (me + everybody else).
  So we mix them with the Web Audio API:

    local mic ─┐
    remote A  ─┼─> AudioContext ─> MediaStreamDestination ─┐
    remote B  ─┘                                            ├─> MediaRecorder
    video track (screen if presenting, else camera) ────────┘

  Limit: the video is whichever track was active when recording started
  (MediaRecorder cannot switch video sources in the middle of a recording).
*/
export function useRecorder({ localStreamRef, screenStream }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState("idle"); // idle | starting | recording | uploading
  const [seconds, setSeconds] = useState(0);
  const [progress, setProgress] = useState(0);

  const screenStreamRef = useRef(screenStream);
  const session = useRef(null); // everything that belongs to the current recording

  useEffect(() => {
    screenStreamRef.current = screenStream;
  }, [screenStream]);

  const teardownAudio = () => {
    const s = session.current;
    if (!s) return;
    clearInterval(s.timer);
    s.unsubscribe?.();
    s.audioContext?.close().catch(() => {});
  };

  const finish = useCallback(async (s) => {
    teardownAudio();
    const duration = Math.max(1, Math.round((Date.now() - s.startedAt) / 1000));
    session.current = null;

    if (s.chunks.length === 0) {
      toast.error("The recording was empty");
      setState("idle");
      return;
    }

    setState("uploading");
    setProgress(0);
    try {
      const blob = new Blob(s.chunks, { type: "video/webm" });
      const file = new File([blob], `meeting-${Date.now()}.webm`, { type: "video/webm" });
      await uploadRecording({
        meetingId: s.meetingId,
        recordingId: s.recordingId,
        file,
        duration,
        onUploadProgress: (e) => setProgress(Math.round((e.loaded * 100) / (e.total || file.size))),
      });
      await completeRecording(s.meetingId, s.recordingId, duration);
      toast.success("Recording saved");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not upload the recording"));
    } finally {
      setState("idle");
      queryClient.invalidateQueries({ queryKey: ["recordings", s.meetingId] });
    }
  }, [queryClient]);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    if (typeof MediaRecorder === "undefined") {
      toast.error("Your browser cannot record meetings");
      return;
    }

    const local = localStreamRef.current;
    const videoTrack = screenStreamRef.current?.getVideoTracks()[0] || local?.getVideoTracks()[0];
    if (!videoTrack && !local?.getAudioTracks().length) {
      toast.error("There is no camera or microphone to record");
      return;
    }

    const meetingId = useMeetingStore.getState().meeting.id;
    setState("starting");

    let recording;
    try {
      recording = await startRecordingApi(meetingId); // server creates the record, status RECORDING
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not start recording"));
      setState("idle");
      return;
    }

    // --- mix every audio track into one ---
    const audioContext = new AudioContext();
    audioContext.resume();
    const destination = audioContext.createMediaStreamDestination();
    const connected = new Set();
    const addAudioFrom = (stream) => {
      stream?.getAudioTracks().forEach((track) => {
        if (connected.has(track.id)) return;
        connected.add(track.id);
        // Chrome only gives audio for remote streams that are also played by a <video>/<audio>
        // element. Our VideoTile does that, so this works.
        audioContext.createMediaStreamSource(new MediaStream([track])).connect(destination);
      });
    };
    addAudioFrom(local);
    Object.values(useMeetingStore.getState().remoteStreams).forEach(addAudioFrom);
    // People who join during the recording are added when their stream shows up in the store
    const unsubscribe = useMeetingStore.subscribe((s) => Object.values(s.remoteStreams).forEach(addAudioFrom));

    const tracks = [...destination.stream.getAudioTracks()];
    if (videoTrack) tracks.push(videoTrack);
    const mixed = new MediaStream(tracks);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(mixed, mimeType ? { mimeType } : undefined);
    const s = {
      meetingId,
      recordingId: recording._id,
      recorder,
      chunks: [],
      audioContext,
      unsubscribe,
      startedAt: Date.now(),
      timer: null,
    };
    session.current = s;

    recorder.ondataavailable = (e) => e.data.size > 0 && s.chunks.push(e.data);
    recorder.onstop = () => finish(s);
    recorder.onerror = () => toast.error("The recorder stopped because of an error");

    recorder.start(1000); // a chunk every second, so little is lost if something goes wrong
    setSeconds(0);
    s.timer = setInterval(() => setSeconds(Math.floor((Date.now() - s.startedAt) / 1000)), 1000);
    setState("recording");
  }, [state, localStreamRef, finish]);

  const stop = useCallback(() => {
    const recorder = session.current?.recorder;
    if (recorder && recorder.state !== "inactive") recorder.stop(); // triggers onstop -> finish()
  }, []);

  // Leaving the meeting while recording: stop and still upload what we have
  useEffect(
    () => () => {
      const recorder = session.current?.recorder;
      if (recorder && recorder.state !== "inactive") recorder.stop();
    },
    []
  );

  return { state, seconds, progress, start, stop };
}
