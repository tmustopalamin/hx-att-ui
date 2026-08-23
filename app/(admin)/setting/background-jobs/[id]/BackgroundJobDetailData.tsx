"use client";
import { useI18n } from "@/app/i18n";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";
import { useSelector } from "react-redux";

import {
  cancelBackgroundJob,
  getBackgroundJobDetail,
} from "@/app/services/background-job-service";
import { BackgroundJobDetail } from "@/app/types/background-job";
import { formatDateTimeWithSeconds } from "@/app/utils/date-format";
import { hasPermission } from "@/app/utils/permission-utils";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import { useDispatch } from "react-redux";

const activeStatuses = ["QUEUED", "RUNNING", "RETRY_WAIT", "CANCEL_REQUESTED"];

const formatStatusLabel = (status?: string | null) => {
  switch (status) {
    case "QUEUED":
      return "Queued";
    case "RUNNING":
      return "Running";
    case "RETRY_WAIT":
      return "Retry waiting";
    case "CANCEL_REQUESTED":
      return "Cancellation requested";
    case "SUCCEEDED":
      return "Succeeded";
    case "PARTIAL_SUCCESS":
      return "Partial success";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status || "Unknown";
  }
};

const formatSourceLabel = (source?: string | null) => {
  switch (source) {
    case "MANUAL":
      return "Manual";
    case "SCHEDULED":
      return "Scheduled";
    case "SYSTEM":
      return "System";
    default:
      return source || "Unknown";
  }
};

const severity = (status: string) => {
  if (status === "SUCCEEDED") return "success" as const;
  if (status === "PARTIAL_SUCCESS") return "warning" as const;
  if (status === "FAILED") return "danger" as const;
  if (status === "CANCELLED") return "secondary" as const;
  return "info" as const;
};

const percent = (job: BackgroundJobDetail) =>
  job.progress_percent ??
  (job.progress_total && job.progress_total > 0
    ? Math.min(100, (job.progress_current / job.progress_total) * 100)
    : null);

export default function BackgroundJobDetailData() {
  const { t: i18nT, tText } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canCancelAll = permissions.some(
    (permission) =>
      permission.trim().toLowerCase() === "background-job.cancel-all",
  );
  const canCancelOwn = hasPermission(permissions, "background-job.cancel");
  const employeeId = useSelector(
    (state: RootState) => state.profile.employee_id,
  );
  const [job, setJob] = useState<BackgroundJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const id = Number(params.id);
  const load = useCallback(async () => {
    if (!Number.isInteger(id) || id <= 0) {
      setJob(null);
      setError("Invalid background job ID.");
      setLoading(false);
      return;
    }
    try {
      setError("");
      setJob(await getBackgroundJobDetail(id));
    } catch (err: unknown) {
      setError(
        isResponseTypeError(err)
          ? getErrorMessage(err, "message")
          : "Unable to load background job.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!job || !activeStatuses.includes(job.status)) return;
    const interval = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(interval);
  }, [job, load]);

  const canCancel = useMemo(() => {
    if (!job || !activeStatuses.includes(job.status)) return false;
    return (
      canCancelAll ||
      (canCancelOwn &&
        (job.requested_by_employee_id === employeeId ||
          job.requester_employee_ids.includes(employeeId)))
    );
  }, [canCancelAll, canCancelOwn, employeeId, job]);

  const handleCancel = async () => {
    if (!job || cancelReason.trim().length < 3) return;
    try {
      setCancelling(true);
      await cancelBackgroundJob(job.id, job.row_version, cancelReason);
      setCancelVisible(false);
      setCancelReason("");
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.118y85z"),
          detail: i18nT("static.10dii07"),
        }),
      );
      await load();
    } catch (err: unknown) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1m8e7ts"),
          detail: isResponseTypeError(err)
            ? getErrorMessage(err, "message")
            : i18nT("static.i2wacg"),
        }),
      );
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !job)
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
        {i18nT("static.ehvtt8")}{" "}
      </div>
    );
  if (error && !job)
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
        {error}
      </div>
    );
  if (!job) return null;

  const value = percent(job);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          label={i18nT("static.197pam9")}
          icon="pi pi-arrow-left"
          text
          onClick={() => router.push("/setting/background-jobs")}
        />
        {canCancel && (
          <Button
            label={i18nT("static.1nlaya0")}
            icon="pi pi-times"
            severity="danger"
            outlined
            onClick={() => setCancelVisible(true)}
          />
        )}
      </div>

      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="m-0 text-xl font-bold text-slate-900">
                {job.display_name}
              </h1>
              <Tag
                value={tText(formatStatusLabel(job.status))}
                severity={severity(job.status)}
                rounded
              />
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {i18nT("static.6m7bo5")}
              {job.id} - {job.job_type} - {tText(formatSourceLabel(job.source))}
            </p>
          </div>
          <div className="text-right text-xs text-slate-400">
            <div>
              {i18nT("static.2qkacb")}{" "}
              {formatDateTimeWithSeconds(job.created_at)}
            </div>
            {job.finished_at && (
              <div>
                {i18nT("static.1aj3cub")}{" "}
                {formatDateTimeWithSeconds(job.finished_at)}
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
            <span>{job.stage || i18nT("static.17wun3o")}</span>
            <span>
              {value === null
                ? i18nT("static.d33r1p", { p0: job.progress_current })
                : i18nT("static.1axt9f4", { p0: Math.round(value) })}
            </span>
          </div>
          {value !== null && (
            <ProgressBar className="mt-3" value={value} showValue={false} />
          )}
          {job.progress_message && (
            <p className="m-0 mt-2 text-sm text-slate-500">
              {job.progress_message}
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            [tText("Current"), job.progress_current],
            [tText("Total"), job.progress_total ?? "-"],
            [tText("Attempt"), `${job.attempt_count}/${job.max_attempts}`],
            [tText("Target"), job.target_id ?? "-"],
            [tText("Error"), job.error_code ?? "-"],
          ].map(([label, display]) => (
            <div
              key={String(label)}
              className="rounded-xl border border-slate-200 p-3"
            >
              <p className="m-0 text-xs text-slate-500">{label}</p>
              <p className="m-0 mt-1 truncate text-sm font-semibold text-slate-800">
                {String(display)}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {job.error_message && (
        <Card className="border border-rose-200 bg-rose-50 shadow-sm">
          <p className="m-0 text-sm text-rose-800">{job.error_message}</p>
        </Card>
      )}

      {job.result !== null && job.result !== undefined && (
        <Card className="border border-slate-200 shadow-sm">
          <h2 className="m-0 text-base font-bold text-slate-800">
            {i18nT("static.1170bdt")}{" "}
          </h2>
          <pre className="mt-3 max-h-[28rem] overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-5 text-slate-100">
            {JSON.stringify(job.result, null, 2)}
          </pre>
        </Card>
      )}

      <Card className="border border-slate-200 shadow-sm">
        <h2 className="m-0 text-base font-bold text-slate-800">
          {i18nT("static.3rtzuh")}{" "}
        </h2>
        <div className="mt-4 divide-y divide-slate-100">
          {job.events.length === 0 && (
            <p className="text-sm text-slate-500">{i18nT("static.17ygss8")} </p>
          )}
          {job.events.map((event) => (
            <div
              key={event.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Tag value={event.event_type} severity="secondary" rounded />
                  <span className="text-sm font-semibold text-slate-800">
                    {event.stage || "-"}
                  </span>
                </div>
                {event.message && (
                  <p className="m-0 mt-1 text-sm text-slate-600">
                    {event.message}
                  </p>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {formatDateTimeWithSeconds(event.created_at)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <h2 className="m-0 text-base font-bold text-slate-800">
          {i18nT("static.1scdpc7")}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[42rem] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">{i18nT("static.1j0rhe6")}</th>
                <th className="px-3 py-2">{i18nT("static.3pd73")}</th>
                <th className="px-3 py-2">{i18nT("static.163dnb2")}</th>
                <th className="px-3 py-2">{i18nT("static.1vks92p")}</th>
              </tr>
            </thead>
            <tbody>
              {job.attempts.map((attempt) => (
                <tr key={attempt.id} className="border-b border-slate-100">
                  <td className="px-3 py-3">{attempt.attempt_no}</td>
                  <td className="px-3 py-3">
                    <Tag
                      value={tText(formatStatusLabel(attempt.status))}
                      severity={severity(attempt.status)}
                      rounded
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-500">
                    {formatDateTimeWithSeconds(attempt.started_at)}
                  </td>
                  <td className="px-3 py-3 text-rose-700">
                    {attempt.error_message || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {job.children.length > 0 && (
        <Card className="border border-slate-200 shadow-sm">
          <h2 className="m-0 text-base font-bold text-slate-800">
            {i18nT("static.1k4iutz")}
          </h2>
          <div className="mt-3 space-y-2">
            {job.children.map((child) => (
              <button
                type="button"
                key={child.id}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50"
                onClick={() =>
                  router.push(`/setting/background-jobs/${child.id}`)
                }
              >
                <span className="text-sm font-semibold text-slate-800">
                  #{child.id} {child.display_name}
                </span>
                <Tag
                  value={tText(formatStatusLabel(child.status))}
                  severity={severity(child.status)}
                  rounded
                />
              </button>
            ))}
          </div>
        </Card>
      )}

      <Dialog
        header={i18nT("static.1u1i83e")}
        visible={cancelVisible}
        modal
        closable={!cancelling}
        onHide={() => !cancelling && setCancelVisible(false)}
        style={{ width: "min(32rem, 94vw)" }}
      >
        <div className="space-y-4">
          <p className="m-0 text-sm text-slate-600">
            {i18nT("static.rwy1lt")}{" "}
          </p>
          <div>
            <label
              htmlFor="background-job-cancel-reason"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              {i18nT("static.i36sl5")}{" "}
            </label>
            <InputTextarea
              id="background-job-cancel-reason"
              value={cancelReason}
              rows={4}
              maxLength={500}
              autoResize
              className="w-full"
              disabled={cancelling}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder={i18nT("static.13el6ci")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.xs6zlz")}
              text
              severity="secondary"
              disabled={cancelling}
              onClick={() => setCancelVisible(false)}
            />
            <Button
              label={i18nT("static.1nlaya0")}
              severity="danger"
              loading={cancelling}
              disabled={cancelReason.trim().length < 3}
              onClick={() => void handleCancel()}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
