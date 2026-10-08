import { MdClose } from "react-icons/md";
import ParticipantsPanel from "./ParticipantsPanel";
import ChatPanel from "./ChatPanel";
import FilesPanel from "./FilesPanel";
import RecordingsPanel from "./RecordingsPanel";
import HostSettingsPanel from "./HostSettingsPanel";
import { useMeetingStore } from "@/stores/meetingStore";
import { useUiStore } from "@/stores/uiStore";

const TITLES = {
  participants: "People",
  chat: "Chat",
  files: "Files",
  recordings: "Recordings",
  settings: "Host controls",
};

// Full-screen on phones, a 22rem column on larger screens
export default function SidePanel() {
  const activePanel = useUiStore((s) => s.activePanel);
  const closePanel = useUiStore((s) => s.closePanel);
  const count = useMeetingStore((s) => Object.keys(s.participants).length);
  if (!activePanel) return null;

  return (
    <aside className="absolute inset-0 z-20 flex flex-col bg-slate-950 md:static md:inset-auto md:w-[22rem] md:shrink-0 md:rounded-2xl md:border md:border-slate-800 md:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="font-medium text-white">
          {TITLES[activePanel]} {activePanel === "participants" && <span className="text-slate-400">({count})</span>}
        </h2>
        <button onClick={closePanel} aria-label="Close panel" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
          <MdClose size={20} />
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {activePanel === "participants" && <div className="h-full overflow-y-auto"><ParticipantsPanel /></div>}
        {activePanel === "chat" && <ChatPanel />}
        {activePanel === "files" && <FilesPanel />}
        {activePanel === "recordings" && <RecordingsPanel />}
        {activePanel === "settings" && <HostSettingsPanel />}
      </div>
    </aside>
  );
}
