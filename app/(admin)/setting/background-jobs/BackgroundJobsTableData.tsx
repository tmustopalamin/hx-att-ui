"use client";
import { useI18n } from "@/app/i18n";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { ProgressBar } from "primereact/progressbar";
import { Tag } from "primereact/tag";

import {
  getBackgroundJobHealth,
  getBackgroundJobs,
} from "@/app/services/background-job-service";
import { BackgroundJob, BackgroundJobHealth } from "@/app/types/background-job";
import { formatDateTimeWithSeconds } from "@/app/utils/date-format";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { RootState } from "@/store/store";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

const statusOptions = [
  { labelKey: "All statuses", value: "" },
  { labelKey: "Queued", value: "QUEUED" },
  { labelKey: "Running", value: "RUNNING" },
  { labelKey: "Retry waiting", value: "RETRY_WAIT" },
  { labelKey: "Cancellation requested", value: "CANCEL_REQUESTED" },
  { labelKey: "Succeeded", value: "SUCCEEDED" },
  { labelKey: "Partial success", value: "PARTIAL_SUCCESS" },
  { labelKey: "Failed", value: "FAILED" },
  { labelKey: "Cancelled", value: "CANCELLED" },
];

const sourceOptions = [
  { labelKey: "All sources", value: "" },
  { labelKey: "Manual", value: "MANUAL" },
  { labelKey: "Scheduled", value: "SCHEDULED" },
  { labelKey: "System", value: "SYSTEM" },
];

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

const isActive = (status: string) =>
  ["QUEUED", "RUNNING", "RETRY_WAIT", "CANCEL_REQUESTED"].includes(status);

const statusSeverity = (status: string) => {
  switch (status) {
    case "SUCCEEDED":
      return "success" as const;
    case "PARTIAL_SUCCESS":
      return "warning" as const;
    case "FAILED":
      return "danger" as const;
    case "CANCELLED":
      return "secondary" as const;
    case "RUNNING":
    case "CANCEL_REQUESTED":
      return "info" as const;
    default:
      return "warning" as const;
  }
};

const progressValue = (row: BackgroundJob) =>
  row.progress_percent ??
  (row.progress_total && row.progress_total > 0
    ? Math.min(100, (row.progress_current / row.progress_total) * 100)
    : null);

export default function BackgroundJobsTableData() {
  const { t: i18nT, tText } = useI18n();
  const router = useRouter();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canReadAll = permissions.some(
    (permission) =>
      permission.trim().toLowerCase() === "background-job.read-all",
  );
  const [scope, setScope] = useState<"mine" | "all">(
    canReadAll ? "all" : "mine",
  );
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [rows, setRows] = useState<BackgroundJob[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [health, setHealth] = useState<BackgroundJobHealth | null>(null);
  const [workerIsOnline, setWorkerIsOnline] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canReadAll && scope === "all") setScope("mine");
  }, [canReadAll, scope]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getBackgroundJobs({
        scope,
        status: status || undefined,
        source: source || undefined,
        limit: rowsPerPage,
        offset: first,
      });
      setRows(result.items ?? []);
      setTotalRecords(result.total ?? 0);
      if (canReadAll) {
        try {
          setHealth(await getBackgroundJobHealth());
        } catch {}
      }
    } catch (err: unknown) {
      setError(
        isResponseTypeError(err)
          ? getErrorMessage(err, "message")
          : "Unable to load background jobs.",
      );
    } finally {
      setLoading(false);
    }
  }, [canReadAll, first, rowsPerPage, scope, source, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActiveJobs = useMemo(
    () => rows.some((row) => isActive(row.status)),
    [rows],
  );

  useEffect(() => {
    const lastSeenAt = health?.worker_last_seen_at;
    if (!lastSeenAt) {
      setWorkerIsOnline(null);
      return;
    }

    const updateWorkerStatus = () => {
      setWorkerIsOnline(Date.now() - Date.parse(lastSeenAt) <= 90_000);
    };

    updateWorkerStatus();
    const interval = window.setInterval(updateWorkerStatus, 30_000);
    return () => window.clearInterval(interval);
  }, [health?.worker_last_seen_at]);

  useEffect(() => {
    if (!hasActiveJobs) return;
    const interval = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(interval);
  }, [hasActiveJobs, load]);

  if (loading && rows.length === 0) return <LoadingDataTable />;

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <i className="pi pi-cog text-lg" />
            </div>
            <div>
              <h1 className="m-0 text-xl font-bold text-slate-900">
                {i18nT("static.31d7ef")}{" "}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {i18nT("static.1qr4uow")}{" "}
              </p>
            </div>
          </div>
          <Button
            label={i18nT("static.28r6qc")}
            icon="pi pi-refresh"
            outlined
            loading={loading}
            onClick={() => void load()}
          />
        </div>

        {canReadAll && health && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              [
                tText("Queued"),
                health.queued_count,
                "bg-blue-50 text-blue-700",
              ],
              [
                tText("Running"),
                health.running_count,
                "bg-amber-50 text-amber-700",
              ],
              [
                tText("Retry waiting"),
                health.retry_wait_count,
                "bg-violet-50 text-violet-700",
              ],
              [
                tText("Failed / 24h"),
                health.failed_last_24h_count,
                "bg-rose-50 text-rose-700",
              ],
              [
                tText("Worker"),
                health.worker_last_seen_at == null || workerIsOnline === null
                  ? tText("Unknown")
                  : workerIsOnline
                    ? tText("Online")
                    : tText("Stale"),
                workerIsOnline
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600",
              ],
            ].map(([label, value, className]) => (
              <div
                key={String(label)}
                className={`rounded-2xl px-4 py-3 ${className}`}
              >
                <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-75">
                  {label}
                </p>
                <p className="m-0 mt-1 text-lg font-bold">{String(value)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {canReadAll && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                {i18nT("static.rpvfkb")}{" "}
              </label>
              <Dropdown
                value={scope}
                options={[
                  { label: i18nT("static.jv43t"), value: "mine" },
                  { label: i18nT("static.1hk0iw4"), value: "all" },
                ]}
                onChange={(event) => {
                  setScope(event.value);
                  setFirst(0);
                }}
                className="w-full"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              {i18nT("static.3pd73")}{" "}
            </label>
            <Dropdown
              value={status}
              options={statusOptions.map((option) => ({
                label: i18nT(option.labelKey),
                value: option.value,
              }))}
              onChange={(event) => {
                setStatus(event.value);
                setFirst(0);
              }}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              {i18nT("static.r5qyuw")}{" "}
            </label>
            <Dropdown
              value={source}
              options={sourceOptions.map((option) => ({
                label: i18nT(option.labelKey),
                value: option.value,
              }))}
              onChange={(event) => {
                setSource(event.value);
                setFirst(0);
              }}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card className="border border-slate-200 shadow-sm">
        <DataTable
          value={rows}
          dataKey="id"
          lazy
          paginator
          first={first}
          rows={rowsPerPage}
          totalRecords={totalRecords}
          rowsPerPageOptions={[10, 25, 50, 100]}
          responsiveLayout="scroll"
          stripedRows
          emptyMessage={i18nT("static.1tryd3o")}
          rowHover
          currentPageReportTemplate={i18nT("static.1kqh8lr")}
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          onPage={(event) => {
            setFirst(event.first);
            setRowsPerPage(event.rows);
          }}
        >
          <Column
            field="id"
            header={i18nT("static.o4495s")}
            style={{ width: "5rem" }}
          />
          <Column field="display_name" header={i18nT("static.ijqa2k")} />
          <Column
            field="source"
            header={i18nT("static.r5qyuw")}
            body={(row: BackgroundJob) => (
              <Tag
                value={tText(formatSourceLabel(row.source))}
                severity="secondary"
                rounded
              />
            )}
          />
          <Column
            field="status"
            header={i18nT("static.3pd73")}
            body={(row: BackgroundJob) => (
              <Tag
                value={tText(formatStatusLabel(row.status))}
                severity={statusSeverity(row.status)}
                rounded
              />
            )}
          />
          <Column
            header={i18nT("static.79u6hy")}
            body={(row: BackgroundJob) => {
              const value = progressValue(row);
              return (
                <div className="min-w-[12rem]">
                  <div className="mb-1 flex justify-between gap-2 text-xs text-slate-500">
                    <span>{row.stage || "-"}</span>
                    <span>
                      {value === null
                        ? i18nT("static.d33r1p", { p0: row.progress_current })
                        : i18nT("static.1axt9f4", { p0: Math.round(value) })}
                    </span>
                  </div>
                  {value !== null && (
                    <ProgressBar
                      value={value}
                      showValue={false}
                      style={{ height: "0.45rem" }}
                    />
                  )}
                </div>
              );
            }}
          />
          <Column
            field="attempt_count"
            header={i18nT("static.1j0rhe6")}
            body={(row: BackgroundJob) =>
              `${row.attempt_count}/${row.max_attempts}`
            }
          />
          <Column
            field="created_at"
            header={i18nT("static.2qkacb")}
            body={(row: BackgroundJob) =>
              formatDateTimeWithSeconds(row.created_at)
            }
          />
          <Column
            header={i18nT("static.2wk0tb")}
            body={(row: BackgroundJob) => (
              <Button
                icon="pi pi-eye"
                rounded
                outlined
                size="small"
                tooltip={i18nT("static.1dtxu7d")}
                onClick={() =>
                  router.push(`/setting/background-jobs/${row.id}`)
                }
              />
            )}
          />
        </DataTable>
      </Card>
    </div>
  );
}
