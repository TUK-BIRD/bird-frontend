import { Box, Container, Stack } from "@mantine/core";
import OverviewDashboardPanel from "./OverviewDashboardPanel";

export default function OverviewDashboardPage() {
  return (
    <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
      <Container size="xl" mt="12">
        <Stack gap="sm">
          <OverviewDashboardPanel />
        </Stack>
      </Container>
    </Box>
  );
}
