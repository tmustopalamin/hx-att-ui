"use client";
import { useI18n } from "@/app/i18n";
import { formatStatusLabel } from "@/app/i18n/statusLabel";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useDispatch } from "react-redux";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";

import {
  getAttendanceProcessingSetting,
  getAttendanceSubmissionPolicy,
  updateAttendanceProcessingSetting,
  updateAttendanceSubmissionPolicy,
} from "@/app/services/attendance-settings-service";
import type {
  AttendanceProcessingSetting,
  AttendanceSubmissionPolicy,
  UpdateAttendanceProcessingSetting,
  UpdateAttendanceSubmissionPolicy,
} from "@/app/types/attendance-settings";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

const PROCESSING_KEY = "/api/attendance-settings/processing";
const POLICY_KEY = "/api/attendance-settings/submission-policy";
const PHOTO_BYTES_PER_MB = 1_048_576;

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

const gpsPresets = [
  { labelKey: "Strict 50 m", value: 50 },
  { labelKey: "Standard 100 m", value: 100 },
  { labelKey: "Tolerant 200 m", value: 200 },
];

const defaultProcessing: UpdateAttendanceProcessingSetting = {
  auto_process_enabled: false,
  process_interval_minutes: 10,
  lookback_days: 3,
};

const defaultPolicy: UpdateAttendanceSubmissionPolicy = {
  common: {
    require_photo: true,
    require_location: true,
    max_photo_bytes: 5 * PHOTO_BYTES_PER_MB,
    max_event_age_seconds: 300,
    min_submission_interval_seconds: 60,
    geofence_latitude: null,
    geofence_longitude: null,
    geofence_radius_meters: null,
  },
  web: {
    enabled: true,
    enforce_gps_accuracy: true,
    max_gps_accuracy_meters: 100,
  },
  android: {
    enabled: true,
    enforce_gps_accuracy: true,
    max_gps_accuracy_meters: 100,
    integrity_enabled: false,
    allow_unlicensed: true,
  },
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "Never";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const statusSeverity = (
  value?: string | null,
): "success" | "secondary" | "info" | "warning" | "danger" => {
  switch (value?.toUpperCase()) {
    case "SUCCESS":
      return "success";
    case "FAILED":
      return "danger";
    case "RUNNING":
      return "info";
    case "SKIPPED":
      return "warning";
    default:
      return "secondary";
  }
};

const ToggleRow = ({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-xs leading-5 text-slate-500">{description}</div>
    </div>
    <InputSwitch
      checked={checked}
      disabled={disabled}
      onChange={(event) => onChange(!!event.value)}
    />
  </div>
);

const GpsPresetPicker = ({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) => {
  const { t: i18nT } = useI18n();

  return (
    <div className="flex flex-wrap gap-2">
      {gpsPresets.map((preset) => (
        <Button
          key={preset.value}
          type="button"
          label={i18nT(preset.labelKey)}
          size="small"
          outlined={value !== preset.value}
          severity={value === preset.value ? "info" : "secondary"}
          disabled={disabled}
          onClick={() => onChange(preset.value)}
        />
      ))}
    </div>
  );
};

const AttendanceSettingsPage = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const [processingForm, setProcessingForm] =
    useState<UpdateAttendanceProcessingSetting>(defaultProcessing);
  const [policyForm, setPolicyForm] =
    useState<UpdateAttendanceSubmissionPolicy>(defaultPolicy);
  const [processingSetting, setProcessingSetting] =
    useState<AttendanceProcessingSetting | null>(null);
  const [submissionPolicy, setSubmissionPolicy] =
    useState<AttendanceSubmissionPolicy | null>(null);
  const [saving, setSaving] = useState<"processing" | "policy" | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const {
    data: processingData,
    error: processingError,
    isLoading: processingLoading,
    mutate: refreshProcessing,
  } = useSWR(PROCESSING_KEY, getAttendanceProcessingSetting);
  const {
    data: policyData,
    error: policyError,
    isLoading: policyLoading,
    mutate: refreshPolicy,
  } = useSWR(POLICY_KEY, getAttendanceSubmissionPolicy);

  useEffect(() => {
    const setting = processingData?.data;
    if (!setting) return;

    setProcessingSetting(setting);
    setProcessingForm({
      auto_process_enabled: setting.auto_process_enabled,
      process_interval_minutes: setting.process_interval_minutes,
      lookback_days: setting.lookback_days,
    });
  }, [processingData]);

  useEffect(() => {
    const policy = policyData?.data;
    if (!policy) return;

    setSubmissionPolicy(policy);
    setPolicyForm({
      common: { ...policy.common },
      web: { ...policy.web },
      android: { ...policy.android },
    });
  }, [policyData]);

  const loading = processingLoading || policyLoading;
  const errorMessage = useMemo(() => {
    const error = processingError || policyError;
    if (!error) return null;
    return isResponseTypeError(error)
      ? getErrorMessage(error, "message")
      : error instanceof Error
        ? error.message
        : "Failed to load attendance settings.";
  }, [policyError, processingError]);

  const notifyError = (error: unknown) => {
    const detail = isResponseTypeError(error)
      ? getErrorMessage(error, "message")
      : error instanceof Error
        ? error.message
        : "Failed to save attendance settings.";
    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: i18nT("static.1vks92p"),
        detail,
      }),
    );
  };

  const saveProcessing = async () => {
    if (!processingSetting) return;

    try {
      setSaving("processing");
      const response = await updateAttendanceProcessingSetting(
        processingForm,
        processingSetting.row_version,
      );
      setProcessingSetting(response.data);
      await refreshProcessing();
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.12ek4is"),
          detail: i18nT("static.bsgen9"),
        }),
      );
    } catch (error: unknown) {
      notifyError(error);
    } finally {
      setSaving(null);
    }
  };

  const savePolicy = async () => {
    if (!submissionPolicy) return;

    try {
      setSaving("policy");
      const response = await updateAttendanceSubmissionPolicy(
        policyForm,
        submissionPolicy.row_version,
      );
      setSubmissionPolicy(response.data);
      await refreshPolicy();
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.12ek4is"),
          detail: i18nT("static.11iptt7"),
        }),
      );
    } catch (error: unknown) {
      notifyError(error);
    } finally {
      setSaving(null);
    }
  };

  const setWebGpsAccuracy = (value: number) => {
    setPolicyForm((current) => ({
      ...current,
      web: { ...current.web, max_gps_accuracy_meters: value },
    }));
  };

  const setAndroidGpsAccuracy = (value: number) => {
    setPolicyForm((current) => ({
      ...current,
      android: { ...current.android, max_gps_accuracy_meters: value },
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 text-2xl font-semibold text-slate-900">
          {i18nT("static.w5cg4z")}{" "}
        </h1>
        <p className="m-0 max-w-3xl text-sm leading-6 text-slate-500">
          {i18nT("static.1v31jbs")}{" "}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {loading && !processingSetting && !submissionPolicy ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            {i18nT("static.mmm7u7")}{" "}
          </div>
        </Card>
      ) : (
        <TabView>
          <TabPanel header={i18nT("static.1rpvzkt")} leftIcon="pi pi-cog mr-2">
            {processingSetting && (
              <div className="space-y-5 pt-3">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">
                      {i18nT("static.1nm96jz")}
                    </div>
                    <Tag
                      className="mt-2"
                      value={
                        processingSetting.auto_process_enabled
                          ? i18nT("static.zrh9ao")
                          : i18nT("static.csaup6")
                      }
                      severity={
                        processingSetting.auto_process_enabled
                          ? "success"
                          : "secondary"
                      }
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">
                      {i18nT("static.t89x4d")}
                    </div>
                    <Tag
                      className="mt-2"
                      value={
                        processingSetting.last_process_status
                          ? i18nT(
                              formatStatusLabel(
                                processingSetting.last_process_status,
                              ),
                            )
                          : i18nT("static.fwk86k")
                      }
                      severity={statusSeverity(
                        processingSetting.last_process_status,
                      )}
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">
                      {i18nT("static.1hd6y0g")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-900">
                      {i18nT(formatDateTime(processingSetting.last_process_at))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">
                      {i18nT("static.45omj8")}
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-900">
                      {processingSetting.last_processed_count}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <ToggleRow
                    title={i18nT("static.1ojjy7o")}
                    description={i18nT("static.184goka")}
                    checked={processingForm.auto_process_enabled}
                    onChange={(value) =>
                      setProcessingForm((current) => ({
                        ...current,
                        auto_process_enabled: value,
                      }))
                    }
                  />

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {i18nT("static.7lmpuz")}{" "}
                    </label>
                    <Dropdown
                      className="w-full"
                      value={processingForm.process_interval_minutes}
                      options={intervalOptions.map((option) => ({
                        label: i18nT(option.labelKey),
                        value: option.value,
                      }))}
                      optionLabel="label"
                      optionValue="value"
                      disabled={!processingForm.auto_process_enabled}
                      onChange={(event) =>
                        setProcessingForm((current) => ({
                          ...current,
                          process_interval_minutes: Number(event.value),
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {i18nT("static.12suj7h")}{" "}
                    </label>
                    <Dropdown
                      className="w-full"
                      value={processingForm.lookback_days}
                      options={lookbackOptions.map((option) => ({
                        label: i18nT(option.labelKey),
                        value: option.value,
                      }))}
                      optionLabel="label"
                      optionValue="value"
                      disabled={!processingForm.auto_process_enabled}
                      onChange={(event) =>
                        setProcessingForm((current) => ({
                          ...current,
                          lookback_days: Number(event.value),
                        }))
                      }
                    />
                    <small className="mt-1 block text-xs text-slate-500">
                      {i18nT("static.17jzlqf")}{" "}
                    </small>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <Button
                    type="button"
                    label={i18nT("static.nz9f4s")}
                    icon="pi pi-check"
                    loading={saving === "processing"}
                    onClick={saveProcessing}
                  />
                </div>
              </div>
            )}
          </TabPanel>

          <TabPanel
            header={i18nT("static.1hgu5bc")}
            leftIcon="pi pi-map-marker mr-2"
          >
            {submissionPolicy && (
              <div className="space-y-5 pt-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  {i18nT("static.qxc3km")}{" "}
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    {i18nT("static.1jkk67b")}{" "}
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ToggleRow
                      title={i18nT("static.mg2j1c")}
                      description={i18nT("static.7b1iq0")}
                      checked={policyForm.common.require_photo}
                      onChange={(value) =>
                        setPolicyForm((current) => ({
                          ...current,
                          common: { ...current.common, require_photo: value },
                        }))
                      }
                    />
                    <ToggleRow
                      title={i18nT("static.emel8r")}
                      description={i18nT("static.18eqzv0")}
                      checked={policyForm.common.require_location}
                      onChange={(value) =>
                        setPolicyForm((current) => ({
                          ...current,
                          common: {
                            ...current.common,
                            require_location: value,
                          },
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <Card className="border border-slate-200 shadow-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="m-0 text-base font-semibold text-slate-900">
                          {i18nT("static.1sb2mmk")}{" "}
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {i18nT("static.5gzind")}{" "}
                        </p>
                      </div>
                      <InputSwitch
                        checked={policyForm.web.enabled}
                        onChange={(event) =>
                          setPolicyForm((current) => ({
                            ...current,
                            web: {
                              ...current.web,
                              enabled: !!event.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="mt-5 space-y-3">
                      <ToggleRow
                        title={i18nT("static.m2y13q")}
                        description={i18nT("static.2in41f")}
                        checked={policyForm.web.enforce_gps_accuracy}
                        disabled={!policyForm.web.enabled}
                        onChange={(value) =>
                          setPolicyForm((current) => ({
                            ...current,
                            web: {
                              ...current.web,
                              enforce_gps_accuracy: value,
                            },
                          }))
                        }
                      />
                      <label className="block text-sm font-medium text-slate-700">
                        {i18nT("static.4kfsxg")}{" "}
                      </label>
                      <GpsPresetPicker
                        value={policyForm.web.max_gps_accuracy_meters}
                        disabled={
                          !policyForm.web.enabled ||
                          !policyForm.web.enforce_gps_accuracy
                        }
                        onChange={setWebGpsAccuracy}
                      />
                      <InputNumber
                        className="w-full"
                        value={policyForm.web.max_gps_accuracy_meters}
                        min={5}
                        max={1000}
                        suffix={i18nT("static.1sduwzc")}
                        disabled={
                          !policyForm.web.enabled ||
                          !policyForm.web.enforce_gps_accuracy
                        }
                        onValueChange={(event) =>
                          setWebGpsAccuracy(event.value ?? 100)
                        }
                      />
                      <small className="block text-xs leading-5 text-slate-500">
                        {policyForm.web.enforce_gps_accuracy
                          ? i18nT("static.78ewww")
                          : i18nT("static.5oo0w3")}
                      </small>
                    </div>
                  </Card>

                  <Card className="border border-slate-200 shadow-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="m-0 text-base font-semibold text-slate-900">
                          {i18nT("static.170ydlq")}{" "}
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {i18nT("static.2rbls3")}{" "}
                        </p>
                      </div>
                      <InputSwitch
                        checked={policyForm.android.enabled}
                        onChange={(event) =>
                          setPolicyForm((current) => ({
                            ...current,
                            android: {
                              ...current.android,
                              enabled: !!event.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="mt-5 space-y-3">
                      <ToggleRow
                        title={i18nT("static.m2y13q")}
                        description={i18nT("static.19v29t7")}
                        checked={policyForm.android.enforce_gps_accuracy}
                        disabled={!policyForm.android.enabled}
                        onChange={(value) =>
                          setPolicyForm((current) => ({
                            ...current,
                            android: {
                              ...current.android,
                              enforce_gps_accuracy: value,
                            },
                          }))
                        }
                      />
                      <label className="block text-sm font-medium text-slate-700">
                        {i18nT("static.4kfsxg")}{" "}
                      </label>
                      <GpsPresetPicker
                        value={policyForm.android.max_gps_accuracy_meters}
                        disabled={
                          !policyForm.android.enabled ||
                          !policyForm.android.enforce_gps_accuracy
                        }
                        onChange={setAndroidGpsAccuracy}
                      />
                      <InputNumber
                        className="w-full"
                        value={policyForm.android.max_gps_accuracy_meters}
                        min={5}
                        max={1000}
                        suffix={i18nT("static.1sduwzc")}
                        disabled={
                          !policyForm.android.enabled ||
                          !policyForm.android.enforce_gps_accuracy
                        }
                        onValueChange={(event) =>
                          setAndroidGpsAccuracy(event.value ?? 100)
                        }
                      />
                      <small className="block text-xs leading-5 text-slate-500">
                        {policyForm.android.enforce_gps_accuracy
                          ? i18nT("static.1phcj7b")
                          : i18nT("static.dg20q")}
                      </small>
                    </div>
                  </Card>
                </div>

                <details
                  open={advancedOpen}
                  onToggle={(event) =>
                    setAdvancedOpen(event.currentTarget.open)
                  }
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <summary className="cursor-pointer text-sm font-semibold text-slate-900">
                    {i18nT("static.1gagz3d")}{" "}
                  </summary>

                  <div className="mt-4 space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          {i18nT("static.e4j5f2")}{" "}
                        </label>
                        <InputNumber
                          className="w-full"
                          value={
                            policyForm.common.max_photo_bytes /
                            PHOTO_BYTES_PER_MB
                          }
                          min={0.0625}
                          max={10}
                          minFractionDigits={2}
                          maxFractionDigits={2}
                          suffix={i18nT("static.j3ysoe")}
                          onValueChange={(event) =>
                            setPolicyForm((current) => ({
                              ...current,
                              common: {
                                ...current.common,
                                max_photo_bytes: Math.round(
                                  (event.value ?? 5) * PHOTO_BYTES_PER_MB,
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          {i18nT("static.148042")}{" "}
                        </label>
                        <InputNumber
                          className="w-full"
                          value={policyForm.common.max_event_age_seconds / 60}
                          min={0.5}
                          max={60}
                          minFractionDigits={0}
                          maxFractionDigits={1}
                          suffix={i18nT("static.1jxbmtz")}
                          onValueChange={(event) =>
                            setPolicyForm((current) => ({
                              ...current,
                              common: {
                                ...current.common,
                                max_event_age_seconds: Math.round(
                                  (event.value ?? 5) * 60,
                                ),
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          {i18nT("static.nfo172")}{" "}
                        </label>
                        <InputNumber
                          className="w-full"
                          value={
                            policyForm.common.min_submission_interval_seconds
                          }
                          min={10}
                          max={3600}
                          suffix={i18nT("static.1fxesoi")}
                          onValueChange={(event) =>
                            setPolicyForm((current) => ({
                              ...current,
                              common: {
                                ...current.common,
                                min_submission_interval_seconds:
                                  event.value ?? 60,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>

                    <ToggleRow
                      title={i18nT("static.1xjv5yn")}
                      description={i18nT("static.1iy5cib")}
                      checked={policyForm.android.integrity_enabled}
                      disabled={!policyForm.android.enabled}
                      onChange={(value) =>
                        setPolicyForm((current) => ({
                          ...current,
                          android: {
                            ...current.android,
                            integrity_enabled: value,
                          },
                        }))
                      }
                    />
                    <ToggleRow
                      title={i18nT("static.s74644")}
                      description={i18nT("static.1ibdii1")}
                      checked={policyForm.android.allow_unlicensed}
                      disabled={
                        !policyForm.android.enabled ||
                        !policyForm.android.integrity_enabled
                      }
                      onChange={(value) =>
                        setPolicyForm((current) => ({
                          ...current,
                          android: {
                            ...current.android,
                            allow_unlicensed: value,
                          },
                        }))
                      }
                    />

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">
                        {i18nT("static.jlkv6r")}{" "}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {i18nT("static.z3yk3c")}{" "}
                      </p>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <InputNumber
                          className="w-full"
                          placeholder={i18nT("static.udp36t")}
                          value={policyForm.common.geofence_latitude}
                          minFractionDigits={6}
                          maxFractionDigits={7}
                          onValueChange={(event) =>
                            setPolicyForm((current) => ({
                              ...current,
                              common: {
                                ...current.common,
                                geofence_latitude: event.value ?? null,
                              },
                            }))
                          }
                        />
                        <InputNumber
                          className="w-full"
                          placeholder={i18nT("static.sltujy")}
                          value={policyForm.common.geofence_longitude}
                          minFractionDigits={6}
                          maxFractionDigits={7}
                          onValueChange={(event) =>
                            setPolicyForm((current) => ({
                              ...current,
                              common: {
                                ...current.common,
                                geofence_longitude: event.value ?? null,
                              },
                            }))
                          }
                        />
                        <InputNumber
                          className="w-full"
                          placeholder={i18nT("static.g8dqz7")}
                          value={policyForm.common.geofence_radius_meters}
                          min={10}
                          max={100000}
                          suffix={i18nT("static.1sduwzc")}
                          onValueChange={(event) =>
                            setPolicyForm((current) => ({
                              ...current,
                              common: {
                                ...current.common,
                                geofence_radius_meters: event.value ?? null,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>
                </details>

                <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    {i18nT("static.mgay80")}{" "}
                    {i18nT(formatDateTime(submissionPolicy.updated_at))}
                  </div>
                  <Button
                    type="button"
                    label={i18nT("static.nn49ha")}
                    icon="pi pi-check"
                    loading={saving === "policy"}
                    onClick={savePolicy}
                  />
                </div>
              </div>
            )}
          </TabPanel>
        </TabView>
      )}
    </div>
  );
};

export default AttendanceSettingsPage;
