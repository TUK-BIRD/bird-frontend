import { keepPreviousData, useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

export interface BleMultiAnchorDashboardRequest {
  spaceId: string;
  roomId?: string;
  since?: string;
  until?: string;
  limit?: number;
  windowSeconds?: number;
  enabled?: boolean;
}

export interface BleMultiAnchorTimeSeriesBucket {
  bucket: string; // ISO8601 at the top of the hour
  eventCount: number; // qualified deviceMac count (deduped)
  uniqueDeviceCount: number;
}

export interface BleMultiAnchorQualifiedDevice {
  deviceMac: string;
  firstQualifiedAt: string;
  lastQualifiedAt: string;
  qualifiedHourCount: number;
  anchorIds: string[];
}

export interface BleMultiAnchorDashboardResponse {
  stats: {
    timeSeries: BleMultiAnchorTimeSeriesBucket[];
  };
  devices: BleMultiAnchorQualifiedDevice[];
}

export default function useBleMultiAnchorDashboard(
  params: BleMultiAnchorDashboardRequest
) {
  const {
    spaceId,
    roomId,
    since,
    until,
    limit = 50,
    windowSeconds = 180,
    enabled = true,
  } = params;

  const isReady = Boolean(enabled && spaceId && roomId);

  return useQuery<BleMultiAnchorDashboardResponse>({
    queryKey: [
      "bleMultiAnchorDashboard",
      spaceId,
      roomId,
      since,
      until,
      limit,
      windowSeconds,
    ],
    queryFn: () =>
      apiClient
        .get(
          `/spaces/${spaceId}/rooms/${roomId}/ble_scan_events/multi-anchor-dashboard`,
          {
            params: { since, until, limit, windowSeconds },
          }
        )
        .then((res) => res.data as BleMultiAnchorDashboardResponse),
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
