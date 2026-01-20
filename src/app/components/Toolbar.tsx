import React from "react";
import { Paper, Group, Button, NumberInput, SegmentedControl, Text as MText } from "@mantine/core";
import type { RectShape, Tool } from "../../types/types";
import { PX_PER_M, STAGE_H, STAGE_W } from "../../types/constants";
import { toFixed2 } from "../utils/geometry";

export function Toolbar(props: {
  tool: Tool;
  setTool: (t: Tool) => void;
  selectedId: string | null;
  selectedRect: RectShape | null;
  setSelectedSize: (wM: number, hM: number) => void;
  deleteSelected: () => void;
}) {
  const { tool, setTool, selectedId, selectedRect, setSelectedSize, deleteSelected } = props;

  return (
    <Paper withBorder p="sm" w="500px" h={"800px"}>
      <Group justify="space-between" wrap="wrap" gap="md">
        <Group wrap="nowrap" gap="sm">
          <SegmentedControl
            value={tool}
            onChange={(v) => setTool(v as Tool)}
            data={[
              { value: "select", label: "Select" },
              { value: "rect", label: "Rect" },
            ]}
          />
          <MText size="sm" c="dimmed">
            Stage: {STAGE_W}×{STAGE_H}px / 1m={PX_PER_M}px
          </MText>
        </Group>

        <Group wrap="wrap" gap="sm">
          <MText size="sm">id: {selectedId ?? "-"}</MText>

          <NumberInput
            label="W (m)"
            value={selectedRect ? toFixed2(selectedRect.wM) : undefined}
            onChange={(val) => selectedRect && setSelectedSize(Number(val) || 0, selectedRect.hM)}
            min={0}
            step={0.01}
            allowNegative={false}
            disabled={!selectedRect}
            styles={{ root: { width: 140 } }}
          />

          <NumberInput
            label="H (m)"
            value={selectedRect ? toFixed2(selectedRect.hM) : undefined}
            onChange={(val) => selectedRect && setSelectedSize(selectedRect.wM, Number(val) || 0)}
            min={0}
            step={0.01}
            allowNegative={false}
            disabled={!selectedRect}
            styles={{ root: { width: 140 } }}
          />

          <MText size="sm" w={160} ta="right">
            Area: {selectedRect ? toFixed2(selectedRect.wM * selectedRect.hM) : "-"} m²
          </MText>

          <Button color="red" variant="light" onClick={deleteSelected} disabled={!selectedRect}>
            Delete
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}
