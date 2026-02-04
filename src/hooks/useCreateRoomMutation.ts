import apiClient from "@/api/client";
import { useMutation } from "@tanstack/react-query";

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

export function useCreateRoomMutation(options?: Parameters<typeof useMutation>[0]) {
  return useMutation({ mutationFn: createRoom, ...options });
}
