import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

export interface WeeklyEstimateSlot {
  id: number;
  time: string;
  estimatedDeviceCount: number;
  avgDeviceCount: number;
  maxDeviceCount: number;
}

export interface WeeklyEstimateDay {
  dayOfWeek: number;
  dayName: string;
  slots: WeeklyEstimateSlot[];
}

export interface WeeklyEstimatesResponse {
  space: { id: number; name: string };
  room: { id: number; name: string };
  weeklyEstimates: WeeklyEstimateDay[];
}

export async function fetchWeeklyEstimates(
  spaceId: string,
  roomId: string | undefined,
  dayOfWeek?: number,
) {
  const params: Record<string, unknown> = {};
  if (dayOfWeek !== undefined) params.day_of_week = dayOfWeek;

  const response = await apiClient.get<WeeklyEstimatesResponse>(
    `/spaces/${spaceId}/rooms/${roomId}/weekly-estimates`,
    { params },
  );
  return response.data;
}

export default function useWeeklyEstimates(
  spaceId: string,
  roomId: string | undefined,
  dayOfWeek?: number,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "weeklyEstimates",
      spaceId,
      roomId,
      dayOfWeek,
    ],
    queryFn: () => fetchWeeklyEstimates(spaceId, roomId, dayOfWeek),
    enabled: enabled && Boolean(spaceId && roomId),
    staleTime: 60 * 1000,
  });
}