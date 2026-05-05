import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type Konva from "konva";
import { Paper } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import type { DraftRoom, Entity, ToolMode } from "./types";
import { DeleteConfirmModal } from "./DeleteConfirmModal";
import { LeftPanel } from "./LeftPanel";
import { CanvasStage } from "./CanvasStage";

import { MIN_SIZE_PX } from "./constants";
import { GRID_STEP_M } from "./constants";
import { makeId, normalizeRect, snap, snapPos } from "./utils";
import { useSelectionTransformer } from "./hooks/useSelectionTransformer";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { METERS_TO_PX } from "./constants";
import { useCreateRoomMutation } from "../../../hooks/useCreateRoomMutation";
import { useParams } from "react-router";

type FloorPlannerProps = {
  showToolbar?: boolean;
  showSaveButton?: boolean;
  title?: string;
  description?: string | null;
  blueprintJson?: string | object | null;
  readOnly?: boolean;
  reloadKey?: number | string;
  fitToAdminLayout?: boolean;
  onCreated?: (room: any) => void;
};

export type FloorPlannerHandle = {
  getBlueprintJson: () => string | null;
};

const FloorPlanner = forwardRef<FloorPlannerHandle, FloorPlannerProps>(
  (
    {
      showToolbar = true,
      showSaveButton = true,
      title,
      description,
      blueprintJson,
      readOnly = false,
      reloadKey,
      fitToAdminLayout = false,
      onCreated,
    },
    ref,
  ) => {
  const [mode, setMode] = useState<ToolMode>("select");
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [panEnabled, setPanEnabled] = useState(false);

  const [draftRoom, setDraftRoom] = useState<DraftRoom | null>(null);

  const [deleteOpened, deleteHandlers] = useDisclosure(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const selected = entities.find((e) => e.id === selectedId) ?? null;
  const selectionLocked = !!selected?.locked;
  const effectiveSelectedId = readOnly ? null : selectedId;

  const hasLoadedBlueprint = useRef(false);

  useImperativeHandle(ref, () => ({
    getBlueprintJson: () =>
      stageRef.current?.findOne(".entities-layer")?.toJSON() ?? null,
  }));

  const parseBlueprintEntities = (input: string | object | null | undefined) => {
    if (!input) return [] as Entity[];
    let data: any = input;
    if (typeof input === "string") {
      try {
        data = JSON.parse(input);
      } catch {
        return [] as Entity[];
      }
    }

    if (Array.isArray(data)) {
      return data.filter((item) => item && typeof item === "object");
    }

    if (!data || typeof data !== "object") return [] as Entity[];

    const findLayer = (node: any): any => {
      if (!node) return null;
      if (node.className === "Layer") return node;
      if (node.children && Array.isArray(node.children)) {
        return node.children.find((child: any) => child.className === "Layer") ?? null;
      }
      return null;
    };

    const layer = findLayer(data) ?? findLayer({ children: data.children });
    const children = layer?.children ?? [];

    const getText = (node: any) => {
      const textNode = node.children?.find(
        (child: any) => child.className === "Text" && child.attrs?.text,
      );
      return textNode?.attrs?.text ?? "";
    };

    const getRect = (node: any, matcher?: (attrs: any) => boolean) => {
      const rects = (node.children ?? []).filter(
        (child: any) => child.className === "Rect",
      );
      if (!rects.length) return null;
      if (!matcher) return rects[0];
      return rects.find((r: any) => matcher(r.attrs)) ?? null;
    };

    return children
      .map((child: any) => {
        if (child.className !== "Group") return null;
        const attrs = child.attrs ?? {};
        const x = attrs.x ?? 0;
        const y = attrs.y ?? 0;
        const rotation = attrs.rotation ?? 0;

        const roomRect = getRect(child, (a) => a?.stroke === "#111");
        if (roomRect) {
          return {
            id: roomRect.attrs?.id ?? `room-${Math.random()}`,
            type: "room",
            x,
            y,
            rotation,
            width: roomRect.attrs?.width ?? 0,
            height: roomRect.attrs?.height ?? 0,
          } as Entity;
        }

        const tableRect = getRect(child, (a) => a?.fill === "#D8BFA8");
        if (tableRect) {
          return {
            id: tableRect.attrs?.id ?? `table-${Math.random()}`,
            type: "table",
            x,
            y,
            rotation,
            width: tableRect.attrs?.width ?? 0,
            height: tableRect.attrs?.height ?? 0,
            name: getText(child) || "Table",
          } as Entity;
        }

        const doorRect = getRect(child, (a) => a?.fill === "#8b4513");
        if (doorRect) {
          return {
            id: child.attrs?.id ?? `door-${Math.random()}`,
            type: "door",
            x,
            y,
            rotation,
            width: doorRect.attrs?.width ?? 0,
            height: doorRect.attrs?.height ?? 10,
            name: getText(child) || "Door",
          } as Entity;
        }

        const sensorRect = getRect(child, (a) => a?.fill === "rgba(0,0,0,0)");
        if (sensorRect) {
          return {
            id: sensorRect.attrs?.id ?? `sensor-${Math.random()}`,
            type: "sensor",
            x,
            y,
            rotation,
            width: sensorRect.attrs?.width ?? 40,
            height: sensorRect.attrs?.height ?? 40,
            name: getText(child) || "Sensor",
          } as Entity;
        }

        return null;
      })
      .filter(Boolean) as Entity[];
  };

  useEffect(() => {
    hasLoadedBlueprint.current = false;
  }, [reloadKey]);

  useEffect(() => {
    if (hasLoadedBlueprint.current) return;
    if (!blueprintJson) return;
    const parsed = parseBlueprintEntities(blueprintJson);
    if (parsed.length) {
      setEntities(parsed);
      setSelectedId(null);
    }
    hasLoadedBlueprint.current = true;
  }, [blueprintJson]);

  useSelectionTransformer({
    stageRef,
    transformerRef,
    rotateEnabled: selected?.type !== "room",
    selectedId: selectionLocked ? null : effectiveSelectedId,
    deps: [entities, selectionLocked],
  });

  const toggleLockSelected = () => {
    if (readOnly) return;
    if (!selectedId) return;

    setEntities((prev) =>
      prev.map((e) => (e.id === selectedId ? { ...e, locked: !e.locked } : e)),
    );
  };

  const requestDelete = () => {
    if (readOnly) return;
    if (!selectedId) return;
    setPendingDeleteId(selectedId);
    deleteHandlers.open();
  };

  const confirmDelete = () => {
    if (readOnly) return;
    if (!pendingDeleteId) return;
    setEntities((prev) => prev.filter((e) => e.id !== pendingDeleteId));
    if (selectedId === pendingDeleteId) setSelectedId(null);
    setPendingDeleteId(null);
    deleteHandlers.close();
  };

  const rotateSelected = (delta: number) => {
    if (readOnly) return;
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
    if (readOnly) return;
    const viewCenter = {
      x: (-stagePos.x + width / 2) / scale,
      y: (-stagePos.y + height / 2) / scale,
    };
    const baseX = snap(viewCenter.x);
    const baseY = snap(viewCenter.y);
    const base = {
      id: makeId(type),
      type,
      x: baseX,
      y: baseY,
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
    if (readOnly) return;
    if (!selectedId) return;
    setEntities((prev) =>
      prev.map((e) => (e.id === selectedId ? { ...e, name } : e)),
    );
  };

  const leftPanelWidth = showToolbar ? 260 : 0;
  const width = window.innerWidth - leftPanelWidth;
  const isConstrained = readOnly || fitToAdminLayout;
  const height = isConstrained
    ? window.innerHeight - 60 - 32
    : window.innerHeight - 40;

  const zoomIn = () => setScale((prev) => Math.min(2.5, +(prev + 0.1).toFixed(2)));
  const zoomOut = () => setScale((prev) => Math.max(0.4, +(prev - 0.1).toFixed(2)));
  const resetZoom = () => setScale(1);

  const [saveOpened, saveHandlers] = useDisclosure(false);
  const createRoomMutation = useCreateRoomMutation({
    onSuccess: (data: any) => {
      onCreated?.(data);
    },
  });
  const { spaceId } = useParams();

  useKeyboardShortcuts({
    selected: readOnly ? null : selected,
    onDelete: requestDelete,
    onRotate: rotateSelected,
    disabled: saveOpened || readOnly,
  });

  useEffect(() => {
    const isTypingTarget = (el: Element | null) => {
      if (!el) return false;
      const tag = el.tagName?.toLowerCase();
      return tag === "input" || tag === "textarea" || tag === "select";
    };

    const handleKeyDown = (ev: KeyboardEvent) => {
      if (ev.code !== "Space") return;
      if (isTypingTarget(document.activeElement)) return;
      ev.preventDefault();
      setPanEnabled(true);
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      if (ev.code !== "Space") return;
      setPanEnabled(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        height: isConstrained ? "calc(100vh - 60px - 32px)" : "100vh",
        padding: isConstrained ? 0 : 20,
        gap: 12,
      }}
    >
      <DeleteConfirmModal
        opened={deleteOpened}
        onClose={deleteHandlers.close}
        onConfirm={confirmDelete}
      />

      {showToolbar && !readOnly && (
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
              blueprint: stageRef.current?.findOne(".entities-layer")?.toObject(),
            });
            createRoomMutation.mutate({
              name,
              description,
              spaceId: spaceId,
              blueprintJson:
                stageRef.current?.findOne(".entities-layer")?.toJSON(),
            });
          }}
          showSaveButton={showSaveButton}
        />
      )}

      <Paper
        withBorder
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          cursor: panEnabled ? "grab" : "default",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            zIndex: 6,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div
            style={{
              border: "1px solid #dee2e6",
              background: "#fff",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 12,
              color: "#495057",
            }}
          >
            Grid: {GRID_STEP_M}m
          </div>
          <button
            type="button"
            onClick={zoomOut}
            style={{
              border: "1px solid #dee2e6",
              background: "#fff",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            -
          </button>
          <button
            type="button"
            onClick={resetZoom}
            style={{
              border: "1px solid #dee2e6",
              background: "#fff",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            style={{
              border: "1px solid #dee2e6",
              background: "#fff",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            +
          </button>
        </div>
        {(title || description) && (
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 5,
              background: "rgba(255, 255, 255, 0.9)",
              border: "1px solid #e9ecef",
              borderRadius: 8,
              padding: "8px 12px",
              maxWidth: 420,
            }}
          >
            {title && (
              <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
            )}
            {description && (
              <div style={{ fontSize: 12, color: "#868e96" }}>
                {description}
              </div>
            )}
          </div>
        )}
        <CanvasStage
          onReady={({ stage, transformer }) => {
            stageRef.current = stage;
            transformerRef.current = transformer;
          }}
          readOnly={readOnly}
          scale={scale}
          stagePos={stagePos}
          onStagePosChange={setStagePos}
          allowPan={readOnly || panEnabled}
          width={width}
          height={height}
          mode={mode}
          entities={entities}
          draftRoom={draftRoom}
          onEmptyClick={() => setSelectedId(null)}
          selectedId={(effectiveSelectedId ?? "") as string}
          onSelect={(id) => {
            if (readOnly) return;
            setSelectedId(id);
          }}
          onMove={(id, pos) => {
            if (readOnly) return;
            setEntities((prev) =>
              prev.map((e) => (e.id === id ? { ...e, ...pos } : e)),
            );
          }}
          onResizeRoom={(id, size) => {
            if (readOnly) return;
            setEntities((prev) =>
              prev.map((e) =>
                e.id === id && e.type === "room" ? { ...e, ...size } : e,
              ),
            );
          }}
          onResizeItem={(id, size) => {
            if (readOnly) return;
            setEntities((prev) =>
              prev.map((e) =>
                e.id === id && e.type !== "room" ? { ...e, ...size } : e,
              ),
            );
          }}
          onRoomDrawStart={(pos) => {
            if (readOnly || mode !== "room") return;
            const p = snapPos(pos);
            setDraftRoom({ x: p.x, y: p.y, width: 0, height: 0 });
          }}
          onRoomDrawMove={(pos) => {
            if (readOnly || mode !== "room") return;
            setDraftRoom((prev) => {
              if (!prev) return prev;
              const p = snapPos(pos);
              return { ...prev, width: p.x - prev.x, height: p.y - prev.y };
            });
          }}
          onRoomDrawEnd={() => {
            if (readOnly || mode !== "room" || !draftRoom) return;

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
},
);

export default FloorPlanner;
