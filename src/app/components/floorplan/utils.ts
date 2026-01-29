// src/floorplan/utils.ts
import { GRID_SIZE_PX, METERS_TO_PX } from "./constants";

export const snap = (n: number) => Math.round(n / GRID_SIZE_PX) * GRID_SIZE_PX;

export const snapPos = (p: { x: number; y: number }) => ({
  x: snap(p.x),
  y: snap(p.y),
});

export const toMeters = (px: number) => px / METERS_TO_PX;

export const fmt1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export const normalizeRect = (r: {
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  let { x, y, width, height } = r;
  if (width < 0) {
    x += width;
    width = Math.abs(width);
  }
  if (height < 0) {
    y += height;
    height = Math.abs(height);
  }
  return { x, y, width, height };
};

export const makeId = (prefix: string) =>
  `${prefix}-${crypto.randomUUID?.() ?? String(Date.now())}`;
