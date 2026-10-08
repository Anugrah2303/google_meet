import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MdSend, MdDelete } from "react-icons/md";
import Avatar from "@/components/ui/Avatar";
import { emitRoom } from "@/lib/socket";
import { formatTime } from "@/lib/formatters";
import { chatSchema } from "@/validations/chatSchemas";
import { useAuthStore } from "@/stores/authStore";
import { useMeetingStore } from "@/stores/meetingStore";

export default function ChatPanel() {
  const messages = useMeetingStore((s) => s.messages);
  const permissions = useMeetingStore((s) => s.permissions);
  const userId = useAuthStore((s) => s.user?._id);
  const canChat = permissions.includes("CAN_CHAT");
  const canModerate = permissions.includes("CAN_MANAGE_PARTICIPANTS");
  const bottomRef = useRef(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(chatSchema),
    defaultValues: { message: "" },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // The server saves the message and sends "new-message" back to everybody (including me)
  const onSubmit = ({ message }) => {
    emitRoom("send-message", { message });
    reset();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">No messages yet. Say hello!</p>
        )}
        {messages.map((m) => {
          if (m.type === "SYSTEM" || !m.sender) {
            return <p key={m.messageId} className="text-center text-xs text-slate-500">{m.message}</p>;
          }
          const mine = m.sender.userId === userId;
          return (
            <div key={m.messageId} className="group flex gap-2.5">
              <Avatar name={m.sender.name} src={m.sender.avatar} className="h-8 w-8 text-xs" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">
                  <span className="font-medium text-slate-200">{mine ? "You" : m.sender.name}</span> {formatTime(m.createdAt)}
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-slate-100">{m.message}</p>
              </div>
              {(mine || canModerate) && (
                <button
                  onClick={() => emitRoom("delete-message", { messageId: m.messageId })}
                  aria-label="Delete message"
                  title="Delete message"
                  className="self-start rounded-full p-1.5 text-slate-500 opacity-100 hover:bg-slate-800 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <MdDelete size={16} />
                </button>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-800 p-3">
        {!canChat && <p className="mb-2 rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300">The host turned chat off for this meeting.</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="flex items-center gap-2" noValidate>
          <input
            {...register("message")}
            disabled={!canChat}
            autoComplete="off"
            placeholder={canChat ? "Send a message" : "Chat is turned off"}
            aria-label="Message"
            className="min-w-0 flex-1 rounded-full border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
          <button type="submit" disabled={!canChat} aria-label="Send" className="rounded-full bg-blue-600 p-2.5 text-white hover:bg-blue-500 disabled:opacity-50">
            <MdSend size={18} />
          </button>
        </form>
        {errors.message && <p className="mt-1 px-2 text-xs text-red-400">{errors.message.message}</p>}
      </div>
    </div>
  );
}
