import { api } from "./axios";

// The room uses Socket.IO for chat. These REST helpers are the same actions over HTTP.
export const getMessages = async (meetingId, params = {}) =>
  (await api.get(`/meetings/${meetingId}/messages`, { params })).data.data.messages;
export const sendMessage = async (meetingId, message) =>
  (await api.post(`/meetings/${meetingId}/messages`, { message })).data.data.message;
export const deleteMessage = async (messageId) => (await api.delete(`/messages/${messageId}`)).data;
