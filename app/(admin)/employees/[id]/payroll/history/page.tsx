"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import type {
  EmployeePayrollHistory,
  EmployeePayrollResultHistory,
} from "@/app/types/employee-payroll-history";
import { fetcher } from "@/app/utils/fetcher";

const currency = (value: string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));
export default function EmployeePayrollHistoryPage() {
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const { data, isLoading } = useSWR<EmployeePayrollHistory>(
    Number.isSafeInteger(employeeId) && employeeId > 0
      ? `/api/employees/${employeeId}/payroll-history`
      : null,
    fetcher,
  );
  return (
    <div className="flex flex-col gap-5">
      <Panel
        title="Payroll Result History"
        description="Historical payroll results are snapshots and do not change when master data changes."
      >
        <DataTable
          value={data?.results ?? []}
          loading={isLoading}
          stripedRows
          paginator
          rows={10}
          emptyMessage="No payroll result is available."
        >
          <Column field="batch_no" header="Payroll Batch" />
          <Column
            header="Period"
            body={(row: EmployeePayrollResultHistory) =>
              `${row.period_start} – ${row.period_end}`
            }
          />
          <Column
            header="Gross Income"
            body={(row: EmployeePayrollResultHistory) =>
              currency(row.gross_income)
            }
          />
          <Column
            header="Deduction"
            body={(row: EmployeePayrollResultHistory) =>
              currency(row.employee_deduction)
            }
          />
          <Column
            header="PPh 21"
            body={(row: EmployeePayrollResultHistory) =>
              currency(row.pph21_amount)
            }
          />
          <Column
            header="Take Home Pay"
            body={(row: EmployeePayrollResultHistory) =>
              currency(row.take_home_pay)
            }
          />
          <Column
            header="Status"
            body={(row: EmployeePayrollResultHistory) => (
              <Tag
                value={row.status}
                severity={row.status === "CALCULATED" ? "success" : "warning"}
              />
            )}
          />
        </DataTable>
      </Panel>
      <Panel
        title="Payslip History"
        description="Only published payslips are available to employees."
      >
        <DataTable
          value={data?.payslips ?? []}
          loading={isLoading}
          stripedRows
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
      </Panel>
      <Panel
        title="Payroll Adjustments"
        description="Adjustment workflow and approval status for this employee."
      >
        <DataTable
          value={data?.adjustments ?? []}
          loading={isLoading}
          stripedRows
          emptyMessage="No payroll adjustment is available."
        >
          <Column field="component_type" header="Type" />
          <Column
            field="amount"
            header="Amount"
            body={(row: { amount: string }) => currency(row.amount)}
          />
          <Column field="reason" header="Reason" />
          <Column
            header="Status"
            body={(row: { status: string }) => (
              <Tag
                value={row.status}
                severity={row.status === "APPLIED" ? "success" : "warning"}
              />
            )}
          />
        </DataTable>
      </Panel>
    </div>
  );
}
function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="border-b border-slate-200 pb-5">
          <h1 className="m-0 text-xl font-semibold text-slate-800">{title}</h1>
          <p className="m-0 mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {children}
      </div>
    </Card>
  );
}
