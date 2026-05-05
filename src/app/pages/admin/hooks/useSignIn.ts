import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type LoginRequest } from "@/types/auth";
import { signIn } from "@/api/auth";

export default function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, LoginRequest>({
    mutationFn: async (payload: LoginRequest) => signIn(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data.user);
    },
  });
}
