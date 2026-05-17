import {
  Box,
  Button,
  Card,
  Container,
  Divider,
  Flex,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Alert,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import useSpaces from "../../../hooks/useSpaces";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import apiClient from "@/api/client";
import { useLogout } from "@/app/pages/admin/hooks/useLogout";
import { IconArrowRight, IconLogout, IconPlus } from "@tabler/icons-react";

export default function SpaceSelect() {
  const { data: spaces, isLoading: isSpaceLoading } = useSpaces();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const [spaceDescription, setSpaceDescription] = useState("");

  const createSpaceMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: spaceName.trim(),
        description: spaceDescription.trim(),
      };
      return apiClient.post("/spaces/", payload).then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["spaces"] });
      setIsCreateOpen(false);
      setSpaceName("");
      setSpaceDescription("");
    },
  });

  const logoutMutation = useLogout();

  if (isSpaceLoading) {
    return (
      <Flex justify="center" align="center" h="100dvh">
        <Loader />
      </Flex>
    );
  }

  const handleCreateSpace = () => {
    if (!spaceName.trim()) return;
    createSpaceMutation.mutate();
  };

  return (
    <Box
      style={{
        minHeight: "100dvh",
        background: "#f6f5f1",
      }}
    >
      <Container size="lg" py={40}>
        <Stack gap="xl">
          <Card radius="md" withBorder>
            <Group justify="space-between" align="center" wrap="wrap">
              <Stack gap={6}>
                <Title
                  order={1}
                >
                  안녕하세요 {user?.name}님
                </Title>
                <Text c="dimmed">
                  관리 중인 공간을 선택하거나 새 공간을 만들어 보세요.
                </Text>
              </Stack>
              <Group gap="sm">
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setIsCreateOpen(true)}
                >
                  공간 추가
                </Button>
                <Button
                  variant="light"
                  color="dark"
                  leftSection={<IconLogout size={16} />}
                  onClick={() => logoutMutation.mutate()}
                  loading={logoutMutation.isPending}
                >
                  로그아웃
                </Button>
              </Group>
            </Group>
          </Card>

          <Stack gap="sm">
            <Group justify="space-between" align="center" wrap="wrap">
              <Title order={2}>내가 관리자인 공간들</Title>
            </Group>
            <Divider />
            {spaces?.length === 0 ? (
              <Card withBorder radius="md" p="xl">
                <Stack gap="xs" align="center">
                  <Title order={4}>아직 공간이 없습니다</Title>
                  <Text c="dimmed" ta="center">
                    첫 번째 공간을 만들어 팀을 초대해 보세요.
                  </Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setIsCreateOpen(true)}
                  >
                    공간 추가
                  </Button>
                </Stack>
              </Card>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                {spaces?.map((space) => (
                  <Card
                    key={space.id}
                    withBorder
                    radius="md"
                    style={{
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      navigate(`/admin/space/${space.id}/dashboard/overview`)
                    }
                  >
                    <Stack gap="xs">
                      <Text fw={700} fz="lg">
                        {space.name}
                      </Text>
                      <Text c="dimmed" lineClamp={2}>
                        {space.description || "설명이 아직 없습니다."}
                      </Text>
                      <Group justify="space-between" mt="sm">
                        <Text size="sm" c="dimmed">
                          관리자
                        </Text>
                        <Button
                          variant="subtle"
                          rightSection={<IconArrowRight size={16} />}
                          onClick={() =>
                            navigate(`/admin/space/${space.id}/dashboard/overview`)
                          }
                        >
                          대시보드
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </Stack>
        </Stack>
      </Container>

      <Modal
        opened={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="공간 추가"
        centered
      >
        <Stack gap="md">
          {createSpaceMutation.isError && (
            <Alert color="red" title="공간 생성 실패">
              공간 생성 중 오류가 발생했습니다. 입력 값을 확인해주세요.
            </Alert>
          )}
          <TextInput
            label="공간 이름"
            placeholder="새 공간 이름"
            required
            value={spaceName}
            onChange={(event) => setSpaceName(event.currentTarget.value)}
          />
          <Textarea
            label="공간 설명"
            placeholder="공간에 대한 설명"
            autosize
            minRows={3}
            value={spaceDescription}
            onChange={(event) => setSpaceDescription(event.currentTarget.value)}
          />
          <Flex justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setIsCreateOpen(false)}>
              취소
            </Button>
            <Button
              onClick={handleCreateSpace}
              disabled={!spaceName.trim()}
              loading={createSpaceMutation.isPending}
            >
              생성
            </Button>
          </Flex>
        </Stack>
      </Modal>
    </Box>
  );
}
