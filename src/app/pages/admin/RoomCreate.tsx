import React from "react";
import { Box, Flex } from "@mantine/core";
import type { RectShape, Tool } from "../../../types/types";
import { Toolbar } from "../../components/Toolbar";
import { CanvasStage } from "../../components/CanvasStage";

export default function RoomCreate() {
  const [tool, setTool] = React.useState<Tool>("select");
  const [rects, setRects] = React.useState<RectShape[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const selectedRect = React.useMemo(
    () => rects.find((r) => r.id === selectedId) ?? null,
    [rects, selectedId]
  );

  const setSelectedSize = (wM: number, hM: number) => {
    if (!selectedRect) return;
    setRects((prev) =>
      prev.map((r) =>
        r.id === selectedRect.id
          ? { ...r, wM: Math.max(0, wM), hM: Math.max(0, hM) }
          : r
      )
    );
  };

  const deleteSelected = () => {
    if (!selectedRect) return;
    setRects((prev) => prev.filter((r) => r.id !== selectedRect.id));
    setSelectedId(null);
  };

  return (
    <Flex align="center" gap="md" wrap="nowrap" direction="row">
      <Toolbar
        tool={tool}
        setTool={setTool}
        selectedId={selectedId}
        selectedRect={selectedRect}
        setSelectedSize={setSelectedSize}
        deleteSelected={deleteSelected}
      />
      <Box style={{ width: "100%", minHeight: "500px", height: "800px" }}>
        <CanvasStage
          tool={tool}
          rects={rects}
          setRects={setRects}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      </Box>
    </Flex>
  );
}
