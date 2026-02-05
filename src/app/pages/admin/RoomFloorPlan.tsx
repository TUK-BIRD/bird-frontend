import { Group, Loader, Text, Button } from "@mantine/core";
import { useNavigate, useParams } from "react-router";
import { useRef, useState } from "react";
import FloorPlanner, {
  type FloorPlannerHandle,
} from "../../components/floorplan/FloorPlan";
import useRoom from "../../../hooks/useRoom";
import apiClient from "../../../api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function RoomFloorPlan() {
  const { spaceId, roomId } = useParams<{ spaceId: string; roomId: string }>();
  const { data: room, isLoading, isError } = useRoom(spaceId, roomId);
  const navigate = useNavigate();
  const plannerRef = useRef<FloorPlannerHandle>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const queryClient = useQueryClient();

  const updateRoomMutation = useMutation({
    mutationFn: (blueprintJson: string) =>
      apiClient.patch(`/spaces/${spaceId}/rooms/${roomId}`, {
        name: room?.name,
        description: room?.description,
        blueprintJson,
      }),
    onSuccess: (_res, blueprintJson) => {
      queryClient.setQueryData(["room", spaceId, roomId], (prev: any) =>
        prev
          ? {
              ...prev,
              blueprintJson,
            }
          : prev,
      );
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: () => apiClient.delete(`/spaces/${spaceId}/rooms/${roomId}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["rooms", spaceId] });
      navigate(`/admin/space/${spaceId}/rooms`);
    },
  });

  if (isLoading) {
    return (
      <Group justify="center" mt="xl">
        <Loader />
      </Group>
    );
  }

  if (isError) {
    return (
      <Text c="red" size="sm">
        방 정보를 불러오지 못했습니다.
      </Text>
    );
  }

  if (!room) {
    return (
      <Text c="dimmed" size="sm">
        방 정보가 없습니다.
      </Text>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setReloadKey((prev) => prev + 1);
  };

  const handleSave = () => {
    const json = plannerRef.current?.getBlueprintJson();
    if (!json) return;
    updateRoomMutation.mutate(json, {
      onSuccess: () => {
        setIsEditing(false);
      },
    });
  };

  const handleDelete = () => {
    if (!window.confirm("정말 이 방의 도면을 삭제할까요?")) return;
    deleteRoomMutation.mutate();
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 6,
          display: "flex",
          gap: 8,
        }}
      >
        {isEditing ? (
          <>
            <Button
              size="xs"
              onClick={handleSave}
              loading={updateRoomMutation.isPending}
            >
              저장
            </Button>
            <Button size="xs" variant="default" onClick={handleCancel}>
              취소
            </Button>
          </>
        ) : (
          <>
            <Button size="xs" onClick={handleEdit}>
              수정
            </Button>
            <Button
              size="xs"
              color="red"
              variant="light"
              onClick={handleDelete}
              loading={deleteRoomMutation.isPending}
            >
              삭제
            </Button>
          </>
        )}
      </div>
      <FloorPlanner
        ref={plannerRef}
        showToolbar={isEditing}
        showSaveButton={false}
        title={room.name}
        description={room.description}
        blueprintJson={room.blueprintJson}
        readOnly={!isEditing}
        reloadKey={reloadKey}
        fitToAdminLayout
      />
    </div>
  );
}
