import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import apiClient from "@/api/client";

interface LogoutResponse {
  message: string;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation<LogoutResponse>({
    mutationFn: () => apiClient.post("/auth/logout"), // 서버 쿠키 만료
    onSuccess: () => {
      queryClient.clear(); 
      navigate("/admin/auth/sign-in", { replace: true });
    },
    onError: (error) => {
      console.error("로그아웃 오류:", error);
      queryClient.clear();
      navigate("/admin/auth/sign-in", { replace: true });
    },
  });
}
