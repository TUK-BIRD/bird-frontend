import { Box, Container, Stack } from "@mantine/core";
import BleDashboardPanel from "./BleDashboardPanel";

export default function BleCompareDashboardPage() {
  return (
    <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
      <Container size="xl" mt="12">
        <Stack gap="sm">
          <BleDashboardPanel />
        </Stack>
      </Container>
    </Box>
  );
}
