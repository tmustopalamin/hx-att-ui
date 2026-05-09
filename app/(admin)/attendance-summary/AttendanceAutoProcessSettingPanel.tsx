"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { useDispatch } from "react-redux";

import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";

import { AttendanceProcessSetting } from "@/app/types/attendance-process-setting";
import {
    getAttendanceProcessSetting,
    updateAttendanceProcessSetting,
} from "@/app/services/attendance-process-setting-service";
import { showToast } from "@/store/ToastSlice";
import {
    getErrorMessage,
    isResponseTypeError,
} from "@/app/utils/error-messages";

const swrKey = "/api/attendance-summary/auto-process-setting";

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

const formatDateTime = (value: string | null) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
};

const getStatusSeverity = (
    status?: string | null
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
    const dispatch = useDispatch();

    const [visible, setVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        auto_process_enabled: false,
        process_interval_minutes: 10,
        lookback_days: 3,
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
                    summary: "Success",
                    detail: res.message || "Auto process setting updated successfully",
                })
            );

            setVisible(false);
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: "error",
                        summary: "Error",
                        detail: getErrorMessage(err, "message"),
                    })
                );
            } else if (err instanceof Error) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: "error",
                        summary: "Error",
                        detail: err.message,
                    })
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
                            Auto Process Attendance Summary
                        </div>

                        {setting?.auto_process_enabled ? (
                            <Tag value="ON" severity="success" />
                        ) : (
                            <Tag value="OFF" severity="secondary" />
                        )}

                        <Tag
                            value={setting?.last_process_status || "Never Run"}
                            severity={getStatusSeverity(setting?.last_process_status)}
                        />
                    </div>

                    <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-600 md:grid-cols-2">
                        <div>
                            Interval:{" "}
                            <span className="font-medium">
                                {setting?.auto_process_enabled
                                    ? `Every ${setting.process_interval_minutes} min`
                                    : "-"}
                            </span>
                        </div>

                        <div>
                            Lookback:{" "}
                            <span className="font-medium">
                                {setting ? `${setting.lookback_days} day(s)` : "-"}
                            </span>
                        </div>

                        <div>
                            Last Process:{" "}
                            <span className="font-medium">
                                {formatDateTime(setting?.last_process_at ?? null)}
                            </span>
                        </div>

                        <div>
                            Last Processed Count:{" "}
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
                            Error: {setting.last_process_error}
                        </div>
                    )}
                </div>

                <Button
                    type="button"
                    icon="pi pi-cog"
                    label="Auto Process Setting"
                    size="small"
                    loading={isLoading}
                    onClick={() => setVisible(true)}
                />
            </div>

            <Dialog
                header="Auto Process Attendance Summary Setting"
                visible={visible}
                style={{ width: "36rem", maxWidth: "95vw" }}
                onHide={() => setVisible(false)}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            label="Cancel"
                            icon="pi pi-times"
                            className="p-button-text"
                            onClick={() => setVisible(false)}
                        />
                        <Button
                            type="button"
                            label="Save"
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
                                Enable Auto Process
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                Automatically process attendance summary in the background.
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
                            Process Interval
                        </label>

                        <Dropdown
                            className="w-full"
                            value={form.process_interval_minutes}
                            options={intervalOptions}
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

                        <small className="text-slate-500">
                            Worker checks the setting regularly, but process will only run
                            based on this interval.
                        </small>
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                            Lookback Days
                        </label>

                        <Dropdown
                            className="w-full"
                            value={form.lookback_days}
                            options={lookbackOptions}
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

                        <small className="text-slate-500">
                            Example: 3 means process today and 3 days before today.
                        </small>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default AttendanceAutoProcessSettingPanel;