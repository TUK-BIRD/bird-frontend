import { Box, Container, Stack } from "@mantine/core";
import LocationEstimatesPanel from "./LocationEstimatesPanel";

export default function LocationEstimatesPage() {
  return (
    <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
      <Container size="xl" mt="12">
        <Stack gap="sm">
          <LocationEstimatesPanel />
        </Stack>
      </Container>
    </Box>
  );
}
