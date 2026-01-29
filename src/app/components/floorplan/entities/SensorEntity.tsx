import { Group, Circle, Rect, Text } from "react-konva";
import type { ItemEntity } from "../types";
import { snap } from "../utils";

export function SensorEntity(props: {
  entity: ItemEntity;
  draggable: boolean;
  onSelect: () => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}) {
  const e = props.entity;

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
      <Circle radius={10} fill="red" />
      <Circle
        radius={20}
        stroke="rgba(255,0,0,0.5)"
        strokeWidth={2}
        dash={[5, 5]}
        listening={false}
      />
      <Text text={e.name} x={-10} y={-24} fontSize={10} fill="#333" />
      {/* Transformer가 붙을 수 있도록 투명 히트 박스 */}
      <Rect
        id={e.id}
        width={40}
        height={40}
        x={-20}
        y={-20}
        fill="rgba(0,0,0,0)"
      />
    </Group>
  );
}
