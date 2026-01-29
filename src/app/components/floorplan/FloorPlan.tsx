import { useRef, useState } from "react";
import type Konva from "konva";
import { Paper } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import type { DraftRoom, Entity, ToolMode } from "./types";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { LeftPanel } from "./LeftPanel";
import { CanvasStage } from "./CanvasStage";

import { MIN_SIZE_PX } from "./constants";
import { makeId, normalizeRect, snap, snapPos } from "./utils";
import { useSelectionTransformer } from "./hooks/useSelectionTransformer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { METERS_TO_PX } from "./constants";
import { useCreateRoomMutation } from "../../../hooks/useCreateRoomMutation";
import { useParams } from "react-router";

export default function FloorPlanner() {
  const [mode, setMode] = useState<ToolMode>("select");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [draftRoom, setDraftRoom] = useState<DraftRoom | null>(null);

  const [deleteOpened, deleteHandlers] = useDisclosure(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const selected = entities.find((e) => e.id === selectedId) ?? null;
  const selectionLocked = !!selected?.locked;

  useSelectionTransformer({
    stageRef,
    transformerRef,
    rotateEnabled: selected?.type !== "room",
    selectedId: selectionLocked ? null : selectedId,
    deps: [entities, selectionLocked],
  });

  const toggleLockSelected = () => {
    if (!selectedId) return;

    setEntities((prev) =>
      prev.map((e) => (e.id === selectedId ? { ...e, locked: !e.locked } : e)),
    );
  };

  const requestDelete = () => {
    if (!selectedId) return;
    setPendingDeleteId(selectedId);
    deleteHandlers.open();
  };

  const confirmDelete = () => {
    if (!pendingDeleteId) return;
    setEntities((prev) => prev.filter((e) => e.id !== pendingDeleteId));
    if (selectedId === pendingDeleteId) setSelectedId(null);
    setPendingDeleteId(null);
    deleteHandlers.close();
  };

  const rotateSelected = (delta: number) => {
    if (!selected || selected.type !== "table") return;
    if (selected.locked) return;
    setEntities((prev) =>
      prev.map((e) =>
        e.id === selected.id
          ? { ...e, rotation: (e.rotation + delta + 360) % 360 }
          : e,
      ),
    );
  };

  const addItem = (type: "door" | "table" | "sensor") => {
    const base = {
      id: makeId(type),
      type,
      x: 300,
      y: 200,
      rotation: 0,
      name: type === "door" ? "Door" : type === "table" ? "Table" : "Sensor",
    } as const;
    const ent: Entity =
      type === "sensor"
        ? { ...base, width: 0.2 * METERS_TO_PX, height: 0.2 * METERS_TO_PX }
        : type === "door"
          ? { ...base, width: 0.9 * METERS_TO_PX, height: 0.1 * METERS_TO_PX }
          : { ...base, width: 1.2 * METERS_TO_PX, height: 0.8 * METERS_TO_PX };

    setEntities((prev) => [...prev, ent]);
    setSelectedId(ent.id);
    setMode("select");
  };

  const updateSelectedName = (name: string) => {
    if (!selectedId) return;
    setEntities((prev) =>
      prev.map((e) => (e.id === selectedId ? { ...e, name } : e)),
    );
  };

  const width = window.innerWidth - 260;
  const height = window.innerHeight - 40;

  const [saveOpened, saveHandlers] = useDisclosure(false);
  const createRoomMutation = useCreateRoomMutation();
  const { spaceId } = useParams();

  useKeyboardShortcuts({
    selected,
    onDelete: requestDelete,
    onRotate: rotateSelected,
    disabled: saveOpened,
  });

  return (
    <div style={{ display: "flex", height: "100vh", padding: 20, gap: 12 }}>
      <DeleteConfirmModal
        opened={deleteOpened}
        onClose={deleteHandlers.close}
        onConfirm={confirmDelete}
      />

      <LeftPanel
        mode={mode}
        setMode={setMode}
        selected={selected}
        onAddDoor={() => addItem("door")}
        onAddTable={() => addItem("table")}
        onAddSensor={() => addItem("sensor")}
        onRotateLeft={() => rotateSelected(-15)}
        onRotateRight={() => rotateSelected(15)}
        onDelete={requestDelete}
        onExport={() => console.log({ entities })}
        lockedSelected={!!selected?.locked}
        onToggleLockSelected={toggleLockSelected}
        onChangeSelectedName={updateSelectedName}
        saveOpened={saveOpened}
        onOpenSave={saveHandlers.open}
        onCloseSave={saveHandlers.close}
        onSave={({ name, description }) => {
          console.log({
            name,
            description,
            spaceId,
            blueprint: stageRef.current?.findOne(".entities-layer")?.toObject()
          });
          // createRoomMutation.mutate({
          //   name,
          //   description,
          //   spaceId: spaceId,
          //   blueprintJson: stageRef.current?.toJSON(),
          // });
        }}
      />

      <Paper withBorder style={{ flex: 1, overflow: "hidden" }}>
        <CanvasStage
          onReady={({ stage, transformer }) => {
            stageRef.current = stage;
            transformerRef.current = transformer;
          }}
          width={width}
          height={height}
          mode={mode}
          entities={entities}
          draftRoom={draftRoom}
          onEmptyClick={() => setSelectedId(null)}
          selectedId={selectedId!}
          onSelect={(id) => setSelectedId(id)}
          onMove={(id, pos) =>
            setEntities((prev) =>
              prev.map((e) => (e.id === id ? { ...e, ...pos } : e)),
            )
          }
          onResizeRoom={(id, size) =>
            setEntities((prev) =>
              prev.map((e) =>
                e.id === id && e.type === "room" ? { ...e, ...size } : e,
              ),
            )
          }
          onResizeItem={(id, size) =>
            setEntities((prev) =>
              prev.map((e) =>
                e.id === id && e.type !== "room" ? { ...e, ...size } : e,
              ),
            )
          }
          onRoomDrawStart={(pos) => {
            if (mode !== "room") return;
            const p = snapPos(pos);
            setDraftRoom({ x: p.x, y: p.y, width: 0, height: 0 });
          }}
          onRoomDrawMove={(pos) => {
            if (mode !== "room") return;
            setDraftRoom((prev) => {
              if (!prev) return prev;
              const p = snapPos(pos);
              return { ...prev, width: p.x - prev.x, height: p.y - prev.y };
            });
          }}
          onRoomDrawEnd={() => {
            if (mode !== "room" || !draftRoom) return;

            const normalized = normalizeRect(draftRoom);
            const w = snap(Math.max(MIN_SIZE_PX, normalized.width));
            const h = snap(Math.max(MIN_SIZE_PX, normalized.height));

            const room: Entity = {
              id: makeId("room"),
              type: "room",
              x: snap(normalized.x),
              y: snap(normalized.y),
              width: w,
              height: h,
              rotation: 0,
            };

            setEntities((prev) => [...prev, room]);
            setSelectedId(room.id);
            setDraftRoom(null);
            setMode("select");
          }}
        />
      </Paper>
    </div>
  );
}
