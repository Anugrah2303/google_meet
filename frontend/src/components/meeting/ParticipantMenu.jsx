import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MdMoreVert, MdPushPin, MdMicOff, MdBackHand, MdPersonRemove, MdAdminPanelSettings, MdRemoveModerator } from "react-icons/md";
import { emitRoom } from "@/lib/socket";
import { getParticipantActions } from "@/lib/participantRules";
import { useMeetingStore } from "@/stores/meetingStore";

// Three-dots menu with the host / co-host actions for one participant.
// Rendered in a portal (outside the tile) so the tile's overflow-hidden cannot clip it.
export default function ParticipantMenu({ participant, className = "" }) {
  const me = useMeetingStore((s) => s.participants[s.meId]);
  const permissions = useMeetingStore((s) => s.permissions);
  const [position, setPosition] = useState(null); // null = closed
  const buttonRef = useRef(null);

  const actions = getParticipantActions(me, participant, permissions);
  const hasActions = Object.values(actions).some(Boolean);

  useEffect(() => {
    if (!position) return;
    const close = () => setPosition(null);
    const onKey = (e) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [position]);

  if (!hasActions) return null;

  const id = participant.participantId;
  const run = (fn) => () => {
    setPosition(null);
    fn();
  };

  const items = [
    actions.feature && { icon: MdPushPin, label: "Feature (pin) for everyone", onClick: () => emitRoom("feature-participant", { participantId: id }) },
    actions.unfeature && { icon: MdPushPin, label: "Remove feature", onClick: () => emitRoom("unfeature-participant", { participantId: id }) },
    actions.mute && { icon: MdMicOff, label: "Mute", onClick: () => emitRoom("mute-participant", { participantId: id }) },
    actions.lowerHand && { icon: MdBackHand, label: "Lower hand", onClick: () => emitRoom("lower-hand", { participantId: id }) },
    actions.promote && { icon: MdAdminPanelSettings, label: "Make co-host", onClick: () => emitRoom("promote-participant", { participantId: id }) },
    actions.demote && { icon: MdRemoveModerator, label: "Remove co-host", onClick: () => emitRoom("demote-participant", { participantId: id }) },
    actions.remove && {
      icon: MdPersonRemove,
      label: "Remove from meeting",
      danger: true,
      onClick: () => window.confirm(`Remove ${participant.displayName}? They will not be able to rejoin.`) && emitRoom("remove-participant", { participantId: id }),
    },
  ].filter(Boolean);

  const openMenu = (e) => {
    e.stopPropagation();
    const rect = buttonRef.current.getBoundingClientRect();
    setPosition({ top: rect.bottom + 4, right: Math.max(8, window.innerWidth - rect.right) });
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={openMenu}
        aria-label={`Actions for ${participant.displayName}`}
        aria-haspopup="menu"
        className={`rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${className}`}
      >
        <MdMoreVert size={18} />
      </button>
      {position &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setPosition(null)} />
            <ul role="menu" style={{ top: position.top, right: position.right }} className="fixed z-[61] w-60 rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-2xl">
              {items.map(({ icon: Icon, label, onClick, danger }) => (
                <li key={label} role="none">
                  <button
                    role="menuitem"
                    onClick={run(onClick)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-800 ${danger ? "text-red-400" : "text-slate-100"}`}
                  >
                    <Icon size={18} /> {label}
                  </button>
                </li>
              ))}
            </ul>
          </>,
          document.body
        )}
    </>
  );
}
