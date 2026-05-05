// src/floorplan/types.ts
export type ToolMode = "select" | "room" | "door" | "table" | "sensor";

export type EntityType = "room" | "door" | "table" | "sensor";

export type EntityBase = {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  rotation: number;
  locked?: boolean;
  name?: string;
};

export type RoomEntity = EntityBase & {
  type: "room";
  width: number;
  height: number;
};

export type ItemEntity = EntityBase & {
  type: "door" | "table" | "sensor";
  width: number;
  height: number;
};

export type Entity = RoomEntity | ItemEntity;

export type DraftRoom = { x: number; y: number; width: number; height: number };
