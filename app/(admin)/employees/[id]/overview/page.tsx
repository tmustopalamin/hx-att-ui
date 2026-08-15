"use client";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import type { EmployeeOverview } from "@/app/types/employee-overview";
import { fetcher } from "@/app/utils/fetcher";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";

export default function EmployeeOverviewPage() {
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const { data, isLoading } = useSWR<EmployeeOverview>(
    Number.isSafeInteger(employeeId) && employeeId > 0
      ? `/api/employees/${employeeId}/overview`
      : null,
    fetcher,
  );
  const readiness = data?.payroll_readiness;
  return (
    <div className="flex flex-col gap-5">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <EmployeeDetailTableHeader
            title="Employee Overview"
            description="Current employee readiness, entitlement, and payroll record at a glance."
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Summary
              label="Payroll Ready"
              value={
                readiness
                  ? readiness.ready
                    ? "Ready"
                    : "Incomplete"
                  : "Restricted"
              }
              severity={readiness?.ready ? "success" : "warning"}
            />
            <Summary
              label="Leave Balances"
              value={
                data?.leave_balances
                  ? String(data.leave_balances.length)
                  : "Restricted"
              }
              severity="info"
            />
            <Summary
              label="Published Payslips"
              value={
                data?.payslips ? String(data.payslips.length) : "Restricted"
              }
              severity="info"
            />
          </div>
          {readiness && !readiness.ready && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Missing payroll data: {readiness.missing.join(", ")}.
            </div>
          )}
        </div>
      </Card>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <h2 className="m-0 text-base font-semibold text-slate-800">
            Leave Balance
          </h2>
          {data?.leave_balances === null ? (
            <Restricted />
          ) : (
            <DataTable
              value={data?.leave_balances ?? []}
              loading={isLoading}
              stripedRows
              rowHover
              removableSort
              responsiveLayout="scroll"
              size="small"
              tableStyle={{ minWidth: "34rem" }}
              emptyMessage="No leave balance is available."
            >
              <Column field="leave_type_name" header="Leave Type" />
              <Column field="period_start" header="Period Start" />
              <Column field="period_end" header="Period End" />
              <Column field="closing_balance" header="Available" />
            </DataTable>
          )}
        </div>
      </Card>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <h2 className="m-0 text-base font-semibold text-slate-800">
            Payslip History
          </h2>
          {data?.payslips === null ? (
            <Restricted />
          ) : (
            <DataTable
              value={data?.payslips ?? []}
              loading={isLoading}
              stripedRows
              rowHover
              removableSort
              responsiveLayout="scroll"
              size="small"
              tableStyle={{ minWidth: "30rem" }}
              emptyMessage="No published payslip is available."
            >
              <Column field="payslip_no" header="Payslip No." />
              <Column field="published_at" header="Published" />
              <Column
                header="Status"
                body={(row: { status: string }) => (
                  <Tag value={row.status} severity="success" />
                )}
              />
            </DataTable>
          )}
        </div>
      </Card>
    </div>
  );
}
function Summary({
  label,
  value,
  severity,
}: {
  label: string;
  value: string;
  severity: "success" | "warning" | "info";
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="m-0 text-sm text-slate-500">{label}</p>
      <div className="mt-2">
        <Tag value={value} severity={severity} />
      </div>
    </div>
  );
}
function Restricted() {
  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      You do not have permission to view this data.
    </p>
  );
}
