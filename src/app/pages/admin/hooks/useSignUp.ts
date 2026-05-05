import { useMutation } from "@tanstack/react-query";
import { signUp } from "@/api/auth";

import { useNavigate } from "react-router";
import type { RegisterRequest } from "@/types/auth";

export function useSignUp() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: RegisterRequest) => signUp(payload),
    onSuccess: () => {
      navigate("/admin/auth/sign-in");
    },
  });
}
