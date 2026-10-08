import { api } from "./axios";

export const getFiles = async (meetingId) => (await api.get(`/meetings/${meetingId}/files`)).data.data.files;

export const uploadFile = async (meetingId, file, onProgress) => {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/meetings/${meetingId}/files`, form, {
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / (e.total || file.size))),
  });
  return res.data.data.file;
};

export const deleteFile = async (fileId) => (await api.delete(`/files/${fileId}`)).data;
