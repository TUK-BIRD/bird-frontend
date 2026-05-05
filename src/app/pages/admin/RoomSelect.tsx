import { useNavigate, useParams } from "react-router";
import useRooms from "../../../hooks/useRooms";
import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from "@mantine/core";

export default function RoomSelect() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { data: rooms, isLoading: isRoomLoading } = useRooms(spaceId!);
  const navigate = useNavigate();
  // const { mutate, isPending, error } = useCreateRoom(spaceId!);

  if (isRoomLoading) {
    return (
      <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
        <Container size="lg" py={40}>
          <Group justify="center" mt="xl">
            <Loader />
          </Group>
        </Container>
      </Box>
    );
  }

  return (
    <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
      <Container size="xl" mt={"12"}>
        <Stack gap="xl">
          <Stack gap={4}>
            <Title order={1}>Rooms</Title>
            <Text c="dimmed">공간에 등록된 방 목록을 확인하세요.</Text>
          </Stack>

          <Group justify="space-between" align="center" wrap="wrap">
            <Title order={2}>방 목록</Title>
            <Button
            // onClick={() => mutate()}
            // onClick={() => navigate(`/admin/space/${spaceId}/rooms/create`)}
            >
              Room 생성
            </Button>
          </Group>
          <Divider />

          {!rooms || rooms.length === 0 ? (
            <Card withBorder p="xl" radius="md">
              <Stack align="center">
                <Text size="lg" fw={600}>
                  아직 생성된 Room이 없습니다
                </Text>
                <Text size="sm" c="dimmed">
                  새로운 Room을 생성해서 공간을 관리해보세요.
                </Text>
                <Button
                  mt="md"
                  // onClick={() => navigate(`/admin/space/${spaceId}/rooms/create`)}
                  // onClick={mutate}
                >
                  Room 생성
                </Button>
              </Stack>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {rooms.map((room) => (
                <Card
                  key={room.id}
                  withBorder
                  radius="md"
                  style={{ cursor: "pointer", backgroundColor: "white" }}
                  onClick={() =>
                    navigate(`/admin/space/${spaceId}/rooms/${room.id}`)
                  }
                >
                  <Stack gap={6}>
                    <Text fw={600}>{room.name}</Text>
                    {room.description && (
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {room.description}
                      </Text>
                    )}
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Stack>
      </Container>
    </Box>
  );
}
