"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  getPayrollBatchDetail,
  getPayrollBatchSourceReadiness,
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
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import { formatStatusLabel } from "@/app/i18n/statusLabel";

interface PayrollBatchDetailDataProps {
  batchId: number;
}

const formatCurrency = (amount: string) => {
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
  const detailUrl = `/api/payroll-batches/${batchId}/detail`;
  const { data, error, isLoading } = useSWR<PayrollBatchDetail>(detailUrl, () =>
    getPayrollBatchDetail(batchId),
  );
  const readinessUrl = `/api/payroll-batches/${batchId}/source-readiness`;
  const { data: readiness, error: readinessError } =
    useSWR<PayrollBatchSourceReadiness>(readinessUrl, () =>
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
          <Link
            href="/run-payroll"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <i className="pi pi-arrow-left text-sm" />
            {i18nT("static.rnmopi")}{" "}
          </Link>
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

function EmployeeResultPanel({
  result,
}: {
  result: PayrollEmployeeResultDetail;
}) {
  const { t: i18nT } = useI18n();
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
                value={prorationValue("method_code")}
              />
              <Metric
                label={i18nT("static.18cbssj")}
                value={prorationValue("denominator_days")}
                suffix={i18nT("static.1wewy2y")}
              />
              <Metric
                label={i18nT("static.1eqehn7")}
                value={prorationValue("employment_days")}
                suffix={i18nT("static.1wewy2y")}
              />
              <Metric
                label={i18nT("static.yfvb1r")}
                value={prorationValue("non_payable_days")}
                suffix={i18nT("static.1wewy2y")}
              />
              <Metric
                label={i18nT("static.15ju7o9")}
                value={prorationValue("payable_days")}
                suffix={i18nT("static.1wewy2y")}
              />
              <Metric
                label={i18nT("static.rpvfkb")}
                value={prorationValue("salary_scope")}
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
            <Column field="component_name" header={i18nT("static.bvqo3k")} />
            <Column field="component_type" header={i18nT("static.1m2zofh")} />
            <Column field="source" header={i18nT("static.r5qyuw")} />
            <Column
              header={i18nT("static.1gig16e")}
              body={(row: PayrollComponentResult) => {
                const calculator = row.calculation_details_json?.calculator;
                return typeof calculator === "string"
                  ? calculator.replaceAll("_", " ")
                  : "-";
              }}
            />
            <Column
              header={i18nT("static.19phq7s")}
              body={(row: PayrollComponentResult) =>
                row.base_amount ? formatCurrency(row.base_amount) : "-"
              }
            />
            <Column
              header={i18nT("static.a2ky21")}
              body={(row: PayrollComponentResult) => formatCurrency(row.amount)}
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
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  const { t: i18nT } = useI18n();
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
        {value}
        {suffix ? i18nT("static.m3cxo5", { p0: suffix }) : ""}
      </p>
    </div>
  );
}
