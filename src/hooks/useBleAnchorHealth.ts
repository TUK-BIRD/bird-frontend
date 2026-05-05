import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

export type HealthState = "online" | "degraded" | "offline" | "unknown";

export interface AnchorHealthSummary {
  total: number;
  online: number;
  degraded: number;
  offline: number;
  unknown: number;
}

export interface AnchorHealthItem {
  id: number;
  anchorUid: string;
  label: string;
  roomId: number;
  installedAt: string | null;
  healthState: HealthState;
  healthStatus: string | null;
  healthIsStale: boolean;
  lastHealthPayloadAt: string | null;
  wifiConnected: boolean | null;
  mqttConnected: boolean | null;
  scanEnabled: boolean | null;
}

export interface RoomAnchorHealthResponse {
  roomId: number;
  spaceId: number;
  summary: AnchorHealthSummary;
  anchors: AnchorHealthItem[];
}

interface BleAnchorHealthRequest {
  spaceId: string;
  roomId?: string;
  enabled?: boolean;
}

export default function useBleAnchorHealth(params: BleAnchorHealthRequest) {
  const { spaceId, roomId, enabled = true } = params;
  const isReady = Boolean(enabled && spaceId && roomId);

  return useQuery<RoomAnchorHealthResponse>({
    queryKey: ["bleAnchorHealth", spaceId, roomId],
    queryFn: () =>
      apiClient
        .get(`/spaces/${spaceId}/rooms/${roomId}/ble_anchors/health`)
        .then((res) => res.data),
    enabled: isReady,
    staleTime: 30 * 1000,
    keepPreviousData: true,
  });
}
