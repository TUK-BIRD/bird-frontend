import { Group, Rect, Text } from "react-konva";
import type Konva from "konva";
import type { RoomEntity as RoomEntityType } from "../types";
import { fmt1, toMeters } from "../utils";
import { MIN_SIZE_PX } from "../constants";
import { snap } from "../utils";

export function RoomEntity(props: {
  entity: RoomEntityType;
  draggable: boolean;
  onSelect: () => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
  onResize: (next: { width: number; height: number }) => void;
}) {
  const e = props.entity;
  const w_m = toMeters(e.width);
  const h_m = toMeters(e.height);
  const area = w_m * h_m;

  return (
    <Group
      x={e.x}
      y={e.y}
      rotation={e.rotation}
      draggable={props.draggable && !e.locked}
      onClick={props.onSelect}
      onTap={props.onSelect}
      onDragEnd={(ev) =>
        props.onDragEnd({ x: snap(ev.target.x()), y: snap(ev.target.y()) })
      }
    >
      <Rect
        id={e.id}
        width={e.width}
        height={e.height}
        fill="#fff"
        opacity={0.2}
        stroke="#111"
        strokeWidth={5}
        onTransformEnd={(ev) => {
          const node = ev.target as unknown as Konva.Rect;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);

          const newW = snap(Math.max(MIN_SIZE_PX, node.width() * scaleX));
          const newH = snap(Math.max(MIN_SIZE_PX, node.height() * scaleY));

          props.onResize({ width: newW, height: newH });
        }}
      />
      <Text
        text={`${fmt1(w_m)}m × ${fmt1(h_m)}m\n= ${fmt1(area)} m²`}
        x={e.width}
        y={e.height}
        fontSize={18}
        fill="#333"
        listening={false}
      />
    </Group>
  );
}
