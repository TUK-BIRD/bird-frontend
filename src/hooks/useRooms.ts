import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import type { Room } from "@/types/room";

export default function useRooms(spaceId: string) {
  return useQuery<Room[]>({
    queryKey: ["rooms", spaceId],
    queryFn: () =>
      apiClient.get(`/space/${spaceId}/rooms`).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
}
