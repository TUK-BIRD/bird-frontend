import { useEffect } from "react";
import type { Entity } from "../../../../types/types";

export function useKeyboardShortcuts(params: {
  selected: Entity | null;
  onDelete: () => void;
  onRotate: (deltaDeg: number) => void;
  disabled?: boolean;
}) {
  const { selected, disabled, onDelete, onRotate } = params;

  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (disabled) return;
      if (!selected) return;

      if (ev.key === "Backspace" || ev.key === "Delete") {
        ev.preventDefault();
        onDelete();
      }
      if (ev.key === "[") onRotate(-15);
      if (ev.key === "]") onRotate(15);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selected, onDelete, onRotate, disabled]);
}
