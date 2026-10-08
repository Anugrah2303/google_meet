import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { MdFiberManualRecord, MdPeople, MdWarningAmber } from "react-icons/md";
import { endMeeting } from "@/api/meetings";
import ConnectionBanner from "./ConnectionBanner";
import ControlsBar from "./ControlsBar";
import MeetingInfoModal from "./MeetingInfoModal";
import SidePanel from "./SidePanel";
import VideoGrid from "./VideoGrid";
import Spinner from "@/components/ui/Spinner";
import { useMeetingSocket } from "@/hooks/useMeetingSocket";
import { useRecorder } from "@/hooks/useRecorder";
import { useScreenShare } from "@/hooks/useScreenShare";
import { useWebRTC } from "@/hooks/useWebRTC";
import { MESH_WARNING_THRESHOLD } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { formatClock } from "@/lib/formatters";
import { emitRoom } from "@/lib/socket";
import { useMeetingStore } from "@/stores/meetingStore";

// Everything that exists only while we are inside the room.
// It is mounted AFTER the REST "join" succeeded and unmounted when we leave.
export default function RoomSession({ meetingId, stream, session }) {
  const navigate = useNavigate();
  const joined = useMeetingStore((s) => s.joined);
  const meeting = useMeetingStore((s) => s.meeting);
  const me = useMeetingStore((s) => s.participants[s.meId]);
  const participantCount = useMeetingStore((s) => Object.keys(s.participants).length);
  const recording = useMeetingStore((s) => s.recording);

  const localStreamRef = useRef(stream);
  useEffect(() => {
    localStreamRef.current = stream;
  }, [stream]);

  const exit = useCallback(() => navigate("/home", { replace: true }), [navigate]);

  const webrtc = useWebRTC({ localStreamRef });
  useMeetingSocket({ meetingId, session, localStreamRef, onExit: exit });
  const screen = useScreenShare({ stream, replaceVideoTrack: webrtc.replaceVideoTrack });
  const recorder = useRecorder({ localStreamRef, screenStream: screen.screenStream });

  const end = useMutation({
    mutationFn: () => endMeeting(meetingId),
    onError: (error) => toast.error(getErrorMessage(error, "Could not end the meeting")),
    // on success the server emits "meeting-ended" to everybody, which sends us home
  });

  if (!joined || !me) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
        <Spinner className="h-8 w-8" />
        <p>Joining the meeting...</p>
        <ConnectionBanner />
      </div>
    );
  }

  // Mic / camera: change the real track right away, then tell the server.
  // If the server refuses, useMeetingSocket puts the track back to the confirmed state.
  const toggleMic = () => {
    const next = !me.isMuted;
    stream?.getAudioTracks().forEach((t) => (t.enabled = !next));
    emitRoom("toggle-mic", { isMuted: next });
  };
  const toggleCamera = () => {
    const next = !me.isCameraOff;
    stream?.getVideoTracks().forEach((t) => (t.enabled = !next));
    emitRoom("toggle-camera", { isCameraOff: next });
  };
  const toggleHand = () => emitRoom(me.isHandRaised ? "lower-hand" : "raise-hand");
  const toggleScreen = () => (screen.isSharing ? screen.stop() : screen.start());
  const toggleRecord = () => (recorder.state === "recording" ? recorder.stop() : recorder.start());

  const leave = () => {
    if (recorder.state === "recording" && !window.confirm("Leaving will stop your recording and upload it. Leave now?")) return;
    exit(); // unmounting this component leaves the room (see useMeetingSocket)
  };
  const endForAll = () => {
    if (window.confirm("End this meeting for everyone?")) end.mutate();
  };

  return (
    <div className="flex h-dvh flex-col bg-slate-950">
      <ConnectionBanner />

      <header className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-medium text-white">{meeting?.title}</h1>
          <p className="truncate text-xs text-slate-400">{meeting?.meetingCode}</p>
        </div>
        <div className="flex items-center gap-2">
          {recording && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-600/20 px-3 py-1 text-xs font-medium text-red-300" role="status">
              <MdFiberManualRecord size={12} className="animate-pulse text-red-500" />
              Recording
              {recorder.state === "recording" && <span className="tabular-nums">{formatClock(recorder.seconds)}</span>}
            </span>
          )}
          {recorder.state === "uploading" && (
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-200" role="status">Uploading {recorder.progress}%</span>
          )}
          <span className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
            <MdPeople size={14} /> {participantCount}
          </span>
        </div>
      </header>

      {participantCount > MESH_WARNING_THRESHOLD && (
        <div role="status" className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <MdWarningAmber size={16} className="mt-0.5 shrink-0" />
          This meeting has more than {MESH_WARNING_THRESHOLD} people. Every browser connects to every other one, so video may lag. Turning cameras off helps.
        </div>
      )}

      <div className="relative flex min-h-0 flex-1 gap-2 px-2 pb-2">
        <main className="min-w-0 flex-1">
          <VideoGrid localStream={stream} screenStream={screen.screenStream} />
        </main>
        <SidePanel />
      </div>

      <ControlsBar
        hasAudio={Boolean(stream?.getAudioTracks().length)}
        hasVideo={Boolean(stream?.getVideoTracks().length)}
        screen={screen}
        recorder={recorder}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleScreen={toggleScreen}
        onToggleHand={toggleHand}
        onToggleRecord={toggleRecord}
        onLeave={leave}
        onEnd={endForAll}
      />
      <MeetingInfoModal />
    </div>
  );
}
