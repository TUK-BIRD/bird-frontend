import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { IconAlertCircle } from "@tabler/icons-react";
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  NumberInput,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip as MantineTooltip,
  Title,
} from "@mantine/core";
import useBleDashboard from "@/hooks/useBleDashboard";
import useRooms from "@/hooks/useRooms";
import useBleAnchorHealth, {
  type AnchorHealthItem,
  type HealthState,
} from "@/hooks/useBleAnchorHealth";
import type {
  BleDashboardAnchorStat,
  BleDashboardTimeSeriesBucket,
} from "@/hooks/useBleDashboard";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ChartTitle,
  Tooltip,
  Legend,
);

const pad = (value: number) => value.toString().padStart(2, "0");

const toDateInputValue = (value: Date) => {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}`;
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

const formatTimestamp = (value?: string) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatTimeRange = (since?: string, until?: string) => {
  if (!since || !until) return "—";
  return `${formatTimestamp(since)} ~ ${formatTimestamp(until)}`;
};

const formatNumber = (value?: number | null, fractionDigits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatDelta = (
  value?: number | null,
  fractionDigits = 0,
  suffix = "",
) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, fractionDigits)}${suffix}`;
};

const getDeltaColor = (value?: number | null) => {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value) ||
    value === 0
  ) {
    return "gray";
  }
  return value > 0 ? "green" : "red";
};

const getDeltaTone = (value?: number | null) => {
  if (
    value === null ||
    value === undefined ||
    Number.isNaN(value) ||
    value === 0
  ) {
    return {
      text: "#6b7280",
      background: "#f3f4f6",
      border: "#d1d5db",
    };
  }

  return value > 0
    ? { text: "#15803d", background: "#dcfce7", border: "#86efac" }
    : { text: "#b91c1c", background: "#fee2e2", border: "#fca5a5" };
};

const calculatePercentChange = (
  current?: number | null,
  previous?: number | null,
) => {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined
  ) {
    return null;
  }

  if (previous === 0) {
    return current === 0 ? 0 : null;
  }

  return ((current - previous) / Math.abs(previous)) * 100;
};

const shiftDays = (value: string, days: number) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return toIsoWithOffset(date);
};

const relativeTimeFormatter = new Intl.RelativeTimeFormat("ko", {
  numeric: "auto",
});

const statusPriority: Record<HealthState, number> = {
  offline: 0,
  degraded: 1,
  online: 2,
  unknown: 3,
};

const healthStateMeta: Record<
  HealthState,
  { label: string; color: string; tone: string }
> = {
  online: { label: "Online", color: "green", tone: "#2f9e44" },
  degraded: { label: "Degraded", color: "orange", tone: "#f08c00" },
  offline: { label: "Offline", color: "red", tone: "#e03131" },
  unknown: { label: "Unknown", color: "gray", tone: "#868e96" },
};

const formatRelativeTime = (value?: string | null) => {
  if (!value) return "No health received";

  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "No health received";

  const diffSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) {
    return relativeTimeFormatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return relativeTimeFormatter.format(diffDays, "day");
};

const formatBinaryStatus = (
  value: boolean | null,
  connectedLabel: string,
  disconnectedLabel: string,
  unknownLabel: string,
) => {
  if (value === true) return connectedLabel;
  if (value === false) return disconnectedLabel;
  return unknownLabel;
};

const sortAnchorHealth = (anchors: AnchorHealthItem[]) => {
  return [...anchors].sort((a, b) => {
    const stateGap =
      statusPriority[a.healthState] - statusPriority[b.healthState];
    if (stateGap !== 0) return stateGap;

    const installedAtGap =
      new Date(b.installedAt ?? 0).getTime() -
      new Date(a.installedAt ?? 0).getTime();
    if (installedAtGap !== 0) return installedAtGap;

    return a.label.localeCompare(b.label, "ko");
  });
};

const mergeComparisonSeries = (
  current: BleDashboardTimeSeriesBucket[],
  previous: BleDashboardTimeSeriesBucket[],
) => {
  const previousByShiftedBucket = new Map<
    string,
    BleDashboardTimeSeriesBucket
  >();

  previous.forEach((bucket) => {
    previousByShiftedBucket.set(shiftDays(bucket.bucket, 7), bucket);
  });

  return current.map((bucket) => ({
    label: bucket.bucket,
    currentEventCount: bucket.eventCount,
    previousEventCount:
      previousByShiftedBucket.get(bucket.bucket)?.eventCount ?? null,
  }));
};

const buildAnchorComparison = (
  current: BleDashboardAnchorStat[],
  previous: BleDashboardAnchorStat[],
) => {
  const previousByKey = new Map(
    previous.map((anchor) => [
      String(anchor.anchorId ?? anchor.anchorUid ?? anchor.label ?? "unknown"),
      anchor,
    ]),
  );

  return current.map((anchor) => {
    const key = String(
      anchor.anchorId ?? anchor.anchorUid ?? anchor.label ?? "unknown",
    );
    const previousAnchor = previousByKey.get(key);

    return {
      key,
      label: anchor.label ?? "Unnamed Anchor",
      anchorUid: anchor.anchorUid,
      currentEventCount: anchor.eventCount,
      previousEventCount: previousAnchor?.eventCount ?? null,
      delta: previousAnchor
        ? anchor.eventCount - previousAnchor.eventCount
        : null,
      currentLastScannedAt: anchor.lastScannedAt,
      previousLastScannedAt: previousAnchor?.lastScannedAt ?? null,
    };
  });
};

export default function BleDashboardPanel() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [sinceInput, setSinceInput] = useState(() =>
    toDateInputValue(new Date(Date.now() - 24 * 60 * 60 * 1000)),
  );
  const [untilInput, setUntilInput] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [limit, setLimit] = useState(50);
  const bucketMinutesParam = searchParams.get("bucket_minutes");
  const bucketMinutes =
    bucketMinutesParam === "10" ||
    bucketMinutesParam === "30" ||
    bucketMinutesParam === "60"
      ? (Number(bucketMinutesParam) as 10 | 30 | 60)
      : 60;

  const { data: rooms } = useRooms(spaceId ?? "");

  const roomOptions = useMemo(
    () =>
      rooms?.map((room) => ({
        value: String(room.id),
        label: room.name,
      })) ?? [],
    [rooms],
  );

  const defaultRoomId = useMemo(
    () => (rooms && rooms.length ? String(rooms[0].id) : undefined),
    [rooms],
  );

  const activeRoomId = selectedRoomId ?? defaultRoomId;
  const activeRoomLabel = useMemo(() => {
    if (!rooms || !activeRoomId) return "—";
    const room = rooms.find((item) => String(item.id) === activeRoomId);
    return room?.name ?? "—";
  }, [rooms, activeRoomId]);

  const sinceParam = useMemo(
    () => toRequestSinceTimestamp(sinceInput),
    [sinceInput],
  );
  const untilParam = useMemo(
    () => toRequestUntilTimestamp(untilInput),
    [untilInput],
  );

  const classicQuery = useBleDashboard({
    spaceId: spaceId ?? "",
    roomId: activeRoomId,
    since: sinceParam,
    until: untilParam,
    limit,
    bucketMinutes,
    enabled: Boolean(activeRoomId),
  });

  const healthQuery = useBleAnchorHealth({
    spaceId: spaceId ?? "",
    roomId: activeRoomId,
    enabled: Boolean(activeRoomId),
  });

  const healthSummary = healthQuery.data?.summary;
  const healthAnchors = useMemo(
    () => sortAnchorHealth(healthQuery.data?.anchors ?? []),
    [healthQuery.data],
  );

  const classicComparison = classicQuery.data?.comparison?.previousWeek;
  const classicPreviousStats = classicComparison?.stats;
  const classicHealthKpis = classicQuery.data?.healthKpis;
  const classicAnchorBreakdown = useMemo(
    () => classicQuery.data?.stats.anchorBreakdown ?? [],
    [classicQuery.data],
  );
  const classicPreviousAnchorBreakdown = useMemo(
    () => classicPreviousStats?.anchorBreakdown ?? [],
    [classicPreviousStats],
  );
  const classicComparisonSeries = useMemo(
    () =>
      mergeComparisonSeries(
        classicQuery.data?.stats.timeSeries ?? [],
        classicPreviousStats?.timeSeries ?? [],
      ),
    [classicQuery.data?.stats.timeSeries, classicPreviousStats?.timeSeries],
  );
  const classicAnchorComparison = useMemo(
    () =>
      buildAnchorComparison(
        classicAnchorBreakdown,
        classicPreviousAnchorBreakdown,
      ),
    [classicAnchorBreakdown, classicPreviousAnchorBreakdown],
  );

  const totalEventsPercentDelta = useMemo(
    () =>
      calculatePercentChange(
        classicQuery.data?.stats.totalEvents,
        classicPreviousStats?.totalEvents,
      ),
    [classicPreviousStats?.totalEvents, classicQuery.data?.stats.totalEvents],
  );
  const uniqueDevicesPercentDelta = useMemo(
    () =>
      calculatePercentChange(
        classicQuery.data?.stats.uniqueDevices,
        classicPreviousStats?.uniqueDevices,
      ),
    [
      classicPreviousStats?.uniqueDevices,
      classicQuery.data?.stats.uniqueDevices,
    ],
  );

  const comparisonChartData = useMemo(() => {
    if (!classicComparisonSeries.length) return null;

    return {
      labels: classicComparisonSeries.map((bucket) => bucket.label),
      datasets: [
        {
          label: "Current Event Count",
          data: classicComparisonSeries.map(
            (bucket) => bucket.currentEventCount,
          ),
          borderColor: "#1d4ed8",
          backgroundColor: "rgba(29, 78, 216, 0.18)",
          tension: 0.3,
        },
        {
          label: "Last Week Event Count",
          data: classicComparisonSeries.map(
            (bucket) => bucket.previousEventCount,
          ),
          borderColor: "#94a3b8",
          backgroundColor: "rgba(148, 163, 184, 0.15)",
          tension: 0.3,
          borderDash: [6, 4],
        },
      ],
    };
  }, [classicComparisonSeries]);

  const chartLabels = useMemo(
    () => classicComparisonSeries.map((bucket) => bucket.label),
    [classicComparisonSeries],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: "top" as const,
        },
        title: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<"line">[]) => {
              const first = items[0];
              const label = first?.label as string | undefined;
              return label ? formatTimestamp(label) : "";
            },
            label: (context: TooltipItem<"line">) => {
              const y = context.parsed?.y ?? (context.raw as number);
              const datasetLabel = context.dataset.label ?? "";
              return `${datasetLabel}: ${Number(y).toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            callback: (value: string | number) => {
              const label = chartLabels[Number(value)] ?? "";
              if (!label) return "";
              const date = new Date(label);
              return date.toLocaleTimeString([], { hour: "2-digit" });
            },
            maxRotation: 0,
          },
          grid: {
            color: "#e5e7eb",
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "#f3f4f6",
          },
        },
      },
    }),
    [chartLabels],
  );

  const handleBucketMinutesChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("bucket_minutes", value);
    setSearchParams(nextParams);
  };

  return (
    <Box
      style={{
        background:
          "radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 28%), linear-gradient(180deg, #fcfcfb 0%, #f5f7fb 100%)",
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
                  Room BLE Scan Compare
                </Text>
                <Title order={2}>BLE Scan Dashboard</Title>
                <Text size="sm" c="dimmed">
                  현재 구간과 지난주 동일 시간대 스캔 흐름을 비교합니다.
                </Text>
              </Stack>
              <Stack align="flex-end" gap={6}>
                <Badge
                  size="lg"
                  radius="xl"
                  color={classicQuery.isFetching ? "blue" : "gray"}
                  variant="light"
                >
                  {classicQuery.isFetching ? "동기화 중" : "최신"}
                </Badge>
                <Text size="sm" c="dimmed">
                  {activeRoomLabel}
                </Text>
              </Stack>
            </Group>

            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Card withBorder radius="lg" p="md">
                <Stack gap={6}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Current Range
                  </Text>
                  <Text fw={700}>
                    {formatTimeRange(sinceParam, untilParam)}
                  </Text>
                </Stack>
              </Card>
              <Card withBorder radius="lg" p="md">
                <Stack gap={6}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Last Week Range
                  </Text>
                  <Text fw={700}>
                    {classicComparison
                      ? formatTimeRange(
                          classicComparison.timespan.since,
                          classicComparison.timespan.until,
                        )
                      : "No previous-week data"}
                  </Text>
                </Stack>
              </Card>
            </SimpleGrid>

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
              <Group align="flex-end" grow>
                <NumberInput
                  label="Limit"
                  min={1}
                  max={500}
                  value={limit}
                  onChange={(value) => setLimit(value ?? 50)}
                />
                <Button onClick={() => classicQuery.refetch()}>
                  새로 고침
                </Button>
              </Group>
            </SimpleGrid>

            <Stack gap={8}>
              <Text size="sm" fw={600}>
                Bucket Unit
              </Text>
              <SegmentedControl
                value={String(bucketMinutes)}
                onChange={handleBucketMinutesChange}
                data={[
                  { label: "10분", value: "10" },
                  { label: "30분", value: "30" },
                  { label: "60분", value: "60" },
                ]}
                fullWidth
              />
              <Text size="sm" c="dimmed">
                현재 버킷 단위: {bucketMinutes}분
              </Text>
            </Stack>
          </Stack>
        </Card>

        {classicQuery.isError && (
          <Center py="xl" style={{ flexDirection: "column" }}>
            <IconAlertCircle size={32} />
            <Text mt="md" c="red">
              {classicQuery.error instanceof Error
                ? classicQuery.error.message
                : "BLE 대시보드를 불러올 수 없습니다."}
            </Text>
          </Center>
        )}

        {(classicQuery.isLoading || classicQuery.isFetching) &&
          !classicQuery.data && (
            <Center py="xl">
              <Loader />
            </Center>
          )}

        {!classicQuery.isLoading &&
          !classicQuery.isError &&
          classicQuery.data && (
            <Stack gap="lg">
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                <Card withBorder radius="xl" p="lg">
                  <Stack gap="sm">
                    <Text size="sm" c="dimmed">
                      Total Events
                    </Text>
                    <Text size="2.2rem" fw={900}>
                      {formatNumber(classicQuery.data.stats.totalEvents)}
                    </Text>
                    {classicComparison ? (
                      <Box
                        style={{
                          borderRadius: 999,
                          padding: "8px 12px",
                          background: getDeltaTone(totalEventsPercentDelta)
                            .background,
                          border: `1px solid ${getDeltaTone(totalEventsPercentDelta).border}`,
                          color: getDeltaTone(totalEventsPercentDelta).text,
                          width: "fit-content",
                        }}
                      >
                        <Text size="sm" fw={700}>
                          {formatDelta(
                            totalEventsPercentDelta,
                            1,
                            "% vs last week",
                          )}
                        </Text>
                      </Box>
                    ) : (
                      <Text size="sm" c="dimmed">
                        No previous-week data
                      </Text>
                    )}
                  </Stack>
                </Card>

                <Card withBorder radius="xl" p="lg">
                  <Stack gap="sm">
                    <Text size="sm" c="dimmed">
                      Unique Devices
                    </Text>
                    <Text size="2.2rem" fw={900}>
                      {formatNumber(classicQuery.data.stats.uniqueDevices)}
                    </Text>
                    {classicComparison ? (
                      <Box
                        style={{
                          borderRadius: 999,
                          padding: "8px 12px",
                          background: getDeltaTone(uniqueDevicesPercentDelta)
                            .background,
                          border: `1px solid ${getDeltaTone(uniqueDevicesPercentDelta).border}`,
                          color: getDeltaTone(uniqueDevicesPercentDelta).text,
                          width: "fit-content",
                        }}
                      >
                        <Text size="sm" fw={700}>
                          {formatDelta(
                            uniqueDevicesPercentDelta,
                            1,
                            "% vs last week",
                          )}
                        </Text>
                      </Box>
                    ) : (
                      <Text size="sm" c="dimmed">
                        No previous-week data
                      </Text>
                    )}
                  </Stack>
                </Card>

                <Card
                  withBorder
                  radius="xl"
                  p="lg"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(15,118,110,0.1), rgba(37,99,235,0.04))",
                  }}
                >
                  <Stack gap="xs">
                    <Group justify="space-between" align="flex-start">
                      <Text size="sm" c="dimmed">
                        Healthy Rate
                      </Text>
                      {classicHealthKpis?.reachableRatePercent !== null &&
                      classicHealthKpis?.reachableRatePercent !== undefined ? (
                        <MantineTooltip
                          label={`Reachable (online + degraded) / total: ${formatNumber(
                            classicHealthKpis.reachableRatePercent,
                            1,
                          )}%`}
                        >
                          <Badge variant="light" color="teal" radius="xl">
                            Reachable{" "}
                            {formatNumber(
                              classicHealthKpis.reachableRatePercent,
                              1,
                            )}
                            %
                          </Badge>
                        </MantineTooltip>
                      ) : null}
                    </Group>
                    <Text size="3.1rem" fw={900} lh={1}>
                      {formatNumber(classicHealthKpis?.healthyRatePercent, 1)}%
                    </Text>
                    <Text size="sm" c="dimmed">
                      {formatNumber(classicHealthKpis?.onlineAnchors)} /{" "}
                      {formatNumber(classicHealthKpis?.totalAnchors)} anchors
                      healthy
                    </Text>
                    <Text size="xs" c="dimmed">
                      degraded{" "}
                      {formatNumber(classicHealthKpis?.degradedAnchors)} ·
                      offline {formatNumber(classicHealthKpis?.offlineAnchors)}{" "}
                      · unknown{" "}
                      {formatNumber(classicHealthKpis?.unknownAnchors)}
                    </Text>
                  </Stack>
                </Card>
              </SimpleGrid>

              <SimpleGrid cols={{ base: 1, xl: 3 }} spacing="md">
                <Card
                  withBorder
                  radius="xl"
                  p="lg"
                  style={{ gridColumn: "span 2" }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-end">
                      <Stack gap={2}>
                        <Text size="lg" fw={700}>
                          Current vs Last Week
                        </Text>
                        <Text size="sm" c="dimmed">
                          같은 시간대의 이벤트 흐름을 시간축으로 비교합니다.
                        </Text>
                      </Stack>
                      <Text size="sm" c="dimmed">
                        {chartLabels.length} buckets · {bucketMinutes}분 단위
                      </Text>
                    </Group>
                    {comparisonChartData ? (
                      <Box style={{ height: 320 }}>
                        <Line
                          data={comparisonChartData}
                          options={chartOptions}
                        />
                      </Box>
                    ) : (
                      <Text c="dimmed">
                        No previous-week data. 현재 구간 데이터만 확인
                        가능합니다.
                      </Text>
                    )}
                  </Stack>
                </Card>

                <Card withBorder radius="xl" p="lg">
                  <Stack gap="sm">
                    <Text size="lg" fw={700}>
                      Quick Read
                    </Text>
                    {classicComparison ? (
                      <>
                        <Text
                          c={getDeltaColor(classicComparison.delta.totalEvents)}
                          size="sm"
                        >
                          이벤트{" "}
                          {Math.abs(
                            classicComparison.delta.totalEvents,
                          ).toLocaleString()}
                          건{" "}
                          {classicComparison.delta.totalEvents > 0
                            ? "증가"
                            : classicComparison.delta.totalEvents < 0
                              ? "감소"
                              : "동일"}
                        </Text>
                        <Text
                          c={getDeltaColor(
                            classicComparison.delta.uniqueDevices,
                          )}
                          size="sm"
                        >
                          고유 디바이스{" "}
                          {Math.abs(
                            classicComparison.delta.uniqueDevices,
                          ).toLocaleString()}
                          대{" "}
                          {classicComparison.delta.uniqueDevices > 0
                            ? "증가"
                            : classicComparison.delta.uniqueDevices < 0
                              ? "감소"
                              : "동일"}
                        </Text>
                        <Text
                          c={getDeltaColor(classicComparison.delta.averageRssi)}
                          size="sm"
                        >
                          평균 RSSI{" "}
                          {classicComparison.delta.averageRssi === null
                            ? "비교 불가"
                            : `${Math.abs(classicComparison.delta.averageRssi).toFixed(1)} dBm ${
                                classicComparison.delta.averageRssi > 0
                                  ? "개선"
                                  : classicComparison.delta.averageRssi < 0
                                    ? "악화"
                                    : "동일"
                              }`}
                        </Text>
                      </>
                    ) : (
                      <Text c="dimmed" size="sm">
                        지난주 동일 시간 데이터가 없어 현재 지표만 표시합니다.
                      </Text>
                    )}
                  </Stack>
                </Card>
              </SimpleGrid>

              <Card withBorder radius="xl" p="lg">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-end">
                    <Stack gap={2}>
                      <Text size="lg" fw={700}>
                        Anchor Breakdown
                      </Text>
                      <Text size="sm" c="dimmed">
                        anchor별 현재/전주 이벤트 변화를 비교합니다.
                      </Text>
                    </Stack>
                    <Text size="sm" c="dimmed">
                      {classicAnchorBreakdown.length} anchors
                    </Text>
                  </Group>
                  {classicAnchorBreakdown.length ? (
                    <Box style={{ overflowX: "auto" }}>
                      <Table striped highlightOnHover>
                        <thead>
                          <tr>
                            <th>Anchor</th>
                            <th>Current</th>
                            <th>Last Week</th>
                            <th>Delta</th>
                            <th>Last Scanned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classicAnchorComparison.map((anchor) => (
                            <tr key={anchor.key}>
                              <td>
                                <Text fw={600}>{anchor.label}</Text>
                                <Text size="xs" c="dimmed">
                                  {anchor.anchorUid
                                    ? `UID ${anchor.anchorUid}`
                                    : "UID —"}
                                </Text>
                              </td>
                              <td>{formatNumber(anchor.currentEventCount)}</td>
                              <td>{formatNumber(anchor.previousEventCount)}</td>
                              <td>
                                <Box
                                  style={{
                                    borderRadius: 999,
                                    padding: "4px 10px",
                                    background: getDeltaTone(anchor.delta)
                                      .background,
                                    border: `1px solid ${getDeltaTone(anchor.delta).border}`,
                                    color: getDeltaTone(anchor.delta).text,
                                    width: "fit-content",
                                  }}
                                >
                                  <Text size="sm" fw={700}>
                                    {formatDelta(anchor.delta)}
                                  </Text>
                                </Box>
                              </td>
                              <td>
                                <Text size="sm">
                                  현재{" "}
                                  {formatTimestamp(
                                    anchor.currentLastScannedAt ?? undefined,
                                  )}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  전주{" "}
                                  {formatTimestamp(
                                    anchor.previousLastScannedAt ?? undefined,
                                  )}
                                </Text>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Box>
                  ) : (
                    <Text c="dimmed">
                      이 시간대에 수집된 스캔 데이터가 없습니다.
                    </Text>
                  )}
                </Stack>
              </Card>

              <Card withBorder radius="xl" p="lg">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-end">
                    <Stack gap={2}>
                      <Text size="lg" fw={700}>
                        Anchor Health
                      </Text>
                      <Text size="sm" c="dimmed">
                        room 단위 anchor 상태를 함께 확인합니다.
                      </Text>
                    </Stack>
                    <Button
                      variant="default"
                      size="xs"
                      onClick={() => healthQuery.refetch()}
                      loading={healthQuery.isFetching}
                      disabled={!activeRoomId}
                    >
                      Health 재시도
                    </Button>
                  </Group>

                  {healthQuery.isLoading && !healthQuery.data ? (
                    <Center py="lg">
                      <Loader size="sm" />
                    </Center>
                  ) : healthQuery.isError ? (
                    <Text c="red" size="sm">
                      Anchor health 정보를 불러오지 못했습니다.
                    </Text>
                  ) : !healthSummary ? (
                    <Text c="dimmed" size="sm">
                      Room을 선택하면 anchor health가 표시됩니다.
                    </Text>
                  ) : (
                    <Stack gap="md">
                      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }} spacing="sm">
                        {[
                          {
                            label: "Total",
                            value: healthSummary.total,
                            color: "dark",
                            tone: "#1f2937",
                          },
                          {
                            label: "Online",
                            value: healthSummary.online,
                            color: healthStateMeta.online.color,
                            tone: healthStateMeta.online.tone,
                          },
                          {
                            label: "Degraded",
                            value: healthSummary.degraded,
                            color: healthStateMeta.degraded.color,
                            tone: healthStateMeta.degraded.tone,
                          },
                          {
                            label: "Offline",
                            value: healthSummary.offline,
                            color: healthStateMeta.offline.color,
                            tone: healthStateMeta.offline.tone,
                          },
                          {
                            label: "Unknown",
                            value: healthSummary.unknown,
                            color: healthStateMeta.unknown.color,
                            tone: healthStateMeta.unknown.tone,
                          },
                        ].map((item) => (
                          <Card key={item.label} withBorder radius="lg" p="md">
                            <Stack gap={4}>
                              <Text size="sm" c="dimmed">
                                {item.label}
                              </Text>
                              <Text size="xl" fw={800} c={item.color}>
                                {item.value.toLocaleString()}
                              </Text>
                              <Box
                                style={{
                                  height: 4,
                                  borderRadius: 999,
                                  background: item.tone,
                                }}
                              />
                            </Stack>
                          </Card>
                        ))}
                      </SimpleGrid>

                      {healthAnchors.length ? (
                        <Box style={{ overflowX: "auto" }}>
                          <Table striped highlightOnHover>
                            <thead>
                              <tr>
                                <th>Anchor</th>
                                <th>State</th>
                                <th>Last Health</th>
                                <th>Wi-Fi</th>
                                <th>MQTT</th>
                                <th>Scan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {healthAnchors.map((anchor) => {
                                const state =
                                  healthStateMeta[anchor.healthState];

                                return (
                                  <tr key={anchor.id}>
                                    <td>
                                      <Text fw={600}>{anchor.label}</Text>
                                      <Text size="xs" c="dimmed">
                                        UID {anchor.anchorUid}
                                      </Text>
                                    </td>
                                    <td>
                                      <Group gap={8}>
                                        <Badge
                                          color={state.color}
                                          variant="light"
                                        >
                                          {state.label}
                                        </Badge>
                                        {anchor.healthIsStale && (
                                          <Badge
                                            color="yellow"
                                            variant="outline"
                                          >
                                            Stale
                                          </Badge>
                                        )}
                                      </Group>
                                    </td>
                                    <td>
                                      <Text size="sm">
                                        {formatRelativeTime(
                                          anchor.lastHealthPayloadAt,
                                        )}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        {anchor.lastHealthPayloadAt
                                          ? formatTimestamp(
                                              anchor.lastHealthPayloadAt,
                                            )
                                          : "No health received"}
                                      </Text>
                                    </td>
                                    <td>
                                      {formatBinaryStatus(
                                        anchor.wifiConnected,
                                        "Wi-Fi Connected",
                                        "Wi-Fi Disconnected",
                                        "Wi-Fi Unknown",
                                      )}
                                    </td>
                                    <td>
                                      {formatBinaryStatus(
                                        anchor.mqttConnected,
                                        "MQTT Connected",
                                        "MQTT Disconnected",
                                        "MQTT Unknown",
                                      )}
                                    </td>
                                    <td>
                                      {formatBinaryStatus(
                                        anchor.scanEnabled,
                                        "Scan On",
                                        "Scan Off",
                                        "Scan Unknown",
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </Table>
                        </Box>
                      ) : (
                        <Text c="dimmed">
                          No anchors installed in this room
                        </Text>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Card>
            </Stack>
          )}
      </Stack>
    </Box>
  );
}
