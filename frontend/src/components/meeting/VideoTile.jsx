import { useEffect, useRef } from "react";
import clsx from "clsx";
import { MdMicOff, MdBackHand, MdPushPin, MdScreenShare } from "react-icons/md";
import Avatar from "@/components/ui/Avatar";
import ParticipantMenu from "./ParticipantMenu";
import { ROLE_LABELS } from "@/lib/constants";

export default function VideoTile({ participant, stream, isLocal, peerState, className }) {
  const videoRef = useRef(null);

  // srcObject can only be set from JavaScript, not as a JSX attribute
  useEffect(() => {
    const el = videoRef.current;
    if (el && el.srcObject !== (stream || null)) el.srcObject = stream || null;
  }, [stream]);

  const presenting = participant.isScreenSharing;
  const hasVideoTrack = Boolean(stream?.getVideoTracks().length);
  // While presenting, the video we send is the screen, so the "camera off" flag does not apply
  const showVideo = hasVideoTrack && (!participant.isCameraOff || presenting);
  const connecting = !isLocal && !stream;
  const unstable = !isLocal && (peerState === "disconnected" || peerState === "failed");
  const name = isLocal ? `${participant.displayName} (You)` : participant.displayName;

  return (
    <div className={clsx("group relative h-full w-full overflow-hidden rounded-2xl bg-slate-800", participant.isHandRaised && "ring-2 ring-amber-400", className)}>
      {/* Always mounted, even with the camera off, because it also plays the participant's audio */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal} // never play my own microphone back to me
        className={clsx(
          "h-full w-full",
          presenting ? "object-contain bg-black" : "object-cover",
          isLocal && !presenting && "-scale-x-100", // mirror my camera like a mirror
          !showVideo && "invisible"
        )}
      />

      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Avatar name={participant.displayName} src={participant.avatar} className="h-20 w-20 max-h-[40%] text-2xl sm:h-24 sm:w-24" />
        </div>
      )}

      {(connecting || unstable) && (
        <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-medium text-black">
          {unstable ? "Reconnecting..." : "Connecting..."}
        </span>
      )}

      <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1.5">
        {presenting && (
          <span className="flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-xs font-medium text-white">
            <MdScreenShare size={14} /> {isLocal ? "You are presenting" : `${participant.displayName} is presenting`}
          </span>
        )}
        {participant.isFeatured && (
          <span className="rounded-full bg-black/60 p-1.5 text-white" title="Featured">
            <MdPushPin size={14} />
          </span>
        )}
        {participant.isHandRaised && (
          <span className="rounded-full bg-amber-400 p-1.5 text-black" title="Hand raised">
            <MdBackHand size={14} />
          </span>
        )}
      </div>

      <ParticipantMenu participant={participant} className="absolute right-2 top-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100" />

      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
        <span className="flex max-w-full items-center gap-1.5 truncate rounded-lg bg-black/60 px-2 py-1 text-xs text-white sm:text-sm">
          {participant.isMuted && <MdMicOff size={14} className="shrink-0 text-red-400" />}
          <span className="truncate">{name}</span>
          {participant.role !== "PARTICIPANT" && (
            <span className="shrink-0 rounded bg-white/20 px-1.5 text-[10px] font-medium">{ROLE_LABELS[participant.role]}</span>
          )}
        </span>
      </div>
    </div>
  );
}
