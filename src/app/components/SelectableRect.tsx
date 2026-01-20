import React from "react";
import Konva from "konva";
import { Rect, Transformer } from "react-konva";

export function SelectableRect(props: {
  rectPx: { x: number; y: number; width: number; height: number };
  isSelected: boolean;
  draggable: boolean;
  enableTransform: boolean;
  onSelect: () => void;
  onDragEndPx: (next: { x: number; y: number }) => void;
  onTransformEndPx: (next: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
}) {
  const shapeRef = React.useRef<Konva.Rect>(null);
  const trRef = React.useRef<Konva.Transformer>(null);

  React.useEffect(() => {
    if (
      props.isSelected &&
      props.enableTransform &&
      shapeRef.current &&
      trRef.current
    ) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [props.isSelected, props.enableTransform]);

  return (
    <>
      <Rect
        ref={shapeRef}
        x={props.rectPx.x}
        y={props.rectPx.y}
        width={props.rectPx.width}
        height={props.rectPx.height}
        stroke="black"
        fill="rgba(0,0,0,0.03)"
        draggable={props.draggable}
        onClick={props.enableTransform ? props.onSelect : undefined}
        onTap={props.enableTransform ? props.onSelect : undefined}
        onDragEnd={(e) =>
          props.onDragEndPx({ x: e.target.x(), y: e.target.y() })
        }
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;

          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          const next = {
            x: node.x(),
            y: node.y(),
            width: Math.max(1, node.width() * scaleX),
            height: Math.max(1, node.height() * scaleY),
          };

          node.scaleX(1);
          node.scaleY(1);

          props.onTransformEndPx(next);
        }}
      />

      {props.isSelected && props.enableTransform && (
        <Transformer
          ref={trRef}
          flipEnabled={false}
          boundBoxFunc={(oldBox, newBox) => {
            if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5)
              return oldBox;
            return newBox;
          }}
        />
      )}
    </>
  );
}
