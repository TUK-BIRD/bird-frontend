import { useMutation } from "@tanstack/react-query";

type SaveRoomBody = {
  name: string;
  description: string;
  blueprintJson?: string; // 서버가 string 컬럼이면 stringify해서 보냄
  spaceId?: string;
};

async function createRoom(body: SaveRoomBody) {
  const res = await fetch(`/space/${body.spaceId}/room/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Room save failed");
  return res.json();
}

export function useCreateRoomMutation() {
  return useMutation({ mutationFn: createRoom });
}
