import { useQuery } from "@tanstack/react-query";
import { getMeetingHistory } from "@/api/meetings";
import Spinner from "@/components/ui/Spinner";
import { getErrorMessage } from "@/lib/errors";
import { formatDateTime, formatDuration } from "@/lib/formatters";

export default function MeetingHistoryList() {
  const { data: history = [], isLoading, isError, error, refetch } = useQuery({ queryKey: ["history"], queryFn: getMeetingHistory });

  return (
    <section>
      <h2 className="mb-3 font-medium text-white">Meeting history</h2>
      {isLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
      {isError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {getErrorMessage(error)} <button onClick={() => refetch()} className="ml-2 underline">Try again</button>
        </div>
      )}
      {!isLoading && !isError && history.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
          Meetings you join will show up here.
        </p>
      )}
      <ul className="space-y-2">
        {history.map((item) => (
          <li key={`${item.meetingId}-${item.joinedAt}`} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-medium text-white">{item.title}</p>
              <span className="shrink-0 text-xs text-slate-400">{item.status}</span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {item.meetingCode} - hosted by {item.host?.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Joined {formatDateTime(item.joinedAt)} - you stayed {item.durationSeconds === null ? "(still inside)" : formatDuration(item.durationSeconds)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
