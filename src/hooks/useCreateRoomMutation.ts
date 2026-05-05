import apiClient from "@/api/client";
import { useMutation, type UseMutationOptions } from "@tanstack/react-query";

type SaveRoomBody = {
  name: string;
  description: string;
  blueprintJson?: string; 
  spaceId?: string;
};

async function createRoom(body: SaveRoomBody) {
  const res = await apiClient.post(`/space/${body.spaceId}/room/create`, body);
  return res.data;
}

export function useCreateRoomMutation(
  options?: UseMutationOptions<unknown, Error, SaveRoomBody>
) {
  return useMutation({ mutationFn: createRoom, ...options });
}
