import { useMutation } from "@tanstack/react-query";
import { signUp, type SignUpPayload } from "../api/auth";
import { useNavigate } from "react-router";

export function useSignUp() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (payload: SignUpPayload) => signUp(payload),
    onSuccess: () => {
      navigate("/admin/auth/sign-in");
    }
  });
}