import Konva from "konva";
import { PX_PER_M } from "../../types/constants";
import type { RectShape } from "../../types/types";

export function rectMetersToWorldPx(r: RectShape) {
  return {
    x: r.xM * PX_PER_M,
    y: r.yM * PX_PER_M,
    width: r.wM * PX_PER_M,
    height: r.hM * PX_PER_M,
  };
}

// Stage 변환(zoom/pan) 고려: 포인터(screen px) -> 월드(px) -> 미터
export function pointerToMeters(stage: Konva.Stage) {
  const pointer = stage.getPointerPosition();
  if (!pointer) return null;

  const scale = stage.scaleX(); // x,y 동일 스케일 가정
  const worldPx = {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale,
  };

  return { xM: worldPx.x / PX_PER_M, yM: worldPx.y / PX_PER_M };
}
