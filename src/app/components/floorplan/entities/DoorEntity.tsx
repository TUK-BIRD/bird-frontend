import { Group, Rect, Text } from "react-konva";
import type { ItemEntity } from "../types";
import { snap } from "../utils";

export function DoorEntity(props: {
  entity: ItemEntity;
  draggable: boolean;
  onSelect: () => void;
  onDragEnd: (pos: { x: number; y: number }) => void;
}) {
  const e = props.entity;

  return (
    <Group
      id={e.id}
      x={e.x}
      y={e.y}
      rotation={e.rotation}
      draggable={props.draggable && !e.locked}
      onClick={props.onSelect}
      onTap={props.onSelect}
      listening={true} 
      onDragEnd={(ev) =>
        props.onDragEnd({ x: snap(ev.target.x()), y: snap(ev.target.y()) })
      }
    >
      <Rect width={e.width} height={10} fill="#8b4513" />
      <Text
        width={e.width}
        align="center"
        y={18}
        text={e.name}
        rotation={-e.rotation}
        fontSize={12}
        fill="#333"
        listening={false}
      />
    </Group>
  );
}
