import { Stage, Layer, Line, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { DraftRoom, Entity, ToolMode } from "./types";
import { GRID_SIZE_PX } from "./constants";
import { RoomEntity } from "./entities/RoomEntity";
import { TableEntity } from "./entities/TableEntity";
import { DoorEntity } from "./entities/DoorEntity";
import { SensorEntity } from "./entities/SensorEntity";
import { useEffect, useMemo, useRef } from "react";

type CanvasStageRefs = {
  stage: Konva.Stage | null;
  transformer: Konva.Transformer | null;
};

export function CanvasStage(props: {
  onReady: (refs: CanvasStageRefs) => void;

  width: number;
  height: number;

  mode: ToolMode;
  entities: Entity[];
  draftRoom: DraftRoom | null;

  onEmptyClick: () => void;

  onRoomDrawStart: (pos: { x: number; y: number }) => void;
  onRoomDrawMove: (pos: { x: number; y: number }) => void;
  onRoomDrawEnd: () => void;
  selectedId: string;
  onSelect: (id: string) => void;
  onMove: (id: string, pos: { x: number; y: number }) => void;
  onResizeRoom: (id: string, size: { width: number; height: number }) => void;
  onResizeItem: (id: string, size: { width: number; height: number }) => void;
  readOnly?: boolean;
  scale?: number;
  stagePos?: { x: number; y: number };
  onStagePosChange?: (pos: { x: number; y: number }) => void;
  allowPan?: boolean;
}) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const scale = props.scale ?? 1;
  const stagePos = props.stagePos ?? { x: 0, y: 0 };

  const gridLines = useMemo(() => {
    const left = -stagePos.x / scale;
    const top = -stagePos.y / scale;
    const right = left + props.width / scale;
    const bottom = top + props.height / scale;

    const startX = Math.floor(left / GRID_SIZE_PX) * GRID_SIZE_PX;
    const endX = Math.ceil(right / GRID_SIZE_PX) * GRID_SIZE_PX;
    const startY = Math.floor(top / GRID_SIZE_PX) * GRID_SIZE_PX;
    const endY = Math.ceil(bottom / GRID_SIZE_PX) * GRID_SIZE_PX;

    const vertical = [];
    for (let x = startX; x <= endX; x += GRID_SIZE_PX) {
      vertical.push({
        key: `v-${x}`,
        points: [x, top, x, bottom],
      });
    }

    const horizontal = [];
    for (let y = startY; y <= endY; y += GRID_SIZE_PX) {
      horizontal.push({
        key: `h-${y}`,
        points: [left, y, right, y],
      });
    }

    return { vertical, horizontal };
  }, [props.width, props.height, scale, stagePos]);
  const orderedEntities = [...props.entities].sort((a, b) => {
    if (a.type === "room" && b.type !== "room") return -1;
    if (a.type !== "room" && b.type === "room") return 1;
    return 0;
  });

  useEffect(() => {
    props.onReady({
      stage: stageRef.current,
      transformer: transformerRef.current,
    });
  }, [props.onReady]);

  return (
    <Stage
      ref={stageRef}
      width={props.width}
      height={props.height}
      scaleX={props.scale}
      scaleY={props.scale}
      x={props.stagePos?.x ?? 0}
      y={props.stagePos?.y ?? 0}
      draggable={props.allowPan}
      onDragEnd={(e) => {
        if (!props.allowPan) return;
        props.onStagePosChange?.({ x: e.target.x(), y: e.target.y() });
      }}
      onMouseDown={(e: any) => {
        if (props.readOnly) return;
        const stage = e.target.getStage() as Konva.Stage;

        if (props.mode === "select") {
          if (e.target === stage) props.onEmptyClick();
          return;
        }

        if (props.mode === "room") {
          const p = stage.getRelativePointerPosition();
          if (!p) return;
          props.onRoomDrawStart(p);
        }
      }}
      onMouseMove={(e: any) => {
        if (props.readOnly) return;
        if (props.mode !== "room") return;
        const stage = e.target.getStage() as Konva.Stage;
        const p = stage.getRelativePointerPosition();
        if (!p) return;
        props.onRoomDrawMove(p);
      }}
      onMouseUp={() => {
        if (props.readOnly) return;
        if (props.mode !== "room") return;
        props.onRoomDrawEnd();
      }}
      style={{ background: "#fafafa" }}
    >
      <Layer name="grid-layer">
        {/* grid */}
        {gridLines.vertical.map((line) => (
          <Line
            key={line.key}
            points={line.points}
            stroke="#eee"
            strokeWidth={1}
            listening={false}
          />
        ))}
        {gridLines.horizontal.map((line) => (
          <Line
            key={line.key}
            points={line.points}
            stroke="#eee"
            strokeWidth={1}
            listening={false}
          />
        ))}
      </Layer>
      <Layer name="entities-layer">
        {orderedEntities.map((ent) => {
          if (ent.type === "room") {
            return (
              <RoomEntity
                key={ent.id}
                entity={ent}
                draggable={props.mode === "select" && !props.readOnly}
                onSelect={() => props.onSelect(ent.id)}
                onDragEnd={(pos) => props.onMove(ent.id, pos)}
                onResize={(size) => props.onResizeRoom(ent.id, size)}
              />
            );
          }
          if (ent.type === "table") {
            return (
              <TableEntity
                key={ent.id}
                entity={ent}
                draggable={props.mode === "select" && !props.readOnly}
                isSelected={props.selectedId === ent.id}
                onSelect={() => props.onSelect(ent.id)}
                onDragEnd={(pos) => props.onMove(ent.id, pos)}
                onResize={(size) => props.onResizeItem(ent.id, size)} // 추가
              />
            );
          }
          if (ent.type === "door") {
            return (
              <DoorEntity
                key={ent.id}
                entity={ent}
                draggable={props.mode === "select" && !props.readOnly}
                onSelect={() => props.onSelect(ent.id)}
                onDragEnd={(pos) => props.onMove(ent.id, pos)}
              />
            );
          }
          return (
            <SensorEntity
              key={ent.id}
              entity={ent}
              draggable={props.mode === "select" && !props.readOnly}
              onSelect={() => props.onSelect(ent.id)}
              onDragEnd={(pos) => props.onMove(ent.id, pos)}
            />
          );
        })}

        {/* room preview */}
        {props.draftRoom && (
          <Rect
            x={props.draftRoom.x}
            y={props.draftRoom.y}
            width={props.draftRoom.width}
            height={props.draftRoom.height}
            stroke="red"
            dash={[10, 5]}
            strokeWidth={2}
            listening={false}
          />
        )}

        <Transformer
          ref={transformerRef}
          rotateEnabled={!props.readOnly}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (props.readOnly) return oldBox;
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10)
              return oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}
