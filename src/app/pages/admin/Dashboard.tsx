import {
  Box,
  Card,
  Container,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

const kpiData = [
  { label: "현재 인원", value: "128", change: "+12%" },
  { label: "혼잡도", value: "68%", change: "-4%" },
  { label: "가동 중인 방", value: "12", change: "+2" },
  { label: "최대 혼잡 시간", value: "16:00", change: "오늘" },
];

const weeklyUsage = [18, 24, 20, 32, 40, 36, 44];
const hourlyUsage = [40, 28, 32, 20, 12, 24, 30, 22, 18, 26];

export default function Dashboard() {
  return (
    <Box style={{ minHeight: "100dvh" }}>
      <Container size="xl">
        <Stack gap="sm">
          <Stack gap={4}>
            <Title order={1}>대시보드</Title>
            <Text c="dimmed">공간 운영 현황을 한눈에 확인하세요.</Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="sm">
            {kpiData.map((item) => (
              <Card key={item.label} withBorder radius="md">
                <Stack gap={2}>
                  <Text size="sm" c="dimmed">
                    {item.label}
                  </Text>
                  <Group justify="space-between" align="flex-end">
                    <Title order={3}>{item.value}</Title>
                    <Text size="sm" c="green">
                      {item.change}
                    </Text>
                  </Group>
                </Stack>
              </Card>
            ))}
          </SimpleGrid>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
            <Card withBorder radius="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={4}>주간 혼잡도 추이</Title>
                  <Text size="sm" c="dimmed">
                    최근 7일
                  </Text>
                </Group>
                <Box
                  style={{
                    height: 180,
                    width: "100%",
                  }}
                >
                  <svg
                    viewBox="0 0 600 180"
                    width="100%"
                    height="100%"
                    role="img"
                    aria-label="주간 이용 추이"
                  >
                    <polyline
                      fill="none"
                      stroke="#2b2b2b"
                      strokeWidth="3"
                      points={weeklyUsage
                        .map((value, index) => {
                          const x = (index / (weeklyUsage.length - 1)) * 560 + 20;
                          const y = 160 - (value / 50) * 120;
                          return `${x},${y}`;
                        })
                        .join(" ")}
                    />
                    {weeklyUsage.map((value, index) => {
                      const x = (index / (weeklyUsage.length - 1)) * 560 + 20;
                      const y = 160 - (value / 50) * 120;
                      return (
                        <circle
                          key={`${value}-${index}`}
                          cx={x}
                          cy={y}
                          r={4}
                          fill="#2b2b2b"
                        />
                      );
                    })}
                  </svg>
                </Box>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    월
                  </Text>
                  <Text size="sm" c="dimmed">
                    일
                  </Text>
                </Group>
              </Stack>
            </Card>

            <Card withBorder radius="md">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Title order={4}>시간대별 평균 혼잡도</Title>
                  <Text size="sm" c="dimmed">
                    오늘
                  </Text>
                </Group>
                <Group
                  gap={10}
                  align="flex-end"
                  style={{ height: 180 }}
                >
                  {hourlyUsage.map((value, index) => (
                    <Box
                      key={`${value}-${index}`}
                      style={{
                        width: 18,
                        height: `${value * 3}px`,
                        background: "#2b2b2b",
                        borderRadius: 4,
                      }}
                    />
                  ))}
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    09:00
                  </Text>
                  <Text size="sm" c="dimmed">
                    18:00
                  </Text>
                </Group>
              </Stack>
            </Card>
          </SimpleGrid>

          <Card withBorder radius="md">
            <Stack gap="sm">
              <Title order={4}>최근 이벤트</Title>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text>혼잡도 급증 감지</Text>
                  <Text size="sm" c="dimmed">
                    5분 전
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>방 인원 변동</Text>
                  <Text size="sm" c="dimmed">
                    30분 전
                  </Text>
                </Group>
                <Group justify="space-between">
                  <Text>혼잡 구간 해제</Text>
                  <Text size="sm" c="dimmed">
                    2시간 전
                  </Text>
                </Group>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
