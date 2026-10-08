import { useMemo } from "react";
import { MdMicOff, MdMic, MdBackHand, MdPushPin, MdScreenShare } from "react-icons/md";
import Avatar from "@/components/ui/Avatar";
import ParticipantMenu from "./ParticipantMenu";
import { ROLE_LABELS } from "@/lib/constants";
import { useMeetingStore } from "@/stores/meetingStore";

const ROLE_ORDER = { HOST: 0, CO_HOST: 1, PARTICIPANT: 2 };

export default function ParticipantsPanel() {
  const participants = useMeetingStore((s) => s.participants);
  const meId = useMeetingStore((s) => s.meId);

  const list = useMemo(
    () =>
      Object.values(participants).sort(
        (a, b) =>
          ROLE_ORDER[a.role] - ROLE_ORDER[b.role] ||
          Number(b.isHandRaised) - Number(a.isHandRaised) ||
          a.displayName.localeCompare(b.displayName)
      ),
    [participants]
  );

  return (
    <ul className="divide-y divide-slate-800">
      {list.map((p) => (
        <li key={p.participantId} className="flex items-center gap-3 px-4 py-3">
          <Avatar name={p.displayName} src={p.avatar} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-white">
              {p.displayName} {p.participantId === meId && <span className="text-slate-400">(You)</span>}
            </p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[p.role]}</p>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            {p.isScreenSharing && <MdScreenShare size={16} className="text-blue-400" title="Presenting" />}
            {p.isFeatured && <MdPushPin size={16} title="Featured" />}
            {p.isHandRaised && <MdBackHand size={16} className="text-amber-400" title="Hand raised" />}
            {p.isMuted ? <MdMicOff size={16} className="text-red-400" title="Muted" /> : <MdMic size={16} title="Mic on" />}
          </div>
          <ParticipantMenu participant={p} className="!bg-slate-800 hover:!bg-slate-700" />
        </li>
      ))}
    </ul>
  );
}
