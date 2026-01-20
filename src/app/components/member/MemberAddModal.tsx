import { Modal, Button, TextInput, Select, Group, Stack } from "@mantine/core";
import { useForm } from "@mantine/form";
import type { MemberAddType, UserSpaceRole } from "../../../types/types";

interface MemberAddModalProps {
  opened: boolean;
  onClose: () => void;
  onAddMember: (values: MemberAddType) => void;
}

export function MemberAddModal({
  opened,
  onClose,
  onAddMember,
}: MemberAddModalProps) {
  const form = useForm({
    initialValues: {
      email: "",
      role: "MEMBER",
    },
    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : "유효한 이메일을 입력하세요",
    },
  });

  const handleSubmit = (values: typeof form.values) => {
    const newMember: MemberAddType = {
      role: values.role as UserSpaceRole,
      email: values.email,
    };

    onAddMember(newMember);
    form.reset();
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="새 멤버 추가" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          <TextInput
            label="이메일"
            placeholder="example@mail.com"
            withAsterisk
            {...form.getInputProps("email")}
          />

          <Select
            label="권한"
            data={[
              { value: "ADMIN", label: "관리자" },
              { value: "MEMBER", label: "사용자" },
            ]}
            allowDeselect={false}
            {...form.getInputProps("role")}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={onClose}>
              취소
            </Button>
            <Button type="submit">추가</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
