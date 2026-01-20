export type Tool = "select" | "rect";

export type RectShape = {
  id: string;
  type: "rect";
  xM: number;
  yM: number;
  wM: number;
  hM: number;
};

export const UserSpaceRole = {
  MEMBER: "MEMBER",
  ADMIN: "ADMIN",
} as const;

export type UserSpaceRole = typeof UserSpaceRole[keyof typeof UserSpaceRole];

export type MemberAddType = {
  email: string;
  role: UserSpaceRole;
}