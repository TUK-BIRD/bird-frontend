import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";

export default function useRooms(spaceId: string) {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: () =>
      apiClient.get(`/space/${spaceId}/rooms`).then((res) => res.data),
    staleTime: 5 * 60 * 1000,
  });
}
