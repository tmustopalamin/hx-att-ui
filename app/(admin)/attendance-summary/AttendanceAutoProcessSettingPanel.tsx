"use client";
import { useI18n } from "@/app/i18n";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { useDispatch } from "react-redux";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputNumber } from "primereact/inputnumber";
import { Tag } from "primereact/tag";

import { AttendanceProcessSetting } from "@/app/types/attendance-process-setting";
import {
  getAttendanceProcessSetting,
  updateAttendanceProcessSetting,
} from "@/app/services/attendance-process-setting-service";
import { showToast } from "@/store/ToastSlice";
import { formatDateTime as formatDisplayDateTime } from "@/app/utils/date-format";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { formatStatusLabel } from "@/app/i18n/statusLabel";

const swrKey = "/api/attendance-summary/auto-process-setting";

const intervalOptions = [
  { labelKey: "Every 1 minute", value: 1 },
  { labelKey: "Every 2 minutes", value: 2 },
  { labelKey: "Every 5 minutes", value: 5 },
  { labelKey: "Every 10 minutes", value: 10 },
  { labelKey: "Every 15 minutes", value: 15 },
  { labelKey: "Every 30 minutes", value: 30 },
  { labelKey: "Every 60 minutes", value: 60 },
];

const lookbackOptions = [
  { labelKey: "Today only", value: 0 },
  { labelKey: "Today + 1 day back", value: 1 },
  { labelKey: "Today + 2 days back", value: 2 },
  { labelKey: "Today + 3 days back", value: 3 },
  { labelKey: "Today + 7 days back", value: 7 },
];

const formatDateTime = (value: string | null) => {
  return formatDisplayDateTime(value);
};

const getStatusSeverity = (
  status?: string | null,
): "success" | "secondary" | "info" | "warning" | "danger" => {
  const normalized = status?.toUpperCase();

  if (!normalized) return "secondary";
  if (normalized === "SUCCESS") return "success";
  if (normalized === "FAILED") return "danger";
  if (normalized === "RUNNING") return "info";
  if (normalized === "SKIPPED") return "warning";

  return "secondary";
};

const AttendanceAutoProcessSettingPanel = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();

  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    auto_process_enabled: false,
    process_interval_minutes: 10,
    lookback_days: 3,
    mobile_attendance_enabled: true,
    mobile_attendance_require_photo: true,
    mobile_attendance_require_location: true,
    mobile_attendance_max_photo_bytes: 5_242_880,
    mobile_attendance_max_gps_accuracy_meters: 100,
    mobile_attendance_max_event_age_seconds: 300,
    mobile_attendance_min_submission_interval_seconds: 60,
    mobile_attendance_geofence_latitude: null as number | null,
    mobile_attendance_geofence_longitude: null as number | null,
    mobile_attendance_geofence_radius_meters: null as number | null,
    mobile_attendance_integrity_enabled: false,
    mobile_attendance_allow_unlicensed: true,
  });

  const { data, isLoading } = useSWR(swrKey, getAttendanceProcessSetting, {
    refreshInterval: 30000,
  });

  const setting: AttendanceProcessSetting | undefined = data?.data;

  useEffect(() => {
    if (!setting) return;

    setForm({
      auto_process_enabled: setting.auto_process_enabled,
      process_interval_minutes: setting.process_interval_minutes,
      lookback_days: setting.lookback_days,
      mobile_attendance_enabled: setting.mobile_attendance_enabled,
      mobile_attendance_require_photo: setting.mobile_attendance_require_photo,
      mobile_attendance_require_location:
        setting.mobile_attendance_require_location,
      mobile_attendance_max_photo_bytes:
        setting.mobile_attendance_max_photo_bytes,
      mobile_attendance_max_gps_accuracy_meters:
        setting.mobile_attendance_max_gps_accuracy_meters,
      mobile_attendance_max_event_age_seconds:
        setting.mobile_attendance_max_event_age_seconds,
      mobile_attendance_min_submission_interval_seconds:
        setting.mobile_attendance_min_submission_interval_seconds,
      mobile_attendance_geofence_latitude:
        setting.mobile_attendance_geofence_latitude,
      mobile_attendance_geofence_longitude:
        setting.mobile_attendance_geofence_longitude,
      mobile_attendance_geofence_radius_meters:
        setting.mobile_attendance_geofence_radius_meters,
      mobile_attendance_integrity_enabled:
        setting.mobile_attendance_integrity_enabled,
      mobile_attendance_allow_unlicensed:
        setting.mobile_attendance_allow_unlicensed,
    });
  }, [setting]);

  const saveSetting = async () => {
    try {
      setSaving(true);

      const res = await updateAttendanceProcessSetting(form);

      await mutate(swrKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: res.message || i18nT("static.16clvwh"),
        }),
      );

      setVisible(false);
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail: err.message,
          }),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold text-slate-900">
              {i18nT("static.1e7mfze")}{" "}
            </div>

            {setting?.auto_process_enabled ? (
              <Tag value={i18nT("static.zrh9ao")} severity="success" />
            ) : (
              <Tag value={i18nT("static.csaup6")} severity="secondary" />
            )}

            <Tag
              value={
                setting?.last_process_status
                  ? i18nT(formatStatusLabel(setting.last_process_status))
                  : i18nT("static.fwk86k")
              }
              severity={getStatusSeverity(setting?.last_process_status)}
            />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 md:grid-cols-2">
            <div>
              {i18nT("static.quxzwm")}{" "}
              <span className="font-medium">
                {setting?.auto_process_enabled
                  ? i18nT("static.1v3hpcs", {
                      p0: setting.process_interval_minutes,
                    })
                  : "-"}
              </span>
            </div>

            <div>
              {i18nT("static.fjd2x9")}{" "}
              <span className="font-medium">
                {setting
                  ? i18nT("static.lyg1dh", { p0: setting.lookback_days })
                  : "-"}
              </span>
            </div>

            <div>
              {i18nT("static.9x8ogu")}{" "}
              <span className="font-medium">
                {formatDateTime(setting?.last_process_at ?? null)}
              </span>
            </div>

            <div>
              {i18nT("static.1wugv60")}{" "}
              <span className="font-medium">
                {setting?.last_processed_count ?? 0}
              </span>
            </div>
          </div>

          {setting?.last_process_error && (
            <div
              className="mt-2 max-w-2xl truncate text-xs text-red-600"
              title={setting.last_process_error}
            >
              {i18nT("static.e4prip")} {setting.last_process_error}
            </div>
          )}
        </div>

        <Button
          type="button"
          icon="pi pi-cog"
          label={i18nT("static.8tj2gj")}
          size="small"
          loading={isLoading}
          onClick={() => setVisible(true)}
        />
      </div>

      <Dialog
        header={i18nT("static.201jac")}
        visible={visible}
        style={{ width: "36rem", maxWidth: "95vw" }}
        onHide={() => setVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label={i18nT("static.ew9em3")}
              icon="pi pi-times"
              className="p-button-text"
              onClick={() => setVisible(false)}
            />
            <Button
              type="button"
              label={i18nT("static.lewgh4")}
              icon="pi pi-check"
              loading={saving}
              onClick={saveSetting}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {i18nT("static.gv7170")}{" "}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {i18nT("static.ch5ti0")}{" "}
              </div>
            </div>

            <InputSwitch
              checked={form.auto_process_enabled}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  auto_process_enabled: !!e.value,
                }))
              }
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {i18nT("static.tkjpmz")}{" "}
            </label>

            <Dropdown
              className="w-full"
              value={form.process_interval_minutes}
              options={intervalOptions.map((option) => ({
                label: i18nT(option.labelKey),
                value: option.value,
              }))}
              optionLabel="label"
              optionValue="value"
              disabled={!form.auto_process_enabled}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  process_interval_minutes: Number(e.value),
                }))
              }
            />

            <small className="text-slate-500">{i18nT("static.1npq83s")} </small>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {i18nT("static.1oi8y60")}{" "}
            </label>

            <Dropdown
              className="w-full"
              value={form.lookback_days}
              options={lookbackOptions.map((option) => ({
                label: i18nT(option.labelKey),
                value: option.value,
              }))}
              optionLabel="label"
              optionValue="value"
              disabled={!form.auto_process_enabled}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  lookback_days: Number(e.value),
                }))
              }
            />

            <small className="text-slate-500">{i18nT("static.sdlg0x")} </small>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <div className="text-sm font-semibold text-slate-900">
              {i18nT("static.kdjp9e")}{" "}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {i18nT("static.zb5ltw")}{" "}
            </p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {i18nT("static.hrfg93")}{" "}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {i18nT("static.1c2orku")}{" "}
              </div>
            </div>
            <InputSwitch
              checked={form.mobile_attendance_enabled}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  mobile_attendance_enabled: !!e.value,
                }))
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700">
                {i18nT("static.2hsv")}{" "}
              </span>
              <InputSwitch
                checked={form.mobile_attendance_require_photo}
                disabled={!form.mobile_attendance_enabled}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_require_photo: !!e.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm font-medium text-slate-700">
                {i18nT("static.1xpwlrb")}{" "}
              </span>
              <InputSwitch
                checked={form.mobile_attendance_require_location}
                disabled={!form.mobile_attendance_enabled}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_require_location: !!e.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-amber-950">
                  {i18nT("static.1xjv5yn")}{" "}
                </div>
                <div className="mt-1 text-xs leading-5 text-amber-800">
                  {i18nT("static.1mk8npd")}{" "}
                </div>
              </div>
              <InputSwitch
                checked={form.mobile_attendance_integrity_enabled}
                disabled={!form.mobile_attendance_enabled}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_integrity_enabled: !!e.value,
                  }))
                }
              />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-amber-200 pt-4">
              <div>
                <div className="text-sm font-medium text-amber-950">
                  {i18nT("static.ux19ro")}{" "}
                </div>
                <div className="mt-1 text-xs text-amber-800">
                  {i18nT("static.vh90j1")}{" "}
                </div>
              </div>
              <InputSwitch
                checked={form.mobile_attendance_allow_unlicensed}
                disabled={
                  !form.mobile_attendance_enabled ||
                  !form.mobile_attendance_integrity_enabled
                }
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_allow_unlicensed: !!e.value,
                  }))
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {i18nT("static.cmyven")}{" "}
              </label>
              <InputNumber
                className="w-full"
                value={form.mobile_attendance_max_gps_accuracy_meters}
                min={5}
                max={1000}
                disabled={!form.mobile_attendance_enabled}
                onValueChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_max_gps_accuracy_meters: e.value ?? 100,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {i18nT("static.16gn49a")}{" "}
              </label>
              <InputNumber
                className="w-full"
                value={form.mobile_attendance_min_submission_interval_seconds}
                min={10}
                max={3600}
                disabled={!form.mobile_attendance_enabled}
                onValueChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_min_submission_interval_seconds:
                      e.value ?? 60,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {i18nT("static.1r3aoh5")}{" "}
              </label>
              <InputNumber
                className="w-full"
                value={form.mobile_attendance_max_event_age_seconds}
                min={30}
                max={3600}
                disabled={!form.mobile_attendance_enabled}
                onValueChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_max_event_age_seconds: e.value ?? 300,
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {i18nT("static.uo8f4c")}{" "}
              </label>
              <InputNumber
                className="w-full"
                value={form.mobile_attendance_max_photo_bytes}
                min={65536}
                max={10485760}
                disabled={!form.mobile_attendance_enabled}
                onValueChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_max_photo_bytes: e.value ?? 5242880,
                  }))
                }
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-900">
              {i18nT("static.1mwu0px")}{" "}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InputNumber
                placeholder={i18nT("static.udp36t")}
                className="w-full"
                value={form.mobile_attendance_geofence_latitude}
                minFractionDigits={6}
                maxFractionDigits={7}
                disabled={!form.mobile_attendance_enabled}
                onValueChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_geofence_latitude: e.value ?? null,
                  }))
                }
              />
              <InputNumber
                placeholder={i18nT("static.sltujy")}
                className="w-full"
                value={form.mobile_attendance_geofence_longitude}
                minFractionDigits={6}
                maxFractionDigits={7}
                disabled={!form.mobile_attendance_enabled}
                onValueChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_geofence_longitude: e.value ?? null,
                  }))
                }
              />
              <InputNumber
                placeholder={i18nT("static.1rvi020")}
                className="w-full"
                value={form.mobile_attendance_geofence_radius_meters}
                min={10}
                max={100000}
                disabled={!form.mobile_attendance_enabled}
                onValueChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    mobile_attendance_geofence_radius_meters: e.value ?? null,
                  }))
                }
              />
            </div>
            <small className="mt-2 block text-slate-500">
              {i18nT("static.11vaxkr")}{" "}
            </small>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default AttendanceAutoProcessSettingPanel;
