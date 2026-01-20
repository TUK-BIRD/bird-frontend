import React from "react";
import Konva from "konva";
import { Stage, Layer, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

import type { RectShape, Tool } from "../../types/types";
import { PX_PER_M, STAGE_H, STAGE_W } from "../../types/constants";
import { clamp, normRect, toFixed2 } from "../utils/geometry";
import { pointerToMeters, rectMetersToWorldPx } from "../utils/konva";
import { SelectableRect } from "./SelectableRect";

function useElementSize<T extends HTMLElement>() {
  const ref = React.useRef<T | null>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;

    const update = () => {
      const next = { width: el.clientWidth, height: el.clientHeight };

      // 같은 값이면 업데이트하지 않기(무한 업데이트 방지)
      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next
      );
    };

    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update); // 배치 업데이트[web:316]
    });

    update();
    ro.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return { ref, size };
}

export function CanvasStage(props: {
  tool: Tool;
  rects: RectShape[];
  setRects: React.Dispatch<React.SetStateAction<RectShape[]>>;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}) {
  const { tool, rects, setRects, selectedId, setSelectedId } = props;

  const stageRef = React.useRef<Konva.Stage>(null);
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();

  // 드로잉 상태
  const drawingIdRef = React.useRef<string | null>(null);
  const startRef = React.useRef<{ xM: number; yM: number } | null>(null);

  // id 생성
  const idSeqRef = React.useRef(1);
  const nextId = () => `r${idSeqRef.current++}`;

  const lockShapes = tool === "rect";

  const checkDeselect = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    if (e.target === stage) setSelectedId(null);
  };

  // 줌(포인터 기준) 예제 패턴[web:37]
  const onWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    let direction = e.evt.deltaY > 0 ? 1 : -1;
    if (e.evt.ctrlKey) direction = -direction;

    const scaleBy = 1.01;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const s = clamp(newScale, 0.2, 5);

    stage.scale({ x: s, y: s });
    stage.position({
      x: pointer.x - mousePointTo.x * s,
      y: pointer.y - mousePointTo.y * s,
    });
  };

  const onMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;

    if (tool === "select") {
      checkDeselect(e);
      return;
    }

    const pM = pointerToMeters(stage);
    if (!pM) return;

    const id = nextId();
    drawingIdRef.current = id;
    startRef.current = pM;

    setRects((prev) => [...prev, { id, type: "rect", xM: pM.xM, yM: pM.yM, wM: 0, hM: 0 }]);
  };

  const onMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    if (tool !== "rect") return;

    const stage = e.target.getStage();
    if (!stage) return;

    const id = drawingIdRef.current;
    const start = startRef.current;
    if (!id || !start) return;

    const pM = pointerToMeters(stage);
    if (!pM) return;

    const wM = pM.xM - start.xM;
    const hM = pM.yM - start.yM;

    setRects((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...normRect(start.xM, start.yM, wM, hM) } : r))
    );
  };

  const onMouseUp = () => {
    drawingIdRef.current = null;
    startRef.current = null;
  };

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        style={{ background: "#f7f7f7", border: "1px solid #ddd",  position: "absolute",inset: 0, }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        <Layer>
          <Text x={10} y={10} text={`tool=${tool}`} fontSize={14} fill="#333" />

          {rects.map((r) => {
            const rectPx = rectMetersToWorldPx(r);
            const area = r.wM * r.hM;

            return (
              <React.Fragment key={r.id}>
                <SelectableRect
                  rectPx={rectPx}
                  isSelected={!lockShapes && r.id === selectedId}
                  draggable={!lockShapes}
                  enableTransform={!lockShapes}
                  onSelect={() => {
                    if (lockShapes) return;
                    setSelectedId(r.id);
                  }}
                  onDragEndPx={(next) => {
                    if (lockShapes) return;
                    setRects((prev) =>
                      prev.map((x) =>
                        x.id === r.id ? { ...x, xM: next.x / PX_PER_M, yM: next.y / PX_PER_M } : x
                      )
                    );
                  }}
                  onTransformEndPx={(next) => {
                    if (lockShapes) return;
                    setRects((prev) =>
                      prev.map((x) =>
                        x.id === r.id
                          ? {
                              ...x,
                              xM: next.x / PX_PER_M,
                              yM: next.y / PX_PER_M,
                              wM: next.width / PX_PER_M,
                              hM: next.height / PX_PER_M,
                            }
                          : x
                      )
                    );
                  }}
                />

                <Text
                  x={rectPx.x}
                  y={rectPx.y}
                  width={rectPx.width}
                  height={rectPx.height}
                  text={`${toFixed2(area)} m²`}
                  align="center"
                  verticalAlign="middle"
                  fontSize={14}
                  fill="#111"
                  listening={false}
                />
              </React.Fragment>
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}