import { useQuery } from "@tanstack/react-query";
import apiClient from "../api/client";
import type { Space } from "../types/space";

export default function useSpaces() {
  return useQuery<Space[]>({
    queryKey: ['spaces'],
    queryFn: () => apiClient.get('/spaces/').then(res => res.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}