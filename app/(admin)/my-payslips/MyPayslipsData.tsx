"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { getMyPayrollPayslips } from "@/app/services/payroll-batch-service";
import type { PayrollPayslip } from "@/app/types/payroll-batch";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

const payslipUrl = "/api/payroll-payslips/me";

const formatCurrency = (value: string | number) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function MyPayslipsData() {
  const { data, error, isLoading } = useSWR<PayrollPayslip[]>(
    payslipUrl,
    getMyPayrollPayslips,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(
    () =>
      data?.find((payslip) => payslip.id === selectedId) ?? data?.[0] ?? null,
    [data, selectedId],
  );

  if (isLoading) return <LoadingDataTable />;
  if (error || !data) return <ErrorNotConnectedToApi mutateKey={payslipUrl} />;

  return (
    <div className="flex flex-col gap-5">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex items-start gap-3 p-3 sm:p-4 md:p-5">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
            <i className="pi pi-wallet text-xl" />
          </div>
          <div>
            <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
              My Payslips
            </h1>
            <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
              View payroll slips after your payroll payment has been finalized.
            </p>
          </div>
        </div>
      </Card>

      <Card className="border border-slate-200 shadow-sm">
        <div className="p-3 sm:p-4 md:p-5">
          <DataTable
            value={data}
            dataKey="id"
            selectionMode="single"
            selection={selected}
            onSelectionChange={(event) =>
              setSelectedId((event.value as PayrollPayslip).id)
            }
            paginator
            rows={10}
            stripedRows
            rowHover
            scrollable
            responsiveLayout="scroll"
            size="small"
            tableStyle={{ minWidth: "48rem" }}
            emptyMessage="No published payslip is available yet."
          >
            <Column field="payslip_no" header="Payslip No." sortable />
            <Column
              header="Period"
              body={(row: PayrollPayslip) =>
                `${formatDisplayDate(row.snapshot_json.batch.period_start)} – ${formatDisplayDate(row.snapshot_json.batch.period_end)}`
              }
            />
            <Column
              field="snapshot_json.batch.payroll_date"
              header="Payment Date"
              body={(row: PayrollPayslip) =>
                formatDisplayDate(row.snapshot_json.batch.payroll_date)
              }
            />
            <Column
              header="Take Home Pay"
              body={(row: PayrollPayslip) => (
                <span className="font-semibold text-slate-800">
                  {formatCurrency(row.snapshot_json.amounts.take_home_pay)}
                </span>
              )}
            />
            <Column
              header="Status"
              body={(row: PayrollPayslip) => (
                <Tag value={row.status} severity="success" />
              )}
            />
          </DataTable>
        </div>
      </Card>

      {selected && <PayslipSummary payslip={selected} />}
    </div>
  );
}

function PayslipSummary({ payslip }: { payslip: PayrollPayslip }) {
  const { amounts, batch, components } = payslip.snapshot_json;
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-800">
              {payslip.payslip_no}
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {formatDisplayDate(batch.period_start)} to{" "}
              {formatDisplayDate(batch.period_end)}
            </p>
          </div>
          <Tag value="PUBLISHED" severity="success" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Amount label="Gross Income" value={amounts.gross_income} />
          <Amount
            label="Employee Deduction"
            value={amounts.employee_deduction}
          />
          <Amount label="PPh 21" value={amounts.pph21_amount} />
          <Amount
            label="Take Home Pay"
            value={amounts.take_home_pay}
            emphasized
          />
        </div>
        <section>
          <h3 className="m-0 mb-3 text-sm font-semibold text-slate-800">
            Payroll Components
          </h3>
          <DataTable
            value={components}
            size="small"
            stripedRows
            responsiveLayout="scroll"
            tableStyle={{ minWidth: "42rem" }}
          >
            <Column field="component_name" header="Component" />
            <Column field="component_type" header="Type" />
            <Column field="source" header="Source" />
            <Column
              header="Amount"
              body={(
                row: PayrollPayslip["snapshot_json"]["components"][number],
              ) => formatCurrency(row.amount)}
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
  value: string | number;
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
