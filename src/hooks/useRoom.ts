import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

export default function useRoom(spaceId?: string, roomId?: string) {
  return useQuery({
    queryKey: ["room", spaceId, roomId],
    queryFn: () =>
      apiClient
        .get(`/spaces/${spaceId}/rooms/${roomId}`)
        .then((res) => res.data),
    enabled: Boolean(spaceId && roomId),
    staleTime: 5 * 60 * 1000,
  });
}
