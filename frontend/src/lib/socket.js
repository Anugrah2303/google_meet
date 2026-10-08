import { io } from "socket.io-client";
import { useAuthStore } from "@/stores/authStore";
import { useMeetingStore } from "@/stores/meetingStore";

// ONE socket for the whole app. It only connects while the user is inside a meeting room.
// `auth` is a function so the newest token is read on every (re)connect.
export const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5000", {
  autoConnect: false,
  withCredentials: true,
  auth: (cb) => cb({ token: useAuthStore.getState().token }),
});

// Emit an event to the current meeting. Almost every event needs { meetingId }, so we add it here.
export function emitRoom(event, payload = {}) {
  const meetingId = useMeetingStore.getState().meeting?.id;
  socket.emit(event, { meetingId, ...payload });
}
