// src/floorplan/hooks/useSelectionTransformer.ts
import { useEffect } from "react";
import type Konva from "konva";

export function useSelectionTransformer(params: {
  stageRef: React.RefObject<Konva.Stage | null>;
  transformerRef: React.RefObject<Konva.Transformer | null>;
  selectedId: string | null;
  rotateEnabled?: boolean;
  deps?: unknown[];
}) {
  const {
    stageRef,
    transformerRef,
    rotateEnabled,
    selectedId,
    deps = [],
  } = params;

  useEffect(() => {
    const stage = stageRef.current;
    const tr = transformerRef.current;
    if (!stage || !tr) return;
    tr.rotateEnabled(rotateEnabled);
    if (!selectedId) {
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    const node = stage.findOne(`#${CSS.escape(selectedId)}`);
    if (node) {
      tr.nodes([node]);
      tr.getLayer()?.batchDraw();
    }
  }, [selectedId, stageRef, rotateEnabled, transformerRef, ...deps]);
}
