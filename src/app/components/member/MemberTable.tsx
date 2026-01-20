import { useEffect, useState } from "react";
import {
  Table,
  Group,
  Text,
  ActionIcon,
  Badge,
  rem,
  Paper,
  Title,
  Select,
  Button,
} from "@mantine/core";
import { IconTrash, IconUserPlus } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { MemberAddModal } from "./MemberAddModal";
import type { MemberAddType } from "../../../types/types";
import apiClient from "../../../api/client";
import { useParams } from "react-router";

const initialMembers = [
  {
    id: "1",
    name: "김철수",
    email: "chulsoo@example.com",
    role: "관리자",
    status: "활성",
  },
  {
    id: "2",
    name: "이영희",
    email: "younghee@example.com",
    role: "사용자",
    status: "비활성",
  },
  {
    id: "3",
    name: "박지성",
    email: "park@example.com",
    role: "사용자",
    status: "대기",
  },
];


export function MemberTable() {
  const [members, setMembers] = useState(initialMembers);
  const { spaceId } = useParams<{ spaceId: string }>();

  // 역할 변경 핸들러
  const handleRoleChange = (id: string, newRole: string | null) => {
    if (!newRole) return;

    // UI 업데이트
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    );

    console.log(`Member ${id} role changed to: ${newRole}`);
    // TODO: 여기서 API 호출 (ex: axios.patch(`/api/members/${id}`, { role: newRole }))
  };

  const rows = members.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Group gap="sm">
          <div>
            <Text fz="sm" fw={500}>
              {item.name}
            </Text>
            <Text fz="xs" c="dimmed">
              {item.email}
            </Text>
          </div>
        </Group>
      </Table.Td>

      {/* 3. Badge 대신 Select 컴포넌트 사용 */}
      <Table.Td>
        <Select
          data={["관리자", "사용자", "게스트"]}
          value={item.role}
          onChange={(value) => handleRoleChange(item.id, value)}
          variant="filled"
          size="xs"
          allowDeselect={false} // 선택 해제 방지
          w={100} // 너비 고정
        />
      </Table.Td>


      <Table.Td>
        <Group gap={0} justify="flex-end">
          <ActionIcon variant="subtle" color="red">
            <IconTrash
              style={{ width: rem(16), height: rem(16) }}
              stroke={1.5}
            />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const handleAddMember = async (newMemberData: MemberAddType) => {
    const newMember = {
      ...newMemberData,
    };

    console.log(newMemberData);

    console.log("새 멤버 추가됨:", newMember);

    const response = await apiClient.post(`/spaces/${spaceId}/invite`, {
      ...newMember,
    });

    const data = response.data;
    console.log(data);
  };

  const [opened, { open, close }] = useDisclosure(false);

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
    </>
  );
}
