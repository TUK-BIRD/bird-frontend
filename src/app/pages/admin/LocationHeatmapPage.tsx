import { Box, Container, Stack } from "@mantine/core";
import LocationHeatmapPanel from "./LocationHeatmapPanel";

export default function LocationHeatmapPage() {
  return (
    <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
      <Container size="xl" mt="12">
        <Stack gap="sm">
          <LocationHeatmapPanel />
        </Stack>
      </Container>
    </Box>
  );
}
