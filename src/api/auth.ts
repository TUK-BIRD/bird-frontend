import axios from "axios";
import type { LoginRequest, RegisterRequest } from "../types/auth";
import apiClient from "./client";

export const signUp = (payload: RegisterRequest) =>
  apiClient.post("/auth/register", payload).then((res) => res.data);


export const signIn = async (payload: LoginRequest) => {
  const apiBaseUrl = import.meta.env.VITE_API_URL ?? "";
  const csrfBaseUrl = apiBaseUrl.replace(/\/api\/?$/, "");
  await axios.get(`${csrfBaseUrl}/sanctum/csrf-cookie`, {
    withCredentials: true,
  });
  
  return apiClient.post("/auth/login", payload).then((res) => res.data);
};
