export const UserSpaceRole = {
  MEMBER: "MEMBER",
  ADMIN: "ADMIN",
} as const;

export type UserSpaceRole = typeof UserSpaceRole[keyof typeof UserSpaceRole];

export type MemberAddType = {
  email: string;
  role: UserSpaceRole;
}

// types.ts
export type ToolMode = 'select' | 'room' | 'door' | 'table' | 'sensor';

export type EntityType = 'room' | 'door' | 'table' | 'sensor';

export type EntityBase = {
  id: string;
  type: EntityType;
  x: number;
  y: number;
  rotation: number; // degrees
};

export type RoomEntity = EntityBase & {
  type: 'room';
  width: number;
  height: number;
};

export type ItemEntity = EntityBase & {
  type: 'door' | 'table' | 'sensor';
  width: number;
  height: number;
};

export type Entity = RoomEntity | ItemEntity;
