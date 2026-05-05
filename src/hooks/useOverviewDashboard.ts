import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";
import type { HealthState } from "./useBleAnchorHealth";

export interface OverviewDashboardRequest {
  spaceId: string;
  roomId?: string;
  since?: string;
  until?: string;
  windowMinutes?: 30 | 60 | 180 | 360;
  bucketMinutes?: 10 | 30 | 60;
  cellSize?: number;
  minimumConfidence?: 0 | 0.3 | 0.5 | 0.7;
  limit?: 5 | 10;
  enabled?: boolean;
}

export interface OverviewAnchorHealthSummary {
  totalAnchors: number;
  onlineAnchors: number;
  degradedAnchors: number;
  offlineAnchors: number;
  unknownAnchors: number;
  healthyRatePercent: number | null;
  reachableRatePercent: number | null;
}

export interface OverviewAnchorHealthItem {
  id: number;
  anchorUid: string;
  label: string;
  healthState: HealthState;
  healthIsStale: boolean;
  lastHealthPayloadAt: string | null;
  wifiConnected: boolean | null;
  mqttConnected: boolean | null;
  scanEnabled: boolean | null;
}

export interface OverviewOccupancy {
  estimateCount: number;
  uniqueDeviceCount: number;
  occupiedCellCount: number;
  totalCellCount: number;
  occupiedCellRatePercent: number | null;
  cellSize: number;
}

export interface OverviewTimeSlot {
  bucket: string;
  estimateCount: number;
  uniqueDeviceCount: number;
  averageConfidence: number | null;
}

export interface OverviewDashboardResponse {
  timespan: {
    since: string;
    until: string;
    windowMinutes: number;
    bucketMinutes: 10 | 30 | 60;
  };
  anchorHealth: {
    summary: OverviewAnchorHealthSummary;
    anchors: OverviewAnchorHealthItem[];
  };
  occupancy: OverviewOccupancy;
  busiestTimeSlots: OverviewTimeSlot[];
  timeSeries: OverviewTimeSlot[];
  filters: {
    minimumConfidence: number | null;
    limit: number;
  };
}

export default function useOverviewDashboard(params: OverviewDashboardRequest) {
  const {
    spaceId,
    roomId,
    since,
    until,
    windowMinutes = 60,
    bucketMinutes = 10,
    cellSize,
    minimumConfidence,
    limit = 5,
    enabled = true,
  } = params;
  const isReady = Boolean(enabled && spaceId && roomId);

  return useQuery<OverviewDashboardResponse>({
    queryKey: [
      "overviewDashboard",
      spaceId,
      roomId,
      since,
      until,
      windowMinutes,
      bucketMinutes,
      cellSize,
      minimumConfidence,
      limit,
    ],
    queryFn: () =>
      apiClient
        .get(`/spaces/${spaceId}/rooms/${roomId}/overview-dashboard`, {
          params: {
            since,
            until,
            windowMinutes,
            bucketMinutes,
            cellSize,
            minimumConfidence,
            limit,
          },
        })
        .then((res) => res.data),
    enabled: isReady,
    staleTime: 30 * 1000,
  });
}
