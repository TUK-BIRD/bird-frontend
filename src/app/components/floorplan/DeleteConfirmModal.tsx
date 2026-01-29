import { Button, Group, Modal, Text } from "@mantine/core";

export function DeleteConfirmModal(props: {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      opened={props.opened}
      onClose={props.onClose}
      title="삭제 확인"
      centered
    >
      <Text size="sm" mb="md">
        선택한 객체를 삭제할까요?
      </Text>
      <Group justify="flex-end">
        <Button variant="default" onClick={props.onClose}>
          취소
        </Button>
        <Button color="red" onClick={props.onConfirm}>
          삭제
        </Button>
      </Group>
    </Modal>
  );
}
