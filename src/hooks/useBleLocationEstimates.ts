import { keepPreviousData, useQuery } from "@tanstack/react-query";
import apiClient from "@/api/client";

export interface BleLocationEstimateDevice {
  deviceMac: string;
  deviceName: string | null;
  matchedAnchors: number;
  signals: Record<string, number>;
  latestScannedAt: string | null;
  estimate: {
    x: number;
    y: number;
    confidence: number;
    isOutside: boolean;
    minDistance: number;
    matchedAnchors: number;
  } | null;
}

export interface BleLocationEstimatesResponse {
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
    windowMinutes: number;
    minimumAnchorMatches: number;
  };
  stats: {
    installedAnchorCount: number;
    estimatedDeviceCount: number;
  };
  generatedRadiomap?: {
    xRangeMin: number;
    xRangeMax: number;
    yRangeMin: number;
    yRangeMax: number;
    gridStep: number;
  } | null;
  devices: BleLocationEstimateDevice[];
}

export interface BleLocationHeatmapCell {
  x: number;
  y: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  count: number;
  uniqueDeviceCount: number;
  averageConfidence: number;
  intensity: number;
}

export interface BleLocationHeatmapResponse {
  space: {
    id: number;
    name: string;
  };
  room: {
    id: number;
    name: string;
  };
  generatedRadiomap?: {
    xRangeMin: number;
    xRangeMax: number;
    yRangeMin: number;
    yRangeMax: number;
    gridStep: number;
  } | null;
  timespan: {
    since: string;
    until: string;
    windowMinutes: number;
  };
  filters: {
    cellSize: number;
    minimumConfidence: number;
    includeOutside: boolean;
  };
  stats: {
    estimateCount: number;
    cellCount: number;
    maxCellCount: number;
  };
  cells: BleLocationHeatmapCell[];
}

export interface BleLocationEstimatesRequest {
  spaceId: string;
  roomId?: string;
  since?: string;
  until?: string;
  windowMinutes?: number;
  minimumAnchorMatches?: number;
  minimumConfidence?: number;
  requestKey?: number;
  enabled?: boolean;
}

export interface BleLocationHeatmapRequest {
  spaceId: string;
  roomId?: string;
  since?: string;
  until?: string;
  windowMinutes?: number;
  cellSize?: number;
  minimumConfidence?: number;
  includeOutside?: boolean;
  requestKey?: number;
  enabled?: boolean;
}

export async function fetchBleLocationEstimates(
  params: Omit<BleLocationEstimatesRequest, "enabled">
) {
  const {
    spaceId,
    roomId,
    since,
    until,
    windowMinutes = 5,
    minimumAnchorMatches = 3,
    minimumConfidence,
  } = params;

  const response = await apiClient.get(
    `/spaces/${spaceId}/rooms/${roomId}/ble_scan_events/location-estimates`,
    {
      params: {
        since,
        until,
        window_minutes: windowMinutes,
        minimum_anchor_matches: minimumAnchorMatches,
        minimum_confidence: minimumConfidence,
      },
    }
  );

  return response.data as BleLocationEstimatesResponse;
}

export async function fetchBleLocationHeatmap(
  params: Omit<BleLocationHeatmapRequest, "enabled">
) {
  const {
    spaceId,
    roomId,
    since,
    until,
    windowMinutes = 60,
    cellSize,
    minimumConfidence,
    includeOutside = false,
  } = params;

  const response = await apiClient.get(
    `/spaces/${spaceId}/rooms/${roomId}/ble_scan_events/location-estimates/heatmap`,
    {
      params: {
        since,
        until,
        window_minutes: windowMinutes,
        cell_size: cellSize,
        minimum_confidence: minimumConfidence,
        include_outside: includeOutside ? 1 : 0,
        includeOutside: includeOutside ? 1 : 0,
      },
    }
  );

  return response.data as BleLocationHeatmapResponse;
}

export default function useBleLocationEstimates(
  params: BleLocationEstimatesRequest
) {
  const {
    spaceId,
    roomId,
    since,
    until,
    windowMinutes = 5,
    minimumAnchorMatches = 3,
    minimumConfidence,
    requestKey,
    enabled = true,
  } = params;

  const isReady = Boolean(enabled && spaceId && roomId);

  return useQuery<BleLocationEstimatesResponse>({
    queryKey: [
      "bleLocationEstimates",
      spaceId,
      roomId,
      since,
      until,
      windowMinutes,
      minimumAnchorMatches,
      minimumConfidence,
      requestKey,
    ],
    queryFn: () =>
      fetchBleLocationEstimates({
        spaceId,
        roomId,
        since,
        until,
        windowMinutes,
        minimumAnchorMatches,
        minimumConfidence,
    }),
    enabled: isReady,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useBleLocationHeatmap(params: BleLocationHeatmapRequest) {
  const {
    spaceId,
    roomId,
    since,
    until,
    windowMinutes = 60,
    cellSize,
    minimumConfidence,
    includeOutside = false,
    requestKey,
    enabled = true,
  } = params;

  const isReady = Boolean(enabled && spaceId && roomId);

  return useQuery<BleLocationHeatmapResponse>({
    queryKey: [
      "bleLocationHeatmap",
      spaceId,
      roomId,
      since,
      until,
      windowMinutes,
      cellSize,
      minimumConfidence,
      includeOutside,
      requestKey,
    ],
    queryFn: () =>
      fetchBleLocationHeatmap({
        spaceId,
        roomId,
        since,
        until,
        windowMinutes,
        cellSize,
        minimumConfidence,
        includeOutside,
        requestKey,
      }),
    enabled: isReady,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });
}
