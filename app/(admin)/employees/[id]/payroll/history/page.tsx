"use client";
import { useI18n } from "@/app/i18n";

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
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";

const currency = (value: string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value));

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
export default function EmployeePayrollHistoryPage() {
  const { t: i18nT } = useI18n();
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
        title={i18nT("static.1t8hpz3")}
        description={i18nT("static.298bx7")}
      >
        <DataTable
          value={data?.results ?? []}
          loading={isLoading}
          stripedRows
          rowHover
          removableSort
          responsiveLayout="scroll"
          size="small"
          paginator
          rows={10}
          tableStyle={{ minWidth: "60rem" }}
          currentPageReportTemplate={i18nT("static.1kqh8lr")}
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          emptyMessage={i18nT("static.i44hrj")}
        >
          <Column field="batch_no" header={i18nT("static.1cwdnlm")} />
          <Column
            header={i18nT("static.11hwh7o")}
            body={(row: EmployeePayrollResultHistory) =>
              `${formatDisplayDate(row.period_start)} – ${formatDisplayDate(row.period_end)}`
            }
          />
          <Column
            header={i18nT("static.awjta6")}
            body={(row: EmployeePayrollResultHistory) =>
              currency(row.gross_income)
            }
          />
          <Column
            header={i18nT("static.1lt98r0")}
            body={(row: EmployeePayrollResultHistory) =>
              currency(row.employee_deduction)
            }
          />
          <Column
            header={i18nT("static.mlv85w")}
            body={(row: EmployeePayrollResultHistory) =>
              currency(row.pph21_amount)
            }
          />
          <Column
            header={i18nT("static.1brz9dr")}
            body={(row: EmployeePayrollResultHistory) =>
              currency(row.take_home_pay)
            }
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: EmployeePayrollResultHistory) => (
              <Tag
                value={i18nT(formatStatusLabel(row.status))}
                severity={row.status === "CALCULATED" ? "success" : "warning"}
              />
            )}
          />
        </DataTable>
      </Panel>
      <Panel
        title={i18nT("static.773khb")}
        description={i18nT("static.s10nzx")}
      >
        <DataTable
          value={data?.payslips ?? []}
          loading={isLoading}
          stripedRows
          rowHover
          removableSort
          responsiveLayout="scroll"
          size="small"
          tableStyle={{ minWidth: "32rem" }}
          emptyMessage={i18nT("static.185vufn")}
        >
          <Column field="payslip_no" header={i18nT("static.7ovzpo")} />
          <Column
            field="published_at"
            header={i18nT("static.75k7c9")}
            body={(row: { published_at: string | null }) =>
              formatDisplayDateTime(row.published_at)
            }
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: { status: string }) => (
              <Tag
                value={i18nT(formatStatusLabel(row.status))}
                severity="success"
              />
            )}
          />
        </DataTable>
      </Panel>
      <Panel
        title={i18nT("static.6lzle2")}
        description={i18nT("static.1455i0s")}
      >
        <DataTable
          value={data?.adjustments ?? []}
          loading={isLoading}
          stripedRows
          rowHover
          removableSort
          responsiveLayout="scroll"
          size="small"
          tableStyle={{ minWidth: "36rem" }}
          emptyMessage={i18nT("static.t3lwe1")}
        >
          <Column field="component_type" header={i18nT("static.1m2zofh")} />
          <Column
            field="amount"
            header={i18nT("static.a2ky21")}
            body={(row: { amount: string }) => currency(row.amount)}
          />
          <Column field="reason" header={i18nT("static.i36sl5")} />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: { status: string }) => (
              <Tag
                value={i18nT(formatStatusLabel(row.status))}
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
        <EmployeeDetailTableHeader title={title} description={description} />
        {children}
      </div>
    </Card>
  );
}
