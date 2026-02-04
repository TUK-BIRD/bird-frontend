import {
  Group,
  Paper,
  Table,
  Title,
  Text,
  ActionIcon,
  rem,
  Select,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import apiClient from "../../../api/client";
import { useParams } from "react-router";

type Invite = {
  id: string;
  email: string;
  status: string;
  expiresAt: string;
};

const ALL_STATUS = "ALL";

export default function MemberInviteTable() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(ALL_STATUS);
  const { spaceId } = useParams<{ spaceId: string }>();

  useEffect(() => {
    const getInvitations = async () => {
      try {
        const response = await apiClient.get(`/spaces/${spaceId}/invites`);
        setInvites(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    getInvitations();
  }, [spaceId]);

  const statusOptions = useMemo(() => {
    const unique = Array.from(
      new Set(invites.map((invite) => invite.status).filter(Boolean)),
    );
    return [
      { value: ALL_STATUS, label: "전체" },
      ...unique.map((status) => ({ value: status, label: status })),
    ];
  }, [invites]);

  const filteredInvites = useMemo(() => {
    if (!statusFilter || statusFilter === ALL_STATUS) {
      return invites;
    }
    return invites.filter((invite) => invite.status === statusFilter);
  }, [invites, statusFilter]);

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>초대 목록</Title>
        <Select
          data={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="상태 필터"
          w={160}
          size="xs"
          allowDeselect={false}
        />
      </Group>

      <Table.ScrollContainer minWidth={800}>
        <Table verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>이메일</Table.Th>
              <Table.Th>상태</Table.Th>
              <Table.Th>유효기간</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredInvites?.map((item) => (
              <Table.Tr key={item?.id}>
                <Table.Td>
                  <Text fz="sm">{item?.email}</Text>
                </Table.Td>
                <Table.Td>
                  <Text fz="sm">{item?.status}</Text>
                </Table.Td>
                <Table.Td>
                  <Text fz="sm">{item?.expiresAt}</Text>
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
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Paper>
  );
}
