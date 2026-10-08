import { api } from "./axios";

export const createMeeting = async (body) => (await api.post("/meetings", body)).data.data.meeting;
export const getMyMeetings = async () => (await api.get("/meetings")).data.data.meetings;
export const getMeetingHistory = async () => (await api.get("/meetings/history")).data.data.history;
export const getIceServers = async () => (await api.get("/meetings/ice-servers")).data.data.iceServers;
export const getMeetingByCode = async (code) => (await api.get(`/meetings/code/${code}`)).data.data; // { meeting, isMember }
export const getMeeting = async (id) => (await api.get(`/meetings/${id}`)).data.data; // { meeting, me, permissions }
export const joinMeeting = async (id, displayName) => (await api.post(`/meetings/${id}/join`, { displayName })).data.data;
export const leaveMeeting = async (id) => (await api.post(`/meetings/${id}/leave`)).data;
export const updateMeeting = async (id, body) => (await api.patch(`/meetings/${id}`, body)).data.data.meeting;
export const endMeeting = async (id) => (await api.post(`/meetings/${id}/end`)).data;
export const deleteMeeting = async (id) => (await api.delete(`/meetings/${id}`)).data;
