import { Group, Rect, Text } from "react-konva";
import type { ItemEntity } from "../types";
import { snap } from "../utils";
import type Konva from "konva";

export function TableEntity(props: {
  entity: ItemEntity;
  draggable: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
  onResize: (size: { width: number; height: number }) => void;
}) {
  const e = props.entity;
  const lockedSelected = props.isSelected && e.locked;

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
        fill="#D8BFA8"
          stroke={lockedSelected ? '#fa5252' : props.isSelected ? '#228be6' : undefined}
        strokeWidth={lockedSelected ? 3 : props.isSelected ? 2 : 0}
        
        onTransformEnd={(ev) => {
          const node = ev.target as unknown as Konva.Rect;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // scale을 width/height로 “흡수”하고 scale은 원복 [web:229]
          node.scaleX(1);
          node.scaleY(1);

          const newW = snap(Math.max(12, node.width() * scaleX));
          const newH = snap(Math.max(12, node.height() * scaleY));

          props.onResize({ width: newW, height: newH });
        }}
      />
      <Text
        text={e.name}
        x={0}
        y={0}
        width={e.width}
        height={e.height}
        align="center"
        verticalAlign="middle"
        fontSize={12}
      />
    </Group>
  );
}
