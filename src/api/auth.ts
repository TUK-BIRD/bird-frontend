import apiClient from "./client";

export interface SignUpPayload {
  email: string;
  password: string;
  name: string;
  spaceName: string;
  spaceDescription: string;
}

export const signUp = (payload: SignUpPayload) =>
  apiClient.post("/auth/signup", payload).then((res) => res.data);
