import {
  Group,
  Paper,
  Table,
  Title,
  Text,
  ActionIcon,
  rem,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import apiClient from "../../../api/client";
import { useParams } from "react-router";

export default function MemberInviteTable() {
  const [invites, setInvites] = useState([]);
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

  return (
    <Paper shadow="xs" p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Title order={3}>초대 목록</Title>
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
            {invites?.map((item) => (
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
