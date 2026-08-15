"use client";

import { useCallback, useEffect } from "react";
import { requestActionConfirmation } from "./ActionConfirmDialog";

/**
 * Warns before a browser unload and exposes a reusable discard guard for
 * dialogs/navigation. A clean form never produces an unnecessary prompt.
 */
export function useDirtyFormGuard(isDirty: boolean, enabled = true) {
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, isDirty]);

  const confirmDiscard = useCallback((): Promise<boolean> => {
    if (!isDirty || !enabled) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      requestActionConfirmation({
        action: "Discard changes",
        description: "Discard unsaved changes and close this form?",
        severity: "danger",
        confirmLabel: "Discard",
        confirmIcon: "pi pi-trash",
        onAccept: () => resolve(true),
        onReject: () => resolve(false),
      });
    });
  }, [enabled, isDirty]);

  return { confirmDiscard };
}
