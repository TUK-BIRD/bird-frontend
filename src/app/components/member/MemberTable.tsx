import {
  Table,
  Group,
  Text,
  ActionIcon,
  rem,
  Paper,
  Title,
  Select,
  Button,
  Modal,
  Stack,
} from "@mantine/core";
import { IconTrash, IconUserPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { MemberAddModal } from "./MemberAddModal";
import type { MemberAddType } from "../../../types/types";
import apiClient from "../../../api/client";
import { useParams } from "react-router";
import useSpaceUsers from "../../../hooks/useSpaceUsers";
import { notifications } from "@mantine/notifications";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/useAuth";

export function MemberTable() {
  const { spaceId } = useParams<{ spaceId: string }>();
  const params = useParams();
  const { data: space_users } = useSpaceUsers(
    params.spaceId as string,
  );
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const currentUserRole =
    space_users?.find((item) => item.user?.id === user?.id)?.role ?? null;
  const isOwner = currentUserRole === "OWNER";

  const updateRoleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: string;
    }) =>
      apiClient.patch(`/space/${spaceId}/members/${userId}/role`, {
        role,
      }),
    onMutate: async ({ userId, role }) => {
      if (!spaceId) return;
      await queryClient.cancelQueries({
        queryKey: ["space_users", spaceId],
      });
      const previous = queryClient.getQueryData<any[]>([
        "space_users",
        spaceId,
      ]);
      queryClient.setQueryData<any[]>(["space_users", spaceId], (old) =>
        (old ?? []).map((item) =>
          item.user?.id === userId ? { ...item, role } : item,
        ),
      );
      return { previous };
    },
    onError: (error, _vars, context) => {
      if (!spaceId) return;
      if (context?.previous) {
        queryClient.setQueryData(["space_users", spaceId], context.previous);
      }
      let message = "권한 변경에 실패했습니다. 잠시 후 다시 시도해주세요.";
      if (isAxiosError(error)) {
        const serverMessage = error.response?.data?.message;
        if (typeof serverMessage === "string" && serverMessage.trim()) {
          message = serverMessage;
        }
      }
      notifications.show({
        color: "red",
        title: "권한 변경 실패",
        message,
      });
    },
    onSuccess: () => {
      if (!spaceId) return;
      queryClient.invalidateQueries({
        queryKey: ["space_users", spaceId],
      });
      notifications.show({
        color: "green",
        title: "권한 변경됨",
        message: "멤버 권한이 업데이트되었습니다.",
      });
    },
  });

  // 역할 변경 핸들러
  const handleRoleChange = (userId: string, newRole: string | null) => {
    if (!newRole) return;
    if (!spaceId) {
      notifications.show({
        color: "red",
        title: "권한 변경 실패",
        message: "공간 정보를 찾을 수 없습니다.",
      });
      return;
    }
    updateRoleMutation.mutate({ userId, role: newRole });
  };

  const deleteMemberMutation = useMutation({
    mutationFn: (userId: string | number) =>
      apiClient.delete(`/space/${spaceId}/members/${userId}`),
    onSuccess: () => {
      if (!spaceId) return;
      queryClient.invalidateQueries({
        queryKey: ["space_users", spaceId],
      });
      notifications.show({
        color: "green",
        title: "멤버 삭제됨",
        message: "멤버가 공간에서 삭제되었습니다.",
      });
    },
    onError: (error) => {
      let message = "멤버 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.";
      if (isAxiosError(error)) {
        const serverMessage = error.response?.data?.message;
        if (typeof serverMessage === "string" && serverMessage.trim()) {
          message = serverMessage;
        }
      }
      notifications.show({
        color: "red",
        title: "멤버 삭제 실패",
        message,
      });
    },
  });

  const handleDeleteMember = (userId?: string | number) => {
    if (!spaceId) {
      notifications.show({
        color: "red",
        title: "멤버 삭제 실패",
        message: "공간 정보를 찾을 수 없습니다.",
      });
      return;
    }
    if (!userId) {
      notifications.show({
        color: "red",
        title: "멤버 삭제 실패",
        message: "삭제할 멤버 정보를 찾을 수 없습니다.",
      });
      return;
    }
    deleteMemberMutation.mutate(userId);
  };

  const [opened, { open, close }] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id?: string | number;
    name?: string;
    email?: string;
  } | null>(null);

  const rows = space_users?.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Group gap="sm">
          <div>
            <Text fz="sm" fw={500}>
              {item.user.name}
            </Text>
            <Text fz="xs" c="dimmed">
              {item.user.email}
            </Text>
          </div>
        </Group>
      </Table.Td>

      {/* 3. Badge 대신 Select 컴포넌트 사용 */}
      <Table.Td>
        <Select
          data={["MEMBER", "OWNER"]}
          value={item.role}
          onChange={(value) => handleRoleChange(item.user?.id, value)}
          variant="filled"
          size="xs"
          allowDeselect={false} // 선택 해제 방지
          w={100} // 너비 고정
        />
      </Table.Td>

      <Table.Td>
        <Group gap={0} justify="flex-end">
          {isOwner && (
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={() => {
                setDeleteTarget({
                  id: item.user?.id,
                  name: item.user?.name,
                  email: item.user?.email,
                });
                openDelete();
              }}
            >
              <IconTrash
                style={{ width: rem(16), height: rem(16) }}
                stroke={1.5}
              />
            </ActionIcon>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const handleAddMember = async (newMemberData: MemberAddType) => {
    const newMember = {
      ...newMemberData,
    };

    if (!spaceId) {
      notifications.show({
        color: "red",
        title: "초대 실패",
        message: "공간 정보를 찾을 수 없습니다.",
      });
      return;
    }

    try {
      await apiClient.post(`/spaces/${spaceId}/invite`, {
        ...newMember,
      });

      notifications.show({
        color: "green",
        title: "초대 전송됨",
        message: `${newMember.email}에게 초대 메일을 보냈습니다.`,
      });
    } catch (error) {
      let message = "초대 전송에 실패했습니다. 잠시 후 다시 시도해주세요.";

      if (isAxiosError(error)) {
        const serverMessage = error.response?.data?.message;
        if (typeof serverMessage === "string" && serverMessage.trim()) {
          message = serverMessage;
        }
      }

      notifications.show({
        color: "red",
        title: "초대 실패",
        message,
      });
    }
  };

  return (
    <>
      <Paper shadow="xs" p="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={3}>멤버 관리</Title>
          <Button leftSection={<IconUserPlus size={14} />} onClick={open}>
            멤버 추가
          </Button>
        </Group>

        <Table.ScrollContainer minWidth={800}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>직원 정보</Table.Th>
                <Table.Th>권한</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
      <MemberAddModal
        opened={opened}
        onClose={close}
        onAddMember={handleAddMember}
      />
      <Modal
        opened={deleteOpened}
        onClose={() => {
          closeDelete();
          setDeleteTarget(null);
        }}
        title="멤버 삭제"
        centered
      >
        <Stack gap="md">
          <Text>
            {deleteTarget?.name
              ? `${deleteTarget.name} (${deleteTarget.email ?? ""})`
              : deleteTarget?.email ?? "선택한 멤버"}{" "}
            을(를) 정말 삭제하시겠어요?
          </Text>
          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => {
                closeDelete();
                setDeleteTarget(null);
              }}
            >
              취소
            </Button>
            <Button
              color="red"
              loading={deleteMemberMutation.isPending}
              onClick={() => {
                handleDeleteMember(deleteTarget?.id);
                closeDelete();
                setDeleteTarget(null);
              }}
            >
              삭제
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
