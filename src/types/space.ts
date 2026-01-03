export interface Space {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  pivot: {
    userId: number;
    spaceId: number;
    role: "ADMIN" | "MEMBER"
  }
}