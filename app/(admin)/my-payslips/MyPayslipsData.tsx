"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
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

const formatStatusLabel = (status?: string | null) => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (!normalized) return "Unknown";
  return normalized
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

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
  const { t: i18nT } = useI18n();
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
              {i18nT("static.18hf8vs")}{" "}
            </h1>
            <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
              {i18nT("static.k2uw42")}{" "}
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
            emptyMessage={i18nT("static.c7p42h")}
          >
            <Column
              field="payslip_no"
              header={i18nT("static.7ovzpo")}
              sortable
            />
            <Column
              header={i18nT("static.11hwh7o")}
              body={(row: PayrollPayslip) =>
                `${formatDisplayDate(row.snapshot_json.batch.period_start)} – ${formatDisplayDate(row.snapshot_json.batch.period_end)}`
              }
            />
            <Column
              field="snapshot_json.batch.payroll_date"
              header={i18nT("static.1tkvpiv")}
              body={(row: PayrollPayslip) =>
                formatDisplayDate(row.snapshot_json.batch.payroll_date)
              }
            />
            <Column
              header={i18nT("static.1brz9dr")}
              body={(row: PayrollPayslip) => (
                <span className="font-semibold text-slate-800">
                  {formatCurrency(row.snapshot_json.amounts.take_home_pay)}
                </span>
              )}
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: PayrollPayslip) => (
                <Tag
                  value={i18nT(formatStatusLabel(row.status))}
                  severity="success"
                />
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
  const { t: i18nT } = useI18n();
  const { amounts, batch, components, employee } = payslip.snapshot_json;
  return (
    <Card className="payslip-print-root border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-800">
              {payslip.payslip_no}
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {formatDisplayDate(batch.period_start)} {i18nT("static.idyip0")}{" "}
              {formatDisplayDate(batch.period_end)}
            </p>
          </div>
          <div className="payslip-print-actions flex items-center gap-2">
            <Tag value={i18nT("static.1drx2ll")} severity="success" />
            <Button
              label={i18nT("static.5db01g")}
              icon="pi pi-print"
              severity="secondary"
              outlined
              size="small"
              onClick={() => window.print()}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-200 pb-4 sm:grid-cols-3">
          <PayslipDetail
            label={i18nT("static.1fak8xt")}
            value={employee.employee_name}
          />
          <PayslipDetail
            label={i18nT("static.1lghzb2")}
            value={employee.employee_code}
          />
          <PayslipDetail
            label={i18nT("static.1430r53")}
            value={employee.department_name ?? "-"}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Amount label={i18nT("static.awjta6")} value={amounts.gross_income} />
          <Amount
            label={i18nT("static.1yemymq")}
            value={amounts.employee_deduction}
          />
          <Amount label={i18nT("static.mlv85w")} value={amounts.pph21_amount} />
          <Amount
            label={i18nT("static.1brz9dr")}
            value={amounts.take_home_pay}
            emphasized
          />
        </div>
        <section>
          <h3 className="m-0 mb-3 text-sm font-semibold text-slate-800">
            {i18nT("static.11zzcwa")}{" "}
          </h3>
          <DataTable
            value={components}
            size="small"
            stripedRows
            responsiveLayout="scroll"
            tableStyle={{ minWidth: "42rem" }}
          >
            <Column field="component_name" header={i18nT("static.bvqo3k")} />
            <Column field="component_type" header={i18nT("static.1m2zofh")} />
            <Column field="source" header={i18nT("static.r5qyuw")} />
            <Column
              header={i18nT("static.a2ky21")}
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

function PayslipDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
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
