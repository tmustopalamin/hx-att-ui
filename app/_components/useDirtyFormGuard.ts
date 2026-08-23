"use client";
import { useI18n } from "@/app/i18n";

import { useCallback, useEffect } from "react";
import { requestActionConfirmation } from "./ActionConfirmDialog";

/**
 * Warns before a browser unload and exposes a reusable discard guard for
 * dialogs/navigation. A clean form never produces an unnecessary prompt.
 */
export function useDirtyFormGuard(isDirty: boolean, enabled = true) {
  const { t: i18nT } = useI18n();
  useEffect(() => {
    if (!enabled || !isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, i18nT, isDirty]);

  const confirmDiscard = useCallback((): Promise<boolean> => {
    if (!isDirty || !enabled) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      requestActionConfirmation({
        action: i18nT("static.t5asgc"),
        description: i18nT("static.55p5oe"),
        severity: "danger",
        confirmLabel: i18nT("static.8g1qg1"),
        confirmIcon: "pi pi-trash",
        onAccept: () => resolve(true),
        onReject: () => resolve(false),
      });
    });
  }, [enabled, i18nT, isDirty]);

  return { confirmDiscard };
}
