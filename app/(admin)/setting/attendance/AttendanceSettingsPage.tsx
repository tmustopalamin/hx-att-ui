"use client";

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
  { label: "Every 1 minute", value: 1 },
  { label: "Every 2 minutes", value: 2 },
  { label: "Every 5 minutes", value: 5 },
  { label: "Every 10 minutes", value: 10 },
  { label: "Every 15 minutes", value: 15 },
  { label: "Every 30 minutes", value: 30 },
  { label: "Every 60 minutes", value: 60 },
];

const lookbackOptions = [
  { label: "Today only", value: 0 },
  { label: "Today + 1 day back", value: 1 },
  { label: "Today + 2 days back", value: 2 },
  { label: "Today + 3 days back", value: 3 },
  { label: "Today + 7 days back", value: 7 },
];

const gpsPresets = [
  { label: "Strict 50 m", value: 50 },
  { label: "Standard 100 m", value: 100 },
  { label: "Tolerant 200 m", value: 200 },
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
    max_gps_accuracy_meters: 100,
  },
  android: {
    enabled: true,
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
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {gpsPresets.map((preset) => (
      <Button
        key={preset.value}
        type="button"
        label={preset.label}
        size="small"
        outlined={value !== preset.value}
        severity={value === preset.value ? "info" : "secondary"}
        onClick={() => onChange(preset.value)}
      />
    ))}
  </div>
);

const AttendanceSettingsPage = () => {
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
        summary: "Error",
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
          summary: "Saved",
          detail: "Attendance processing settings updated.",
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
          summary: "Saved",
          detail: "Attendance submission policy updated.",
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
          Attendance Settings
        </h1>
        <p className="m-0 max-w-3xl text-sm leading-6 text-slate-500">
          Kelola proses perhitungan attendance dan aturan submit attendance Web
          atau Mobile App dari satu tempat.
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
            Loading attendance settings...
          </div>
        </Card>
      ) : (
        <TabView>
          <TabPanel header="Attendance Processing" leftIcon="pi pi-cog mr-2">
            {processingSetting && (
              <div className="space-y-5 pt-3">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Auto process</div>
                    <Tag
                      className="mt-2"
                      value={
                        processingSetting.auto_process_enabled ? "ON" : "OFF"
                      }
                      severity={
                        processingSetting.auto_process_enabled
                          ? "success"
                          : "secondary"
                      }
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Last status</div>
                    <Tag
                      className="mt-2"
                      value={
                        processingSetting.last_process_status || "Never Run"
                      }
                      severity={statusSeverity(
                        processingSetting.last_process_status,
                      )}
                    />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Last process</div>
                    <div className="mt-2 text-sm font-medium text-slate-900">
                      {formatDateTime(processingSetting.last_process_at)}
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs text-slate-500">Processed rows</div>
                    <div className="mt-2 text-sm font-medium text-slate-900">
                      {processingSetting.last_processed_count}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <ToggleRow
                    title="Enable automatic processing"
                    description="Run attendance summary processing in the background."
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
                      Process interval
                    </label>
                    <Dropdown
                      className="w-full"
                      value={processingForm.process_interval_minutes}
                      options={intervalOptions}
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
                      Reprocess previous days
                    </label>
                    <Dropdown
                      className="w-full"
                      value={processingForm.lookback_days}
                      options={lookbackOptions}
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
                      Useful when late attendance logs arrive after the first
                      processing run.
                    </small>
                  </div>
                </div>

                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <Button
                    type="button"
                    label="Save processing settings"
                    icon="pi pi-check"
                    loading={saving === "processing"}
                    onClick={saveProcessing}
                  />
                </div>
              </div>
            )}
          </TabPanel>

          <TabPanel
            header="Attendance Submission Policy"
            leftIcon="pi pi-map-marker mr-2"
          >
            {submissionPolicy && (
              <div className="space-y-5 pt-3">
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
                  Aturan ini berlaku saat employee mengirim attendance. Nilai
                  GPS yang lebih kecil berarti pemeriksaan lebih ketat. Aturan
                  Web dan Mobile App dapat berbeda karena kemampuan lokasi
                  perangkat tidak selalu sama.
                </div>

                <div>
                  <div className="mb-3 text-sm font-semibold text-slate-900">
                    Aturan bersama
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <ToggleRow
                      title="Require photo"
                      description="Employee must submit a valid attendance photo."
                      checked={policyForm.common.require_photo}
                      onChange={(value) =>
                        setPolicyForm((current) => ({
                          ...current,
                          common: { ...current.common, require_photo: value },
                        }))
                      }
                    />
                    <ToggleRow
                      title="Require location"
                      description="Employee must submit a valid GPS location."
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
                          Web Attendance
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Attendance submitted from the browser page.
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
                      <label className="block text-sm font-medium text-slate-700">
                        GPS tolerance
                      </label>
                      <GpsPresetPicker
                        value={policyForm.web.max_gps_accuracy_meters}
                        onChange={setWebGpsAccuracy}
                      />
                      <InputNumber
                        className="w-full"
                        value={policyForm.web.max_gps_accuracy_meters}
                        min={5}
                        max={1000}
                        suffix=" m"
                        disabled={!policyForm.web.enabled}
                        onValueChange={(event) =>
                          setWebGpsAccuracy(event.value ?? 100)
                        }
                      />
                      <small className="block text-xs leading-5 text-slate-500">
                        Submit ditolak jika browser melaporkan akurasi lebih
                        besar dari nilai ini.
                      </small>
                    </div>
                  </Card>

                  <Card className="border border-slate-200 shadow-none">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="m-0 text-base font-semibold text-slate-900">
                          Mobile App (Android)
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Attendance submitted from the official Android app.
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
                      <label className="block text-sm font-medium text-slate-700">
                        GPS tolerance
                      </label>
                      <GpsPresetPicker
                        value={policyForm.android.max_gps_accuracy_meters}
                        onChange={setAndroidGpsAccuracy}
                      />
                      <InputNumber
                        className="w-full"
                        value={policyForm.android.max_gps_accuracy_meters}
                        min={5}
                        max={1000}
                        suffix=" m"
                        disabled={!policyForm.android.enabled}
                        onValueChange={(event) =>
                          setAndroidGpsAccuracy(event.value ?? 100)
                        }
                      />
                      <small className="block text-xs leading-5 text-slate-500">
                        Nilai aplikasi Android dibaca dari sensor lokasi
                        perangkat.
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
                    Pengaturan lanjutan
                  </summary>

                  <div className="mt-4 space-y-5">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Maximum photo size
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
                          suffix=" MB"
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
                          Maximum event age
                        </label>
                        <InputNumber
                          className="w-full"
                          value={policyForm.common.max_event_age_seconds / 60}
                          min={0.5}
                          max={60}
                          minFractionDigits={0}
                          maxFractionDigits={1}
                          suffix=" min"
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
                          Minimum submit interval
                        </label>
                        <InputNumber
                          className="w-full"
                          value={
                            policyForm.common.min_submission_interval_seconds
                          }
                          min={10}
                          max={3600}
                          suffix=" sec"
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
                      title="Enforce Android Play Integrity"
                      description="Check official app and device integrity evidence before accepting Android attendance."
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
                      title="Allow unlicensed/internal Android app"
                      description="Allow configured company-distributed APKs when Android integrity is enabled."
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
                        Attendance area
                      </div>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Kosongkan semua field untuk mengizinkan attendance dari
                        lokasi mana pun. Isi ketiganya untuk membatasi area.
                      </p>
                      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <InputNumber
                          className="w-full"
                          placeholder="Latitude"
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
                          placeholder="Longitude"
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
                          placeholder="Radius"
                          value={policyForm.common.geofence_radius_meters}
                          min={10}
                          max={100000}
                          suffix=" m"
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
                    Last updated: {formatDateTime(submissionPolicy.updated_at)}
                  </div>
                  <Button
                    type="button"
                    label="Save submission policy"
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
