import { useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Container,
  Group,
  LoadingOverlay,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
  rem,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import apiClient from "@/api/client";
import useBleScanBlacklistedMacs, {
  bleScanBlacklistedMacsQueryKey,
  type BleScanBlacklistedMac,
  type CreateBleScanBlacklistedMacResponse,
} from "@/hooks/useBleScanBlacklistedMacs";

const macPattern = /^([0-9a-f]{2}:){5}[0-9a-f]{2}$/;

function normalizeMac(value: string) {
  return value.trim().toLowerCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (!isAxiosError(error)) return fallback;

  const data = error.response?.data;
  const message = data?.message;
  if (typeof message === "string" && message.trim()) return message;

  const errors = data?.errors;
  if (errors && typeof errors === "object") {
    const firstError = Object.values(errors)
      .flat()
      .find((item) => typeof item === "string");
    if (typeof firstError === "string" && firstError.trim()) {
      return firstError;
    }
  }

  if (error.response?.status === 409 || error.response?.status === 422) {
    return "이미 등록된 MAC 주소이거나 입력값이 올바르지 않습니다.";
  }

  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCreatedBy(entry: BleScanBlacklistedMac) {
  const creator = entry.createdByUser;
  if (!creator) return "-";
  if (typeof creator === "string") return creator;

  if (creator.name && creator.email) {
    return `${creator.name} (${creator.email})`;
  }

  return creator.name ?? creator.email ?? "-";
}

export default function Settings() {
  const queryClient = useQueryClient();
  const blacklistQuery = useBleScanBlacklistedMacs();
  const [deviceMac, setDeviceMac] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<BleScanBlacklistedMac | null>(null);
  const [deleteOpened, { open: openDelete, close: closeDelete }] =
    useDisclosure(false);

  const normalizedMac = useMemo(() => normalizeMac(deviceMac), [deviceMac]);
  const isMacValid = macPattern.test(normalizedMac);

  const createMutation = useMutation({
    mutationFn: (payload: { deviceMac: string; note?: string }) =>
      apiClient
        .post<CreateBleScanBlacklistedMacResponse>(
          "/ble_scan_blacklisted_macs",
          payload,
        )
        .then((res) => res.data),
    onSuccess: (entry) => {
      setDeviceMac("");
      setNote("");
      setFormError(null);
      queryClient.invalidateQueries({
        queryKey: bleScanBlacklistedMacsQueryKey,
      });
      notifications.show({
        color: "green",
        title: "Blacklist MAC 등록됨",
        message: `기존 scan 데이터 ${entry.deletedScanEventCount ?? 0}건, 위치 추정 데이터 ${
          entry.deletedLocationEstimateCount ?? 0
        }건이 제거되었습니다.`,
      });
    },
    onError: (error) => {
      const message = getErrorMessage(
        error,
        "Blacklist MAC 등록에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
      setFormError(message);
      notifications.show({
        color: "red",
        title: "등록 실패",
        message,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (entry: BleScanBlacklistedMac) =>
      apiClient
        .delete(`/ble_scan_blacklisted_macs/${entry.id}`)
        .then((res) => res.data),
    onSuccess: (_result, entry) => {
      queryClient.setQueryData<BleScanBlacklistedMac[]>(
        bleScanBlacklistedMacsQueryKey,
        (old) => (old ?? []).filter((item) => item.id !== entry.id),
      );
      notifications.show({
        color: "green",
        title: "Blacklist에서 제거됨",
        message: `${entry.deviceMac}이(가) blacklist에서 제거되었습니다.`,
      });
    },
    onError: (error) => {
      notifications.show({
        color: "red",
        title: "삭제 실패",
        message: getErrorMessage(
          error,
          "Blacklist MAC 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.",
        ),
      });
    },
  });

  const handleSubmit = () => {
    const nextMac = normalizeMac(deviceMac);
    if (!macPattern.test(nextMac)) {
      setFormError("MAC 주소는 aa:bb:cc:dd:ee:ff 형식으로 입력해주세요.");
      return;
    }

    const shouldRegister = window.confirm(
      `${nextMac}을(를) blacklist에 등록할까요?\n등록 즉시 기존 scan event와 위치 추정 데이터가 삭제되고 이후 집계에서도 제외됩니다.`,
    );
    if (!shouldRegister) return;

    createMutation.mutate({
      deviceMac: nextMac,
      note: note.trim() || undefined,
    });
  };

  const rows = (blacklistQuery.data ?? []).map((entry) => (
    <Table.Tr key={entry.id}>
      <Table.Td>
        <Badge variant="light" color="dark" tt="lowercase">
          {entry.deviceMac}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{entry.note?.trim() || "-"}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatCreatedBy(entry)}</Text>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{formatDate(entry.createdAt)}</Text>
      </Table.Td>
      <Table.Td>
        <Group justify="flex-end">
          <ActionIcon
            variant="subtle"
            color="red"
            aria-label={`${entry.deviceMac} 삭제`}
            onClick={() => {
              setDeleteTarget(entry);
              openDelete();
            }}
          >
            <IconTrash
              style={{ width: rem(16), height: rem(16) }}
              stroke={1.5}
            />
          </ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box style={{ minHeight: "100dvh", background: "#FAFAF8" }}>
      <Container size="xl" mt="12">
        <Stack gap="xl">
          <Stack gap={4}>
            <Title order={1}>설정</Title>
            <Text c="dimmed">공간 운영에 필요한 시스템 설정을 관리하세요.</Text>
          </Stack>

          <Paper shadow="xs" p="md" withBorder pos="relative">
            <LoadingOverlay visible={blacklistQuery.isLoading} />
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Title order={2}>Blacklist MAC</Title>
                  <Text c="dimmed" size="sm">
                    BLE scan 집계에서 제외할 기기 MAC 주소를 관리합니다.
                  </Text>
                </Stack>
                <Button
                  variant="light"
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => blacklistQuery.refetch()}
                  loading={blacklistQuery.isFetching}
                >
                  새로고침
                </Button>
              </Group>

              <Alert
                color="yellow"
                icon={<IconAlertTriangle size={18} />}
                title="등록 시 기존 데이터가 삭제됩니다"
              >
                등록된 MAC의 기존 scan event와 위치 추정 데이터는 즉시 제거되며,
                이후 집계에서도 제외됩니다. Blacklist에서 삭제해도 이미 삭제된
                데이터는 복구되지 않습니다.
              </Alert>

              <Stack gap="sm">
                <Group align="flex-start" grow>
                  <TextInput
                    label="MAC 주소"
                    placeholder="aa:bb:cc:dd:ee:ff"
                    value={deviceMac}
                    onChange={(event) => {
                      setDeviceMac(event.currentTarget.value);
                      setFormError(null);
                    }}
                    error={
                      deviceMac.trim() && !isMacValid
                        ? "aa:bb:cc:dd:ee:ff 형식으로 입력해주세요."
                        : undefined
                    }
                  />
                  <Textarea
                    label="Note"
                    placeholder="등록 사유 또는 메모"
                    autosize
                    minRows={1}
                    maxRows={3}
                    value={note}
                    onChange={(event) => setNote(event.currentTarget.value)}
                  />
                </Group>
                {formError && (
                  <Text c="red" size="sm">
                    {formError}
                  </Text>
                )}
                <Group justify="space-between" align="center">
                  <Text c="dimmed" size="sm">
                    입력한 MAC은 소문자로 변환되어 저장됩니다.
                  </Text>
                  <Button
                    color="red"
                    onClick={handleSubmit}
                    loading={createMutation.isPending}
                    disabled={!deviceMac.trim() || !isMacValid}
                  >
                    등록
                  </Button>
                </Group>
              </Stack>

              {blacklistQuery.isError ? (
                <Alert color="red" title="목록을 불러올 수 없습니다">
                  {getErrorMessage(
                    blacklistQuery.error,
                    "Blacklist MAC 목록 조회에 실패했습니다.",
                  )}
                </Alert>
              ) : (
                <Table.ScrollContainer minWidth={840}>
                  <Table verticalSpacing="sm" striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>MAC 주소</Table.Th>
                        <Table.Th>Note</Table.Th>
                        <Table.Th>등록자</Table.Th>
                        <Table.Th>등록일</Table.Th>
                        <Table.Th />
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {rows.length ? (
                        rows
                      ) : (
                        <Table.Tr>
                          <Table.Td colSpan={5}>
                            <Text c="dimmed" ta="center" py="lg">
                              등록된 blacklist MAC이 없습니다.
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              )}
            </Stack>
          </Paper>
        </Stack>
      </Container>

      <Modal
        opened={deleteOpened}
        onClose={() => {
          closeDelete();
          setDeleteTarget(null);
        }}
        title="Blacklist MAC 삭제"
        centered
      >
        <Stack gap="md">
          <Text>
            {deleteTarget?.deviceMac ?? "선택한 MAC"}을(를) blacklist에서
            삭제하시겠어요?
          </Text>
          <Text c="dimmed" size="sm">
            Blacklist에서만 제거되며 이미 삭제된 scan/location 데이터는 복구되지
            않습니다.
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
              loading={deleteMutation.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget);
                closeDelete();
                setDeleteTarget(null);
              }}
            >
              삭제
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
