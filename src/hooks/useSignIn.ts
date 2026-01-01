import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import apiClient from "../api/client";
import { type AuthResponse, type LoginRequest } from "../types/auth";

export default function useSignIn() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<AuthResponse, Error, LoginRequest>({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const res = await apiClient.post("/auth/login", { email, password });
      return res.data; // Axios는 data 자동 파싱
    },

    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data.user);
      navigate("/admin/dashboard");
    },
  });
}
