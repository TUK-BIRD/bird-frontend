import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  MultiSelect,
  NumberInput,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  TagsInput,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  type TooltipItem,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { IconAlertCircle, IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import useRooms from "@/hooks/useRooms";
import useBleAnchorHealth from "@/hooks/useBleAnchorHealth";
import useBleAnchorSetChart, {
  type BleAnchorSetMatchedDevice,
  type BleAnchorSetTimeSeriesItem,
} from "@/hooks/useBleAnchorSetChart";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const DEFAULT_LIMIT = 200;
const DEFAULT_BUCKET_MINUTES = 10;
type BucketMinutes = 10 | 30 | 60;

const pad = (value: number) => value.toString().padStart(2, "0");

const toDateInputValue = (value: Date) => {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(
    value.getDate()
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
    0
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
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
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
  if (localDateOnly) return toDateInputValue(localDateOnly);

  const localDateTime = parseLocalDateTimeInput(value);
  if (localDateTime) return toDateInputValue(localDateTime);

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return toDateInputValue(parsed);
};

const formatTimestamp = (value?: string | null) => {
  if (!value) return "—";
  return new Date(value).toLocaleString();
};

const formatNumber = (value?: number | null, fractionDigits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const sortMatchedDevices = (devices: BleAnchorSetMatchedDevice[]) => {
  return [...devices].sort((a, b) => b.scanCount - a.scanCount);
};

const sortTimeSeries = (timeSeries: BleAnchorSetTimeSeriesItem[]) => {
  return [...timeSeries].sort(
    (a, b) => new Date(a.bucket).getTime() - new Date(b.bucket).getTime()
  );
};

const parseNumberList = (values: string[]) => {
  return values
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));
};

const normalizeDeviceMac = (value: string) => value.trim().toLowerCase();

const buildSearchParams = (filters: {
  roomId?: string;
  sinceInput: string;
  untilInput: string;
  bucketMinutes: BucketMinutes;
  anchorIds: string[];
  excludeDeviceMacs: string[];
  limit: number;
}) => {
  const params = new URLSearchParams();

  if (filters.roomId) params.set("roomId", filters.roomId);
  if (filters.sinceInput) params.set("since", filters.sinceInput);
  if (filters.untilInput) params.set("until", filters.untilInput);
  if (filters.bucketMinutes !== DEFAULT_BUCKET_MINUTES) {
    params.set("bucket_minutes", String(filters.bucketMinutes));
  }
  if (filters.limit !== DEFAULT_LIMIT) params.set("limit", String(filters.limit));
  filters.anchorIds.forEach((anchorId) => params.append("anchor_ids[]", anchorId));
  filters.excludeDeviceMacs.forEach((deviceMac) =>
    params.append("exclude_device_macs[]", deviceMac)
  );

  return params;
};

interface BleAnchorSetChartViewProps {
  currentAnchorIds: string[];
  currentBucketMinutes: BucketMinutes;
  currentExcludeDeviceMacs: string[];
  currentLimit: number;
  currentRoomId: string;
  currentSinceInput: string;
  currentUntilInput: string;
  defaultRoomId: string;
  defaultSinceInput: string;
  defaultUntilInput: string;
  rooms: Awaited<ReturnType<typeof useRooms>>["data"];
  setSearchParams: ReturnType<typeof useSearchParams>[1];
  spaceId?: string;
}

function BleAnchorSetChartView({
  currentAnchorIds,
  currentBucketMinutes,
  currentExcludeDeviceMacs,
  currentLimit,
  currentRoomId,
  currentSinceInput,
  currentUntilInput,
  defaultRoomId,
  defaultSinceInput,
  defaultUntilInput,
  rooms,
  setSearchParams,
  spaceId,
}: BleAnchorSetChartViewProps) {
  const [draftRoomId, setDraftRoomId] = useState(currentRoomId);
  const [draftSinceInput, setDraftSinceInput] = useState(currentSinceInput);
  const [draftUntilInput, setDraftUntilInput] = useState(currentUntilInput);
  const [draftAnchorIds, setDraftAnchorIds] = useState<string[]>(currentAnchorIds);
  const [draftBucketMinutes, setDraftBucketMinutes] =
    useState<BucketMinutes>(currentBucketMinutes);
  const [draftExcludeDeviceMacs, setDraftExcludeDeviceMacs] = useState<string[]>(
    currentExcludeDeviceMacs
  );
  const [draftLimit, setDraftLimit] = useState(
    Number.isFinite(currentLimit) ? currentLimit : DEFAULT_LIMIT
  );
  const [expandedBuckets, setExpandedBuckets] = useState<Record<string, boolean>>({});

  const anchorOptionsQuery = useBleAnchorHealth({
    spaceId: spaceId ?? "",
    roomId: draftRoomId,
    enabled: Boolean(draftRoomId),
  });

  const appliedSince = useMemo(
    () => toRequestSinceTimestamp(currentSinceInput),
    [currentSinceInput]
  );
  const appliedUntil = useMemo(
    () => toRequestUntilTimestamp(currentUntilInput),
    [currentUntilInput]
  );
  const appliedAnchorIds = useMemo(() => parseNumberList(currentAnchorIds), [currentAnchorIds]);

  const chartQuery = useBleAnchorSetChart({
    spaceId: spaceId ?? "",
    roomId: currentRoomId || undefined,
    since: appliedSince,
    until: appliedUntil,
    bucketMinutes: currentBucketMinutes,
    anchorIds: appliedAnchorIds,
    excludeDeviceMacs: currentExcludeDeviceMacs,
    enabled: Boolean(currentRoomId && appliedAnchorIds.length >= 2),
  });

  const anchorOptions = useMemo(
    () =>
      (anchorOptionsQuery.data?.anchors ?? []).map((anchor) => ({
        value: String(anchor.id),
        label: `${anchor.label} (#${anchor.id})`,
      })),
    [anchorOptionsQuery.data]
  );

  const timeSeries = useMemo(
    () => sortTimeSeries(chartQuery.data?.stats.timeSeries ?? []),
    [chartQuery.data]
  );

  const chartData = useMemo(() => {
    if (!timeSeries.length) return null;

    return {
      labels: timeSeries.map((bucket) => bucket.bucket),
      datasets: [
        {
          label: "Event Count",
          data: timeSeries.map((bucket) => bucket.eventCount),
          borderColor: "#1d4ed8",
          backgroundColor: "rgba(29, 78, 216, 0.65)",
          borderRadius: 6,
        },
      ],
    };
  }, [timeSeries]);

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
            title: (items: TooltipItem<"bar">[]) => {
              const label = items[0]?.label;
              return label ? formatTimestamp(label) : "";
            },
            label: (context: TooltipItem<"bar">) =>
              `Event Count: ${Number(context.parsed.y).toLocaleString()}`,
            afterLabel: (context: TooltipItem<"bar">) => {
              const bucket = timeSeries[context.dataIndex];
              return bucket
                ? `Unique Devices: ${bucket.uniqueDeviceCount.toLocaleString()}`
                : "";
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            callback: (value: string | number) => {
              const label = timeSeries[Number(value)]?.bucket;
              if (!label) return "";
              const date = new Date(label);
              return date.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
            },
            maxRotation: 0,
          },
          grid: {
            color: "#eef2f7",
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: "#eef2f7",
          },
        },
      },
    }),
    [timeSeries]
  );

  const handleApply = () => {
    setSearchParams(
      buildSearchParams({
        roomId: draftRoomId,
        sinceInput: draftSinceInput,
        untilInput: draftUntilInput,
        bucketMinutes: draftBucketMinutes,
        anchorIds: draftAnchorIds,
        excludeDeviceMacs: draftExcludeDeviceMacs.map(normalizeDeviceMac),
        limit: draftLimit,
      })
    );
    setExpandedBuckets({});
  };

  const handleReset = () => {
    const resetRoomId = defaultRoomId;
    const resetSince = defaultSinceInput;
    const resetUntil = defaultUntilInput;

    setDraftRoomId(resetRoomId);
    setDraftSinceInput(resetSince);
    setDraftUntilInput(resetUntil);
    setDraftAnchorIds([]);
    setDraftBucketMinutes(DEFAULT_BUCKET_MINUTES);
    setDraftExcludeDeviceMacs([]);
    setDraftLimit(DEFAULT_LIMIT);
    setSearchParams(
      buildSearchParams({
        roomId: resetRoomId,
        sinceInput: resetSince,
        untilInput: resetUntil,
        bucketMinutes: DEFAULT_BUCKET_MINUTES,
        anchorIds: [],
        excludeDeviceMacs: [],
        limit: DEFAULT_LIMIT,
      })
    );
    setExpandedBuckets({});
  };

  const toggleBucket = (bucket: string) => {
    setExpandedBuckets((prev) => ({
      ...prev,
      [bucket]: !prev[bucket],
    }));
  };

  const hasEnoughAnchors = currentAnchorIds.length >= 2;

  return (
    <Box
      style={{
        background:
          "radial-gradient(circle at top left, rgba(15,118,110,0.08), transparent 26%), linear-gradient(180deg, #fcfcfb 0%, #f4f7fb 100%)",
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
                  Room BLE Anchor Set Chart
                </Text>
                <Title order={2}>Anchor Set Match Dashboard</Title>
                <Text size="sm" c="dimmed">
                  선택한 anchor 조합 전체에 모두 감지된 디바이스만 시간별로 집계합니다.
                </Text>
              </Stack>
              <Badge
                size="lg"
                radius="xl"
                color={chartQuery.isFetching ? "blue" : "gray"}
                variant="light"
              >
                {chartQuery.isFetching ? "조회 중" : "대기"}
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <Select
                label="Room"
                placeholder="Room 선택"
                data={(rooms ?? []).map((room) => ({
                  value: String(room.id),
                  label: room.name,
                }))}
                value={draftRoomId}
                onChange={(value) => {
                  setDraftRoomId(value ?? "");
                  setDraftAnchorIds([]);
                }}
              />
              <TextInput
                label="Since"
                type="date"
                value={draftSinceInput}
                onChange={(event) => setDraftSinceInput(event.target.value)}
              />
              <TextInput
                label="Until"
                type="date"
                value={draftUntilInput}
                onChange={(event) => setDraftUntilInput(event.target.value)}
              />
              <NumberInput
                label="Limit"
                min={1}
                max={1000}
                value={draftLimit}
                onChange={(value) => setDraftLimit(Number(value) || DEFAULT_LIMIT)}
              />
            </SimpleGrid>

            <Stack gap={8}>
              <Text size="sm" fw={600}>
                Bucket Unit
              </Text>
              <SegmentedControl
                value={String(draftBucketMinutes)}
                onChange={(value) => setDraftBucketMinutes(Number(value) as BucketMinutes)}
                data={[
                  { label: "10분", value: "10" },
                  { label: "30분", value: "30" },
                  { label: "60분", value: "60" },
                ]}
                fullWidth
              />
              <Text size="sm" c="dimmed">
                현재 버킷 단위: {currentBucketMinutes}분
              </Text>
            </Stack>

            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
              <MultiSelect
                label="Anchor IDs"
                placeholder="최소 2개 anchor 선택"
                data={anchorOptions}
                value={draftAnchorIds}
                onChange={setDraftAnchorIds}
                searchable
                disabled={!draftRoomId || anchorOptionsQuery.isLoading}
                nothingFoundMessage="선택 가능한 anchor가 없습니다"
              />
              <TagsInput
                label="Exclude Device MACs"
                placeholder="device MAC 입력 후 Enter"
                value={draftExcludeDeviceMacs}
                onChange={(values) =>
                  setDraftExcludeDeviceMacs(values.map(normalizeDeviceMac))
                }
                clearable
              />
            </SimpleGrid>

            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Stack gap={6}>
                <Text size="sm" c={draftAnchorIds.length >= 2 ? "dimmed" : "orange"}>
                  {draftAnchorIds.length >= 2
                    ? "선택한 anchor 조합으로 조회할 수 있습니다."
                    : "anchor_ids는 최소 2개 이상 선택해야 합니다."}
                </Text>
                <Text size="sm" c="dimmed">
                  URL query state와 필터 상태가 동기화됩니다.
                </Text>
              </Stack>
              <Group>
                <Button variant="default" onClick={handleReset}>
                  초기화
                </Button>
                <Button onClick={handleApply} disabled={draftAnchorIds.length < 2}>
                  조회
                </Button>
              </Group>
            </Group>
          </Stack>
        </Card>

        <Card withBorder radius="xl" p="lg">
          <Stack gap="md">
            <Group justify="space-between" align="flex-start" wrap="wrap">
              <Stack gap={4}>
                <Text size="sm" fw={700}>
                  Applied Anchor IDs
                </Text>
                <Group gap={8}>
                  {currentAnchorIds.length ? (
                    currentAnchorIds.map((anchorId) => (
                      <Badge key={anchorId} color="blue" variant="light" radius="xl">
                        #{anchorId}
                      </Badge>
                    ))
                  ) : (
                    <Text size="sm" c="dimmed">
                      아직 선택된 anchor가 없습니다.
                    </Text>
                  )}
                </Group>
              </Stack>
              <Stack gap={4}>
                <Text size="sm" fw={700}>
                  Excluded Device MACs
                </Text>
                <Group gap={8}>
                  {currentExcludeDeviceMacs.length ? (
                    currentExcludeDeviceMacs.map((deviceMac) => (
                      <Badge key={deviceMac} color="gray" variant="light" radius="xl">
                        {deviceMac}
                      </Badge>
                    ))
                  ) : (
                    <Text size="sm" c="dimmed">
                      제외 중인 device MAC이 없습니다.
                    </Text>
                  )}
                </Group>
              </Stack>
            </Group>
          </Stack>
        </Card>

        {!hasEnoughAnchors && (
          <Card withBorder radius="xl" p="lg">
            <Text c="orange">
              anchor_ids가 2개 미만이면 조회할 수 없습니다. 최소 2개 이상 선택해주세요.
            </Text>
          </Card>
        )}

        {chartQuery.isError && (
          <Center py="xl" style={{ flexDirection: "column" }}>
            <IconAlertCircle size={32} />
            <Text mt="md" c="red">
              {chartQuery.error instanceof Error
                ? chartQuery.error.message
                : "Anchor set chart를 불러오지 못했습니다."}
            </Text>
          </Center>
        )}

        {(chartQuery.isLoading || chartQuery.isFetching) && !chartQuery.data && hasEnoughAnchors && (
          <Center py="xl">
            <Loader />
          </Center>
        )}

        {!chartQuery.isLoading && !chartQuery.isError && chartQuery.data && (
          <Stack gap="lg">
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
              <Card withBorder radius="xl" p="lg">
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Matched Device Count
                  </Text>
                  <Text size="2.4rem" fw={900}>
                    {chartQuery.data.stats.matchedDeviceCount.toLocaleString()}
                  </Text>
                  <Text size="sm" c="dimmed">
                    선택한 anchor 조합 모두에 감지된 고유 디바이스 수
                  </Text>
                </Stack>
              </Card>

              <Card withBorder radius="xl" p="lg">
                <Stack gap="xs">
                  <Text size="sm" c="dimmed">
                    Matched Bucket Count
                  </Text>
                  <Text size="2.4rem" fw={900}>
                    {chartQuery.data.stats.matchedBucketCount.toLocaleString()}
                  </Text>
                  <Text size="sm" c="dimmed">
                    조건을 만족한 시간 bucket 수
                  </Text>
                </Stack>
              </Card>
            </SimpleGrid>

            <Card withBorder radius="xl" p="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-end" wrap="wrap">
                  <Stack gap={4}>
                    <Text size="lg" fw={700}>
                      Time Series
                    </Text>
                  <Text size="sm" c="dimmed">
                    x축은 {currentBucketMinutes}분 bucket, y축은 eventCount 입니다.
                  </Text>
                  </Stack>
                  <Text size="sm" c="dimmed">
                    {formatTimestamp(chartQuery.data.timespan.since)} ~{" "}
                    {formatTimestamp(chartQuery.data.timespan.until)}
                  </Text>
                </Group>

                {chartData ? (
                  <Box style={{ height: 320 }}>
                    <Bar data={chartData} options={chartOptions} />
                  </Box>
                ) : (
                  <Text c="dimmed">
                    선택한 anchor 조합에 모두 감지된 디바이스가 없습니다.
                  </Text>
                )}
              </Stack>
            </Card>

            <Card withBorder radius="xl" p="lg">
              <Stack gap="md">
                <Group justify="space-between" align="flex-end">
                  <Stack gap={4}>
                    <Text size="lg" fw={700}>
                      Bucket Details
                    </Text>
                    <Text size="sm" c="dimmed">
                      bucket 오름차순, matchedDevices는 scanCount 내림차순으로 표시됩니다.
                    </Text>
                  </Stack>
                  <Text size="sm" c="dimmed">
                    {timeSeries.length} buckets · {currentBucketMinutes}분 단위
                  </Text>
                </Group>

                {timeSeries.length ? (
                  <Box style={{ overflowX: "auto" }}>
                    <Table striped highlightOnHover>
                      <thead>
                        <tr>
                          <th />
                          <th>Bucket</th>
                          <th>Event Count</th>
                          <th>Unique Device Count</th>
                          <th>Matched Devices</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeSeries.map((bucket) => {
                          const isOpen = Boolean(expandedBuckets[bucket.bucket]);
                          const matchedDevices = sortMatchedDevices(bucket.matchedDevices);

                          return (
                            <>
                              <tr key={bucket.bucket}>
                                <td>
                                  <Button
                                    variant="subtle"
                                    size="compact-xs"
                                    onClick={() => toggleBucket(bucket.bucket)}
                                  >
                                    {isOpen ? (
                                      <IconChevronDown size={16} />
                                    ) : (
                                      <IconChevronRight size={16} />
                                    )}
                                  </Button>
                                </td>
                                <td>{formatTimestamp(bucket.bucket)}</td>
                                <td>{bucket.eventCount.toLocaleString()}</td>
                                <td>{bucket.uniqueDeviceCount.toLocaleString()}</td>
                                <td>{matchedDevices.length.toLocaleString()}</td>
                              </tr>
                              {isOpen && (
                                <tr key={`${bucket.bucket}-details`}>
                                  <td colSpan={5}>
                                    <Card withBorder radius="md" p="sm">
                                      <Stack gap="sm">
                                        <Text fw={700}>Matched Devices</Text>
                                        {matchedDevices.length ? (
                                          <Table striped>
                                            <thead>
                                              <tr>
                                                <th>Device MAC</th>
                                                <th>Scan Count</th>
                                                <th>Average RSSI</th>
                                                <th>First Scanned At</th>
                                                <th>Last Scanned At</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {matchedDevices.map((device) => (
                                                <tr
                                                  key={`${bucket.bucket}-${device.deviceMac}`}
                                                >
                                                  <td>{device.deviceMac}</td>
                                                  <td>{device.scanCount.toLocaleString()}</td>
                                                  <td>
                                                    {device.averageRssi === null
                                                      ? "—"
                                                      : `${formatNumber(
                                                          device.averageRssi,
                                                          0
                                                        )} dBm`}
                                                  </td>
                                                  <td>
                                                    {formatTimestamp(device.firstScannedAt)}
                                                  </td>
                                                  <td>
                                                    {formatTimestamp(device.lastScannedAt)}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </Table>
                                        ) : (
                                          <Text c="dimmed" size="sm">
                                            표시할 matched device가 없습니다.
                                          </Text>
                                        )}
                                      </Stack>
                                    </Card>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </tbody>
                    </Table>
                  </Box>
                ) : (
                  <Text c="dimmed">
                    선택한 anchor 조합에 모두 감지된 디바이스가 없습니다.
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

export default function BleAnchorSetChartPanel() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: rooms } = useRooms(spaceId ?? "");
  const [defaultTimeRange] = useState(() => {
    const until = new Date();
    const since = new Date(until);
    since.setDate(since.getDate() - 1);

    return {
      since: toDateInputValue(since),
      until: toDateInputValue(until),
    };
  });

  const defaultRoomId = useMemo(
    () => (rooms && rooms.length ? String(rooms[0].id) : ""),
    [rooms]
  );

  const currentRoomId = searchParams.get("roomId") ?? defaultRoomId;
  const currentSinceInput = toDateInputValueFromQueryParam(
    searchParams.get("since"),
    defaultTimeRange.since
  );
  const currentUntilInput = toDateInputValueFromQueryParam(
    searchParams.get("until"),
    defaultTimeRange.until
  );
  const currentAnchorIds = searchParams.getAll("anchor_ids[]");
  const currentExcludeDeviceMacs = searchParams
    .getAll("exclude_device_macs[]")
    .map(normalizeDeviceMac);
  const bucketMinutesParam = searchParams.get("bucket_minutes");
  const currentBucketMinutes =
    bucketMinutesParam === "10" || bucketMinutesParam === "30" || bucketMinutesParam === "60"
      ? (Number(bucketMinutesParam) as BucketMinutes)
      : DEFAULT_BUCKET_MINUTES;
  const currentLimit = Number(searchParams.get("limit") ?? DEFAULT_LIMIT);
  const viewKey = `${searchParams.toString()}::${defaultRoomId}`;

  return (
    <BleAnchorSetChartView
      key={viewKey}
      currentAnchorIds={currentAnchorIds}
      currentBucketMinutes={currentBucketMinutes}
      currentExcludeDeviceMacs={currentExcludeDeviceMacs}
      currentLimit={currentLimit}
      currentRoomId={currentRoomId}
      currentSinceInput={currentSinceInput}
      currentUntilInput={currentUntilInput}
      defaultRoomId={defaultRoomId}
      defaultSinceInput={defaultTimeRange.since}
      defaultUntilInput={defaultTimeRange.until}
      rooms={rooms}
      setSearchParams={setSearchParams}
      spaceId={spaceId}
    />
  );
}
