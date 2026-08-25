"use client";

import { useI18n } from "@/app/i18n";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";

import {
  getMobileAppSettings,
  updateMobileAppSettings,
} from "@/app/services/mobile-app-settings-service";
import type {
  MobileAppAction,
  MobileAppSettings,
  UpdateMobileAppSettings,
} from "@/app/types/mobile-app-settings";
import { getErrorMessage } from "@/app/utils/error-messages";
import { toPermissionSet } from "@/app/utils/permission-utils";
import { showToast } from "@/store/ToastSlice";
import type { RootState } from "@/store/store";

const SETTINGS_KEY = "/api/mobile-app-settings";
const DEFAULT_MOBILE_APP_LABEL = "Download Hexing HRIS Mobile";
const LINK_ACTION: MobileAppAction = "link";
const DOWNLOAD_ACTION: MobileAppAction = "download";

const defaultDraft: UpdateMobileAppSettings = {
  label: "",
  target_url: "",
  action: LINK_ACTION,
  is_enabled: false,
};

const getSafeExternalUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const MobileAppSettingsPage = () => {
  const { t: i18nT, tText } = useI18n();
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canUpdate = toPermissionSet(permissions).has("master-data.update");
  const [draft, setDraft] = useState<UpdateMobileAppSettings>(defaultDraft);
  const [saving, setSaving] = useState(false);
  const actionOptions: Array<{ label: string; value: MobileAppAction }> = [
    { label: tText("Open link"), value: LINK_ACTION },
    { label: tText("Download file"), value: DOWNLOAD_ACTION },
  ];

  const {
    data: settings,
    error,
    isLoading,
    isValidating,
    mutate: refreshSettings,
  } = useSWR<MobileAppSettings>(SETTINGS_KEY, getMobileAppSettings, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (!settings) return;

    setDraft({
      label: settings.label,
      target_url: settings.target_url ?? "",
      action: settings.action,
      is_enabled: settings.is_enabled,
    });
  }, [settings]);

  const previewUrl = useMemo(
    () => getSafeExternalUrl(draft.target_url ?? ""),
    [draft.target_url],
  );

  const notifyError = (errorValue: unknown) => {
    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: i18nT("common.status.error"),
        detail: getErrorMessage(errorValue, "message"),
      }),
    );
  };

  const save = async () => {
    if (!settings || !canUpdate || saving) return;

    const label = draft.label.trim();
    const targetUrl = (draft.target_url ?? "").trim();

    if (!label) {
      notifyError({ message: tText("The button label is required.") });
      return;
    }

    if (draft.is_enabled && !targetUrl) {
      notifyError({
        message: tText("A link is required when the button is enabled."),
      });
      return;
    }

    if (targetUrl && !getSafeExternalUrl(targetUrl)) {
      notifyError({
        message: tText("Use a valid http:// or https:// URL."),
      });
      return;
    }

    try {
      setSaving(true);
      const updated = await updateMobileAppSettings(settings.row_version, {
        ...draft,
        label,
        target_url: targetUrl || null,
      });
      await refreshSettings(updated, { revalidate: false });
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("common.status.success"),
          detail: tText("Mobile app link configuration saved."),
        }),
      );
    } catch (errorValue) {
      notifyError(errorValue);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <div className="py-12 text-center text-sm text-slate-500">
          {tText("Loading mobile app configuration...")}
        </div>
      </Card>
    );
  }

  if (error && !settings) {
    return (
      <Card className="border border-red-200 shadow-sm">
        <div className="flex flex-col items-center gap-4 py-10 text-center">
          <i className="pi pi-exclamation-circle text-3xl text-red-500" />
          <p className="m-0 text-sm text-red-700">
            {getErrorMessage(error, "message")}
          </p>
          <Button
            type="button"
            label={i18nT("common.actions.retry")}
            icon="pi pi-refresh"
            outlined
            onClick={() => void refreshSettings()}
          />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-2xl font-semibold text-slate-900">
          {tText("Mobile App Configuration")}
        </h1>
        <p className="m-0 max-w-3xl text-sm leading-6 text-slate-500">
          {tText(
            "Configure the Android application link displayed at the bottom of the profile sidebar.",
          )}
        </p>
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <div className="space-y-6 p-1">
          <div className="flex items-start justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3 text-blue-900">
              <i className="pi pi-info-circle mt-0.5 text-blue-600" />
              <p className="m-0 text-sm leading-6">
                {tText(
                  "The button is visible to authenticated users only when it is enabled and has a valid link.",
                )}
              </p>
            </div>
            <InputSwitch
              checked={draft.is_enabled}
              disabled={!canUpdate || saving}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  is_enabled: Boolean(event.value),
                }))
              }
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              {tText("Button label")}
              <InputText
                value={draft.label}
                disabled={!canUpdate || saving}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                className="mt-2 w-full"
                maxLength={120}
                placeholder={tText(DEFAULT_MOBILE_APP_LABEL)}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              {tText("Action")}
              <Dropdown
                value={draft.action}
                options={actionOptions}
                optionLabel="label"
                optionValue="value"
                disabled={!canUpdate || saving}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    action: event.value as MobileAppAction,
                  }))
                }
                className="mt-2 w-full"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-slate-700">
            {tText("Android application link")}
            <InputText
              value={draft.target_url ?? ""}
              disabled={!canUpdate || saving}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  target_url: event.target.value,
                }))
              }
              className="mt-2 w-full"
              type="url"
              placeholder={tText(
                "https://play.google.com/store/apps/details?id=...",
              )}
            />
            <span className="mt-1 block text-xs font-normal leading-5 text-slate-500">
              {tText(
                "Use an https:// Play Store URL or the direct APK download URL.",
              )}
            </span>
          </label>

          {previewUrl && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {tText("Preview")}
              </div>
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800 transition-colors hover:bg-blue-100"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <i className="pi pi-mobile text-lg" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {draft.label || tText(DEFAULT_MOBILE_APP_LABEL)}
                  </span>
                  <span className="mt-0.5 block text-xs text-blue-600">
                    {draft.action === "download"
                      ? tText("Download Android application")
                      : tText("Open mobile application link")}
                  </span>
                </span>
                <i
                  className={`pi ${draft.action === "download" ? "pi-download" : "pi-external-link"} text-sm`}
                />
              </a>
            </div>
          )}

          {!canUpdate && (
            <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
              {tText(
                "You have read-only access. Contact an administrator with master-data.update permission to change this link.",
              )}
            </p>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0 text-xs text-slate-400">
              {isValidating
                ? tText("Refreshing configuration...")
                : tText("Changes use optimistic concurrency protection.")}
            </p>
            {canUpdate && (
              <Button
                type="button"
                label={i18nT("common.actions.save")}
                icon="pi pi-check"
                loading={saving}
                disabled={!settings || saving}
                onClick={() => void save()}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MobileAppSettingsPage;
