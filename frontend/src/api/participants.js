import { api } from "./axios";

export const getParticipants = async (meetingId, onlineOnly = false) =>
  (await api.get(`/meetings/${meetingId}/participants`, { params: onlineOnly ? { online: true } : {} })).data.data
    .participants;
