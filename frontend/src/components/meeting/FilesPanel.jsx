import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MdUploadFile, MdDownload, MdDelete, MdInsertDriveFile } from "react-icons/md";
import { deleteFile, getFiles, uploadFile } from "@/api/files";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import { ALLOWED_FILE_TYPES, FILE_ACCEPT, MAX_FILE_SIZE } from "@/lib/constants";
import { getErrorMessage } from "@/lib/errors";
import { formatBytes, formatTime } from "@/lib/formatters";
import { useAuthStore } from "@/stores/authStore";
import { useMeetingStore } from "@/stores/meetingStore";

export default function FilesPanel() {
  const meetingId = useMeetingStore((s) => s.meeting?.id);
  const permissions = useMeetingStore((s) => s.permissions);
  const userId = useAuthStore((s) => s.user?._id);
  const queryClient = useQueryClient();
  const inputRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const canSend = permissions.includes("CAN_SEND_FILE");
  const canModerate = permissions.includes("CAN_MANAGE_PARTICIPANTS");
  const queryKey = ["files", meetingId];

  const { data: files = [], isLoading, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: () => getFiles(meetingId),
    enabled: Boolean(meetingId),
  });

  const upload = useMutation({
    mutationFn: (file) => uploadFile(meetingId, file, setProgress),
    onSuccess: () => {
      toast.success("File shared");
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(getErrorMessage(e, "Upload failed")),
    onSettled: () => setProgress(0),
  });

  const remove = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const handleChoose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) return toast.error("The file is larger than 25 MB");
    if (!ALLOWED_FILE_TYPES.includes(file.type)) return toast.error("This file type is not allowed. Use PDF, Office files, images, txt, csv or zip.");
    upload.mutate(file);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-800 p-4">
        <input ref={inputRef} type="file" accept={FILE_ACCEPT} onChange={handleChoose} className="hidden" />
        <Button
          variant="secondary"
          className="w-full"
          disabled={!canSend}
          loading={upload.isPending}
          title={canSend ? "" : "File sharing is turned off"}
          onClick={() => inputRef.current?.click()}
        >
          <MdUploadFile size={18} /> {upload.isPending ? `Uploading ${progress}%` : "Share a file"}
        </Button>
        {upload.isPending && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        <p className="mt-2 text-xs text-slate-500">
          {canSend ? "Up to 25 MB. PDF, Office files, images, txt, csv, zip." : "The host turned file sharing off."}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading && <div className="flex justify-center py-8 text-slate-400"><Spinner /></div>}
        {isError && (
          <p className="p-4 text-sm text-red-300">{getErrorMessage(error)} <button onClick={() => refetch()} className="underline">Try again</button></p>
        )}
        {!isLoading && !isError && files.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No files shared yet.</p>}
        <ul className="divide-y divide-slate-800">
          {files.map((file) => {
            const ownerId = file.uploadedBy?._id || file.uploadedBy;
            const canDelete = ownerId === userId || canModerate;
            return (
              <li key={file._id} className="flex items-center gap-3 px-4 py-3">
                <MdInsertDriveFile size={24} className="shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white" title={file.originalName}>{file.originalName}</p>
                  <p className="truncate text-xs text-slate-400">
                    {formatBytes(file.size)} - {file.uploadedBy?.name || "Someone"} - {formatTime(file.createdAt)}
                  </p>
                </div>
                <a href={file.url} target="_blank" rel="noreferrer" download={file.originalName} aria-label={`Download ${file.originalName}`} className="rounded-full p-2 text-slate-300 hover:bg-slate-800">
                  <MdDownload size={18} />
                </a>
                {canDelete && (
                  <button
                    onClick={() => window.confirm(`Delete ${file.originalName}?`) && remove.mutate(file._id)}
                    aria-label={`Delete ${file.originalName}`}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                  >
                    <MdDelete size={18} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
