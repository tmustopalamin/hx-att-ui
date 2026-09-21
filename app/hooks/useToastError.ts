"use client";

import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { useI18n } from "@/app/i18n";
import { getErrorMessage, isDatabaseError } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

/**
 * Reusable hook for standardized, secure error toast notifications.
 * Automatically masks database errors (PostgreSQL/SQLx) to prevent schema leakage.
 */
export function useToastError() {
  const dispatch = useDispatch();
  const { t: i18nT } = useI18n();

  return useCallback(
    (err: unknown, fallbackMessage?: string) => {
      let detailMessage: string;

      if (isDatabaseError(err)) {
        detailMessage = getErrorMessage({ code: "DATABASE_ERROR" }, "code");
      } else {
        detailMessage = getErrorMessage(err, "message");
      }

      if (
        (!detailMessage ||
          detailMessage === "Request failed. Please try again.") &&
        fallbackMessage
      ) {
        detailMessage = fallbackMessage;
      }

      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"), // "Error"
          detail: detailMessage,
        }),
      );
    },
    [dispatch, i18nT],
  );
}

export default useToastError;
