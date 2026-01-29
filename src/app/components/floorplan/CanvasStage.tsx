import { Stage, Layer, Line, Rect, Transformer } from "react-konva";
import type Konva from "konva";
import type { DraftRoom, Entity, ToolMode } from "./types";
import { GRID_SIZE_PX } from "./constants";
import { RoomEntity } from "./entities/RoomEntity";
import { TableEntity } from "./entities/TableEntity";
import { DoorEntity } from "./entities/DoorEntity";
import { SensorEntity } from "./entities/SensorEntity";
import { useEffect, useRef } from "react";

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
}) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

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
      onMouseDown={(e: any) => {
        const stage = e.target.getStage() as Konva.Stage;

        if (props.mode === "select") {
          if (e.target === stage) props.onEmptyClick();
          return;
        }

        if (props.mode === "room") {
          const p = stage.getPointerPosition();
          if (!p) return;
          props.onRoomDrawStart(p);
        }
      }}
      onMouseMove={(e: any) => {
        if (props.mode !== "room") return;
        const stage = e.target.getStage() as Konva.Stage;
        const p = stage.getPointerPosition();
        if (!p) return;
        props.onRoomDrawMove(p);
      }}
      onMouseUp={() => {
        if (props.mode !== "room") return;
        props.onRoomDrawEnd();
      }}
      style={{ background: "#fafafa" }}
    >
      <Layer name="grid-layer">
        {/* grid */}
        {Array.from({ length: 200 }).map((_, i) => (
          <Line
            key={`v-${i}`}
            points={[i * GRID_SIZE_PX, 0, i * GRID_SIZE_PX, props.height]}
            stroke="#eee"
            strokeWidth={1}
            listening={false}
          />
        ))}
        {Array.from({ length: 200 }).map((_, i) => (
          <Line
            key={`h-${i}`}
            points={[0, i * GRID_SIZE_PX, props.width, i * GRID_SIZE_PX]}
            stroke="#eee"
            strokeWidth={1}
            listening={false}
          />
        ))}
      </Layer>
      <Layer name="entities-layer">
        {props.entities.map((ent) => {
          if (ent.type === "room") {
            return (
              <RoomEntity
                key={ent.id}
                entity={ent}
                draggable={props.mode === "select"}
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
                draggable={props.mode === "select"}
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
                draggable={props.mode === "select"}
                onSelect={() => props.onSelect(ent.id)}
                onDragEnd={(pos) => props.onMove(ent.id, pos)}
              />
            );
          }
          return (
            <SensorEntity
              key={ent.id}
              entity={ent}
              draggable={props.mode === "select"}
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
          rotateEnabled
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10)
              return oldBox;
            return newBox;
          }}
        />
      </Layer>
    </Stage>
  );
}
