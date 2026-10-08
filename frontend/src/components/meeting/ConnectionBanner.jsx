import Spinner from "@/components/ui/Spinner";
import { useMeetingStore } from "@/stores/meetingStore";

export default function ConnectionBanner() {
  const connection = useMeetingStore((s) => s.connection);
  if (connection === "connected") return null;
  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-sm font-medium text-black">
      <Spinner className="h-4 w-4" /> Connection lost. Reconnecting...
    </div>
  );
}
