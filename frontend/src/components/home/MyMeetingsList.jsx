import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { MdDelete } from "react-icons/md";
import clsx from "clsx";
import { deleteMeeting, getMyMeetings } from "@/api/meetings";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime } from "@/lib/formatters";
import { useAuthStore } from "@/stores/authStore";

const STATUS_STYLES = {
  LIVE: "bg-emerald-500/15 text-emerald-300",
  SCHEDULED: "bg-amber-500/15 text-amber-300",
  ENDED: "bg-slate-700 text-slate-300",
};

export default function MyMeetingsList() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: meetings = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ["meetings"], queryFn: getMyMeetings });

  const remove = useMutation({
    mutationFn: deleteMeeting,
    onSuccess: () => {
      toast.success("Meeting deleted");
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleDelete = (meeting) => {
    if (window.confirm(`Delete "${meeting.title}" with all its chat, files and recordings?`)) remove.mutate(meeting.id);
  };

  return (
    <section>
      <h2 className="mb-3 font-medium text-white">My meetings</h2>
      {isLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {getErrorMessage(error)} <button onClick={() => refetch()} className="ml-2 underline">Try again</button>
        </div>
      )}
      {!isLoading && !isError && meetings.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
          No meetings yet. Create one above to get started.
        </p>
      )}
      <ul className="space-y-2">
        {meetings.map((meeting) => {
          const isHost = meeting.host?.id === user?._id;
          const canJoin = meeting.status !== "ENDED";
          return (
            <li key={meeting.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{meeting.title}</p>
                <p className="truncate text-xs text-slate-400">
                  {meeting.meetingCode} - {meeting.status === "SCHEDULED" && meeting.scheduledAt ? formatDateTime(meeting.scheduledAt) : formatDateTime(meeting.createdAt)}
                </p>
              </div>
              <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLES[meeting.status])}>{meeting.status}</span>
              {canJoin && (
                <Button size="sm" onClick={() => navigate(`/meeting/${meeting.id}`, { state: { title: meeting.title, code: meeting.meetingCode } })}>
                  {isHost && meeting.status === "SCHEDULED" ? "Start" : "Join"}
                </Button>
              )}
              {isHost && (
                <button onClick={() => handleDelete(meeting)} aria-label={`Delete ${meeting.title}`} title="Delete meeting" className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400">
                  <MdDelete size={18} />
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
