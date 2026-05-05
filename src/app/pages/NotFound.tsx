import { Box, Button, Center, Container, Stack, Text, Title } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <Box style={{ minHeight: "100dvh", background: "#f6f5f1" }}>
      <Center h="100dvh">
        <Container size="sm" ta="center">
        <Stack align="center" gap="lg">
          <IconAlertCircle size={56} color="#2b2b2b" />
          <div>
            <Title order={1}>404</Title>
            <Title order={2} c="dimmed" size="h4" mt={0}>
              페이지를 찾을 수 없습니다.
            </Title>
          </div>
          <Text c="dimmed" size="lg">
            요청하신 페이지는 존재하지 않습니다.
          </Text>
          <Button
            component={Link}
            to="/admin/spaces"
            size="md"
            variant="default"
          >
            홈으로 돌아가기
          </Button>
        </Stack>
      </Container>
      </Center>
    </Box>
  );
}
