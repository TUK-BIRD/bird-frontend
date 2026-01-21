import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";

export default function useSpaceUsers(spaceId: string) {
  return useQuery<any[]>({
    queryKey: ['space_users'],
    queryFn: () => apiClient.get(`/space/${spaceId}/members`).then(res => res.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}