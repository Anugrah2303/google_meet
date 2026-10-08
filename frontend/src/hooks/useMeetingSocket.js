import { useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getRecordings } from "@/api/recordings";
import { socket, emitRoom } from "@/lib/socket";
import { useAuthStore } from "@/stores/authStore";
import { useMeetingStore } from "@/stores/meetingStore";
import { useUiStore } from "@/stores/uiStore";

const AUTH_ERRORS = ["Authentication token missing", "User not found", "Invalid token", "Token expired"];

const meStore = () => {
  const s = useMeetingStore.getState();
  return s.participants[s.meId];
};

/*
  Connects the socket, joins the room and keeps meetingStore in sync with every server event.
  (WebRTC signaling events are handled in useWebRTC, screen-share errors in useScreenShare.)
  Mounted only while the user is inside the room.
*/
export function useMeetingSocket({ meetingId, session, localStreamRef, onExit }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Refs so the long-lived listeners below always see the newest values
  const sessionRef = useRef(session);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    sessionRef.current = session;
    onExitRef.current = onExit;
  });
  const teardownTimer = useRef(null);

  // Make the real camera/mic tracks match what the server says (mute by host, rejected toggle, ...)
  const syncLocalTracks = useCallback(
    (participant) => {
      const stream = localStreamRef.current;
      if (!stream || !participant) return;
      stream.getAudioTracks().forEach((t) => (t.enabled = !participant.isMuted));
      stream.getVideoTracks().forEach((t) => (t.enabled = !participant.isCameraOff));
    },
    [localStreamRef]
  );

  // Used for the first join AND after every reconnect
  const joinRoom = useCallback(() => {
    const me = meStore();
    const initial = sessionRef.current;
    socket.emit("join-meeting", {
      meetingId,
      displayName: me?.displayName || initial.displayName,
      isMuted: me ? me.isMuted : initial.isMuted,
      isCameraOff: me ? me.isCameraOff : initial.isCameraOff,
    });
  }, [meetingId]);

  // ---------- 1. listeners (registered BEFORE we connect) ----------
  useEffect(() => {
    const store = () => useMeetingStore.getState();
    const exit = () => onExitRef.current?.();
    const invalidate = (key) => queryClient.invalidateQueries({ queryKey: [key, meetingId] });

    const handlers = {
      connect: () => {
        store().setConnection("connected");
        joinRoom();
      },

      disconnect: (reason) => {
        if (reason === "io client disconnect") return; // we closed it ourselves
        store().setConnection("reconnecting");
        if (reason === "io server disconnect") socket.connect(); // the server will not retry for us
      },

      connect_error: (error) => {
        if (AUTH_ERRORS.includes(error.message)) {
          toast.error(`${error.message}. Please log in again.`);
          useAuthStore.getState().logout();
          navigate("/login", { replace: true });
          return;
        }
        store().setConnection("reconnecting");
      },

      "join-meeting-success": (data) => {
        store().setJoined(data);
        syncLocalTracks(data.participant);
        emitRoom("message-history", { limit: 100 });

        // If a recording is already running, show the badge for the newcomer too
        getRecordings(meetingId)
          .then((list) => {
            const active = list.find((r) => r.status === "RECORDING");
            if (active) {
              store().setRecording({
                recordingId: active._id,
                startedBy: { participantId: null, name: active.recordedBy?.name || "Someone" },
                startedAt: active.startedAt,
              });
            }
          })
          .catch(() => {});
      },

      "join-meeting-error": ({ message }) => {
        toast.error(message || "Could not join the meeting");
        exit();
      },

      "socket-error": ({ event, message }) => {
        toast.error(message || "Something went wrong");
        // Server said no to a mic/camera toggle: put the real tracks back to the confirmed state
        if (event === "toggle-mic" || event === "toggle-camera") syncLocalTracks(meStore());
      },

      // ----- people -----
      "participants-list": ({ participants }) => store().addParticipants(participants),

      "participant-joined": ({ participant }) => {
        store().addParticipant(participant);
        toast(`${participant.displayName} joined`, { duration: 2500 });
      },

      "participant-left": ({ participantId, displayName }) => {
        if (participantId === store().meId) return;
        store().removeParticipant(participantId);
        toast(`${displayName} left`, { duration: 2500 });
      },

      "participant-updated": ({ participant }) => {
        // This event carries no avatar URL, so do not overwrite the one we have
        const { avatar, ...rest } = participant;
        store().updateParticipant(participant.participantId, avatar ? participant : rest);
      },

      "participant-removed": ({ participantId }) => {
        if (participantId === store().meId) {
          toast.error("You were removed from the meeting");
          exit();
        } else {
          store().removeParticipant(participantId);
        }
      },

      // ----- mic / camera / screen / hand / featured -----
      "participant-mic-changed": ({ participantId, isMuted, mutedBy }) => {
        store().updateParticipant(participantId, { isMuted });
        if (participantId === store().meId) {
          localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
          if (mutedBy && mutedBy !== store().meId) toast.info("The host muted you");
        }
      },

      "participant-camera-changed": ({ participantId, isCameraOff }) => {
        store().updateParticipant(participantId, { isCameraOff });
        if (participantId === store().meId) {
          localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !isCameraOff));
        }
      },

      "screen-share-started": ({ participantId }) => store().updateParticipant(participantId, { isScreenSharing: true }),
      "screen-share-stopped": ({ participantId }) => store().updateParticipant(participantId, { isScreenSharing: false }),

      "hand-raised": ({ participantId, displayName }) => {
        store().updateParticipant(participantId, { isHandRaised: true });
        if (participantId !== store().meId) toast(`${displayName} raised a hand`, { duration: 2500 });
      },
      "hand-lowered": ({ participantId }) => store().updateParticipant(participantId, { isHandRaised: false }),

      "participant-featured": ({ participantId, previousParticipantIds = [] }) => {
        previousParticipantIds.forEach((id) => store().updateParticipant(id, { isFeatured: false }));
        store().updateParticipant(participantId, { isFeatured: true });
      },
      "participant-unfeatured": ({ participantId }) => store().updateParticipant(participantId, { isFeatured: false }),

      // ----- roles and permissions -----
      "participant-role-changed": ({ participantId, role, permissions }) => {
        const before = store().participants[participantId]?.role;
        store().updateParticipant(participantId, { role });
        if (participantId === store().meId) {
          store().setPermissions(permissions);
          if (before !== role) toast.info(role === "CO_HOST" ? "You are now a co-host" : "You are no longer a co-host");
        }
      },

      "permissions-updated": ({ settings, permissions }) => {
        store().setMeetingSettings(settings);
        store().setPermissions(permissions);
      },

      // ----- chat -----
      "new-message": (message) => {
        store().addMessage(message);
        const ui = useUiStore.getState();
        const mine = message.sender?.userId === useAuthStore.getState().user?._id;
        if (ui.activePanel !== "chat" && !mine && message.type !== "SYSTEM") ui.incrementUnread();
      },
      "message-history": ({ messages }) => store().setMessages(messages),
      "message-deleted": ({ messageId }) => store().removeMessage(messageId),

      // ----- files and recordings (lists are React Query data, so we just refetch) -----
      "file-shared": ({ file, uploadedByName }) => {
        invalidate("files");
        if (file.uploadedBy !== meStore()?.userId) toast(`${uploadedByName} shared ${file.originalName}`);
      },
      "file-deleted": () => invalidate("files"),

      "recording-started": ({ recordingId, startedBy, startedAt }) => {
        store().setRecording({ recordingId, startedBy, startedAt });
        invalidate("recordings");
        if (startedBy?.participantId !== store().meId) toast(`${startedBy?.name || "Someone"} started recording`);
      },
      "recording-stopped": () => store().setRecording(null),
      "recording-processing": () => invalidate("recordings"),
      "recording-completed": () => {
        const wasMine = store().recording?.startedBy?.participantId === store().meId;
        store().setRecording(null);
        invalidate("recordings");
        if (!wasMine) toast.success("The recording is ready");
      },

      // ----- meeting lifecycle -----
      "meeting-ended": () => {
        toast.info("This meeting has ended");
        exit();
      },
      "meeting-left": ({ reason }) => {
        if (reason === "left") return; // we asked for it, we are already leaving
        toast.info(reason === "joined-from-another-device" ? "You joined from another tab or device" : "You left the meeting");
        exit();
      },
    };

    for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);

    // Closing the tab: tell the server right away instead of waiting for the timeout
    const onPageHide = () => {
      if (socket.connected) socket.emit("leave-meeting", { meetingId });
      socket.disconnect();
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [meetingId, joinRoom, syncLocalTracks, localStreamRef, navigate, queryClient]);

  // ---------- 2. connect + leave ----------
  // StrictMode (dev) runs "mount, cleanup, mount". Disconnecting for real in that fake cleanup would
  // leave a ghost participant on the server (join and disconnect race). So the real teardown is
  // delayed a moment, and the second "mount" cancels it.
  useEffect(() => {
    if (teardownTimer.current) {
      clearTimeout(teardownTimer.current);
      teardownTimer.current = null;
    } else {
      useMeetingStore.getState().reset();
      useUiStore.getState().resetUi();
      if (socket.connected) joinRoom();
      else socket.connect(); // the "connect" listener sends join-meeting
    }

    return () => {
      teardownTimer.current = setTimeout(() => {
        teardownTimer.current = null;
        if (socket.connected) socket.emit("leave-meeting", { meetingId });
        socket.disconnect();
        useMeetingStore.getState().reset();
        useUiStore.getState().resetUi();
      }, 100);
    };
  }, [meetingId, joinRoom]);
}
