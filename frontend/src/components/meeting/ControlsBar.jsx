import clsx from "clsx";
import {
  MdMic, MdMicOff, MdVideocam, MdVideocamOff, MdScreenShare, MdStopScreenShare, MdBackHand,
  MdFiberManualRecord, MdStop, MdPeople, MdChat, MdAttachFile, MdInfoOutline, MdCallEnd,
  MdSettings, MdVideoLibrary,
} from "react-icons/md";
import Spinner from "@/components/ui/Spinner";
import { useMeetingStore } from "@/stores/meetingStore";
import { useUiStore } from "@/stores/uiStore";

function RoundButton({ onClick, title, disabled, active = false, danger = false, badge, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={clsx(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40",
        danger ? "bg-red-600 hover:bg-red-500" : active ? "bg-blue-600 hover:bg-blue-500" : "bg-slate-700 hover:bg-slate-600"
      )}
    >
      {children}
      {badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold">{badge}</span>
      )}
    </button>
  );
}

export default function ControlsBar({ hasAudio, hasVideo, screen, recorder, onToggleMic, onToggleCamera, onToggleScreen, onToggleHand, onToggleRecord, onLeave, onEnd }) {
  const me = useMeetingStore((s) => s.participants[s.meId]);
  const permissions = useMeetingStore((s) => s.permissions);
  const participants = useMeetingStore((s) => s.participants);
  const activeRecording = useMeetingStore((s) => s.recording);
  const { activePanel, unreadChat, togglePanel, setInfoOpen } = useUiStore();

  if (!me) return null;

  const can = (permission) => permissions.includes(permission);
  const someoneElsePresenting = Object.values(participants).some((p) => p.isScreenSharing && p.participantId !== me.participantId);
  const sharing = me.isScreenSharing || screen.isSharing;

  const micBlocked = me.isMuted && !can("CAN_UNMUTE");
  const camBlocked = me.isCameraOff && !can("CAN_ENABLE_CAMERA");
  const screenBlocked = !sharing && (!(can("CAN_SCREEN_SHARE") || can("CAN_SHARE_SCREEN")) || someoneElsePresenting || !hasVideo);
  const recordingState = recorder.state;
  const someoneElseRecording = Boolean(activeRecording) && recordingState === "idle";
  const recordBlocked = recordingState === "idle" && (!can("CAN_RECORD") || someoneElseRecording);

  const screenTitle = sharing
    ? "Stop presenting"
    : !hasVideo
      ? "Sharing needs a camera to be available"
      : !(can("CAN_SCREEN_SHARE") || can("CAN_SHARE_SCREEN"))
        ? "Screen sharing is turned off"
        : someoneElsePresenting
          ? "Someone else is presenting"
          : "Present your screen";

  const recordTitle =
    recordingState === "recording" ? "Stop recording"
    : recordingState === "uploading" ? "Uploading recording..."
    : !can("CAN_RECORD") ? "You are not allowed to record"
    : someoneElseRecording ? "Someone is already recording"
    : "Record meeting";

  return (
    <footer className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-800 bg-slate-950 px-3 py-3">
      <RoundButton onClick={onToggleMic} disabled={!hasAudio || micBlocked} active={false} danger={me.isMuted} title={!hasAudio ? "No microphone found" : micBlocked ? "The host turned unmuting off" : me.isMuted ? "Unmute" : "Mute"}>
        {me.isMuted ? <MdMicOff size={22} /> : <MdMic size={22} />}
      </RoundButton>

      <RoundButton onClick={onToggleCamera} disabled={!hasVideo || camBlocked} danger={me.isCameraOff} title={!hasVideo ? "No camera found" : camBlocked ? "The host turned cameras off" : me.isCameraOff ? "Turn camera on" : "Turn camera off"}>
        {me.isCameraOff ? <MdVideocamOff size={22} /> : <MdVideocam size={22} />}
      </RoundButton>

      <RoundButton onClick={onToggleScreen} disabled={screenBlocked} active={sharing} title={screenTitle}>
        {sharing ? <MdStopScreenShare size={22} /> : <MdScreenShare size={22} />}
      </RoundButton>

      <RoundButton onClick={onToggleHand} active={me.isHandRaised} title={me.isHandRaised ? "Lower hand" : "Raise hand"}>
        <MdBackHand size={20} />
      </RoundButton>

      <RoundButton onClick={onToggleRecord} disabled={recordBlocked || recordingState === "starting" || recordingState === "uploading"} danger={recordingState === "recording"} title={recordTitle}>
        {recordingState === "starting" || recordingState === "uploading" ? <Spinner className="h-5 w-5" /> : recordingState === "recording" ? <MdStop size={24} /> : <MdFiberManualRecord size={22} className="text-red-400" />}
      </RoundButton>

      <span className="mx-1 hidden h-8 w-px bg-slate-700 sm:block" />

      <RoundButton onClick={() => togglePanel("participants")} active={activePanel === "participants"} title="People">
        <MdPeople size={22} />
      </RoundButton>
      <RoundButton onClick={() => togglePanel("chat")} active={activePanel === "chat"} badge={unreadChat} title="Chat">
        <MdChat size={21} />
      </RoundButton>
      <RoundButton onClick={() => togglePanel("files")} active={activePanel === "files"} title="Files">
        <MdAttachFile size={21} />
      </RoundButton>
      <RoundButton onClick={() => togglePanel("recordings")} active={activePanel === "recordings"} title="Recordings">
        <MdVideoLibrary size={21} />
      </RoundButton>
      {can("CAN_MANAGE_PARTICIPANTS") && (
        <RoundButton onClick={() => togglePanel("settings")} active={activePanel === "settings"} title="Host controls">
          <MdSettings size={21} />
        </RoundButton>
      )}
      <RoundButton onClick={() => setInfoOpen(true)} title="Meeting details">
        <MdInfoOutline size={22} />
      </RoundButton>

      <span className="mx-1 hidden h-8 w-px bg-slate-700 sm:block" />

      <button onClick={onLeave} title="Leave meeting" aria-label="Leave meeting" className="flex h-11 items-center gap-2 rounded-full bg-red-600 px-5 text-white hover:bg-red-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        <MdCallEnd size={22} />
        <span className="hidden text-sm font-medium sm:inline">Leave</span>
      </button>
      {me.role === "HOST" && (
        <button onClick={onEnd} className="h-11 rounded-full border border-red-500/60 px-4 text-sm font-medium text-red-300 hover:bg-red-500/10">
          End for all
        </button>
      )}
    </footer>
  );
}
