import { useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Progress,
  Select,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import useRooms from "@/hooks/useRooms";
import useOverviewDashboard, {
  type OverviewAnchorHealthItem,
  type OverviewTimeSlot,
} from "@/hooks/useOverviewDashboard";
import type { HealthState } from "@/hooks/useBleAnchorHealth";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const statusPriority: Record<HealthState, number> = {
  offline: 0,
  degraded: 1,
  online: 2,
  unknown: 3,
};

const healthStateMeta: Record<
  HealthState,
  { label: string; color: string; background: string; border: string }
> = {
  online: {
    label: "Online",
    color: "green",
    background: "#f0fdf4",
    border: "#86efac",
  },
  degraded: {
    label: "Degraded",
    color: "orange",
    background: "#fff7ed",
    border: "#fdba74",
  },
  offline: {
    label: "Offline",
    color: "red",
    background: "#fef2f2",
    border: "#fca5a5",
  },
  unknown: {
    label: "Unknown",
    color: "gray",
    background: "#f8fafc",
    border: "#cbd5e1",
  },
};

const pad = (value: number) => value.toString().padStart(2, "0");

const toDateInputValue = (value: Date) => {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate(),
  )}`;
};

const getTodayStartInputValue = () => {
  return toDateInputValue(new Date());
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

const formatNumber = (value?: number | null, fractionDigits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatPercent = (value?: number | null) => `${formatNumber(value, 1)}%`;

const formatTimestamp = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatBucketLabel = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatBucketRange = (bucket: string, bucketMinutes: number) => {
  const start = new Date(bucket);
  if (Number.isNaN(start.getTime())) return "-";
  const end = new Date(start.getTime() + bucketMinutes * 60 * 1000);
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  };

  return `${start.toLocaleTimeString(undefined, timeOptions)} - ${end.toLocaleTimeString(
    undefined,
    timeOptions,
  )}`;
};

const sortAnchorHealth = (anchors: OverviewAnchorHealthItem[]) =>
  [...anchors].sort((a, b) => {
    const stateGap =
      statusPriority[a.healthState] - statusPriority[b.healthState];
    if (stateGap !== 0) return stateGap;
    return a.label.localeCompare(b.label, "ko");
  });

const sortBusiestSlots = (slots: OverviewTimeSlot[]) =>
  [...slots].sort((a, b) => b.uniqueDeviceCount - a.uniqueDeviceCount);

type ScanCommandState = "on" | "off";

interface RoomScanStatusResponse {
  latest: {
    reported_state: ScanCommandState | null;
    reportedState?: ScanCommandState | null;
    state?: ScanCommandState | null;
    command_state?: ScanCommandState | null;
    commandState?: ScanCommandState | null;
    request_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
}

interface RoomScanControlResponse {
  state?: ScanCommandState;
  reported_state?: ScanCommandState;
  latest?: RoomScanStatusResponse["latest"];
}

const scanStatusQueryKey = (spaceId?: string, roomId?: string) => [
  "roomScanStatus",
  spaceId,
  roomId,
];

const getErrorMessage = (error: unknown) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ECONNABORTED"
  ) {
    return "스캔 명령 요청 시간이 초과되었습니다. 서버 처리 상태를 확인해주세요.";
  }
  if (error instanceof Error) return error.message;
  return "스캔 명령 처리 중 오류가 발생했습니다.";
};

const normalizeScanCommandState = (value: unknown) => {
  return value === "on" || value === "off" ? value : null;
};

const getLatestScanCommandState = (status?: RoomScanStatusResponse) => {
  const latest = status?.latest;
  if (!latest) return null;

  return (
    normalizeScanCommandState(latest.reported_state) ??
    normalizeScanCommandState(latest.reportedState) ??
    normalizeScanCommandState(latest.state) ??
    normalizeScanCommandState(latest.command_state) ??
    normalizeScanCommandState(latest.commandState)
  );
};

const getScanControlResponseState = (
  response: RoomScanControlResponse,
  fallback: ScanCommandState,
) => {
  return (
    normalizeScanCommandState(response.latest?.reported_state) ??
    normalizeScanCommandState(response.latest?.reportedState) ??
    normalizeScanCommandState(response.latest?.state) ??
    normalizeScanCommandState(response.latest?.command_state) ??
    normalizeScanCommandState(response.latest?.commandState) ??
    normalizeScanCommandState(response.reported_state) ??
    normalizeScanCommandState(response.state) ??
    fallback
  );
};

export default function OverviewDashboardPanel() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const queryClient = useQueryClient();
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [scanControlError, setScanControlError] = useState<string | null>(null);
  const [sinceInput, setSinceInput] = useState(getTodayStartInputValue);
  const [untilInput, setUntilInput] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [bucketMinutes, setBucketMinutes] = useState<10 | 30 | 60>(10);
  const [limit, setLimit] = useState<5 | 10>(5);

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
    if (!rooms || !activeRoomId) return "-";
    return rooms.find((room) => String(room.id) === activeRoomId)?.name ?? "-";
  }, [rooms, activeRoomId]);

  const overviewQuery = useOverviewDashboard({
    spaceId: spaceId ?? "",
    roomId: activeRoomId,
    since: toRequestSinceTimestamp(sinceInput),
    until: toRequestUntilTimestamp(untilInput),
    bucketMinutes,
    limit,
    enabled: Boolean(activeRoomId),
  });
  const scanStatusQuery = useQuery<RoomScanStatusResponse>({
    queryKey: scanStatusQueryKey(spaceId, activeRoomId),
    queryFn: () =>
      apiClient
        .get(`/spaces/${spaceId}/rooms/${activeRoomId}/scan-status`)
        .then((res) => res.data as RoomScanStatusResponse),
    enabled: Boolean(spaceId && activeRoomId),
  });
  const latestScanState = getLatestScanCommandState(scanStatusQuery.data);
  const isScanCommandOn = latestScanState === "on";
  const scanStatusLabel =
    latestScanState === "on"
      ? "마지막 명령: 스캔 시작"
      : latestScanState === "off"
        ? "마지막 명령: 스캔 중지"
        : "상태 없음";
  const nextScanState: ScanCommandState = isScanCommandOn ? "off" : "on";
  const scanButtonLabel = isScanCommandOn ? "스캔 중지" : "스캔 시작";
  const scanControlMutation = useMutation({
    mutationFn: (state: ScanCommandState) =>
      apiClient
        .post(
          `/spaces/${spaceId}/rooms/${activeRoomId}/scan-control`,
          {
            state,
          },
          {
            timeout: 10000,
          },
        )
        .then((res) => res.data as RoomScanControlResponse),
    onMutate: () => {
      setScanControlError(null);
    },
    onSuccess: (data, state) => {
      const responseState = getScanControlResponseState(data, state);
      queryClient.setQueryData<RoomScanStatusResponse>(
        scanStatusQueryKey(spaceId, activeRoomId),
        (current) => ({
          ...current,
          latest: {
            ...current?.latest,
            ...data.latest,
            reported_state: responseState,
          },
        }),
      );
      void queryClient.invalidateQueries({
        queryKey: scanStatusQueryKey(spaceId, activeRoomId),
      });
    },
    onError: (error) => {
      setScanControlError(getErrorMessage(error));
    },
  });
  const isScanControlBusy = scanControlMutation.isPending;

  const overview = overviewQuery.data;
  const anchors = useMemo(
    () => sortAnchorHealth(overview?.anchorHealth.anchors ?? []),
    [overview?.anchorHealth.anchors],
  );
  const busiestSlots = useMemo(
    () => sortBusiestSlots(overview?.busiestTimeSlots ?? []),
    [overview?.busiestTimeSlots],
  );
  const timeSeries = useMemo(
    () => overview?.timeSeries ?? [],
    [overview?.timeSeries],
  );
  const isEmptyOccupancy = overview?.occupancy.uniqueDeviceCount === 0;

  const chartData = useMemo(
    () => ({
      labels: timeSeries.map((slot) => slot.bucket),
      datasets: [
        {
          label: "측정된 기기 수",
          data: timeSeries.map((slot) => slot.uniqueDeviceCount),
          backgroundColor: "#2563eb",
          borderRadius: 4,
          barThickness: 18,
          maxBarThickness: 28,
        },
      ],
    }),
    [timeSeries],
  );

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: (items: TooltipItem<"bar">[]) =>
              formatBucketRange(
                String(items[0]?.label ?? ""),
                overview?.timespan.bucketMinutes ?? bucketMinutes,
              ),
            label: (context: TooltipItem<"bar">) =>
              `측정된 기기 수: ${formatNumber(context.parsed.y)}`,
          },
        },
      },
      scales: {
        x: {
          ticks: {
            callback: (value: string | number) =>
              formatBucketLabel(timeSeries[Number(value)]?.bucket),
            maxRotation: 0,
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0,
          },
          grid: {
            color: "#eef2f7",
          },
        },
      },
    }),
    [bucketMinutes, overview?.timespan.bucketMinutes, timeSeries],
  );

  return (
    <Box>
      <Stack gap="md">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
              Overview Dashboard
            </Text>
            <Title order={2}>종합 대시보드</Title>
            <Text size="lg" fw={700}>
              {overview
                ? `${formatTimestamp(overview.timespan.since)} ~ ${formatTimestamp(
                    overview.timespan.until,
                  )}`
                : "조회 시간 범위를 불러오는 중"}
            </Text>
          </Stack>
          <Stack align="flex-end" gap={6}>
            <Badge
              size="lg"
              color={overviewQuery.isFetching ? "blue" : "gray"}
              variant="light"
            >
              {overviewQuery.isFetching ? "동기화 중" : "최신"}
            </Badge>
            <Text size="sm" c="dimmed">
              {activeRoomLabel}
            </Text>
          </Stack>
        </Group>

        <Card withBorder radius="md" p="md">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="md">
            <Select
              label="Room"
              placeholder="Room 선택"
              data={roomOptions}
              value={activeRoomId}
              onChange={(value) => {
                setSelectedRoomId(value ?? undefined);
                setScanControlError(null);
              }}
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
            <Stack gap={6}>
              <Text size="sm" fw={600}>
                Bucket
              </Text>
              <SegmentedControl
                value={String(bucketMinutes)}
                onChange={(value) =>
                  setBucketMinutes(Number(value) as 10 | 30 | 60)
                }
                data={[
                  { label: "10분", value: "10" },
                  { label: "30분", value: "30" },
                  { label: "60분", value: "60" },
                ]}
              />
            </Stack>
            <Stack gap={6}>
              <Text size="sm" fw={600}>
                Limit
              </Text>
              <SegmentedControl
                value={String(limit)}
                onChange={(value) => setLimit(Number(value) as 5 | 10)}
                data={[
                  { label: "5", value: "5" },
                  { label: "10", value: "10" },
                ]}
              />
            </Stack>
          </SimpleGrid>
        </Card>

        {overviewQuery.isError && (
          <Center py="xl" style={{ flexDirection: "column" }}>
            <IconAlertCircle size={32} />
            <Text mt="md" c="red">
              {overviewQuery.error instanceof Error
                ? overviewQuery.error.message
                : "종합 대시보드를 불러올 수 없습니다."}
            </Text>
          </Center>
        )}

        {overviewQuery.isLoading && !overview && (
          <Center py="xl">
            <Loader />
          </Center>
        )}

        {!overviewQuery.isError && overview && (
          <Stack gap="md">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {[
                {
                  label: "측정된 기기 수",
                  value: formatNumber(overview.occupancy.uniqueDeviceCount),
                },
                {
                  label: "점유율",
                  value: formatPercent(
                    overview.occupancy.occupiedCellRatePercent,
                  ),
                },
                {
                  label: "앵커 정상률",
                  value: formatPercent(
                    overview.anchorHealth.summary.healthyRatePercent,
                  ),
                },
                {
                  label: "연결 가능률",
                  value: formatPercent(
                    overview.anchorHealth.summary.reachableRatePercent,
                  ),
                },
              ].map((item) => (
                <Card key={item.label} withBorder radius="md" p="md">
                  <Text size="sm" c="dimmed">
                    {item.label}
                  </Text>
                  <Text mt={6} size="2rem" fw={900} lh={1.1}>
                    {item.value}
                  </Text>
                </Card>
              ))}
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <Card withBorder radius="md" p="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-start">
                    <Stack gap={2}>
                      <Text size="lg" fw={700}>
                        혼잡도 / 점유율
                      </Text>
                      <Text size="sm" c="dimmed">
                        cell size {formatNumber(overview.occupancy.cellSize, 2)}
                      </Text>
                    </Stack>
                    <Badge variant="light" color="blue">
                      {overview.timespan.bucketMinutes}분 bucket
                    </Badge>
                  </Group>

                  {isEmptyOccupancy ? (
                    <Text c="dimmed">
                      선택한 시간 범위에 측정된 기기가 없습니다
                    </Text>
                  ) : (
                    <Stack gap="sm">
                      <Text size="3rem" fw={900} lh={1}>
                        {formatNumber(overview.occupancy.uniqueDeviceCount)}
                      </Text>
                      <Progress
                        value={overview.occupancy.occupiedCellRatePercent ?? 0}
                        size="lg"
                        radius="sm"
                        color="blue"
                      />
                      <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                          점유율{" "}
                          {formatPercent(
                            overview.occupancy.occupiedCellRatePercent,
                          )}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {formatNumber(overview.occupancy.occupiedCellCount)} /{" "}
                          {formatNumber(overview.occupancy.totalCellCount)} cells
                        </Text>
                      </Group>
                    </Stack>
                  )}

                  <Group gap="lg">
                    <Text size="sm" c="dimmed">
                      estimates{" "}
                      <Text span fw={700} c="dark">
                        {formatNumber(overview.occupancy.estimateCount)}
                      </Text>
                    </Text>
                    <Text size="sm" c="dimmed">
                      occupied cells{" "}
                      <Text span fw={700} c="dark">
                        {formatNumber(overview.occupancy.occupiedCellCount)}
                      </Text>
                    </Text>
                  </Group>
                </Stack>
              </Card>

              <Card withBorder radius="md" p="md">
                <Stack gap="md">
                  <Group justify="space-between">
                    <Text size="lg" fw={700}>
                      Anchor Health
                    </Text>
                    <Text size="sm" c="dimmed">
                      {formatNumber(
                        overview.anchorHealth.summary.totalAnchors,
                      )}{" "}
                      anchors
                    </Text>
                  </Group>

                  <Box
                    style={{
                      border: "1px solid #dbeafe",
                      background: "#eff6ff",
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <Stack gap="sm">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={2}>
                          <Text size="sm" fw={700}>
                            BLE 스캔 명령
                          </Text>
                          <Text size="xs" c="dimmed">
                            서버가 마지막으로 보낸 스캔 명령 상태입니다.
                          </Text>
                        </Stack>
                        <Badge
                          radius="xl"
                          color={
                            latestScanState === "on"
                              ? "green"
                              : latestScanState === "off"
                                ? "gray"
                                : "yellow"
                          }
                          variant="light"
                        >
                          {scanStatusQuery.isLoading
                            ? "상태 조회 중"
                            : scanStatusLabel}
                        </Badge>
                      </Group>
                      {(scanControlError || scanStatusQuery.isError) && (
                        <Alert color="red" icon={<IconAlertCircle size={16} />}>
                          {scanControlError ??
                            getErrorMessage(scanStatusQuery.error)}
                        </Alert>
                      )}
                      <Group justify="space-between" align="center">
                        <Text size="xs" c="dimmed">
                          실제 Anchor 상태는 health_scan_enabled를 확인해야
                          합니다.
                        </Text>
                        <Button
                          size="xs"
                          color={isScanCommandOn ? "red" : "blue"}
                          disabled={!activeRoomId || isScanControlBusy}
                          loading={scanControlMutation.isPending}
                          onClick={() =>
                            scanControlMutation.mutate(nextScanState)
                          }
                        >
                          {scanButtonLabel}
                        </Button>
                      </Group>
                    </Stack>
                  </Box>

                  <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                    {[
                      {
                        label: "online",
                        value: overview.anchorHealth.summary.onlineAnchors,
                        state: "online" as HealthState,
                      },
                      {
                        label: "degraded",
                        value: overview.anchorHealth.summary.degradedAnchors,
                        state: "degraded" as HealthState,
                      },
                      {
                        label: "offline",
                        value: overview.anchorHealth.summary.offlineAnchors,
                        state: "offline" as HealthState,
                      },
                      {
                        label: "unknown",
                        value: overview.anchorHealth.summary.unknownAnchors,
                        state: "unknown" as HealthState,
                      },
                    ].map((item) => {
                      const meta = healthStateMeta[item.state];
                      return (
                        <Box
                          key={item.label}
                          style={{
                            border: `1px solid ${meta.border}`,
                            background: meta.background,
                            borderRadius: 8,
                            padding: 12,
                          }}
                        >
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                            {item.label}
                          </Text>
                          <Text size="1.4rem" fw={900}>
                            {formatNumber(item.value)}
                          </Text>
                        </Box>
                      );
                    })}
                  </SimpleGrid>

                  {anchors.length ? (
                    <Stack gap="xs">
                      {anchors.map((anchor) => {
                        const meta = healthStateMeta[anchor.healthState];
                        return (
                          <Box
                            key={anchor.id}
                            style={{
                              border: `1px solid ${meta.border}`,
                              background: meta.background,
                              borderRadius: 8,
                              padding: 12,
                            }}
                          >
                            <Group justify="space-between" align="flex-start">
                              <Stack gap={2}>
                                <Group gap="xs">
                                  <Text fw={700}>{anchor.label}</Text>
                                  <Badge
                                    color={meta.color}
                                    variant="light"
                                    radius="sm"
                                  >
                                    {meta.label}
                                  </Badge>
                                </Group>
                                <Text size="xs" c="dimmed">
                                  UID {anchor.anchorUid}
                                </Text>
                              </Stack>
                              <Text size="xs" c="dimmed">
                                {formatTimestamp(anchor.lastHealthPayloadAt)}
                              </Text>
                            </Group>
                            {anchor.healthIsStale ? (
                              <Group gap="xs" mt="sm">
                                <Badge color="yellow" variant="light">
                                  stale
                                </Badge>
                              </Group>
                            ) : null}
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Text c="dimmed">설치된 앵커가 없습니다</Text>
                  )}
                </Stack>
              </Card>
            </SimpleGrid>

            <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md">
              <Card withBorder radius="md" p="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-end">
                    <Text size="lg" fw={700}>
                      붐비는 시간대
                    </Text>
                    <Text size="sm" c="dimmed">
                      uniqueDeviceCount 내림차순
                    </Text>
                  </Group>
                  {busiestSlots.length ? (
                    <Table.ScrollContainer minWidth={520}>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>시간대</Table.Th>
                            <Table.Th>기기 수</Table.Th>
                            <Table.Th>Estimates</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {busiestSlots.map((slot) => (
                            <Table.Tr key={slot.bucket}>
                              <Table.Td>
                                <Text fw={800}>
                                  {formatBucketRange(
                                    slot.bucket,
                                    overview.timespan.bucketMinutes,
                                  )}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                {formatNumber(slot.uniqueDeviceCount)}
                              </Table.Td>
                              <Table.Td>
                                {formatNumber(slot.estimateCount)}
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    </Table.ScrollContainer>
                  ) : (
                    <Text c="dimmed">
                      선택한 시간 범위에 측정된 기기가 없습니다
                    </Text>
                  )}
                </Stack>
              </Card>

              <Card withBorder radius="md" p="md">
                <Stack gap="md">
                  <Group justify="space-between" align="flex-end">
                    <Text size="lg" fw={700}>
                      시간대 추이
                    </Text>
                    <Text size="sm" c="dimmed">
                      {overview.timespan.bucketMinutes}분 단위
                    </Text>
                  </Group>
                  {timeSeries.length ? (
                    <Box style={{ height: 320 }}>
                      <Bar data={chartData} options={chartOptions} />
                    </Box>
                  ) : (
                    <Text c="dimmed">
                      선택한 시간 범위에 측정된 기기가 없습니다
                    </Text>
                  )}
                </Stack>
              </Card>
            </SimpleGrid>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
