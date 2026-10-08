import { api } from "./axios";

export const getRecordings = async (meetingId) => (await api.get(`/meetings/${meetingId}/recordings`)).data.data.recordings;

export const startRecordingApi = async (meetingId) =>
  (await api.post(`/meetings/${meetingId}/recordings/start`)).data.data.recording;

export const uploadRecording = async ({ meetingId, recordingId, file, duration, onUploadProgress }) => {
  const form = new FormData();
  // Text fields first: multer has already parsed them by the time the controller runs
  form.append("recordingId", recordingId);
  form.append("duration", String(duration));
  form.append("recording", file);
  return (await api.post(`/meetings/${meetingId}/recordings/upload`, form, { onUploadProgress })).data.data.recording;
};

export const completeRecording = async (meetingId, recordingId, duration) =>
  (await api.post(`/meetings/${meetingId}/recordings/${recordingId}/complete`, { duration })).data.data.recording;

export const deleteRecording = async (recordingId) => (await api.delete(`/recordings/${recordingId}`)).data;
