import { create } from "zustand";

/*
  Live meeting state, filled by Socket.IO events (see hooks/useMeetingSocket.js).
  Files and recordings LISTS are not here: they are REST data and live in React Query.

  participants and remoteStreams are objects keyed by participantId.
  "Who is featured / presenting / has a raised hand" is derived from the participants
  (isFeatured, isScreenSharing, isHandRaised), so there is only one source of truth.
*/
const initialState = () => ({
  meeting: null,
  meId: null, // my participantId
  permissions: [],
  iceServers: [],
  participants: {},
  remoteStreams: {},
  peerStates: {}, // participantId -> RTCPeerConnection.connectionState
  messages: [],
  recording: null, // { recordingId, startedBy: { participantId, name }, startedAt }
  connection: "connected", // "connected" | "reconnecting"
  joined: false,
});

const omit = (object, key) => {
  const copy = { ...object };
  delete copy[key];
  return copy;
};

export const useMeetingStore = create((set) => ({
  ...initialState(),

  // Called on every join-meeting-success (also after a reconnect), so it starts from a clean slate
  setJoined: ({ meeting, participant, permissions, iceServers }) =>
    set({
      meeting,
      meId: participant.participantId,
      permissions,
      iceServers,
      participants: { [participant.participantId]: participant },
      remoteStreams: {},
      peerStates: {},
      joined: true,
    }),

  addParticipant: (participant) =>
    set((s) => ({
      participants: {
        ...s.participants,
        [participant.participantId]: { ...s.participants[participant.participantId], ...participant },
      },
    })),

  addParticipants: (list) =>
    set((s) => {
      const participants = { ...s.participants };
      for (const p of list) participants[p.participantId] = { ...participants[p.participantId], ...p };
      return { participants };
    }),

  updateParticipant: (id, patch) =>
    set((s) =>
      s.participants[id] ? { participants: { ...s.participants, [id]: { ...s.participants[id], ...patch } } } : s
    ),

  removeParticipant: (id) =>
    set((s) => ({
      participants: omit(s.participants, id),
      remoteStreams: omit(s.remoteStreams, id),
      peerStates: omit(s.peerStates, id),
    })),

  setRemoteStream: (id, stream) => set((s) => ({ remoteStreams: { ...s.remoteStreams, [id]: stream } })),
  removeRemoteStream: (id) =>
    set((s) => ({ remoteStreams: omit(s.remoteStreams, id), peerStates: omit(s.peerStates, id) })),
  setPeerState: (id, state) => set((s) => ({ peerStates: { ...s.peerStates, [id]: state } })),

  setPermissions: (permissions) => set({ permissions }),
  setMeetingSettings: (settings) => set((s) => ({ meeting: s.meeting ? { ...s.meeting, settings } : s.meeting })),

  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((s) => (s.messages.some((m) => m.messageId === message.messageId) ? s : { messages: [...s.messages, message] })),
  removeMessage: (messageId) => set((s) => ({ messages: s.messages.filter((m) => m.messageId !== messageId) })),

  setRecording: (recording) => set({ recording }),
  setConnection: (connection) => set({ connection }),

  reset: () => set(initialState()),
}));
