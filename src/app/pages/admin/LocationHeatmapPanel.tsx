import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
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
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import useRooms from "@/hooks/useRooms";
import {
  type BleLocationHeatmapCell,
  type BleLocationHeatmapResponse,
  useBleLocationHeatmap,
} from "@/hooks/useBleLocationEstimates";
import type { Room } from "@/types/room";

const HEATMAP_FRAME_MINUTES = 10;
const HEATMAP_MINIMUM_CONFIDENCE = 0.7;
const DEFAULT_HEATMAP_CELL_SIZE = 1;

const heatmapCellSizeOptions = ["0.25", "0.5", "1", "2"];

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

const formatTimestamp = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const formatFrameDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatFrameTime = (since?: string | null, until?: string | null) => {
  if (!since || !until) return "-";

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
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const buildFrames = (since?: string, until?: string) => {
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
    const next = new Date(
      cursor.getTime() + HEATMAP_FRAME_MINUTES * 60 * 1000,
    );
    const boundedNext = next > end ? end : next;
    const frameSince = toIsoWithOffset(cursor);
    const frameUntil = toIsoWithOffset(boundedNext);

    frames.push({
      index,
      since: frameSince,
      until: frameUntil,
      label: `${formatTimestamp(frameSince)} ~ ${formatTimestamp(frameUntil)}`,
    });
    cursor = boundedNext;
    index += 1;
  }

  return frames;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

const getHeatmapColor = (intensity: number) => {
  const clamped = clamp01(intensity);

  if (clamped < 0.5) {
    const mix = clamped / 0.5;
    const red = 253;
    const green = Math.round(224 - 47 * mix);
    const blue = Math.round(195 - 96 * mix);
    return `rgb(${red}, ${green}, ${blue})`;
  }

  const mix = (clamped - 0.5) / 0.5;
  const red = Math.round(251 - 17 * mix);
  const green = Math.round(146 - 58 * mix);
  const blue = Math.round(60 - 48 * mix);
  return `rgb(${red}, ${green}, ${blue})`;
};

const buildAxisTicks = (min: number, max: number, count = 6) => {
  if (max <= min) return [min];

  const step = (max - min) / Math.max(count - 1, 1);
  return Array.from({ length: count }, (_, index) => min + step * index);
};

type HeatmapRadiomap = NonNullable<
  BleLocationHeatmapResponse["generatedRadiomap"]
>;

function HeatmapFloorPlan({
  cells,
  radiomap,
}: {
  cells: BleLocationHeatmapCell[];
  radiomap: HeatmapRadiomap;
}) {
  const width = radiomap.xRangeMax - radiomap.xRangeMin;
  const height = radiomap.yRangeMax - radiomap.yRangeMin;
  const safeWidth = width > 0 ? width : 1;
  const safeHeight = height > 0 ? height : 1;

  const normalizeX = (value: number) =>
    ((value - radiomap.xRangeMin) / safeWidth) * 100;
  const normalizeY = (value: number) =>
    100 - ((value - radiomap.yRangeMin) / safeHeight) * 100;
  const xLabels = buildAxisTicks(radiomap.xRangeMin, radiomap.xRangeMax);
  const yLabels = buildAxisTicks(radiomap.yRangeMin, radiomap.yRangeMax);

  return (
    <Box
      style={{
        display: "grid",
        justifyItems: "stretch",
        gap: 12,
        borderRadius: 12,
        background: "#ffffff",
      }}
    >
      <Box
        style={{
          display: "grid",
          gridTemplateRows: "28px auto",
          gridTemplateColumns: "56px 1fr",
          alignItems: "stretch",
          width: "100%",
        }}
      >
        <Box />
        <Box style={{ position: "relative" }}>
          {xLabels.map((label) => (
            <Text
              key={label}
              size="xs"
              c="#334155"
              style={{
                position: "absolute",
                left: `${normalizeX(label)}%`,
                top: 0,
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              x {formatNumber(label, 1)}
            </Text>
          ))}
        </Box>

        <Box style={{ position: "relative" }}>
          {yLabels.map((label) => (
            <Text
              key={label}
              size="xs"
              c="#334155"
              style={{
                position: "absolute",
                right: 12,
                top: `${normalizeY(label)}%`,
                transform: "translateY(-50%)",
                whiteSpace: "nowrap",
              }}
            >
              y {formatNumber(label, 1)}
            </Text>
          ))}
        </Box>

        <Box
          style={{
            aspectRatio: `${safeWidth} / ${safeHeight}`,
            borderBottom: "1px solid #cbd5e1",
            maxHeight: 460,
          }}
        >
          <svg
            role="img"
            aria-label="Location estimates heatmap"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            width="100%"
            height="100%"
          >
            <rect width="100" height="100" fill="#f3f4f6" />
            {cells.map((cell) => {
              const x = normalizeX(cell.xMin);
              const y = normalizeY(cell.yMax);
              const cellWidth = normalizeX(cell.xMax) - normalizeX(cell.xMin);
              const cellHeight = normalizeY(cell.yMin) - normalizeY(cell.yMax);
              const intensity = clamp01(cell.intensity);

              return (
                <rect
                  key={`${cell.xMin}-${cell.xMax}-${cell.yMin}-${cell.yMax}`}
                  x={x}
                  y={y}
                  width={Math.max(cellWidth, 0.2)}
                  height={Math.max(cellHeight, 0.2)}
                  fill={getHeatmapColor(intensity)}
                  fillOpacity={0.35 + intensity * 0.65}
                >
                  <title>
                    {`count: ${cell.count}, unique devices: ${cell.uniqueDeviceCount}, confidence: ${formatNumber(
                      cell.averageConfidence,
                      3,
                    )}, x: ${formatNumber(cell.x, 2)}, y: ${formatNumber(
                      cell.y,
                      2,
                    )}`}
                  </title>
                </rect>
              );
            })}
          </svg>
        </Box>
      </Box>

      <Group gap="xs" justify="flex-end">
        <Text size="xs" c="dimmed">
          0
        </Text>
        <Box
          style={{
            width: 150,
            height: 14,
            border: "1px solid #cfd8dc",
            background:
              "linear-gradient(90deg, rgb(253,224,195), rgb(251,146,60), rgb(234,88,12))",
          }}
        />
        <Text size="xs" c="dimmed">
          1.0
        </Text>
      </Group>
    </Box>
  );
}

interface AppliedHeatmapFilters {
  roomId: string;
  since: string | undefined;
  until: string | undefined;
  requestKey: number;
}

export default function LocationHeatmapPanel() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [sinceInput, setSinceInput] = useState(() => {
    const since = new Date();
    since.setDate(since.getDate() - 1);
    return toDateInputValue(since);
  });
  const [untilInput, setUntilInput] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [heatmapCellSize, setHeatmapCellSize] = useState(
    DEFAULT_HEATMAP_CELL_SIZE,
  );
  const [heatmapPlaybackIndex, setHeatmapPlaybackIndex] = useState(0);
  const [isHeatmapPlaying, setIsHeatmapPlaying] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<AppliedHeatmapFilters | null>(null);

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
  const activeRoomId = selectedRoomId ?? defaultRoomId;

  const heatmapFrames = useMemo(
    () => buildFrames(appliedFilters?.since, appliedFilters?.until),
    [appliedFilters?.since, appliedFilters?.until],
  );
  const clampedHeatmapPlaybackIndex = Math.min(
    heatmapPlaybackIndex,
    Math.max(heatmapFrames.length - 1, 0),
  );
  const activeHeatmapFrame = heatmapFrames[clampedHeatmapPlaybackIndex];
  const heatmapQuery = useBleLocationHeatmap({
    spaceId: spaceId ?? "",
    roomId: appliedFilters?.roomId,
    since: activeHeatmapFrame?.since,
    until: activeHeatmapFrame?.until,
    windowMinutes: HEATMAP_FRAME_MINUTES,
    cellSize: heatmapCellSize,
    minimumConfidence: HEATMAP_MINIMUM_CONFIDENCE,
    includeOutside: false,
    requestKey: appliedFilters?.requestKey,
    enabled: Boolean(appliedFilters?.roomId && activeHeatmapFrame),
  });
  const measuredDeviceCount = useMemo(
    () =>
      heatmapQuery.data?.cells.reduce(
        (total, cell) => total + cell.uniqueDeviceCount,
        0,
      ) ?? 0,
    [heatmapQuery.data?.cells],
  );

  const handleSearch = () => {
    if (!activeRoomId) return;

    setHeatmapPlaybackIndex(0);
    setIsHeatmapPlaying(false);
    setAppliedFilters((current) => ({
      roomId: activeRoomId,
      since: toRequestSinceTimestamp(sinceInput),
      until: toRequestUntilTimestamp(untilInput),
      requestKey: (current?.requestKey ?? 0) + 1,
    }));
  };

  useEffect(() => {
    if (!isHeatmapPlaying || heatmapFrames.length <= 1) return;

    const timer = window.setInterval(() => {
      setHeatmapPlaybackIndex((current) =>
        current >= heatmapFrames.length - 1 ? 0 : current + 1,
      );
    }, 1400);

    return () => window.clearInterval(timer);
  }, [isHeatmapPlaying, heatmapFrames.length]);

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
                  Room BLE Location Heatmap
                </Text>
                <Title order={2}>Location Heatmap</Title>
                <Text size="sm" c="dimmed">
                  저장된 위치 추정 결과를 10분 단위 히트맵으로 확인합니다.
                </Text>
              </Stack>
              <Badge
                size="lg"
                radius="xl"
                color={heatmapQuery.isFetching ? "blue" : "gray"}
                variant="light"
              >
                {heatmapQuery.isFetching ? "조회 중" : "대기"}
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
                  loading={heatmapQuery.isFetching}
                >
                  조회
                </Button>
              </Group>
            </SimpleGrid>
            <Text size="xs" c="dimmed">
              시간은 10분 단위로 선택할 수 있습니다.
            </Text>
          </Stack>
        </Card>

        {!appliedFilters && (
          <Center py="xl">
            <Text c="dimmed">
              조회 버튼을 누르면 10분 단위 히트맵을 불러옵니다.
            </Text>
          </Center>
        )}

        {heatmapQuery.isError && (
          <Center py="xl" style={{ flexDirection: "column" }}>
            <IconAlertCircle size={32} />
            <Text mt="md" c="red">
              {heatmapQuery.error instanceof Error
                ? heatmapQuery.error.message
                : "히트맵 데이터를 불러오지 못했습니다."}
            </Text>
          </Center>
        )}

        {appliedFilters && !heatmapFrames.length && (
          <Center py="xl">
            <Text c="dimmed">
              재생할 시간 구간이 없습니다. since / until 범위를 확인해주세요.
            </Text>
          </Center>
        )}

        {(heatmapQuery.isLoading || heatmapQuery.isFetching) &&
          !heatmapQuery.data && (
            <Center py="xl">
              <Loader />
            </Center>
          )}

        {!heatmapQuery.isLoading && !heatmapQuery.isError && heatmapQuery.data && (
          <Stack gap="lg">
            <Card withBorder radius="xl" p="lg">
              <Group align="flex-start" gap="xl" wrap="wrap">
                <Stack
                  gap="lg"
                  style={{
                    flex: "0 0 280px",
                    maxWidth: 320,
                  }}
                >
                  <Stack gap={6}>
                    <Text size="sm" c="dimmed" fw={700} tt="uppercase">
                      Current Frame
                    </Text>
                    <Title order={3}>
                      {formatFrameDate(activeHeatmapFrame?.since)}
                    </Title>
                    <Text
                      fw={900}
                      style={{
                        fontSize: "clamp(1.75rem, 3vw, 2.4rem)",
                        lineHeight: 1.08,
                      }}
                    >
                      {formatFrameTime(
                        activeHeatmapFrame?.since,
                        activeHeatmapFrame?.until,
                      )}
                    </Text>
                  </Stack>

                  <Stack gap="xs">
                    <Text size="sm" c="dimmed">
                      측정된 기기 개수
                    </Text>
                    <Text
                      fw={900}
                      style={{
                        fontSize: "clamp(2.4rem, 4vw, 3.4rem)",
                        lineHeight: 1,
                      }}
                    >
                      {measuredDeviceCount.toLocaleString()}
                    </Text>
                  </Stack>

                  <Select
                    label="Cell Size"
                    data={heatmapCellSizeOptions}
                    value={String(heatmapCellSize)}
                    onChange={(value) => setHeatmapCellSize(Number(value) || 1)}
                    style={{ width: 160 }}
                  />
                </Stack>

                <Stack gap="md" style={{ flex: "1 1 560px", minWidth: 0 }}>
                  <Group justify="space-between" align="flex-end">
                    <Stack gap={4}>
                      <Text size="lg" fw={700}>
                        Heatmap
                      </Text>
                      <Text size="sm" c="dimmed">
                        {activeHeatmapFrame?.label ??
                          "프레임을 선택하면 히트맵을 렌더링합니다."}
                      </Text>
                    </Stack>
                    <Group gap="sm">
                      <Badge variant="light" radius="xl" color="gray">
                        {heatmapFrames.length} frames
                      </Badge>
                      <ActionIcon
                        variant="light"
                        size="lg"
                        radius="xl"
                        onClick={() => setIsHeatmapPlaying((prev) => !prev)}
                        disabled={heatmapFrames.length <= 1}
                      >
                        {isHeatmapPlaying ? (
                          <IconPlayerPauseFilled size={18} />
                        ) : (
                          <IconPlayerPlayFilled size={18} />
                        )}
                      </ActionIcon>
                      <Badge variant="light" radius="xl" color="yellow">
                        low
                      </Badge>
                      <Badge variant="light" radius="xl" color="orange">
                        medium
                      </Badge>
                      <Badge variant="light" radius="xl" color="red">
                        high
                      </Badge>
                    </Group>
                  </Group>

                  {heatmapFrames.length ? (
                    <Stack gap="xs">
                      <Group justify="space-between" align="center" wrap="wrap">
                        <Text size="sm" fw={600}>
                          Frame {clampedHeatmapPlaybackIndex + 1} /{" "}
                          {heatmapFrames.length}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {activeHeatmapFrame?.label}
                        </Text>
                      </Group>
                      <Slider
                        min={0}
                        max={Math.max(heatmapFrames.length - 1, 0)}
                        step={1}
                        value={clampedHeatmapPlaybackIndex}
                        onChange={setHeatmapPlaybackIndex}
                        marks={heatmapFrames.map((frame) => ({
                          value: frame.index,
                          label:
                            frame.index === 0 ||
                            frame.index === heatmapFrames.length - 1
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

                  {heatmapQuery.isFetching && !heatmapQuery.data ? (
                    <Center py="xl">
                      <Loader size="sm" />
                    </Center>
                  ) : !heatmapQuery.data.generatedRadiomap ? (
                    <Text c="dimmed">Radiomap range is not available</Text>
                  ) : (
                    <HeatmapFloorPlan
                      cells={heatmapQuery.data.cells}
                      radiomap={heatmapQuery.data.generatedRadiomap}
                    />
                  )}
                </Stack>
              </Group>
            </Card>
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
