import {
  Box,
  Container,
  Divider,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import MemberInviteTable from "../../components/member/MemberInviteTable";
import { MemberTable } from "../../components/member/MemberTable";

export default function Members() {
  return (
    <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
      <Container size="xl" mt="12">
        <Stack gap="xl">
          <Stack gap={4}>
            <Title order={1}>멤버 관리</Title>
            <Text c="dimmed">공간에 등록된 멤버와 초대 목록을 관리하세요.</Text>
          </Stack>

          <Stack gap="md">
            <Title order={2}>멤버 목록</Title>
            <MemberTable />
          </Stack>

          <Divider />

          <Stack gap="md">
            <Title order={2}>초대 목록</Title>
            <MemberInviteTable />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
