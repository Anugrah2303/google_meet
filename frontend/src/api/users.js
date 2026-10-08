import { api } from "./axios";

export const updateProfile = async (body) => (await api.patch("/users/me", body)).data.data.user;

export const updateAvatar = async (file) => {
  const form = new FormData();
  form.append("avatar", file);
  return (await api.patch("/users/me/avatar", form)).data.data.user;
};

export const getUser = async (id) => (await api.get(`/users/${id}`)).data.data.user;
