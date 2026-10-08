import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import clsx from "clsx";
import { MdDelete, MdDownload, MdPlayArrow } from "react-icons/md";
import { deleteRecording, getRecordings } from "@/api/recordings";
import Spinner from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/errors";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/formatters";
import { useAuthStore } from "@/stores/authStore";
import { useMeetingStore } from "@/stores/meetingStore";

const STATUS_STYLES = {
  RECORDING: "bg-red-500/20 text-red-300",
  PROCESSING: "bg-amber-500/20 text-amber-300",
  COMPLETED: "bg-emerald-500/20 text-emerald-300",
  FAILED: "bg-slate-700 text-slate-300",
};

export default function RecordingsPanel() {
  const meetingId = useMeetingStore((s) => s.meeting?.id);
  const myRole = useMeetingStore((s) => s.participants[s.meId]?.role);
  const userId = useAuthStore((s) => s.user?._id);
  const queryClient = useQueryClient();
  const queryKey = ["recordings", meetingId];

  const { data: recordings = [], isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => getRecordings(meetingId),
    enabled: Boolean(meetingId),
  });

  const remove = useMutation({
    mutationFn: deleteRecording,
    onSuccess: () => {
      toast.success("Recording deleted");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="h-full overflow-y-auto">
      {isLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
      {isError && (
        <p className="p-4 text-sm text-red-300">{getErrorMessage(error)} <button onClick={() => refetch()} className="underline">Try again</button></p>
      )}
      {!isLoading && !isError && recordings.length === 0 && (
        <p className="px-6 py-10 text-center text-sm text-slate-500">No recordings yet. Use the record button in the bottom bar to start one.</p>
      )}
      <ul className="divide-y divide-slate-800">
        {recordings.map((rec) => {
          const ownerId = rec.recordedBy?._id || rec.recordedBy;
          const canDelete = ownerId === userId || myRole === "HOST";
          return (
            <li key={rec._id} className="space-y-1 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm text-white">{formatDateTime(rec.startedAt || rec.createdAt)}</p>
                <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[rec.status])}>{rec.status}</span>
              </div>
              <p className="text-xs text-slate-400">
                By {rec.recordedBy?.name || "someone"} - {formatDuration(rec.duration)} {rec.size ? `- ${formatBytes(rec.size)}` : ""}
              </p>
              <div className="flex items-center gap-1 pt-1">
                {rec.status === "COMPLETED" && rec.url && (
                  <>
                    <a href={rec.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700">
                      <MdPlayArrow size={16} /> Play
                    </a>
                    <a href={rec.url} download target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-xs text-white hover:bg-slate-700">
                      <MdDownload size={16} /> Download
                    </a>
                  </>
                )}
                {canDelete && rec.status !== "RECORDING" && (
                  <button
                    onClick={() => window.confirm("Delete this recording?") && remove.mutate(rec._id)}
                    aria-label="Delete recording"
                    className="ml-auto rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                  >
                    <MdDelete size={18} />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
