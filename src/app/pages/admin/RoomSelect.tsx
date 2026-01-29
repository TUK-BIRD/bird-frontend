import { useNavigate, useParams } from "react-router";
import useRooms from "../../../hooks/useRooms";
import {
  Card,
  Group,
  Loader,
  Stack,
  Text,
  Button,
  SimpleGrid,
} from "@mantine/core";
import useCreateRoomMutation from "../../../hooks/useCreateRoomMutation";

export default function RoomSelect() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const { data: rooms, isLoading: isRoomLoading } = useRooms(spaceId!);
  const navigate = useNavigate();
  // const { mutate, isPending, error } = useCreateRoom(spaceId!);

  if (isRoomLoading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }
  if (!rooms || rooms.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Text size="xl" fw={600}>
          Rooms
        </Text>
        <Button
          // onClick={() => mutate()}
          // onClick={() => navigate(`/admin/space/${spaceId}/rooms/create`)}
        >
          Room 생성
        </Button>
      </Group>

      <SimpleGrid cols={3}>
        {rooms.map((room) => (
          <Card
            key={room.id}
            withBorder
            shadow="sm"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/admin/space/${spaceId}/rooms/${room.id}`)}
          >
            <Text fw={500}>{room.name}</Text>
            {room.description && (
              <Text size="sm" c="dimmed">
                {room.description}
              </Text>
            )}
          </Card>
        ))}
      </SimpleGrid>
    </>
  );
}
