import {
  Button,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import type { Entity, ToolMode } from "./types";
import {
  IconCpu,
  IconDeviceFloppy,
  IconDoor,
  IconPicnicTable,
} from "@tabler/icons-react";
import { GRID_SIZE_PX, GRID_STEP_M } from "./constants";
import { useState } from "react";

export function LeftPanel(props: {
  mode: ToolMode;
  setMode: (m: ToolMode) => void;
  selected: Entity | null;
  onAddDoor: () => void;
  onAddTable: () => void;
  onAddSensor: () => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onDelete: () => void;
  onExport: () => void;
  lockedSelected: boolean;
  onToggleLockSelected: () => void;
  onChangeSelectedName: (name: string) => void;
  saveOpened: boolean;
  onOpenSave: () => void;
  onCloseSave: () => void;
  onSave: ({
    name,
    description,
  }: {
    name: string;
    description: string;
  }) => void;
  showSaveButton?: boolean;
}) {
  const { saveOpened, onSave, onOpenSave, onCloseSave } = props;

  const [roomName, setRoomName] = useState("");
  const [roomDescription, setRoomDescription] = useState("");

  const handleConfirm = () => {
    if (!roomName) return;

    onSave({ name: roomName, description: roomDescription });
    close();
  };

  return (
    <Paper withBorder p="md" style={{ width: 240 }}>
      <Stack gap="sm">
        <Text fw={600}>Tools</Text>

        <SegmentedControl
          value={props.mode}
          onChange={(v) => props.setMode(v as ToolMode)}
          data={[
            { label: "Select", value: "select" },
            { label: "Room", value: "room" },
          ]}
        />

        <Text fw={600} mt="sm">
          Add
        </Text>
        <Group grow>
          <Button variant="light" onClick={props.onAddDoor}>
            <IconDoor />
          </Button>
          <Button variant="light" onClick={props.onAddTable}>
            <IconPicnicTable />
          </Button>
          <Button variant="light" onClick={props.onAddSensor}>
            <IconCpu />
          </Button>
        </Group>

        <Text fw={600} mt="sm">
          Edit
        </Text>
        {props.selected &&
          (props.selected.type === "table" ||
            props.selected.type === "door" ||
            props.selected.type === "sensor") && (
            <TextInput
              label="Name"
              value={props.selected.name ?? ""}
              onChange={(ev) =>
                props.onChangeSelectedName(ev.currentTarget.value)
              }
            />
          )}
        <Button
          variant={props.lockedSelected ? "filled" : "default"}
          disabled={!props.selected}
          onClick={props.onToggleLockSelected}
        >
          {props.lockedSelected ? "Unlock selected" : "Lock selected"}
        </Button>

        <Button color="red" disabled={!props.selected} onClick={props.onDelete}>
          Delete selected
        </Button>
        {props.showSaveButton !== false && (
          <>
            <Button
              fullWidth
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={onOpenSave}
            >
              Save
            </Button>

            <Modal opened={saveOpened} onClose={onCloseSave} title="Save project">
              <Stack>
                <TextInput
                  label="Room Name"
                  placeholder="예: 501호"
                  value={roomName}
                  onChange={(e) => setRoomName(e.currentTarget.value)}
                  autoFocus
                />
                <Textarea
                  label="Room Description"
                  placeholder="예: 501호의 도면입니다"
                  value={roomDescription}
                  onChange={(e) => setRoomDescription(e.currentTarget.value)}
                />

                <Group justify="flex-end">
                  <Button variant="default" onClick={onCloseSave}>
                    Cancel
                  </Button>
                  <Button onClick={handleConfirm} disabled={!roomName.trim()}>
                    Save
                  </Button>
                </Group>
              </Stack>
            </Modal>
          </>
        )}
      </Stack>

      <Text size="xs" c="dimmed" mt={12}>
        Grid: {GRID_STEP_M}m / {GRID_SIZE_PX}px per cell
      </Text>
    </Paper>
  );
}
