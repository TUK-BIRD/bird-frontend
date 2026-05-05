import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

export interface BleDashboardRequest {
  spaceId: string;
  roomId?: string;
  since?: string;
  until?: string;
  limit?: number;
  bucketMinutes?: 10 | 30 | 60;
  enabled?: boolean;
}

export interface BleDashboardAnchorStat {
  anchorId: string | number | null;
  anchorUid: string | null;
  label: string | null;
  eventCount: number;
  averageRssi: number | null;
  lastScannedAt: string | null;
}

export interface BleDashboardTimeSeriesBucket {
  bucket: string;
  eventCount: number;
  uniqueDeviceCount?: number;
  averageRssi: number | null;
}

export interface BleDashboardStats {
  totalEvents: number;
  uniqueDevices: number;
  averageRssi: number | null;
  latestEventScannedAt?: string | null;
  bucketMinutes?: 10 | 30 | 60;
  anchorBreakdown: BleDashboardAnchorStat[];
  timeSeries: BleDashboardTimeSeriesBucket[];
  windowMinutes?: number;
}

export interface BleDashboardComparison {
  previousWeek: {
    timespan: {
      since: string;
      until: string;
    };
    stats: BleDashboardStats;
    delta: {
      totalEvents: number;
      uniqueDevices: number;
      averageRssi: number | null;
    };
  };
}

export interface BleDashboardHealthKpis {
  totalAnchors: number;
  onlineAnchors: number;
  degradedAnchors: number;
  offlineAnchors: number;
  unknownAnchors: number;
  healthyRatePercent: number | null;
  reachableRatePercent: number | null;
}

export interface BleDashboardEvent {
  deviceMac: string;
  deviceName: string | null;
  rssiDbm: number;
  scannedAt: string;
  receivedAt: string;
  anchor: {
    anchorId: string;
    anchorUid: string;
    label: string;
  };
}

export interface BleDashboardResponse {
  space: {
    id: string;
    name: string;
    description?: string;
  };
  room: {
    id: string;
    name: string;
    description?: string;
  };
  timespan: {
    since: string;
    until: string;
    limit: number;
    bucketMinutes?: 10 | 30 | 60;
  };
  stats: BleDashboardStats;
  comparison?: BleDashboardComparison | null;
  healthKpis?: BleDashboardHealthKpis | null;
  events: BleDashboardEvent[];
}

export default function useBleDashboard(params: BleDashboardRequest) {
  const {
    spaceId,
    roomId,
    since,
    until,
    limit = 10,
    bucketMinutes = 60,
    enabled = true,
  } = params;

  const isRoomReady = Boolean(spaceId && roomId);
  const isEnabled = Boolean(enabled && isRoomReady);

  const queryKey = [
    "bleDashboard",
    spaceId,
    roomId,
    since,
    until,
    limit,
    bucketMinutes,
  ];

  return useQuery<BleDashboardResponse>({
    queryKey,
    queryFn: () =>
      apiClient
        .get(`/spaces/${spaceId}/rooms/${roomId}/ble_scan_events/dashboard`, {
          params: { since, until, limit, bucket_minutes: bucketMinutes },
        })
        .then((res) => res.data),
    enabled: isEnabled,
    staleTime: 5 * 60 * 1000,
    keepPreviousData: true,
  });
}
