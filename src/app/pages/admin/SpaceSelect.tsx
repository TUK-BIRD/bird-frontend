import { Card, Flex, Loader, SimpleGrid, Title, Text } from "@mantine/core";
import useSpaces from "../../../hooks/useSpaces";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { IconUserCircle } from "@tabler/icons-react";

export default function SpaceSelect() {
  const { data: spaces, isLoading: isSpaceLoading } = useSpaces();
  const navigate = useNavigate();
  const { user } = useAuth();

  if (isSpaceLoading) <Loader />;

  return (
    <Flex
      maw={"70%"}
      m={"auto"}
      direction={"column"}
      justify={"center"}
      h={"100dvh"}
      gap={"sm"}
      p={"md"}
    >
      <Title order={1}>안녕하세요 {user?.name}님</Title>
      <Flex gap={"sm"} direction={"column"} w={"100%"}>
        <Title order={2}>내가 관리자인 공간들</Title>
        <SimpleGrid cols={3} w={"100%"}>
          {spaces?.map((space) => (
            <Card
              key={space.id}
              withBorder
              shadow="sm"
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/admin/space/${space.id}/dashboard`)}
            >
              <Text fw={"bold"}>{space.name}</Text>
              <Text c={"dimmed"}>{space.description}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </Flex>
    </Flex>
  );
}
