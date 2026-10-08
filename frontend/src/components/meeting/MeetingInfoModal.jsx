import { MdContentCopy } from "react-icons/md";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { useMeetingStore } from "@/stores/meetingStore";
import { useUiStore } from "@/stores/uiStore";

export default function MeetingInfoModal() {
  const open = useUiStore((s) => s.infoOpen);
  const setInfoOpen = useUiStore((s) => s.setInfoOpen);
  const meeting = useMeetingStore((s) => s.meeting);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(meeting.meetingCode);
      toast.success("Meeting code copied");
    } catch {
      toast.error("Could not copy. Select the code and copy it by hand.");
    }
  };

  return (
    <Modal open={open && Boolean(meeting)} onClose={() => setInfoOpen(false)} title="Meeting details">
      {meeting && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-slate-400">Title</p>
            <p className="text-white">{meeting.title}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Meeting code</p>
            <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-800 px-4 py-3">
              <span className="select-all font-mono text-lg text-white">{meeting.meetingCode}</span>
              <Button size="sm" variant="secondary" onClick={copy}><MdContentCopy size={16} /> Copy</Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Share this code. People enter it on the Meetly home page.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
