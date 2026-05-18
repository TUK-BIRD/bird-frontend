import { useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  Accordion,
  Badge,
  Box,
  Card,
  Center,
  Container,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconCalendar,
  IconClockHour4,
  IconHistory,
  IconUsers,
} from "@tabler/icons-react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  type ChartData,
  type TooltipItem,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { useQueries } from "@tanstack/react-query";
import { fetchBleLocationEstimates } from "@/hooks/useBleLocationEstimates";
import useRoom from "@/hooks/useRoom";
import useWeeklyEstimates from "@/hooks/useWeeklyEstimates";
import type { WeeklyEstimateDay } from "@/hooks/useWeeklyEstimates";
import type { Room } from "@/types/room";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarController,
  BarElement,
  LineController,
  PointElement,
  LineElement,
  ChartTooltip,
  Legend,
);

const DAY_OF_WEEK_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

const getDayOfWeekValue = (label: string): number =>
  DAY_OF_WEEK_LABELS.indexOf(label as (typeof DAY_OF_WEEK_LABELS)[number]);

const jsDayToPythonWeekday = (jsDay: number): number =>
  jsDay === 0 ? 6 : jsDay - 1;

const pad = (value: number) => value.toString().padStart(2, "0");
const ACTUAL_WINDOW_MINUTES = 10;
const MINIMUM_ANCHOR_MATCHES = 2;
const ACTUAL_MINIMUM_CONFIDENCE = 0.7;

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

const normalizeHourTime = (value: string) => {
  const [rawHour = "", rawMinute = ""] = value.trim().split(":");
  if (!rawHour || !rawMinute) return value;
  return `${rawHour.padStart(2, "0")}:${rawMinute.slice(0, 2)}`;
};

interface ActualEstimateFrame {
  index: number;
  time: string;
  since: string;
  until: string;
}

const buildHourlyFrames = (dateInput: string) => {
  const selected = parseLocalDateInput(dateInput);
  if (!selected) return [];

  const frames: ActualEstimateFrame[] = [];
  const cursor = new Date(selected);

  for (let index = 0; index < 24; index += 1) {
    const since = new Date(cursor);
    const until = new Date(cursor);
    until.setHours(until.getHours() + 1);

    frames.push({
      index,
      time: `${pad(since.getHours())}:00`,
      since: toIsoWithOffset(since),
      until: toIsoWithOffset(until),
    });

    cursor.setHours(cursor.getHours() + 1);
  }

  return frames;
};

const groupSlotsByHour = (slots: WeeklyEstimateDay["slots"]) => {
  const hourMap = new Map<
    string,
    { estimated: number[]; avg: number[]; max: number[] }
  >();

  for (const slot of slots) {
    const hour = slot.time.slice(0, 2) + ":00";
    if (!hourMap.has(hour)) {
      hourMap.set(hour, { estimated: [], avg: [], max: [] });
    }
    const bucket = hourMap.get(hour)!;
    bucket.estimated.push(slot.estimatedDeviceCount);
    bucket.avg.push(slot.avgDeviceCount);
    bucket.max.push(slot.maxDeviceCount);
  }

  const hours = Array.from(hourMap.keys()).sort();
  return hours.map((hour) => {
    const bucket = hourMap.get(hour)!;
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    return {
      time: hour,
      estimatedDeviceCount: Math.round(avg(bucket.estimated)),
      avgDeviceCount: Math.round(avg(bucket.avg) * 10) / 10,
      maxDeviceCount: Math.max(...bucket.max),
    };
  });
};

const getBusiestHour = (
  hourlyData: ReturnType<typeof groupSlotsByHour>,
) => {
  if (!hourlyData.length) return null;
  let peak = hourlyData[0];
  for (const h of hourlyData) {
    if (h.estimatedDeviceCount > peak.estimatedDeviceCount) peak = h;
  }
  return peak;
};

const getBusiestHourFromActual = (
  frames: ActualEstimateFrame[],
  values: Array<number | null>,
) => {
  let peakValue = -1;
  let peakTime = "";
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null && values[i]! > peakValue) {
      peakValue = values[i]!;
      peakTime = frames[i]?.time ?? "";
    }
  }
  return peakValue >= 0 ? { time: peakTime, value: peakValue } : null;
};

interface WeeklyChartProps {
  weeklyDay: WeeklyEstimateDay | null;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
}

function WeeklyChart({
  weeklyDay,
  isLoading,
  isFetching,
  isError,
  errorMessage,
}: WeeklyChartProps) {
  const hourlyData = useMemo(
    () => groupSlotsByHour(weeklyDay?.slots ?? []),
    [weeklyDay],
  );
  const labels = hourlyData.map((h) => h.time);
  const busiest = useMemo(() => getBusiestHour(hourlyData), [hourlyData]);

  const chartData: ChartData<"bar", number[], string> = {
    labels,
    datasets: [
      {
        type: "bar" as const,
        label: "예측 인원",
        data: hourlyData.map((h) => h.estimatedDeviceCount),
        backgroundColor: "rgba(13, 148, 136, 0.25)",
        borderColor: "rgba(15, 118, 110, 0.6)",
        borderWidth: 1,
        borderRadius: 6,
        barPercentage: 0.7,
        categoryPercentage: 0.8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" as const },
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
        padding: 12,
        callbacks: {
          title: (items: TooltipItem<"bar" | "line">[]) =>
            labels[items[0]?.dataIndex ?? 0] ?? "",
          label: (item: TooltipItem<"bar" | "line">) =>
            `${item.dataset.label}: ${formatNumber(item.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: "#64748b", maxRotation: 0, autoSkip: true, autoSkipPadding: 24 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: { display: false, precision: 0 },
        grid: { color: "rgba(148, 163, 184, 0.18)", drawTicks: false },
      },
    },
  };

  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
      style={{
        background: "#ffffff",
        borderColor: "#e2e8f0",
        boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={4}>
            <Group gap="sm" align="center">
              <IconClockHour4 size={20} color="teal" />
              <Title order={3} size="h4">
                시간대별 혼잡도 예측
              </Title>
            </Group>
            <Text c="dimmed" size="sm">
              AI 기반 주간 예측 데이터입니다. 평균과 최대값을 함께 확인할 수
              있습니다.
            </Text>
          </Stack>
          {isFetching && !isLoading ? (
            <Badge color="blue" variant="light" radius="xl" size="sm">
              업데이트 중
            </Badge>
          ) : null}
        </Group>

        {busiest && (
          <Card bg="teal.0" radius="md" p="sm" withBorder={false}>
            <Group gap="xs" align="center">
              <IconUsers size={16} color="teal" />
              <Text size="sm" fw={600}>
                가장 붐비는 시간: {busiest.time} (예측{" "}
                {formatNumber(busiest.estimatedDeviceCount)}명)
              </Text>
            </Group>
          </Card>
        )}

        {isError ? (
          <Group gap="sm" c="red">
            <IconAlertCircle size={18} />
            <Text size="sm">
              {errorMessage ?? "예측 데이터를 불러오지 못했습니다."}
            </Text>
          </Group>
        ) : null}

        {isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : labels.length ? (
          <Box
            h={{ base: 260, sm: 340 }}
            style={{
              background:
                "linear-gradient(180deg, rgba(248,250,252,0.92) 0%, rgba(255,255,255,1) 100%)",
              border: "1px solid #edf2f7",
              borderRadius: 8,
              padding: "14px 12px 8px",
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

interface HistoryChartProps {
  selectedDate: string;
  weeklyPredictionDay: WeeklyEstimateDay | null;
  actualFrames: ActualEstimateFrame[];
  actualValues: Array<number | null>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  errorMessage?: string;
}

function HistoryChart({
  selectedDate,
  weeklyPredictionDay,
  actualFrames,
  actualValues,
  isLoading,
  isFetching,
  isError,
  errorMessage,
}: HistoryChartProps) {
  const actualPeak = useMemo(
    () => getBusiestHourFromActual(actualFrames, actualValues),
    [actualFrames, actualValues],
  );

  const predictionByHour = useMemo(() => {
    const hourly = groupSlotsByHour(weeklyPredictionDay?.slots ?? []);
    return new Map(
      hourly.map((slot) => [
        normalizeHourTime(slot.time),
        Number(slot.estimatedDeviceCount),
      ]),
    );
  }, [weeklyPredictionDay]);

  const datasets: ChartData<"bar" | "line", Array<number | null>, string>["datasets"] = [];

  if (weeklyPredictionDay) {
    datasets.push({
      type: "bar" as const,
      label: "예측 인원",
      data: actualFrames.map((f) => {
        const matched = predictionByHour.get(normalizeHourTime(f.time));
        return matched ?? null;
      }),
      backgroundColor: "rgba(13, 148, 136, 0.25)",
      borderColor: "rgba(15, 118, 110, 0.6)",
      borderWidth: 1,
      borderRadius: 6,
      barPercentage: 0.7,
      categoryPercentage: 0.8,
    });
  }

  datasets.push({
    type: "line" as const,
    label: "실측",
    data: actualValues,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    borderColor: "#2563eb",
    borderWidth: 2.5,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.4,
    fill: true,
  });

  const labels = actualFrames.map((f) => f.time);

  const chartData: ChartData<"bar" | "line", Array<number | null>, string> = {
    labels,
    datasets,
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: "index" as const },
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
        padding: 12,
        callbacks: {
          title: (items: TooltipItem<"bar" | "line">[]) =>
            labels[items[0]?.dataIndex ?? 0] ?? "",
          label: (item: TooltipItem<"bar" | "line">) =>
            `${item.dataset.label}: ${
              item.raw === null ? "-" : formatNumber(Number(item.raw))
            }`,
        },
      },
    },
    scales: {
      x: {
        border: { display: false },
        grid: { display: false },
        ticks: { color: "#64748b", maxRotation: 0, autoSkip: true, autoSkipPadding: 24 },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: { display: false, precision: 0 },
        grid: { color: "rgba(148, 163, 184, 0.18)", drawTicks: false },
      },
    },
  };

  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
      style={{
        background: "#ffffff",
        borderColor: "#e2e8f0",
      }}
    >
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
           <Stack gap={4}>
             <Group gap="sm" align="center">
               <IconHistory size={20} color="blue" />
               <Title order={3} size="h4">
                 {selectedDate} 실측 히스토리
               </Title>
             </Group>
             <Text c="dimmed" size="sm">
               선택한 날짜의 실측 데이터와 AI 예측값을 시간별로 비교합니다.
             </Text>
           </Stack>
           {isFetching && !isLoading ? (
             <Badge color="blue" variant="light" radius="xl" size="sm">
               업데이트 중
             </Badge>
           ) : null}
         </Group>

        {actualPeak && (
          <Card bg="blue.0" radius="md" p="sm" withBorder={false}>
            <Group gap="xs" align="center">
              <IconUsers size={16} color="blue" />
              <Text size="sm" fw={600}>
                최대 혼잡 시간: {actualPeak.time} (실측{" "}
                {formatNumber(actualPeak.value)}명)
              </Text>
            </Group>
          </Card>
        )}

        {isError ? (
          <Group gap="sm" c="red">
            <IconAlertCircle size={18} />
            <Text size="sm">
              {errorMessage ?? "데이터를 불러오지 못했습니다."}
            </Text>
          </Group>
        ) : null}

        {isLoading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : labels.length ? (
          <Box
            h={{ base: 260, sm: 340 }}
            style={{
              background:
                "linear-gradient(180deg, rgba(248,250,252,0.92) 0%, rgba(255,255,255,1) 100%)",
              border: "1px solid #edf2f7",
              borderRadius: 8,
              padding: "14px 12px 8px",
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
  const [selectedDayLabel, setSelectedDayLabel] = useState<string>(
    DAY_OF_WEEK_LABELS[jsDayToPythonWeekday(new Date().getDay())],
  );
  const [historyDate, setHistoryDate] = useState(() =>
    toDateInputValue(new Date()),
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const roomQuery = useRoom(spaceId, roomId);
  const room = roomQuery.data as Room | undefined;
  const selectedDayOfWeek = getDayOfWeekValue(selectedDayLabel);

  const weeklyQuery = useWeeklyEstimates(
    spaceId ?? "",
    roomId,
    selectedDayOfWeek,
    Boolean(spaceId && roomId),
  );
  const roomName = room?.name ?? weeklyQuery.data?.room.name;
  const weeklyDay = useMemo(
    () =>
      weeklyQuery.data?.weeklyEstimates.find(
        (d) => d.dayOfWeek === selectedDayOfWeek,
      ) ?? null,
    [weeklyQuery.data, selectedDayOfWeek],
  );

  const historyFrames = useMemo(
    () => buildHourlyFrames(historyDate),
    [historyDate],
  );
  const historyDateValue = useMemo(
    () => parseLocalDateInput(historyDate),
    [historyDate],
  );
  const historyDayOfWeek = useMemo(
    () =>
      historyDateValue ? jsDayToPythonWeekday(historyDateValue.getDay()) : null,
    [historyDateValue],
  );
  const historyWeeklyQuery = useWeeklyEstimates(
    spaceId ?? "",
    roomId,
    historyDayOfWeek ?? undefined,
    Boolean(spaceId && roomId && historyOpen && historyDayOfWeek !== null),
  );
  const historyWeeklyDay = useMemo(
    () =>
      historyDayOfWeek === null
        ? null
        : historyWeeklyQuery.data?.weeklyEstimates.find(
            (d) => d.dayOfWeek === historyDayOfWeek,
          ) ?? null,
    [historyWeeklyQuery.data, historyDayOfWeek],
  );
  const historyActualQueries = useQueries({
    queries: historyFrames.map((frame) => ({
      queryKey: [
        "publicRoomActualLocationEstimates",
        spaceId,
        roomId,
        frame.since,
        frame.until,
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
      enabled: Boolean(spaceId && roomId && historyOpen),
      staleTime: 60 * 1000,
    })),
  });
  const historyActualValues = historyActualQueries.map(
    (q) => q.data?.stats.estimatedDeviceCount ?? null,
  );
  const historyActualIsLoading = historyActualQueries.some(
    (q) => q.isLoading && !q.data,
  );
  const historyActualIsFetching = historyActualQueries.some(
    (q) => q.isFetching,
  );
  const historyActualError = historyActualQueries.find((q) => q.isError)?.error;

  const todayDayOfWeek = jsDayToPythonWeekday(new Date().getDay());
  const todayLabel = DAY_OF_WEEK_LABELS[todayDayOfWeek];

  return (
    <Box bg="#f6f7f9" mih="100dvh">
      <Container size="xl" py={{ base: 24, sm: 40 }}>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <Stack gap={6}>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Room Activity
              </Text>
              <Title order={1}>{roomName ?? "Room"}</Title>
              {room?.description ? (
                <Text c="dimmed" maw={720}>
                  {room.description}
                </Text>
              ) : null}
            </Stack>
          </Group>

          <Card withBorder radius="lg" p="lg">
            <Stack gap="md">
              <Group justify="space-between" align="center" wrap="wrap">
                <Stack gap={4}>
                  <Text fw={700}>요일 선택</Text>
                  <Text size="sm" c="dimmed">
                    요일별 AI 혼잡도 예측을 확인하세요
                  </Text>
                </Stack>
                {selectedDayLabel === todayLabel ? (
                  <Badge color="green" variant="light" radius="xl" size="sm">
                    오늘
                  </Badge>
                ) : null}
              </Group>
              <SegmentedControl
                fullWidth
                value={selectedDayLabel}
                onChange={setSelectedDayLabel}
                data={DAY_OF_WEEK_LABELS.map((label, i) => ({
                  label: i === todayDayOfWeek ? `${label} ·` : label,
                  value: label,
                }))}
              />
              <Group gap={4}>
                {DAY_OF_WEEK_LABELS.map((label) => {
                  const dayOfWeek = getDayOfWeekValue(label);
                  const day = weeklyQuery.data?.weeklyEstimates.find(
                    (d) => d.dayOfWeek === dayOfWeek,
                  );
                  if (!day) return null;
                  const peak = day.slots.reduce(
                    (max, s) =>
                      s.estimatedDeviceCount > max
                        ? s.estimatedDeviceCount
                        : max,
                    0,
                  );
                  if (peak === 0) return null;
                  return (
                    <Badge
                      key={label}
                      color={
                        label === selectedDayLabel ? "teal" : "gray"
                      }
                      variant={label === selectedDayLabel ? "filled" : "light"}
                      radius="sm"
                      size="sm"
                    >
                      {label} 최대 {peak}
                    </Badge>
                  );
                })}
              </Group>
            </Stack>
          </Card>

          <WeeklyChart
            weeklyDay={weeklyDay}
            isLoading={weeklyQuery.isLoading}
            isFetching={weeklyQuery.isFetching}
            isError={weeklyQuery.isError}
            errorMessage={
              weeklyQuery.error instanceof Error
                ? weeklyQuery.error.message
                : undefined
            }
          />

          <Accordion
            variant="contained"
            radius="lg"
            value={historyOpen ? "history" : ""}
            onChange={(v) => setHistoryOpen(v === "history")}
          >
            <Accordion.Item value="history">
              <Accordion.Control>
                <Group gap="sm" align="center">
                  <IconHistory size={18} color="gray" />
                  <Text fw={600}>과거 실측 히스토리 보기</Text>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="md" pt="sm">
                  <Group justify="flex-end" align="flex-end" wrap="wrap">
                    <TextInput
                      leftSection={<IconCalendar size={16} />}
                      label="날짜 선택"
                      type="date"
                      value={historyDate}
                      onChange={(event) => setHistoryDate(event.target.value)}
                      maw={220}
                    />
                  </Group>
                  <HistoryChart
                    selectedDate={historyDate}
                    weeklyPredictionDay={historyWeeklyDay}
                    actualFrames={historyFrames}
                    actualValues={historyActualValues}
                    isLoading={historyWeeklyQuery.isLoading || historyActualIsLoading}
                    isFetching={
                      historyWeeklyQuery.isFetching ||
                      historyActualIsFetching
                    }
                    isError={
                      historyWeeklyQuery.isError ||
                      Boolean(historyActualError)
                    }
                    errorMessage={
                      historyWeeklyQuery.error instanceof Error
                        ? historyWeeklyQuery.error.message
                        : historyActualError instanceof Error
                          ? historyActualError.message
                          : undefined
                    }
                  />
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      </Container>
    </Box>
  );
}
