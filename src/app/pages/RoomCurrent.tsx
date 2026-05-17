import { useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  Box,
  Button,
  Card,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconCalendar, IconRefresh } from "@tabler/icons-react";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  type ChartData,
  type TooltipItem,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useQueries, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { fetchBleLocationEstimates } from "@/hooks/useBleLocationEstimates";
import useRoom from "@/hooks/useRoom";
import type { Room } from "@/types/room";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend,
);

const pad = (value: number) => value.toString().padStart(2, "0");
const ACTUAL_WINDOW_MINUTES = 10;
const MINIMUM_ANCHOR_MATCHES = 2;
const ACTUAL_MINIMUM_CONFIDENCE = 0.9;

const toDateInputValue = (value: Date) =>
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;

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

const formatNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return Number(value).toLocaleString();
};

interface DailyEstimatePoint {
  time: string;
  estimated_device_count: number;
}

interface DailyEstimateResponse {
  date: string;
  day_of_week: string;
  estimates: DailyEstimatePoint[];
}

interface ActualEstimateFrame {
  index: number;
  time: string;
  since: string;
  until: string;
}

const buildTenMinuteFrames = (dateInput: string) => {
  const selected = parseLocalDateInput(dateInput);
  if (!selected) return [];

  const frames: ActualEstimateFrame[] = [];
  const cursor = new Date(selected);

  for (let index = 0; index < 24 * 6; index += 1) {
    const since = new Date(cursor);
    const until = new Date(cursor);
    until.setMinutes(until.getMinutes() + ACTUAL_WINDOW_MINUTES);

    frames.push({
      index,
      time: `${pad(since.getHours())}:${pad(since.getMinutes())}`,
      since: toIsoWithOffset(since),
      until: toIsoWithOffset(until),
    });

    cursor.setMinutes(cursor.getMinutes() + ACTUAL_WINDOW_MINUTES);
  }

  return frames;
};

interface HourlyLocationEstimateChartProps {
  title: string;
  description: string;
  predictionData?: DailyEstimateResponse;
  actualFrames: ActualEstimateFrame[];
  actualValues: Array<number | null>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
}

function HourlyLocationEstimateChart({
  title,
  description,
  predictionData,
  actualFrames,
  actualValues,
  isLoading,
  isFetching,
  isError,
  errorMessage,
}: HourlyLocationEstimateChartProps) {
  const predictions = predictionData?.estimates ?? [];
  const labels = predictions.length
    ? predictions.map((estimate) => estimate.time)
    : actualFrames.map((frame) => frame.time);
  const predictionValues = labels.map(
    (label) =>
      predictions.find((estimate) => estimate.time === label)
        ?.estimated_device_count ?? null,
  );
  const actualValueByTime = new Map(
    actualFrames.map((frame, index) => [frame.time, actualValues[index]]),
  );
  const alignedActualValues = labels.map((label) => actualValueByTime.get(label) ?? null);
  const numericPredictionValues = predictionValues.filter(
    (value): value is number => value !== null,
  );
  const numericActualValues = alignedActualValues.filter(
    (value): value is number => value !== null,
  );
  const predictionPeak = numericPredictionValues.length
    ? Math.max(...numericPredictionValues)
    : 0;
  const actualPeak = numericActualValues.length ? Math.max(...numericActualValues) : 0;
  const predictionPeakTime =
    labels[predictionValues.findIndex((value) => value === predictionPeak)];
  const actualPeakTime =
    labels[alignedActualValues.findIndex((value) => value === actualPeak)];
  const chartData: ChartData<"bar" | "line", Array<number | null>, string> = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "예측",
        data: predictionValues,
        backgroundColor: "rgba(13, 148, 136, 0.22)",
        borderColor: "rgba(15, 118, 110, 0.55)",
        borderWidth: 1,
        borderRadius: 4,
        barPercentage: 0.92,
        categoryPercentage: 0.86,
      },
      {
        type: "line" as const,
        label: "실측",
        data: alignedActualValues,
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        borderColor: "#2563eb",
        borderWidth: 2.5,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHitRadius: 16,
        tension: 0.42,
        fill: true,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          boxWidth: 10,
          boxHeight: 10,
          usePointStyle: true,
          color: "#475569",
        },
      },
      tooltip: {
        backgroundColor: "#111827",
        borderColor: "#1f2937",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        padding: 12,
        callbacks: {
          title: (items: TooltipItem<"bar" | "line">[]) => {
            const index = items[0]?.dataIndex ?? 0;
            return labels[index] ?? "";
          },
          label: (item: TooltipItem<"bar" | "line">) =>
            `${item.dataset.label}: ${
              item.raw === null ? "-" : formatNumber(Number(item.raw))
            }`,
        },
      },
    },
    scales: {
      x: {
        border: {
          display: false,
        },
        grid: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 18,
        },
      },
      y: {
        beginAtZero: true,
        border: {
          display: false,
        },
        ticks: {
          display: false,
          precision: 0,
        },
        grid: {
          color: "rgba(148, 163, 184, 0.18)",
          drawTicks: false,
        },
      },
    },
  };

  return (
    <Card
      withBorder
      radius="md"
      p="lg"
      style={{
        background: "#ffffff",
        borderColor: "#e2e8f0",
        boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
      }}
    >
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Title order={2} size="h3">
              {title}
            </Title>
            <Text c="dimmed" size="sm">
              {description}
            </Text>
            <Text size="sm" fw={700} c="teal">
              가장 붐비는 시간대:{" "}
              {predictionPeakTime
                ? `${predictionPeakTime} · 예측 ${formatNumber(predictionPeak)}`
                : actualPeakTime
                  ? `${actualPeakTime} · 실측 ${formatNumber(actualPeak)}`
                  : "-"}
            </Text>
          </Stack>
          {isFetching ? <Text size="sm" c="dimmed">조회 중</Text> : null}
        </Group>

        {isError ? (
          <Group gap="sm" c="red">
            <IconAlertCircle size={18} />
            <Text size="sm">
              {errorMessage ?? "Location estimate를 불러오지 못했습니다."}
            </Text>
          </Group>
        ) : null}

        {isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : labels.length ? (
          <Box
            h={{ base: 300, sm: 380 }}
            style={{
              background:
                "linear-gradient(180deg, rgba(248,250,252,0.92) 0%, rgba(255,255,255,1) 100%)",
              border: "1px solid #edf2f7",
              borderRadius: 8,
              padding: "18px 16px 10px",
            }}
          >
            <Chart type="bar" data={chartData} options={chartOptions} />
          </Box>
        ) : (
          <Text c="dimmed">표시할 데이터가 없습니다.</Text>
        )}
      </Stack>
    </Card>
  );
}

export default function RoomCurrent() {
  const { spaceId, roomId } = useParams<{ spaceId: string; roomId: string }>();
  const [selectedDate, setSelectedDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const roomQuery = useRoom(spaceId, roomId);
  const room = roomQuery.data as Room | undefined;
  const actualFrames = useMemo(
    () => buildTenMinuteFrames(selectedDate),
    [selectedDate],
  );
  const predictionQuery = useQuery<DailyEstimateResponse>({
    queryKey: [
      "publicRoomDailyEstimatePrediction",
      spaceId,
      roomId,
      selectedDate,
      refreshKey,
    ],
    queryFn: () =>
      axios
        .get(
          `https://bird-ai.l1n.kr/api/spaces/${spaceId}/rooms/${roomId}/estimate/day`,
          {
            params: { date: selectedDate },
          },
        )
        .then((res) => res.data as DailyEstimateResponse),
    enabled: Boolean(spaceId && roomId && selectedDate),
    staleTime: 60 * 1000,
  });
  const actualQueries = useQueries({
    queries: actualFrames.map((frame) => ({
      queryKey: [
        "publicRoomActualLocationEstimates",
        spaceId,
        roomId,
        frame.since,
        frame.until,
        refreshKey,
      ],
      queryFn: () =>
        fetchBleLocationEstimates({
          spaceId: spaceId ?? "",
          roomId,
          since: frame.since,
          until: frame.until,
          windowMinutes: ACTUAL_WINDOW_MINUTES,
          minimumAnchorMatches: MINIMUM_ANCHOR_MATCHES,
          minimumConfidence: ACTUAL_MINIMUM_CONFIDENCE,
        }),
      enabled: Boolean(spaceId && roomId && selectedDate),
      staleTime: 60 * 1000,
    })),
  });
  const actualValues = actualQueries.map(
    (query) => query.data?.stats.estimatedDeviceCount ?? null,
  );
  const actualIsLoading = actualQueries.some(
    (query) => query.isLoading && !query.data,
  );
  const actualIsFetching = actualQueries.some((query) => query.isFetching);
  const actualError = actualQueries.find((query) => query.isError)?.error;
  const chartError = predictionQuery.error ?? actualError;
  const isFetching =
    roomQuery.isFetching || predictionQuery.isFetching || actualIsFetching;

  const refresh = () => {
    setRefreshKey((current) => current + 1);
    void roomQuery.refetch();
  };

  return (
    <Box bg="#f6f7f9" mih="100dvh">
      <Container size="xl" py={{ base: 24, sm: 40 }}>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={6}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Room Activity
              </Text>
              <Title order={1}>
                {room?.name ?? "Room"}
              </Title>
              {room?.description ? (
                <Text c="dimmed" maw={720}>
                  {room.description}
                </Text>
              ) : null}
            </Stack>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={refresh}
              loading={isFetching}
            >
              새로고침
            </Button>
          </Group>

          <Card withBorder radius="md" p="lg">
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Stack gap={4}>
                <Text fw={700}>날짜 선택</Text>
                <Text size="sm" c="dimmed">
                  선택한 날짜의 실측값과 AI 예측값을 10분 단위로 표시합니다.
                </Text>
              </Stack>
              <TextInput
                leftSection={<IconCalendar size={16} />}
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                maw={240}
              />
            </Group>
          </Card>

          <HourlyLocationEstimateChart
            title={`${selectedDate} 시간대별 혼잡도`}
            description={`${selectedDate} 하루 동안의 실측값과 AI 예측값입니다.`}
            predictionData={predictionQuery.data}
            actualFrames={actualFrames}
            actualValues={actualValues}
            isLoading={predictionQuery.isLoading || actualIsLoading}
            isFetching={predictionQuery.isFetching || actualIsFetching}
            isError={predictionQuery.isError || Boolean(actualError)}
            errorMessage={
              chartError instanceof Error ? chartError.message : undefined
            }
          />
        </Stack>
      </Container>
    </Box>
  );
}
