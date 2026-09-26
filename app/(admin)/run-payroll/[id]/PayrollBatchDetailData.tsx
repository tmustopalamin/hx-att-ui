"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";
import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { getErrorMessage } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import type { RootState } from "@/store/store";
import {
  calculatePayrollBatch,
  exportPayrollEbupot21,
  getPayrollBatchDetail,
  getPayrollBatchSourceReadiness,
  validatePayrollBatch,
} from "@/app/services/payroll-batch-service";
import type {
  PayrollBatchDetail,
  PayrollComponentResult,
  PayrollEmployeeResultDetail,
  PayrollBatchSourceReadiness,
} from "@/app/types/payroll-batch";
import PayrollAdjustmentPanel from "./PayrollAdjustmentPanel";
import PerformanceEarningPanel from "./PerformanceEarningPanel";
import HolidayPositionIncentivePanel from "./HolidayPositionIncentivePanel";
import ThrEarningPanel from "./ThrEarningPanel";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import { formatStatusLabel } from "@/app/i18n/statusLabel";

interface PayrollBatchDetailDataProps {
  batchId: number;
}

const formatCurrency = (amount: string | number) => {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDuration = (seconds: number) => {
  const totalMinutes = Math.floor(seconds / 60);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};

const statusSeverity = (
  status: string,
): "success" | "info" | "warning" | "danger" | "secondary" => {
  if (status === "CALCULATED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "WARNING") return "warning";
  if (status === "PENDING") return "secondary";
  return "info";
};

export default function PayrollBatchDetailData({
  batchId,
}: PayrollBatchDetailDataProps) {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const { mutate: mutateKey } = useSWRConfig();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canValidate = permissions.includes("payroll.validate");
  const canCalculate = permissions.includes("payroll.calculate");
  const canExport = permissions.includes("payroll.export");
  const [validating, setValidating] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [exportingEbupot, setExportingEbupot] = useState(false);

  const detailUrl = `/api/payroll-batches/${batchId}/detail`;
  const { data, error, isLoading, mutate } = useSWR<PayrollBatchDetail>(
    detailUrl,
    () => getPayrollBatchDetail(batchId),
  );
  const readinessUrl = `/api/payroll-batches/${batchId}/source-readiness`;
  const {
    data: readiness,
    error: readinessError,
    mutate: mutateReadiness,
  } = useSWR<PayrollBatchSourceReadiness>(readinessUrl, () =>
    getPayrollBatchSourceReadiness(batchId),
  );
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const selectedResult = useMemo(
    () =>
      data?.employee_results?.find(
        (result) => result.id === selectedResultId,
      ) ??
      data?.employee_results?.[0] ??
      null,
    [data?.employee_results, selectedResultId],
  );

  const toast = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));

  const showError = (err: unknown) => {
    toast("error", i18nT("static.ghd2d6"), getErrorMessage(err));
  };

  const handleValidate = async (revalidate = false) => {
    if (!data?.batch) return;
    try {
      setValidating(true);
      const result = await validatePayrollBatch(
        data.batch.id,
        data.batch.row_version,
      );
      await Promise.all([
        mutate(),
        mutateReadiness(),
        mutateKey(`payroll-performance-earnings-${batchId}`),
        mutateKey(`/api/payroll-batches/${batchId}/adjustments`),
      ]);
      toast(
        result.failed_count > 0 ? "error" : "success",
        result.failed_count > 0
          ? i18nT("static.7ojrng")
          : i18nT("static.mej0rw"),
        i18nT("static.btpd6d", {
          p0: result.ready_count,
          p1: result.warning_count,
          p2: result.failed_count,
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setValidating(false);
    }
  };

  const confirmValidate = (revalidate = false) => {
    if (!data?.batch) return;
    requestActionConfirmation({
      action: revalidate ? i18nT("static.1f1y0jf") : i18nT("static.58a1lq"),
      target: data.batch.batch_no,
      severity: "warning",
      confirmLabel: revalidate
        ? i18nT("static.81yhza")
        : i18nT("static.y0kciz"),
      confirmIcon: "pi pi-check-circle",
      description: revalidate ? i18nT("static.rcv3dc") : i18nT("static.mm8zct"),
      onAccept: () => handleValidate(revalidate),
    });
  };

  const handleCalculate = async () => {
    if (!data?.batch) return;
    try {
      setCalculating(true);
      const result = await calculatePayrollBatch(
        data.batch.id,
        data.batch.row_version,
      );
      await Promise.all([
        mutate(),
        mutateReadiness(),
        mutateKey(`payroll-performance-earnings-${batchId}`),
        mutateKey(`/api/payroll-batches/${batchId}/adjustments`),
      ]);
      if (result.failed_count > 0) {
        toast(
          "error",
          i18nT("static.1jfbp5m"),
          i18nT("static.1jqrewv", {
            p0: result.calculated_count,
            p1: result.failed_count,
          }),
        );
        return;
      }
      toast(
        "success",
        i18nT("static.1byvg5y"),
        i18nT("static.1qnoqyq", { p0: result.calculated_count }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setCalculating(false);
    }
  };

  const confirmCalculate = () => {
    if (!data?.batch) return;
    requestActionConfirmation({
      action: i18nT("static.1thvu1b"),
      target: data.batch.batch_no,
      severity: "warning",
      confirmLabel: i18nT("static.1thvu1b"),
      confirmIcon: "pi pi-calculator",
      description: i18nT("static.12qgyyv"),
      onAccept: () => handleCalculate(),
    });
  };

  const handleExportEbupot = async () => {
    if (!data?.batch) return;
    try {
      setExportingEbupot(true);
      const { blob, filename } = await exportPayrollEbupot21(batchId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast("success", "Ekspor Berhasil", `File ${filename} berhasil diunduh.`);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setExportingEbupot(false);
    }
  };

  if (isLoading) return <LoadingDataTable />;
  if (error || !data) return <ErrorNotConnectedToApi mutateKey={detailUrl} />;

  return (
    <div className="flex flex-col gap-5">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
              <i className="pi pi-wallet text-xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {data.batch.batch_no}
                </h1>
                <Tag
                  value={i18nT(formatStatusLabel(data.batch.status))}
                  severity={statusSeverity(data.batch.status)}
                />
                {data.batch.include_thr && (
                  <Tag
                    value={i18nT("THR Keagamaan")}
                    severity="warning"
                    icon="pi pi-gift"
                  />
                )}
              </div>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                {i18nT("static.1lhep1j")}{" "}
                {formatDisplayDate(data.batch.period_start)}{" "}
                {i18nT("static.idyip0")}{" "}
                {formatDisplayDate(data.batch.period_end)}{" "}
                {i18nT("static.1ewdooc")}{" "}
                {formatDisplayDate(data.batch.payroll_date)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canCalculate && data.batch.status === "READY" && (
              <Button
                label={i18nT("static.1thvu1b")}
                icon="pi pi-calculator"
                size="small"
                loading={calculating}
                disabled={validating || calculating}
                onClick={confirmCalculate}
              />
            )}
            {canValidate &&
              [
                "READY",
                "CALCULATED",
                "REVIEWED",
                "PENDING_APPROVAL",
                "APPROVED",
              ].includes(data.batch.status) && (
                <Button
                  label={i18nT("static.81yhza")}
                  icon="pi pi-refresh"
                  size="small"
                  severity="secondary"
                  outlined
                  loading={validating}
                  disabled={validating || calculating}
                  onClick={() => confirmValidate(true)}
                />
              )}
            {canValidate && ["DRAFT", "FAILED"].includes(data.batch.status) && (
              <Button
                label={i18nT("static.y0kciz")}
                icon="pi pi-check-circle"
                size="small"
                severity="secondary"
                outlined
                loading={validating}
                disabled={validating || calculating}
                onClick={() => confirmValidate(false)}
              />
            )}
            {canExport &&
              [
                "CALCULATED",
                "REVIEWED",
                "PENDING_APPROVAL",
                "APPROVED",
                "PAID",
              ].includes(data.batch.status) && (
                <Button
                  label="Export e-Bupot 21/26"
                  icon="pi pi-file-export"
                  size="small"
                  severity="help"
                  outlined
                  loading={exportingEbupot}
                  disabled={validating || calculating || exportingEbupot}
                  onClick={handleExportEbupot}
                />
              )}
            <Link
              href="/run-payroll"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <i className="pi pi-arrow-left text-sm" />
              {i18nT("static.rnmopi")}{" "}
            </Link>
          </div>
        </div>
      </Card>

      {readinessError ? (
        <Message severity="warn" text={i18nT("static.t45kcq")} />
      ) : readiness ? (
        <PayrollSourceReadinessPanel readiness={readiness} />
      ) : null}

      <Card className="border border-slate-200 shadow-sm">
        <div className="p-3 sm:p-4 md:p-5">
          <div className="mb-4">
            <h2 className="m-0 text-base font-semibold text-slate-800">
              {i18nT("static.1ex48ey")}{" "}
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {i18nT("static.1brz5hp")}{" "}
            </p>
          </div>
          <DataTable
            value={data.employee_results}
            dataKey="id"
            selectionMode="single"
            selection={selectedResult}
            onSelectionChange={(event) =>
              setSelectedResultId(
                (event.value as PayrollEmployeeResultDetail).id,
              )
            }
            paginator
            rows={10}
            stripedRows
            rowHover
            scrollable
            responsiveLayout="scroll"
            size="small"
            tableStyle={{ minWidth: "62rem" }}
            emptyMessage={i18nT("static.biabwz")}
          >
            <Column
              field="employee_code"
              header={i18nT("static.1lghzb2")}
              sortable
            />
            <Column
              field="employee_name"
              header={i18nT("static.1fak8xt")}
              sortable
            />
            <Column
              header={i18nT("static.awjta6")}
              body={(row: PayrollEmployeeResultDetail) =>
                formatCurrency(row.gross_income)
              }
            />
            <Column
              header={i18nT("static.1lt98r0")}
              body={(row: PayrollEmployeeResultDetail) =>
                formatCurrency(row.employee_deduction)
              }
            />
            <Column
              header={i18nT("static.mlv85w")}
              body={(row: PayrollEmployeeResultDetail) =>
                formatCurrency(row.pph21_amount)
              }
            />
            <Column
              header={i18nT("static.1brz9dr")}
              body={(row: PayrollEmployeeResultDetail) => (
                <span className="font-semibold text-slate-800">
                  {formatCurrency(row.take_home_pay)}
                </span>
              )}
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: PayrollEmployeeResultDetail) => (
                <Tag
                  value={i18nT(formatStatusLabel(row.status))}
                  severity={statusSeverity(row.status)}
                />
              )}
            />
          </DataTable>
        </div>
      </Card>

      {selectedResult && <EmployeeResultPanel result={selectedResult} />}
      <PerformanceEarningPanel
        batchId={data.batch.id}
        batchStatus={data.batch.status}
      />
      <HolidayPositionIncentivePanel
        batchId={data.batch.id}
        batchStatus={data.batch.status}
      />
      {Boolean(data.batch.include_thr) && (
        <ThrEarningPanel
          batchId={data.batch.id}
          batchStatus={data.batch.status}
        />
      )}
      <PayrollAdjustmentPanel
        batchId={data.batch.id}
        batchStatus={data.batch.status}
      />
    </div>
  );
}

function PayrollSourceReadinessPanel({
  readiness,
}: {
  readiness: PayrollBatchSourceReadiness;
}) {
  const { t: i18nT } = useI18n();
  const statusSeverity = (status: string) => {
    if (status === "READY") return "success" as const;
    if (status === "WARNING") return "warning" as const;
    return "danger" as const;
  };
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-800">
              {i18nT("static.1arqacr")}{" "}
            </h2>
            <p className="m-0 mt-1 text-xs text-slate-500">
              {i18nT("static.1jvrh6p")}{" "}
            </p>
          </div>
          <div className="flex gap-2">
            <Tag
              value={
                readiness.source_manifest_current
                  ? i18nT("static.1sm1t8b")
                  : i18nT("static.3vuf4u")
              }
              severity={
                readiness.source_manifest_current ? "success" : "danger"
              }
            />
            <Tag
              value={
                readiness.ready_for_calculation
                  ? i18nT("static.fq1f6d")
                  : i18nT("static.weurra")
              }
              severity={readiness.ready_for_calculation ? "success" : "warning"}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {readiness.domains.map((domain) => (
            <div
              key={domain.domain}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-700">
                  {domain.domain.replaceAll("_", " ")}
                </span>
                <Tag
                  value={i18nT(formatStatusLabel(domain.status))}
                  severity={statusSeverity(domain.status)}
                />
              </div>
              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {domain.message}
              </p>
              {(domain.blocking_count > 0 || domain.warning_count > 0) && (
                <p className="m-0 mt-1 text-xs font-medium text-amber-700">
                  {domain.blocking_count > 0
                    ? i18nT("static.1bqbeel", { p0: domain.blocking_count })
                    : i18nT("static.1gx8ykr", { p0: domain.warning_count })}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

const formatProrationMethod = (code: string, isId: boolean) => {
  const normalized = code.trim().toUpperCase();
  if (normalized === "SCHEDULED_DAYS" || normalized === "WORKING_DAYS") {
    return isId ? "Hari Kerja Terjadwal" : "Scheduled Working Days";
  }
  if (normalized === "CALENDAR_DAYS") {
    return isId ? "Hari Kalender" : "Calendar Days";
  }
  if (normalized === "NONE") {
    return isId ? "Tanpa Prorata" : "No Proration";
  }
  if (normalized.startsWith("FIXED_")) {
    const days = normalized.replace("FIXED_", "").replace("_DAYS", "");
    return isId
      ? `Pembagi Tetap (${days} Hari)`
      : `Fixed Divisor (${days} Days)`;
  }
  return code || "-";
};

const formatProrationScope = (scope: string, isId: boolean) => {
  const normalized = scope.trim().toUpperCase();
  if (normalized === "BASE_SALARY_ONLY") {
    return isId ? "Hanya Gaji Pokok" : "Base Salary Only";
  }
  if (
    normalized === "ALL_COMPONENTS" ||
    normalized === "BASE_AND_FIXED_ALLOWANCES"
  ) {
    return isId
      ? "Gaji Pokok & Tunjangan Tetap"
      : "Base Salary & Fixed Allowances";
  }
  if (!scope || scope === "-") return "-";
  return scope.replace(/_/g, " ");
};

const formatComponentType = (type: string, isId: boolean) => {
  const normalized = type?.toUpperCase();
  if (normalized === "EARNING") {
    return (
      <Tag
        value={isId ? "Pendapatan" : "Earning"}
        severity="success"
        className="text-[11px] font-medium"
      />
    );
  }
  if (normalized === "DEDUCTION") {
    return (
      <Tag
        value={isId ? "Potongan" : "Deduction"}
        severity="danger"
        className="text-[11px] font-medium"
      />
    );
  }
  if (normalized === "EMPLOYER_CONTRIBUTION") {
    return (
      <Tag
        value={isId ? "Iuran Perusahaan" : "Employer Contrib."}
        severity="info"
        className="text-[11px] font-medium"
      />
    );
  }
  if (normalized === "TAX") {
    return (
      <Tag
        value={isId ? "Pajak (PPh 21)" : "Tax"}
        severity="warning"
        className="text-[11px] font-medium"
      />
    );
  }
  return <Tag value={type} severity="secondary" className="text-[11px]" />;
};

const formatComponentSource = (source: string, isId: boolean) => {
  const normalized = source?.toUpperCase();
  switch (normalized) {
    case "ATTENDANCE":
      return isId ? "Kehadiran" : "Attendance";
    case "FIXED":
      return isId ? "Tetap" : "Fixed";
    case "PERCENTAGE":
      return isId ? "Persentase" : "Percentage";
    case "FORMULA":
      return "Formula";
    case "REGULATORY":
      return isId ? "Regulasi" : "Regulatory";
    case "ADJUSTMENT":
      return isId ? "Penyesuaian" : "Adjustment";
    case "PERFORMANCE":
      return isId ? "Kinerja" : "Performance";
    case "POSITION_ALLOWANCE":
      return isId ? "Tunjangan Jabatan" : "Position Allowance";
    case "HOLIDAY_POSITION_INCENTIVE":
      return isId ? "Insentif Libur" : "Holiday Incentive";
    case "OVERTIME":
      return isId ? "Lembur" : "Overtime";
    case "MANUAL":
      return "Manual";
    default:
      return source ? source.replace(/_/g, " ") : "-";
  }
};

const renderCalculation = (
  row: PayrollComponentResult,
  result: PayrollEmployeeResultDetail,
  isId: boolean,
) => {
  const details = (row.calculation_details_json ?? {}) as Record<
    string,
    unknown
  >;
  const source = row.source?.toUpperCase();
  const code = row.component_code?.toUpperCase();

  // 1a. LATE & EARLY OUT PENALTY (Depnaker PP 35/2021)
  if (code === "POTONGAN_KETERLAMBATAN" || details.source === "LATE_PENALTY") {
    const minutesRaw =
      row.quantity ??
      (typeof details.total_penalty_minutes === "string" ||
      typeof details.total_penalty_minutes === "number"
        ? String(details.total_penalty_minutes)
        : null);
    const minutes = minutesRaw ? Number(minutesRaw) : null;

    const minuteRateRaw =
      row.rate ??
      (typeof details.minute_rate === "string" ||
      typeof details.minute_rate === "number"
        ? String(details.minute_rate)
        : null);

    const lateSec =
      typeof details.late_seconds === "number"
        ? details.late_seconds
        : (result.attendance?.late_seconds ?? 0);
    const earlySec =
      typeof details.early_out_seconds === "number"
        ? details.early_out_seconds
        : (result.attendance?.early_out_seconds ?? 0);

    const lateMins = Math.round(lateSec / 60);
    const earlyMins = Math.round(earlySec / 60);

    if (minutes !== null && minuteRateRaw) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-800">
            {minutes} {isId ? "menit" : "mins"} &times;{" "}
            {formatCurrency(minuteRateRaw)}/{isId ? "mnt" : "min"}
          </span>
          {(lateMins > 0 || earlyMins > 0) && (
            <span className="text-[11px] font-medium text-amber-700">
              {isId
                ? `${lateMins}m terlambat + ${earlyMins}m pulang cepat`
                : `${lateMins}m late + ${earlyMins}m early departure`}
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {isId
              ? "Tarif: 1/173 × Gaji Pokok / 60"
              : "Rate: 1/173 × Base Salary / 60"}
          </span>
        </div>
      );
    }
    return (
      <span className="text-slate-600">
        {isId ? "Potongan Keterlambatan" : "Late Penalty"}
      </span>
    );
  }

  // 1b. ATTENDANCE (e.g. Transport, Meal allowance per day)
  if (source === "ATTENDANCE" || details.source === "ATTENDANCE") {
    const daysRaw =
      row.quantity ??
      (typeof details.payable_days === "string" ||
      typeof details.payable_days === "number"
        ? String(details.payable_days)
        : null);
    const days = daysRaw ? Math.round(Number(daysRaw)) : null;

    const rateRaw =
      row.rate ??
      (typeof details.configured_daily_amount === "string" ||
      typeof details.configured_daily_amount === "number"
        ? String(details.configured_daily_amount)
        : null);

    if (days !== null && rateRaw) {
      return (
        <span className="font-semibold text-slate-800">
          {days} {isId ? "hari" : "days"} &times; {formatCurrency(rateRaw)}
        </span>
      );
    }
  }

  // 1c. OVERTIME (PP 35/2021)
  if (
    source === "OVERTIME" ||
    details.source === "OVERTIME" ||
    code === "LEMBUR"
  ) {
    const hoursRaw =
      row.quantity ??
      (typeof details.weighted_overtime_hours === "string" ||
      typeof details.weighted_overtime_hours === "number"
        ? String(details.weighted_overtime_hours)
        : null) ??
      (typeof details.approved_overtime_seconds === "number"
        ? String(Number(details.approved_overtime_seconds) / 3600)
        : null);
    const hours = hoursRaw ? Number(hoursRaw) : null;

    const rateRaw =
      row.rate ??
      (typeof details.hourly_rate === "string" ||
      typeof details.hourly_rate === "number"
        ? String(details.hourly_rate)
        : null) ??
      (result.base_salary
        ? String(Math.round(Number(result.base_salary) / 173))
        : null);

    const actualSeconds =
      typeof details.approved_overtime_seconds === "number"
        ? details.approved_overtime_seconds
        : typeof details.approved_overtime_seconds === "string"
          ? Number(details.approved_overtime_seconds)
          : (result.attendance?.approved_overtime_seconds ?? 0);
    const actualHours = actualSeconds > 0 ? actualSeconds / 3600 : null;

    if (hours !== null && rateRaw) {
      return (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-800">
            {hours.toLocaleString(isId ? "id-ID" : "en-US", {
              maximumFractionDigits: 2,
            })}{" "}
            {isId ? "jam upah" : "pay hrs"} &times; {formatCurrency(rateRaw)}
          </span>
          {actualHours !== null && (
            <span className="text-[11px] font-medium text-blue-700">
              {isId
                ? `${actualHours} jam aktual → ${hours} jam konversi PP 35/2021`
                : `${actualHours} actual hrs → ${hours} converted hrs (PP 35/2021)`}
            </span>
          )}
          <span className="text-[11px] text-slate-500">
            {isId ? "Tarif: 1/173 × Gaji Pokok" : "Rate: 1/173 × Base Salary"}
          </span>
        </div>
      );
    }
    return (
      <span className="text-slate-600">
        {isId ? "Upah Lembur" : "Overtime Pay"}
      </span>
    );
  }

  // 2. BASIC SALARY (with or without proration)
  if (code === "BASIC_SALARY") {
    const prorationObj =
      (details.proration as Record<string, unknown>) ??
      result.proration_details_json ??
      {};
    const factorNum = Number(
      prorationObj?.factor ?? result.proration_factor ?? 1,
    );
    const payableDays = prorationObj?.payable_days;
    const denomDays = prorationObj?.denominator_days;

    if (factorNum < 1 && payableDays && denomDays) {
      const pct = (factorNum * 100).toFixed(2);
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">
            {isId ? "Prorata" : "Proration"}: {String(payableDays)}/
            {String(denomDays)} {isId ? "hari" : "days"}
          </span>
          <span className="text-[11px] text-slate-500">
            ({pct}% {isId ? "dari gaji pokok" : "of base salary"})
          </span>
        </div>
      );
    }
    return (
      <span className="text-slate-600">
        {isId ? "Gaji Penuh (1 Bulan)" : "Full Month (100%)"}
      </span>
    );
  }

  // 3. FORMULA
  if (source === "FORMULA" || row.formula_expression_used) {
    return (
      <span
        className="font-mono text-xs text-slate-700"
        title={row.formula_expression_used ?? ""}
      >
        {row.formula_expression_used || "Formula"}
      </span>
    );
  }

  // 4. PERCENTAGE / REFERENCE
  // 4. PERCENTAGE / REFERENCE / REGULATORY BPJS
  const effRate =
    row.rate ??
    (typeof details.rate === "string" || typeof details.rate === "number"
      ? String(details.rate)
      : null);
  if (
    source === "PERCENTAGE" ||
    (effRate && Number(effRate) > 0 && Number(effRate) <= 1)
  ) {
    const pct = (Number(effRate) * 100).toFixed(2) + "%";
    const wageBase =
      row.base_amount ??
      (typeof details.wage_base === "string" ||
      typeof details.wage_base === "number"
        ? String(details.wage_base)
        : null);
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          {pct}
          {wageBase ? ` × ${formatCurrency(wageBase)}` : ""}
        </span>
        {typeof details.program_code === "string" && (
          <span className="text-[11px] text-slate-500">
            {details.treatment_code === "EMPLOYER"
              ? isId
                ? "Iuran Perusahaan"
                : "Employer Share"
              : isId
                ? "Iuran Karyawan"
                : "Employee Share"}
          </span>
        )}
      </div>
    );
  }

  // 5. REGULATORY PPh 21
  if (
    code === "PPH21" ||
    details.calculator === "PPH21_MONTHLY_TER" ||
    details.ptkp_code !== undefined
  ) {
    const terCat =
      typeof details.ter_category === "string" ? details.ter_category : "";
    const ptkp = typeof details.ptkp_code === "string" ? details.ptkp_code : "";
    const taxMethod =
      typeof details.tax_method === "string" ? details.tax_method : "GROSS";
    const rateVal = details.tax_rate ?? row.rate;
    const ratePct = rateVal ? (Number(rateVal) * 100).toFixed(2) + "%" : "";
    const taxableGross = details.taxable_gross_income
      ? formatCurrency(String(details.taxable_gross_income))
      : "";

    return (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          TER {terCat} {ratePct ? `(${ratePct})` : ""}{" "}
          {taxableGross ? `× ${taxableGross}` : ""}
        </span>
        <span className="text-[11px] text-slate-500">
          PTKP: {ptkp} •{" "}
          {taxMethod === "NET"
            ? isId
              ? "NET (Ditanggung Perusahaan)"
              : "NET (Company Borne)"
            : taxMethod === "GROSS_UP"
              ? "GROSS UP"
              : "GROSS"}
        </span>
      </div>
    );
  }

  // 5b. TUNJANGAN_PPH21 (Gross Up Allowance)
  if (code === "TUNJANGAN_PPH21" || details.source === "TAX_GROSS_UP") {
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          {formatCurrency(row.amount)}
        </span>
        <span className="text-[11px] text-slate-500">
          {isId ? "Tunjangan PPh 21 (Gross Up)" : "Gross Up Tax Allowance"}
        </span>
      </div>
    );
  }

  // 5c. OTHER REGULATORY (BPJS / Tax)
  if (typeof details.calculator === "string") {
    return (
      <span className="text-slate-700 capitalize">
        {details.calculator.replaceAll("_", " ")}
      </span>
    );
  }

  // 6. FIXED
  if (source === "FIXED") {
    return (
      <span className="text-slate-600">
        {isId ? "Nominal Tetap (Flat)" : "Fixed Amount (Flat)"}
      </span>
    );
  }

  return <span className="text-slate-400">-</span>;
};

const renderBase = (
  row: PayrollComponentResult,
  result: PayrollEmployeeResultDetail,
  isId: boolean,
) => {
  const details = (row.calculation_details_json ?? {}) as Record<
    string,
    unknown
  >;
  const source = row.source?.toUpperCase();
  const code = row.component_code?.toUpperCase();

  // For TUNJANGAN_PPH21
  if (code === "TUNJANGAN_PPH21" || details.source === "TAX_GROSS_UP") {
    return (
      <span className="font-medium text-slate-800">
        {formatCurrency(result.taxable_income)}
      </span>
    );
  }

  // For POTONGAN_KETERLAMBATAN: show base salary with minute rate subtext
  if (code === "POTONGAN_KETERLAMBATAN" || details.source === "LATE_PENALTY") {
    const baseRaw =
      row.base_amount ??
      (typeof details.base_salary === "string" ||
      typeof details.base_salary === "number"
        ? String(details.base_salary)
        : null) ??
      result.base_salary;
    const minuteRateRaw =
      row.rate ??
      (typeof details.minute_rate === "string" ||
      typeof details.minute_rate === "number"
        ? String(details.minute_rate)
        : null);

    return (
      <div className="flex flex-col">
        <span className="font-medium text-slate-800">
          {formatCurrency(baseRaw)}
        </span>
        {minuteRateRaw && (
          <span className="text-[11px] text-slate-500">
            {formatCurrency(minuteRateRaw)}/{isId ? "mnt (1/173/60)" : "min"}
          </span>
        )}
      </div>
    );
  }

  // If explicit base_amount is set
  if (row.base_amount && Number(row.base_amount) > 0) {
    return (
      <span className="font-medium text-slate-800">
        {formatCurrency(row.base_amount)}
      </span>
    );
  }

  // For ATTENDANCE: show the daily rate as the base
  if (source === "ATTENDANCE" || details.source === "ATTENDANCE") {
    const rateRaw =
      row.rate ??
      (typeof details.configured_daily_amount === "string" ||
      typeof details.configured_daily_amount === "number"
        ? String(details.configured_daily_amount)
        : null);
    if (rateRaw) {
      return (
        <span className="font-medium text-slate-800">
          {formatCurrency(rateRaw)}{" "}
          <span className="text-xs font-normal text-slate-500">
            /{isId ? "hari" : "day"}
          </span>
        </span>
      );
    }
  }

  // For OVERTIME: show base salary with hourly rate subtext
  if (
    source === "OVERTIME" ||
    details.source === "OVERTIME" ||
    code === "LEMBUR"
  ) {
    const baseRaw =
      row.base_amount ??
      (typeof details.base_salary === "string" ||
      typeof details.base_salary === "number"
        ? String(details.base_salary)
        : null) ??
      result.base_salary;
    const rateRaw =
      row.rate ??
      (typeof details.hourly_rate === "string" ||
      typeof details.hourly_rate === "number"
        ? String(details.hourly_rate)
        : null);

    return (
      <div className="flex flex-col">
        <span className="font-medium text-slate-800">
          {formatCurrency(baseRaw)}
        </span>
        {rateRaw && (
          <span className="text-[11px] text-slate-500">
            {formatCurrency(rateRaw)}/{isId ? "jam (1/173)" : "hr (1/173)"}
          </span>
        )}
      </div>
    );
  }

  // For BASIC_SALARY: show full contract / unprorated base salary
  if (code === "BASIC_SALARY") {
    const factorNum = Number(result.proration_factor ?? 1);
    if (factorNum > 0 && factorNum < 1) {
      const fullBase = Math.round(Number(result.base_salary) / factorNum);
      return (
        <div className="flex flex-col">
          <span className="font-medium text-slate-800">
            {formatCurrency(fullBase)}
          </span>
          <span className="text-[11px] text-slate-500">
            {isId ? "(Gaji Penuh)" : "(Full Salary)"}
          </span>
        </div>
      );
    }
    return (
      <span className="font-medium text-slate-800">
        {formatCurrency(result.base_salary)}
      </span>
    );
  }

  return <span className="text-slate-400">-</span>;
};

function EmployeeResultPanel({
  result,
}: {
  result: PayrollEmployeeResultDetail;
}) {
  const { t: i18nT, locale } = useI18n();
  const isId = locale === "id";
  const attendance = result.attendance;
  const proration = result.proration_details_json ?? {};
  const prorationValue = (key: string) => {
    const value = proration[key];
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : "-";
  };
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-800">
              {result.employee_name}{" "}
              <span className="font-normal text-slate-500">
                ({result.employee_code})
              </span>
            </h2>
            {result.error_message && (
              <div
                className={`mt-2 flex flex-col gap-1.5 rounded-lg border p-3 ${
                  result.status === "WARNING"
                    ? "border-amber-200 bg-amber-50/70 text-amber-900"
                    : "border-red-200 bg-red-50/70 text-red-900"
                }`}
              >
                <div className="flex items-start gap-2">
                  <i
                    className={`mt-0.5 shrink-0 pi ${
                      result.status === "WARNING"
                        ? "pi-exclamation-triangle text-amber-600"
                        : "pi-times-circle text-red-600"
                    }`}
                  />
                  <div className="flex flex-col gap-0.5">
                    <p className="m-0 text-sm font-medium leading-5">
                      {result.error_message}
                    </p>
                    {result.error_code && (
                      <small
                        className={`text-xs font-mono ${
                          result.status === "WARNING"
                            ? "text-amber-700"
                            : "text-red-700"
                        }`}
                      >
                        {i18nT("static.gsq7ai")} {result.error_code}
                      </small>
                    )}
                  </div>
                </div>
                {result.error_code === "ATTENDANCE_NOT_FINAL" && (
                  <div className="mt-0.5 flex justify-end">
                    <Link
                      href="/attendance-summary"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <span>{i18nT("nav.attendanceSummary")}</span>
                      <i className="pi pi-arrow-right text-[10px]" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
          <Tag
            value={i18nT(formatStatusLabel(result.status))}
            severity={statusSeverity(result.status)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Amount label={i18nT("static.38iui2")} value={result.base_salary} />
          <Amount label={i18nT("static.awjta6")} value={result.gross_income} />
          <Amount
            label={i18nT("static.1yemymq")}
            value={result.employee_deduction}
          />
          <Amount label={i18nT("static.mlv85w")} value={result.pph21_amount} />
          <Amount
            label={i18nT("static.cgfoly")}
            value={result.employer_contribution}
          />
          <Amount
            label={i18nT("static.1mhojd5")}
            value={result.company_payroll_cost}
          />
          <Amount
            label={i18nT("static.1brz9dr")}
            value={result.take_home_pay}
            emphasized
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-xs font-medium text-slate-500">
              {i18nT("static.1kc2dwu")}{" "}
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
              {result.proration_factor}
            </p>
          </div>
        </div>

        {Object.keys(proration).length > 0 && (
          <section>
            <h3 className="m-0 mb-3 text-sm font-semibold text-slate-800">
              {i18nT("static.1cigod8")}{" "}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric
                label={i18nT("static.16cmxjk")}
                value={formatProrationMethod(
                  prorationValue("method_code"),
                  isId,
                )}
                hint={
                  prorationValue("method_code") === "SCHEDULED_DAYS"
                    ? isId
                      ? "Prorata jadwal shift kerja"
                      : "Work schedule proration"
                    : undefined
                }
              />
              <Metric
                label={i18nT("static.18cbssj")}
                value={prorationValue("denominator_days")}
                suffix={i18nT("static.1wewy2y")}
                hint={
                  isId
                    ? "Total hari kerja terjadwal periode ini"
                    : "Total scheduled work days in period"
                }
              />
              <Metric
                label={i18nT("static.1eqehn7")}
                value={prorationValue("employment_days")}
                suffix={i18nT("static.1wewy2y")}
                hint={
                  isId ? "Hari kalender aktif kerja" : "Calendar active days"
                }
              />
              <Metric
                label={i18nT("static.yfvb1r")}
                value={prorationValue("non_payable_days")}
                suffix={i18nT("static.1wewy2y")}
                hint={
                  isId
                    ? "Hari mangkir / unpaid leave"
                    : "Absence or unpaid leave"
                }
              />
              <Metric
                label={i18nT("static.15ju7o9")}
                value={prorationValue("payable_days")}
                suffix={i18nT("static.1wewy2y")}
                hint={
                  prorationValue("denominator_days") !== "-" &&
                  prorationValue("non_payable_days") !== "-"
                    ? isId
                      ? `Hari dibayar (${prorationValue("denominator_days")} - ${prorationValue("non_payable_days")})`
                      : `Paid days (${prorationValue("denominator_days")} - ${prorationValue("non_payable_days")})`
                    : undefined
                }
              />
              <Metric
                label={i18nT("static.rpvfkb")}
                value={formatProrationScope(
                  prorationValue("salary_scope"),
                  isId,
                )}
                hint={
                  isId
                    ? "Hanya memotong gaji pokok"
                    : "Applies to basic salary only"
                }
              />
            </div>
            <p className="m-0 mt-2 text-xs leading-5 text-slate-500">
              {i18nT("static.mzc62v")}{" "}
            </p>
          </section>
        )}

        {attendance && (
          <section>
            <h3 className="m-0 mb-3 text-sm font-semibold text-slate-800">
              {i18nT("static.g3hd72")}{" "}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric
                label={i18nT("static.1b7ctnc")}
                value={attendance.scheduled_days}
                suffix={i18nT("static.1wewy2y")}
              />
              <Metric
                label={i18nT("static.1m3e00c")}
                value={attendance.present_days}
                suffix={i18nT("static.1wewy2y")}
              />
              <Metric
                label={isId ? "Cuti Berbayar" : "Paid Leave"}
                value={attendance.paid_leave_days}
                suffix={i18nT("static.1wewy2y")}
              />
              <Metric
                label={i18nT("static.1xgh3nr")}
                value={attendance.unpaid_leave_days}
                suffix={i18nT("static.1wewy2y")}
              />
              <Metric
                label={i18nT("static.c4jx3y")}
                value={formatDuration(attendance.approved_overtime_seconds)}
              />
              <Metric
                label={i18nT("static.hc7xkj")}
                value={i18nT("static.hvhngx", {
                  p0: formatDuration(attendance.late_seconds),
                  p1: formatDuration(attendance.early_out_seconds),
                })}
              />
            </div>
          </section>
        )}

        <section>
          <h3 className="m-0 mb-3 text-sm font-semibold text-slate-800">
            {i18nT("static.168fn3r")}{" "}
          </h3>
          <DataTable
            value={result.components}
            dataKey="id"
            size="small"
            stripedRows
            scrollable
            responsiveLayout="scroll"
            tableStyle={{ minWidth: "46rem" }}
            emptyMessage={i18nT("static.bqd1tu")}
          >
            <Column
              field="component_name"
              header={i18nT("static.bvqo3k")}
              body={(row: PayrollComponentResult) => (
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-slate-800">
                      {row.component_name}
                    </span>
                    {row.component_type === "TAX" &&
                      !row.affects_take_home_pay && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                          {isId ? "Ditanggung Perusahaan" : "Company Borne"}
                        </span>
                      )}
                  </div>
                  <span className="font-mono text-xs text-slate-400">
                    {row.component_code}
                  </span>
                </div>
              )}
            />
            <Column
              field="component_type"
              header={i18nT("static.1m2zofh")}
              body={(row: PayrollComponentResult) =>
                formatComponentType(row.component_type, isId)
              }
            />
            <Column
              field="source"
              header={i18nT("static.r5qyuw")}
              body={(row: PayrollComponentResult) => (
                <span className="text-sm text-slate-700">
                  {formatComponentSource(row.source, isId)}
                </span>
              )}
            />
            <Column
              header={i18nT("static.1gig16e")}
              body={(row: PayrollComponentResult) =>
                renderCalculation(row, result, isId)
              }
            />
            <Column
              header={i18nT("static.19phq7s")}
              body={(row: PayrollComponentResult) =>
                renderBase(row, result, isId)
              }
            />
            <Column
              header={i18nT("static.a2ky21")}
              body={(row: PayrollComponentResult) => (
                <span className="font-semibold text-slate-900">
                  {formatCurrency(row.amount)}
                </span>
              )}
            />
          </DataTable>
        </section>
      </div>
    </Card>
  );
}

function Amount({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? "rounded-lg border border-blue-200 bg-blue-50 p-3"
          : "rounded-lg border border-slate-200 bg-slate-50 p-3"
      }
    >
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p
        className={
          emphasized
            ? "m-0 mt-1 text-sm font-semibold text-blue-700"
            : "m-0 mt-1 text-sm font-semibold text-slate-800"
        }
      >
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  hint,
}: {
  label: string;
  value: string;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div>
        <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
        <p className="m-0 mt-1 text-sm font-semibold leading-snug text-slate-800">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </p>
      </div>
      {hint && (
        <p className="m-0 mt-1.5 text-[11px] leading-4 text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
