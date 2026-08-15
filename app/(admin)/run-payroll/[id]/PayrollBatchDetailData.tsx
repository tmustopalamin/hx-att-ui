"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { getPayrollBatchDetail } from "@/app/services/payroll-batch-service";
import type {
  PayrollBatchDetail,
  PayrollComponentResult,
  PayrollEmployeeResultDetail,
} from "@/app/types/payroll-batch";
import PayrollAdjustmentPanel from "./PayrollAdjustmentPanel";
import PerformanceEarningPanel from "./PerformanceEarningPanel";

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
  const detailUrl = `/api/payroll-batches/${batchId}/detail`;
  const { data, error, isLoading } = useSWR<PayrollBatchDetail>(detailUrl, () =>
    getPayrollBatchDetail(batchId),
  );
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const selectedResult = useMemo(
    () =>
      data?.employee_results.find((result) => result.id === selectedResultId) ??
      data?.employee_results[0] ??
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
                  value={data.batch.status}
                  severity={statusSeverity(data.batch.status)}
                />
              </div>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                Payroll period {data.batch.period_start} to{" "}
                {data.batch.period_end} · Payment date {data.batch.payroll_date}
              </p>
            </div>
          </div>
          <Link
            href="/run-payroll"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <i className="pi pi-arrow-left text-sm" />
            Back to Payroll
          </Link>
        </div>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <div className="p-3 sm:p-4 md:p-5">
          <div className="mb-4">
            <h2 className="m-0 text-base font-semibold text-slate-800">
              Employee Payroll Results
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Select an employee to inspect the frozen attendance and
              calculation results.
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
            emptyMessage="No employee result is available for this batch."
          >
            <Column field="employee_code" header="Employee ID" sortable />
            <Column field="employee_name" header="Employee" sortable />
            <Column
              header="Gross Income"
              body={(row: PayrollEmployeeResultDetail) =>
                formatCurrency(row.gross_income)
              }
            />
            <Column
              header="Deduction"
              body={(row: PayrollEmployeeResultDetail) =>
                formatCurrency(row.employee_deduction)
              }
            />
            <Column
              header="PPh 21"
              body={(row: PayrollEmployeeResultDetail) =>
                formatCurrency(row.pph21_amount)
              }
            />
            <Column
              header="Take Home Pay"
              body={(row: PayrollEmployeeResultDetail) => (
                <span className="font-semibold text-slate-800">
                  {formatCurrency(row.take_home_pay)}
                </span>
              )}
            />
            <Column
              header="Status"
              body={(row: PayrollEmployeeResultDetail) => (
                <Tag value={row.status} severity={statusSeverity(row.status)} />
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
      <PayrollAdjustmentPanel
        batchId={data.batch.id}
        batchStatus={data.batch.status}
      />
    </div>
  );
}

function EmployeeResultPanel({
  result,
}: {
  result: PayrollEmployeeResultDetail;
}) {
  const attendance = result.attendance;
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
              <div className="mt-1 flex flex-col gap-0.5 text-sm text-red-600">
                <p className="m-0">{result.error_message}</p>
                {result.error_code && (
                  <small className="text-xs text-red-500">
                    Code: {result.error_code}
                  </small>
                )}
              </div>
            )}
          </div>
          <Tag value={result.status} severity={statusSeverity(result.status)} />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Amount label="Base Salary" value={result.base_salary} />
          <Amount label="Gross Income" value={result.gross_income} />
          <Amount
            label="Employee Deduction"
            value={result.employee_deduction}
          />
          <Amount label="PPh 21" value={result.pph21_amount} />
          <Amount
            label="Employer Contribution"
            value={result.employer_contribution}
          />
          <Amount label="Company Cost" value={result.company_payroll_cost} />
          <Amount
            label="Take Home Pay"
            value={result.take_home_pay}
            emphasized
          />
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-xs font-medium text-slate-500">
              Proration Factor
            </p>
            <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
              {result.proration_factor}
            </p>
          </div>
        </div>

        {attendance && (
          <section>
            <h3 className="m-0 mb-3 text-sm font-semibold text-slate-800">
              Frozen Attendance
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <Metric
                label="Scheduled"
                value={attendance.scheduled_days}
                suffix="days"
              />
              <Metric
                label="Present"
                value={attendance.present_days}
                suffix="days"
              />
              <Metric
                label="Unpaid Leave"
                value={attendance.unpaid_leave_days}
                suffix="days"
              />
              <Metric
                label="Overtime"
                value={formatDuration(attendance.approved_overtime_seconds)}
              />
              <Metric
                label="Late / Early Out"
                value={`${formatDuration(attendance.late_seconds)} / ${formatDuration(attendance.early_out_seconds)}`}
              />
            </div>
          </section>
        )}

        <section>
          <h3 className="m-0 mb-3 text-sm font-semibold text-slate-800">
            Calculated Components
          </h3>
          <DataTable
            value={result.components}
            dataKey="id"
            size="small"
            stripedRows
            scrollable
            responsiveLayout="scroll"
            tableStyle={{ minWidth: "46rem" }}
            emptyMessage="No calculated component is available."
          >
            <Column field="component_name" header="Component" />
            <Column field="component_type" header="Type" />
            <Column field="source" header="Source" />
            <Column
              header="Calculation"
              body={(row: PayrollComponentResult) => {
                const calculator = row.calculation_details_json?.calculator;
                return typeof calculator === "string"
                  ? calculator.replaceAll("_", " ")
                  : "-";
              }}
            />
            <Column
              header="Base"
              body={(row: PayrollComponentResult) =>
                row.base_amount ? formatCurrency(row.base_amount) : "-"
              }
            />
            <Column
              header="Amount"
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
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </p>
    </div>
  );
}
