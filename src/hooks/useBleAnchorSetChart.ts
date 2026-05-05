import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

export interface BleAnchorSetMatchedDevice {
  deviceMac: string;
  scanCount: number;
  averageRssi: number | null;
  firstScannedAt: string | null;
  lastScannedAt: string | null;
}

export interface BleAnchorSetTimeSeriesItem {
  bucket: string;
  eventCount: number;
  uniqueDeviceCount: number;
  matchedDevices: BleAnchorSetMatchedDevice[];
}

export interface BleAnchorSetChartResponse {
  space: {
    id: number;
    name: string;
  };
  room: {
    id: number;
    name: string;
  };
  timespan: {
    since: string;
    until: string;
  };
  filters: {
    anchorIds: number[];
    excludeDeviceMacs: string[];
  };
  stats: {
    matchedBucketCount: number;
    matchedDeviceCount: number;
    timeSeries: BleAnchorSetTimeSeriesItem[];
  };
}

export interface BleAnchorSetChartRequest {
  spaceId: string;
  roomId?: string;
  since?: string;
  until?: string;
  bucketMinutes?: 10 | 30 | 60;
  anchorIds: number[];
  excludeDeviceMacs: string[];
  enabled?: boolean;
}

export default function useBleAnchorSetChart(params: BleAnchorSetChartRequest) {
  const {
    spaceId,
    roomId,
    since,
    until,
    bucketMinutes = 10,
    anchorIds,
    excludeDeviceMacs,
    enabled = true,
  } = params;

  const isReady = Boolean(
    enabled && spaceId && roomId && since && until && anchorIds.length >= 2
  );

  return useQuery<BleAnchorSetChartResponse>({
    queryKey: [
      "bleAnchorSetChart",
      spaceId,
      roomId,
      since,
      until,
      bucketMinutes,
      anchorIds,
      excludeDeviceMacs,
    ],
    queryFn: async () => {
      const query = new URLSearchParams();

      query.set("since", since ?? "");
      query.set("until", until ?? "");
      query.set("bucket_minutes", String(bucketMinutes));
      anchorIds.forEach((anchorId) => {
        query.append("anchor_ids[]", String(anchorId));
      });
      excludeDeviceMacs.forEach((deviceMac) => {
        query.append("exclude_device_macs[]", deviceMac);
      });

      const response = await apiClient.get(
        `/spaces/${spaceId}/rooms/${roomId}/ble_scan_events/anchor-set-chart?${query.toString()}`
      );

      return response.data;
    },
    enabled: isReady,
    staleTime: 60 * 1000,
    keepPreviousData: true,
  });
}
