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
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/client";
import useRooms from "@/hooks/useRooms";
import useOverviewDashboard, {
  type OverviewAnchorHealthItem,
} from "@/hooks/useOverviewDashboard";
import type { HealthState } from "@/hooks/useBleAnchorHealth";

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

const sortAnchorHealth = (anchors: OverviewAnchorHealthItem[]) =>
  [...anchors].sort((a, b) => {
    const stateGap =
      statusPriority[a.healthState] - statusPriority[b.healthState];
    if (stateGap !== 0) return stateGap;
    return a.label.localeCompare(b.label, "ko");
  });

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
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
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
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
