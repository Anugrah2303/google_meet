import { api } from "./axios";

export const registerUser = async (body) => (await api.post("/auth/register", body)).data.data; // { user, token }
export const loginUser = async (body) => (await api.post("/auth/login", body)).data.data; // { user, token }
export const logoutUser = async () => (await api.post("/auth/logout")).data;
export const getMe = async () => (await api.get("/auth/me")).data.data.user;
