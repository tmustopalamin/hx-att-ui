"use client";

import { getClientLocale, translateStaticText } from "@/app/i18n";
import type { ReactNode } from "react";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import type { ConfirmDialogProps } from "primereact/confirmdialog";

export type ActionConfirmationSeverity = "danger" | "warning" | "info";

export interface ActionConfirmationOptions {
  action: string;
  target?: string;
  description?: ReactNode;
  severity?: ActionConfirmationSeverity;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmIcon?: string;
  onAccept: () => void | Promise<void>;
  onReject?: () => void;
}

export const ACTION_CONFIRM_GROUP = "hris-action-confirm";

type LegacyConfirmationOptions = ConfirmDialogProps;

const translateFallback = (source: string, params?: Record<string, string>) => {
  const translated = translateStaticText(source, getClientLocale());
  return translated.replace(
    /\{(\w+)\}/g,
    (_, name: string) => params?.[name] ?? `{${name}}`,
  );
};

/**
 * The application-wide confirmation entry point for state-changing actions.
 * Individual pages should call this helper instead of browser-native prompts or a
 * bespoke browser prompt. Authorization and state validation remain backend
 * responsibilities.
 */
export function requestActionConfirmation(
  options: ActionConfirmationOptions,
): void;
export function requestActionConfirmation(
  options: LegacyConfirmationOptions,
): void;
export function requestActionConfirmation(
  options: ActionConfirmationOptions | LegacyConfirmationOptions,
): void {
  if ("action" in options && "onAccept" in options) {
    const {
      action,
      target,
      description,
      severity = "warning",
      confirmLabel = action,
      cancelLabel = "Cancel",
      confirmIcon = "pi pi-check",
      onAccept,
      onReject,
    } = options;
    const isDanger = severity === "danger";
    const icon = isDanger
      ? "pi pi-exclamation-triangle"
      : severity === "info"
        ? "pi pi-info-circle"
        : "pi pi-exclamation-circle";
    let settled = false;
    const accept = () => {
      if (settled) return;
      settled = true;
      void onAccept();
    };
    const reject = () => {
      if (settled) return;
      settled = true;
      onReject?.();
    };

    confirmDialog({
      group: ACTION_CONFIRM_GROUP,
      header: translateFallback("{p0} confirmation", { p0: action }),
      message: (
        <div className="flex flex-col gap-1 text-sm leading-5">
          <span className="text-slate-600">
            {description ??
              translateFallback("Are you sure you want to {p0} this item?", {
                p0: action.toLowerCase(),
              })}
          </span>
          {target && (
            <span className="font-semibold text-slate-800">{target}</span>
          )}
        </div>
      ),
      icon,
      acceptLabel: confirmLabel,
      rejectLabel: cancelLabel,
      acceptIcon: confirmIcon,
      rejectIcon: "pi pi-times",
      acceptClassName: isDanger ? "p-button-danger" : "",
      rejectClassName: "p-button-text p-button-secondary",
      defaultFocus: isDanger ? "reject" : "accept",
      closeOnEscape: true,
      dismissableMask: true,
      accept,
      reject,
      onHide: reject,
    });
    return;
  }

  // Transitional adapter for existing PrimeReact-shaped confirmations. It
  // keeps custom footers and messages intact while routing every dialog to the
  // single application-wide host. Call sites are migrated to this helper so a
  // local default ConfirmDialog can never subscribe to the same event.
  const { accept: onAccept, reject: onReject, onHide, ...rest } = options;
  let settled = false;
  const accept = () => {
    if (settled) return;
    settled = true;
    onAccept?.();
  };
  const reject = () => {
    if (settled) return;
    settled = true;
    onReject?.();
  };

  confirmDialog({
    ...rest,
    group: ACTION_CONFIRM_GROUP,
    accept,
    reject,
    onHide: (result) => {
      reject();
      onHide?.(result);
    },
  });
}

/** Mount once from the authenticated application shell. */
export function GlobalActionConfirmDialog() {
  return (
    <ConfirmDialog
      group={ACTION_CONFIRM_GROUP}
      className="action-confirm-dialog"
      draggable={false}
      resizable={false}
      breakpoints={{ "640px": "calc(100vw - 2rem)" }}
      style={{ width: "min(28rem, calc(100vw - 2rem))" }}
    />
  );
}
