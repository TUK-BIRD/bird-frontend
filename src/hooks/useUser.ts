// hooks/useAuth.ts
import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { User } from '../types/user';

export function useUser() {
  return useQuery<User>({
    queryKey: ['user'],
    queryFn: () => apiClient.get<User>('/user').then(res => res.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
