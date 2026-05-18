import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowDownRight,
  IconArrowRight,
  IconArrowUpRight,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
  type ChartData,
  type Plugin,
  type TooltipItem,
} from "chart.js";
import { Bar, Scatter } from "react-chartjs-2";
import { useQueries } from "@tanstack/react-query";
import useRooms from "@/hooks/useRooms";
import useBleLocationEstimates, {
  type BleLocationEstimateDevice,
  type BleLocationEstimatesResponse,
  fetchBleLocationEstimates,
} from "@/hooks/useBleLocationEstimates";
import type { Room } from "@/types/room";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTooltip,
  Legend,
);

const DEFAULT_WINDOW_MINUTES = 10;
const DEFAULT_MINIMUM_ANCHOR_MATCHES = 2;
const CONFIDENCE_THRESHOLD = 0.7;
const SCATTER_GRID_PADDING = 2;
const SCATTER_MAX_HEIGHT_PX = 520;
const PLAYBACK_INTERVAL_MS = 700;

const pad = (value: number) => value.toString().padStart(2, "0");

const toDateInputValue = (value: Date) => {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}`;
};

const parseLocalDateTimeInput = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
    0,
  );

  return Number.isNaN(date.getTime()) ? null : date;
};

const parseLocalDateInput = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(date.getTime()) ? null : date;
};

const toIsoWithOffset = (date: Date) => {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absMinutes / 60);
  const offsetRemainderMinutes = absMinutes % 60;

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}${sign}${pad(offsetHours)}:${pad(offsetRemainderMinutes)}`;
};

const toRequestSinceTimestamp = (input: string) => {
  const parsed = parseLocalDateInput(input);
  if (!parsed) return undefined;
  return toIsoWithOffset(parsed);
};

const toRequestUntilTimestamp = (input: string) => {
  const parsed = parseLocalDateInput(input);
  if (!parsed) return undefined;

  const until = new Date(parsed);
  until.setDate(until.getDate() + 1);
  return toIsoWithOffset(until);
};

const toDateInputValueFromQueryParam = (value: string | null, fallback: string) => {
  if (!value) return fallback;

  const localDateOnly = parseLocalDateInput(value);
  if (localDateOnly) {
    return toDateInputValue(localDateOnly);
  }

  const localDate = parseLocalDateTimeInput(value);
  if (localDate) {
    return toDateInputValue(localDate);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;

  return toDateInputValue(parsed);
};

const toDateRangeFromQueryParam = (value: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  if (!value) return null;

  const since = parseLocalDateInput(value);
  if (!since) return null;

  const until = new Date(since);
  until.setDate(until.getDate() + 1);

  return {
    since: toDateInputValue(since),
    until: toDateInputValue(until),
  };
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatFrameDate = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatFrameTime = (since?: string | null, until?: string | null) => {
  if (!since || !until) return "—";

  const start = new Date(since);
  const end = new Date(until);
  return `${start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

const formatNumber = (value?: number | null, fractionDigits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatDelta = (value: number, fractionDigits = 0) => {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, fractionDigits)}`;
};

const formatPercentDelta = (current: number, previous: number) => {
  if (previous === 0) {
    if (current === 0) return "0%";
    return "New";
  }

  return `${formatDelta(((current - previous) / previous) * 100, 1)}%`;
};

const shiftTimestampByDays = (value: string | undefined, days: number) => {
  if (!value) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  date.setDate(date.getDate() + days);
  return toIsoWithOffset(date);
};

const formatDateRange = (since?: string | null, until?: string | null) => {
  if (!since || !until) return "—";

  return `${formatTimestamp(since)} ~ ${formatTimestamp(until)}`;
};

const summarizeDevices = (devices: BleLocationEstimateDevice[]) => {
  const estimated = devices.filter((device) => device.estimate);
  const outside = estimated.filter((device) => device.estimate?.isOutside);

  return {
    deviceCount: devices.length,
    estimatedCount: estimated.length,
    outsideCount: outside.length,
  };
};

const getScatterBounds = (
  radiomap: BleLocationEstimatesResponse["generatedRadiomap"],
) => {
  if (!radiomap) {
    return {
      xMin: 0,
      xMax: 1,
      yMin: 0,
      yMax: 1,
      aspectRatio: 1,
    };
  }

  const xMin = radiomap.xRangeMin - SCATTER_GRID_PADDING;
  const xMax = radiomap.xRangeMax + SCATTER_GRID_PADDING;
  const yMin = radiomap.yRangeMin - SCATTER_GRID_PADDING;
  const yMax = radiomap.yRangeMax + SCATTER_GRID_PADDING;
  const xSpan = Math.max(xMax - xMin, 1);
  const ySpan = Math.max(yMax - yMin, 1);

  return {
    xMin,
    xMax,
    yMin,
    yMax,
    aspectRatio: xSpan / ySpan,
  };
};

const sortDevices = (devices: BleLocationEstimateDevice[]) => {
  return [...devices].sort((a, b) => {
    const confidenceGap =
      (b.estimate?.confidence ?? Number.NEGATIVE_INFINITY) -
      (a.estimate?.confidence ?? Number.NEGATIVE_INFINITY);
    if (confidenceGap !== 0) return confidenceGap;

    return (
      new Date(b.latestScannedAt ?? 0).getTime() -
      new Date(a.latestScannedAt ?? 0).getTime()
    );
  });
};

const getEstimateTone = (device: BleLocationEstimateDevice) => {
  if (!device.estimate) {
    return {
      border: "#9ca3af",
      fill: "rgba(156, 163, 175, 0.45)",
    };
  }

  if (device.estimate.isOutside) {
    return {
      border: "#dc2626",
      fill: "rgba(220, 38, 38, 0.45)",
    };
  }

  return {
    border: "#2563eb",
    fill: "rgba(37, 99, 235, 0.45)",
  };
};

const buildPlaybackFrames = (
  since?: string,
  until?: string,
  windowMinutes = DEFAULT_WINDOW_MINUTES,
) => {
  if (!since || !until) return [];

  const start = new Date(since);
  const end = new Date(until);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start >= end
  ) {
    return [];
  }

  const frames: Array<{
    index: number;
    since: string;
    until: string;
    label: string;
  }> = [];

  let cursor = new Date(start);
  let index = 0;

  while (cursor < end) {
    const next = new Date(cursor.getTime() + windowMinutes * 60 * 1000);
    const boundedNext = next > end ? end : next;
    frames.push({
      index,
      since: toIsoWithOffset(cursor),
      until: toIsoWithOffset(boundedNext),
      label: `${formatTimestamp(toIsoWithOffset(cursor))} ~ ${formatTimestamp(
        toIsoWithOffset(boundedNext),
      )}`,
    });
    cursor = boundedNext;
    index += 1;
  }

  return frames;
};

interface AppliedLocationEstimateFilters {
  roomId: string;
  since: string | undefined;
  until: string | undefined;
  windowMinutes: number;
  minimumAnchorMatches: number;
  requestKey: number;
}

interface ComparisonMetric {
  label: string;
  current: number;
  previous: number;
  fractionDigits?: number;
  suffix?: string;
}

function ComparisonMetricCard({
  metric,
}: {
  metric: ComparisonMetric;
}) {
  const delta = metric.current - metric.previous;
  const direction = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const Icon =
    direction === "up"
      ? IconArrowUpRight
      : direction === "down"
        ? IconArrowDownRight
        : IconArrowRight;
  const color = direction === "up" ? "blue" : direction === "down" ? "red" : "gray";

  return (
    <Card withBorder radius="lg" p="md">
      <Stack gap={8}>
        <Group justify="space-between" align="center">
          <Text size="sm" c="dimmed" fw={700}>
            {metric.label}
          </Text>
          <Badge
            color={color}
            variant="light"
            radius="xl"
            leftSection={<Icon size={14} />}
          >
            {formatPercentDelta(metric.current, metric.previous)}
          </Badge>
        </Group>
        <Group gap="xs" align="baseline">
          <Text size="2rem" fw={900} lh={1}>
            {formatNumber(metric.current, metric.fractionDigits)}
            {metric.suffix ?? ""}
          </Text>
          <Text size="sm" c="dimmed">
            전주 {formatNumber(metric.previous, metric.fractionDigits)}
            {metric.suffix ?? ""}
          </Text>
        </Group>
        <Text size="xs" c={color}>
          전주 대비 {formatDelta(delta, metric.fractionDigits)}
          {metric.suffix ?? ""}
        </Text>
      </Stack>
    </Card>
  );
}

export default function LocationEstimatesPanel() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [defaultTimeRange] = useState(() => {
    const until = new Date();
    const since = new Date(until);
    since.setDate(since.getDate() - 1);

    return {
      since: toDateInputValue(since),
      until: toDateInputValue(until),
    };
  });
  const queryDateRange =
    toDateRangeFromQueryParam(searchParams.get("date")) ?? defaultTimeRange;
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(
    () => searchParams.get("roomId") ?? undefined,
  );
  const [sinceInput, setSinceInput] = useState(() =>
    toDateInputValueFromQueryParam(searchParams.get("since"), queryDateRange.since),
  );
  const [untilInput, setUntilInput] = useState(() =>
    toDateInputValueFromQueryParam(searchParams.get("until"), queryDateRange.until),
  );
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<AppliedLocationEstimateFilters | null>(null);

  const { data: rooms } = useRooms(spaceId ?? "");
  const roomList = useMemo(() => (rooms ?? []) as Room[], [rooms]);

  const roomOptions = useMemo(
    () =>
      roomList.map((room) => ({
        value: String(room.id),
        label: room.name,
      })),
    [roomList],
  );

  const defaultRoomId = useMemo(
    () => (roomList.length ? String(roomList[0].id) : undefined),
    [roomList],
  );

  const queryRoomId = searchParams.get("roomId") ?? undefined;
  const activeRoomId = selectedRoomId ?? queryRoomId ?? defaultRoomId;
  const hasQueryFilters =
    searchParams.has("roomId") ||
    searchParams.has("date") ||
    searchParams.has("since") ||
    searchParams.has("until");
  const querySinceInput = toDateInputValueFromQueryParam(
    searchParams.get("since"),
    queryDateRange.since,
  );
  const queryUntilInput = toDateInputValueFromQueryParam(
    searchParams.get("until"),
    queryDateRange.until,
  );
  const queryFilters = useMemo<AppliedLocationEstimateFilters | null>(() => {
    if (!hasQueryFilters || !activeRoomId) return null;

    return {
      roomId: activeRoomId,
      since: toRequestSinceTimestamp(querySinceInput),
      until: toRequestUntilTimestamp(queryUntilInput),
      windowMinutes: DEFAULT_WINDOW_MINUTES,
      minimumAnchorMatches: DEFAULT_MINIMUM_ANCHOR_MATCHES,
      requestKey: 0,
    };
  }, [activeRoomId, hasQueryFilters, querySinceInput, queryUntilInput]);
  const effectiveFilters = appliedFilters ?? queryFilters;

  const query = useBleLocationEstimates({
    spaceId: spaceId ?? "",
    roomId: effectiveFilters?.roomId,
    since: effectiveFilters?.since,
    until: effectiveFilters?.until,
    windowMinutes: effectiveFilters?.windowMinutes,
    minimumAnchorMatches: effectiveFilters?.minimumAnchorMatches,
    requestKey: effectiveFilters?.requestKey,
    enabled: Boolean(effectiveFilters?.roomId),
  });
  const previousWeekFilters = useMemo<AppliedLocationEstimateFilters | null>(() => {
    if (!effectiveFilters) return null;

    return {
      ...effectiveFilters,
      since: shiftTimestampByDays(effectiveFilters.since, -7),
      until: shiftTimestampByDays(effectiveFilters.until, -7),
    };
  }, [effectiveFilters]);
  const previousWeekQuery = useBleLocationEstimates({
    spaceId: spaceId ?? "",
    roomId: previousWeekFilters?.roomId,
    since: previousWeekFilters?.since,
    until: previousWeekFilters?.until,
    windowMinutes: previousWeekFilters?.windowMinutes,
    minimumAnchorMatches: previousWeekFilters?.minimumAnchorMatches,
    requestKey: previousWeekFilters?.requestKey,
    enabled: Boolean(
      previousWeekFilters?.roomId &&
        previousWeekFilters.since &&
        previousWeekFilters.until,
    ),
  });

  const playbackFrames = useMemo(
    () =>
      buildPlaybackFrames(
        effectiveFilters?.since,
        effectiveFilters?.until,
        effectiveFilters?.windowMinutes,
      ),
    [effectiveFilters],
  );
  const previousWeekPlaybackFrames = useMemo(
    () =>
      buildPlaybackFrames(
        previousWeekFilters?.since,
        previousWeekFilters?.until,
        previousWeekFilters?.windowMinutes,
      ),
    [previousWeekFilters],
  );
  const clampedPlaybackIndex = Math.min(
    playbackIndex,
    Math.max(playbackFrames.length - 1, 0),
  );
  const activePlaybackFrame = playbackFrames[clampedPlaybackIndex];
  const playbackQueries = useQueries({
    queries: playbackFrames.map((frame) => ({
      queryKey: [
        "bleLocationEstimatesPlayback",
        spaceId,
        effectiveFilters?.roomId,
        frame.since,
        frame.until,
        effectiveFilters?.windowMinutes,
        effectiveFilters?.minimumAnchorMatches,
        effectiveFilters?.requestKey,
      ],
      queryFn: () =>
        fetchBleLocationEstimates({
          spaceId: spaceId ?? "",
          roomId: effectiveFilters?.roomId,
          since: frame.since,
          until: frame.until,
          windowMinutes: effectiveFilters?.windowMinutes,
          minimumAnchorMatches: effectiveFilters?.minimumAnchorMatches,
        }),
      enabled: Boolean(effectiveFilters?.roomId),
      staleTime: 60 * 1000,
    })),
  });
  const previousWeekPlaybackQueries = useQueries({
    queries: previousWeekPlaybackFrames.map((frame) => ({
      queryKey: [
        "bleLocationEstimatesPreviousWeekPlayback",
        spaceId,
        previousWeekFilters?.roomId,
        frame.since,
        frame.until,
        previousWeekFilters?.windowMinutes,
        previousWeekFilters?.minimumAnchorMatches,
        previousWeekFilters?.requestKey,
      ],
      queryFn: () =>
        fetchBleLocationEstimates({
          spaceId: spaceId ?? "",
          roomId: previousWeekFilters?.roomId,
          since: frame.since,
          until: frame.until,
          windowMinutes: previousWeekFilters?.windowMinutes,
          minimumAnchorMatches: previousWeekFilters?.minimumAnchorMatches,
        }),
      enabled: Boolean(previousWeekFilters?.roomId),
      staleTime: 60 * 1000,
    })),
  });
  const playbackData = playbackQueries[clampedPlaybackIndex]?.data;
  const playbackDevices = useMemo(
    () => sortDevices(playbackData?.devices ?? []),
    [playbackData],
  );
  const playbackRadiomap = playbackData?.generatedRadiomap ?? null;
  const scatterBounds = useMemo(
    () => getScatterBounds(playbackRadiomap),
    [playbackRadiomap],
  );
  const estimatedDevices = useMemo(
    () =>
      playbackDevices.filter(
        (device) =>
          device.estimate && device.estimate.confidence >= CONFIDENCE_THRESHOLD,
      ),
    [playbackDevices],
  );
  const playbackSummary = useMemo(
    () =>
      playbackFrames.map((frame, index) => {
        const frameData = playbackQueries[index]?.data;

        return {
          label: frame.label,
          shortLabel: `${new Date(frame.since).getHours()}:${pad(
            new Date(frame.since).getMinutes(),
          )}`,
          estimatedDeviceCount: frameData?.stats.estimatedDeviceCount ?? 0,
        };
      }),
    [playbackFrames, playbackQueries],
  );
  const previousWeekPlaybackSummary = useMemo(
    () =>
      playbackFrames.map((frame, index) => {
        const previousFrame = previousWeekPlaybackFrames[index];
        const frameData = previousWeekPlaybackQueries[index]?.data;

        return {
          label: previousFrame?.label ?? frame.label,
          estimatedDeviceCount: frameData?.stats.estimatedDeviceCount ?? 0,
        };
      }),
    [playbackFrames, previousWeekPlaybackFrames, previousWeekPlaybackQueries],
  );
  const scatterData = useMemo(() => {
    return {
      datasets: estimatedDevices.map((device) => ({
        label: device.deviceName ?? device.deviceMac,
        data: [
          {
            x: device.estimate?.x ?? 0,
            y: device.estimate?.y ?? 0,
          },
        ],
        pointRadius: 8,
        pointHoverRadius: 10,
        pointBorderWidth: 2,
        pointBorderColor: getEstimateTone(device).border,
        pointBackgroundColor: getEstimateTone(device).fill,
      })),
    };
  }, [estimatedDevices]);
  const scatterOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: scatterBounds.aspectRatio,
      animation: {
        duration: 260,
        easing: "easeOutQuart" as const,
      },
      animations: {
        x: {
          duration: 0,
        },
        y: {
          duration: 0,
        },
        radius: {
          duration: 260,
          easing: "easeOutQuart" as const,
          from: 0,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<"scatter">[]) => {
              const label = items[0]?.dataset.label;
              return label ?? "";
            },
            label: (context: TooltipItem<"scatter">) => {
              const device = estimatedDevices[context.datasetIndex];
              if (!device?.estimate) return "";

              return [
                `x: ${formatNumber(device.estimate.x, 3)}`,
                `y: ${formatNumber(device.estimate.y, 3)}`,
                `confidence: ${formatNumber(device.estimate.confidence, 3)}`,
                `latest: ${formatTimestamp(device.latestScannedAt)}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          min: scatterBounds.xMin,
          max: scatterBounds.xMax,
          title: {
            display: true,
            text: "X Position",
          },
          grid: {
            color: "#eef2f7",
          },
          ticks: playbackRadiomap?.gridStep
            ? {
                stepSize: playbackRadiomap.gridStep,
              }
            : undefined,
        },
        y: {
          min: scatterBounds.yMin,
          max: scatterBounds.yMax,
          title: {
            display: true,
            text: "Y Position",
          },
          grid: {
            color: "#eef2f7",
          },
          ticks: playbackRadiomap?.gridStep
            ? {
                stepSize: playbackRadiomap.gridStep,
              }
            : undefined,
        },
      },
    }),
    [estimatedDevices, playbackRadiomap, scatterBounds],
  );
  const scatterPlugins = useMemo<Plugin<"scatter">[]>(() => {
    if (!playbackRadiomap) return [];

    return [
      {
        id: "radiomapMaxBounds",
        afterDatasetsDraw: (chart) => {
          const { ctx, chartArea, scales } = chart;
          const xZero = scales.x.getPixelForValue(0);
          const yZero = scales.y.getPixelForValue(0);

          ctx.save();
          ctx.strokeStyle = "#475569";
          ctx.fillStyle = "#475569";
          ctx.lineWidth = 1;

          if (xZero >= chartArea.left && xZero <= chartArea.right) {
            ctx.strokeStyle = "#94a3b8";
            ctx.fillStyle = "#64748b";
            ctx.beginPath();
            ctx.moveTo(xZero, chartArea.top);
            ctx.lineTo(xZero, chartArea.bottom);
            ctx.stroke();
          }
          if (yZero >= chartArea.top && yZero <= chartArea.bottom) {
            ctx.strokeStyle = "#94a3b8";
            ctx.fillStyle = "#64748b";
            ctx.beginPath();
            ctx.moveTo(chartArea.left, yZero);
            ctx.lineTo(chartArea.right, yZero);
            ctx.stroke();
          }

          ctx.setLineDash([]);
          ctx.font = "12px sans-serif";
          ctx.textBaseline = "top";
          if (xZero >= chartArea.left && xZero <= chartArea.right) {
            ctx.fillText("x 0", xZero + 8, chartArea.bottom - 18);
          }
          if (yZero >= chartArea.top && yZero <= chartArea.bottom) {
            ctx.fillText("y 0", chartArea.left + 8, yZero + 6);
          }
          ctx.restore();
        },
      },
    ];
  }, [playbackRadiomap]);
  const playbackTrendData = useMemo(() => {
    if (!playbackSummary.length) return null;

    return {
      labels: playbackSummary.map((item) => item.shortLabel),
      datasets: [
        {
          type: "bar" as const,
          label: "선택 기간",
          data: playbackSummary.map((item) => item.estimatedDeviceCount),
          backgroundColor: "rgba(37, 99, 235, 0.45)",
          borderColor: "#2563eb",
          borderRadius: 6,
          yAxisID: "countAxis",
        },
        {
          type: "line" as const,
          label: "전주 동일 시간",
          data: previousWeekPlaybackSummary.map(
            (item) => item.estimatedDeviceCount,
          ),
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.18)",
          pointBackgroundColor: "#f59e0b",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          borderWidth: 3,
          tension: 0.3,
          yAxisID: "countAxis",
        },
      ],
    };
  }, [playbackSummary, previousWeekPlaybackSummary]);
  const playbackTrendOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 220,
        easing: "easeOutQuart" as const,
      },
      animations: {
        y: {
          duration: 0,
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "bottom" as const,
        },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<"bar">[]) => {
              const index = items[0]?.dataIndex ?? 0;
              return playbackSummary[index]?.label ?? "";
            },
            afterTitle: (items: TooltipItem<"bar">[]) => {
              const index = items[0]?.dataIndex ?? 0;
              const previousLabel = previousWeekPlaybackSummary[index]?.label;
              return previousLabel ? [`전주: ${previousLabel}`] : [];
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "#eef2f7",
          },
        },
        countAxis: {
          beginAtZero: true,
          grid: {
            color: "#eef2f7",
          },
        },
      },
    }),
    [playbackSummary, previousWeekPlaybackSummary],
  );
  const playbackLoading = playbackQueries.some(
    (playbackQuery) => playbackQuery.isLoading && !playbackQuery.data,
  );
  const previousWeekPlaybackLoading = previousWeekPlaybackQueries.some(
    (playbackQuery) => playbackQuery.isLoading && !playbackQuery.data,
  );
  const weekComparisonMetrics = useMemo<ComparisonMetric[]>(() => {
    if (!query.data || !previousWeekQuery.data) return [];

    const currentSummary = summarizeDevices(query.data.devices);
    const previousSummary = summarizeDevices(previousWeekQuery.data.devices);

    return [
      {
        label: "Estimated Devices",
        current: query.data.stats.estimatedDeviceCount,
        previous: previousWeekQuery.data.stats.estimatedDeviceCount,
      },
      {
        label: "Outside Estimates",
        current: currentSummary.outsideCount,
        previous: previousSummary.outsideCount,
      },
    ];
  }, [previousWeekQuery.data, query.data]);

  const handleSearch = () => {
    if (!activeRoomId) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("roomId", activeRoomId);
    nextParams.delete("date");
    nextParams.set("since", sinceInput);
    nextParams.set("until", untilInput);
    setSearchParams(nextParams);

    setPlaybackIndex(0);
    setIsPlaying(false);
    setAppliedFilters((current) => ({
      roomId: activeRoomId,
      since: toRequestSinceTimestamp(sinceInput),
      until: toRequestUntilTimestamp(untilInput),
      windowMinutes: DEFAULT_WINDOW_MINUTES,
      minimumAnchorMatches: DEFAULT_MINIMUM_ANCHOR_MATCHES,
      requestKey: (current?.requestKey ?? 0) + 1,
    }));
  };

  useEffect(() => {
    if (!isPlaying || playbackFrames.length <= 1) return;

    const timer = window.setInterval(() => {
      setPlaybackIndex((current) =>
        current >= playbackFrames.length - 1 ? 0 : current + 1,
      );
    }, PLAYBACK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isPlaying, playbackFrames.length]);

  return (
    <Box
      style={{
        background:
          "radial-gradient(circle at top left, rgba(251,191,36,0.09), transparent 25%), linear-gradient(180deg, #fcfcfb 0%, #f5f7fb 100%)",
        border: "1px solid #e5e7eb",
        borderRadius: 20,
        padding: 20,
      }}
    >
      <Stack gap="lg">
        <Card
          radius="xl"
          p="lg"
          style={{
            background: "#ffffffcc",
            backdropFilter: "blur(6px)",
            border: "1px solid #e5e7eb",
          }}
        >
          <Stack gap="lg">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Room BLE Location Estimates
                </Text>
                <Title order={2}>Location Estimates</Title>
                <Text size="sm" c="dimmed">
                  저장된 위치 추정 결과를 기기별 최신 위치 목록으로 조회합니다.
                </Text>
              </Stack>
              <Badge
                size="lg"
                radius="xl"
                color={query.isFetching ? "blue" : "gray"}
                variant="light"
              >
                {query.isFetching ? "조회 중" : "대기"}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <Select
                label="Room"
                placeholder="Room 선택"
                data={roomOptions}
                value={activeRoomId}
                onChange={(value) => setSelectedRoomId(value ?? undefined)}
                disabled={!roomOptions.length}
              />
              <TextInput
                label="Since"
                type="date"
                value={sinceInput}
                onChange={(event) => setSinceInput(event.target.value)}
              />
              <TextInput
                label="Until"
                type="date"
                value={untilInput}
                onChange={(event) => setUntilInput(event.target.value)}
              />
              <Group align="flex-end">
                <Button
                  onClick={handleSearch}
                  disabled={!activeRoomId}
                  loading={query.isFetching || playbackLoading}
                >
                  조회
                </Button>
              </Group>
            </SimpleGrid>
          </Stack>
        </Card>

        {!effectiveFilters && (
          <Center py="xl">
            <Text c="dimmed">
              조회 버튼을 누르면 위치 추정 데이터를 불러옵니다.
            </Text>
          </Center>
        )}

        {query.isError && (
          <Center py="xl" style={{ flexDirection: "column" }}>
            <IconAlertCircle size={32} />
            <Text mt="md" c="red">
              {query.error instanceof Error
                ? query.error.message
                : "위치 추정 결과를 불러오지 못했습니다."}
            </Text>
          </Center>
        )}

        {(query.isLoading || query.isFetching) && !query.data && (
          <Center py="xl">
            <Loader />
          </Center>
        )}

        {!query.isLoading && !query.isError && query.data && (
          <Stack gap="lg">
            <Card withBorder radius="xl" p="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="lg" fw={700}>
                      전주 동일 기간 비교
                    </Text>
                    <Text size="sm" c="dimmed">
                      현재 조회 기간과 7일 전 같은 시간 범위의 위치 추정 결과를
                      비교합니다.
                    </Text>
                  </Stack>
                  <Badge
                    color={previousWeekQuery.isFetching ? "blue" : "gray"}
                    variant="light"
                    radius="xl"
                  >
                    {previousWeekQuery.isFetching ? "전주 조회 중" : "전주 대비"}
                  </Badge>
                </Group>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="sm">
                  <Box>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                      Current
                    </Text>
                    <Text size="sm">
                      {formatDateRange(
                        query.data.timespan.since,
                        query.data.timespan.until,
                      )}
                    </Text>
                  </Box>
                  <Box>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                      Previous Week
                    </Text>
                    <Text size="sm">
                      {formatDateRange(
                        previousWeekFilters?.since,
                        previousWeekFilters?.until,
                      )}
                    </Text>
                  </Box>
                </SimpleGrid>

                {previousWeekQuery.isLoading && !previousWeekQuery.data ? (
                  <Center py="lg">
                    <Loader size="sm" />
                  </Center>
                ) : previousWeekQuery.isError ? (
                  <Text c="red" size="sm">
                    전주 동일 기간 데이터를 불러오지 못했습니다.
                  </Text>
                ) : weekComparisonMetrics.length ? (
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                    {weekComparisonMetrics.map((metric) => (
                      <ComparisonMetricCard key={metric.label} metric={metric} />
                    ))}
                  </SimpleGrid>
                ) : (
                  <Text c="dimmed" size="sm">
                    비교할 전주 데이터가 없습니다.
                  </Text>
                )}
              </Stack>
            </Card>

            <Card withBorder radius="xl" p="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="lg" fw={700}>
                      Frame Trend
                    </Text>
                    <Text size="sm" c="dimmed">
                      프레임별 추정 디바이스 수를 선택 기간과 전주 동일 시간대로
                      비교합니다.
                    </Text>
                  </Stack>
                  <Badge
                    color={previousWeekPlaybackLoading ? "blue" : "gray"}
                    variant="light"
                    radius="xl"
                  >
                    {previousWeekPlaybackLoading ? "전주 차트 조회 중" : "전주 비교"}
                  </Badge>
                </Group>

                {playbackTrendData ? (
                  <Box style={{ height: 280 }}>
                    <Bar
                      data={
                        playbackTrendData as ChartData<"bar", number[], string>
                      }
                      options={playbackTrendOptions}
                    />
                  </Box>
                ) : (
                  <Text c="dimmed">추세를 표시할 프레임이 없습니다.</Text>
                )}
              </Stack>
            </Card>

            <Card withBorder radius="xl" p="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="lg" fw={700}>
                      {DEFAULT_WINDOW_MINUTES}-Minute Playback
                    </Text>
                    <Text size="sm" c="dimmed">
                      선택한 시간 범위를 {DEFAULT_WINDOW_MINUTES}분 창으로 나눠 scatter
                      변화를 재생합니다. confidence{" "}
                      {formatNumber(CONFIDENCE_THRESHOLD, 2)} 이상만 표시합니다.
                    </Text>
                  </Stack>
                  <Group gap="sm">
                    <Badge variant="light" radius="xl" color="gray">
                      {playbackFrames.length} frames
                    </Badge>
                    <ActionIcon
                      variant="light"
                      size="lg"
                      radius="xl"
                      onClick={() => setIsPlaying((prev) => !prev)}
                      disabled={playbackFrames.length <= 1}
                    >
                      {isPlaying ? (
                        <IconPlayerPauseFilled size={18} />
                      ) : (
                        <IconPlayerPlayFilled size={18} />
                      )}
                    </ActionIcon>
                  </Group>
                </Group>

                <Group justify="space-between" align="flex-end" wrap="wrap">
                  <Stack gap={2}>
                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                      Current Frame
                    </Text>
                    <Title order={3}>
                      {formatFrameDate(activePlaybackFrame?.since)}
                    </Title>
                    <Text
                      fw={900}
                      style={{
                        fontSize: "clamp(2rem, 4vw, 3.1rem)",
                        lineHeight: 1.05,
                      }}
                    >
                      {formatFrameTime(
                        activePlaybackFrame?.since,
                        activePlaybackFrame?.until,
                      )}
                    </Text>
                  </Stack>
                  <Badge color="blue" variant="light" radius="xl">
                    Confidence fixed {formatNumber(CONFIDENCE_THRESHOLD, 2)}
                  </Badge>
                </Group>

                {playbackFrames.length ? (
                  <Stack gap="xs">
                    <Group justify="space-between" align="center" wrap="wrap">
                      <Text size="sm" fw={600}>
                        Frame {clampedPlaybackIndex + 1} /{" "}
                        {playbackFrames.length}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {activePlaybackFrame?.label}
                      </Text>
                    </Group>
                    <Slider
                      min={0}
                      max={Math.max(playbackFrames.length - 1, 0)}
                      step={1}
                      value={clampedPlaybackIndex}
                      onChange={setPlaybackIndex}
                      marks={playbackFrames.map((frame) => ({
                        value: frame.index,
                        label:
                          frame.index === 0 ||
                          frame.index === playbackFrames.length - 1
                            ? `${new Date(frame.since).getHours()}:${pad(
                                new Date(frame.since).getMinutes(),
                              )}`
                            : "",
                      }))}
                    />
                  </Stack>
                ) : (
                  <Text c="dimmed">
                    재생할 시간 구간이 없습니다. since / until 범위를
                    확인해주세요.
                  </Text>
                )}

                {playbackLoading ? (
                  <Center py="lg">
                    <Loader size="sm" />
                  </Center>
                ) : !playbackRadiomap ? (
                  <Text c="dimmed">Radiomap range is not available</Text>
                ) : (
                  <>
                    <Box
                      style={{
                        aspectRatio: String(scatterBounds.aspectRatio),
                        width: "100%",
                        maxWidth: `min(100%, ${Math.round(
                          SCATTER_MAX_HEIGHT_PX * scatterBounds.aspectRatio,
                        )}px)`,
                        maxHeight: SCATTER_MAX_HEIGHT_PX,
                        marginInline: "auto",
                      }}
                    >
                      <Scatter
                        data={scatterData}
                        options={scatterOptions}
                        plugins={scatterPlugins}
                      />
                    </Box>
                    <Group gap={8}>
                      <Badge color="blue" variant="light" radius="xl">
                        Inside estimate
                      </Badge>
                      <Badge color="red" variant="light" radius="xl">
                        Outside estimate
                      </Badge>
                      <Badge color="gray" variant="light" radius="xl">
                        점 크기 = confidence
                      </Badge>
                    </Group>
                  </>
                )}
              </Stack>
            </Card>

            <Card withBorder radius="xl" p="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="lg" fw={700}>
                      Frame Devices
                    </Text>
                    <Text size="sm" c="dimmed">
                      현재 선택된 프레임의 device 위치 추정 결과입니다.
                    </Text>
                  </Stack>
                  <Text size="sm" c="dimmed">
                    {playbackFrames[clampedPlaybackIndex]?.label ??
                      `${formatTimestamp(query.data.timespan.since)} ~ ${formatTimestamp(
                        query.data.timespan.until,
                      )}`}
                  </Text>
                </Group>

                {playbackDevices.length ? (
                  <Box style={{ overflowX: "auto" }}>
                    <Table striped highlightOnHover>
                      <thead>
                        <tr>
                          <th>Device</th>
                          <th>Estimate</th>
                          <th>Confidence</th>
                          <th>Signals</th>
                          <th>Latest Scanned</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playbackDevices.map((device) => (
                          <tr key={device.deviceMac}>
                            <td>
                              <Text fw={600}>{device.deviceMac}</Text>
                              <Text size="xs" c="dimmed">
                                {device.deviceName ?? "Unnamed"} · anchors{" "}
                                {device.matchedAnchors}
                              </Text>
                            </td>
                            <td>
                              {device.estimate ? (
                                <Stack gap={2}>
                                  <Text size="sm">
                                    x {formatNumber(device.estimate.x, 3)} / y{" "}
                                    {formatNumber(device.estimate.y, 3)}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    minDistance{" "}
                                    {formatNumber(
                                      device.estimate.minDistance,
                                      2,
                                    )}
                                  </Text>
                                </Stack>
                              ) : (
                                <Text size="sm" c="dimmed">
                                  No estimate
                                </Text>
                              )}
                            </td>
                            <td>
                              {device.estimate ? (
                                <Stack gap={2}>
                                  <Badge
                                    color={
                                      device.estimate.isOutside ? "red" : "blue"
                                    }
                                    variant="light"
                                    radius="xl"
                                  >
                                    {formatNumber(
                                      device.estimate.confidence,
                                      3,
                                    )}
                                  </Badge>
                                  <Text size="xs" c="dimmed">
                                    {device.estimate.isOutside
                                      ? "Outside"
                                      : "Inside"}
                                  </Text>
                                </Stack>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td>
                              <Group gap={6}>
                                {Object.entries(device.signals)
                                  .sort(([a], [b]) => Number(a) - Number(b))
                                  .map(([anchorId, rssi]) => (
                                    <Badge
                                      key={anchorId}
                                      variant="light"
                                      color="gray"
                                    >
                                      #{anchorId} {rssi} dBm
                                    </Badge>
                                  ))}
                              </Group>
                            </td>
                            <td>{formatTimestamp(device.latestScannedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Box>
                ) : (
                  <Text c="dimmed">
                    위치 추정 조건을 만족하는 디바이스가 없습니다.
                  </Text>
                )}
              </Stack>
            </Card>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
