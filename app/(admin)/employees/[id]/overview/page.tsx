"use client";
import { useI18n } from "@/app/i18n";

import { useParams } from "next/navigation";
import useSWR from "swr";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import type { EmployeeOverview } from "@/app/types/employee-overview";
import { fetcher } from "@/app/utils/fetcher";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";

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

export default function EmployeeOverviewPage() {
  const { t: i18nT } = useI18n();
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
            title={i18nT("static.18xkp0s")}
            description={i18nT("static.1piozt8")}
          />
          <div className="grid gap-4 md:grid-cols-3">
            <Summary
              label={i18nT("static.n4ge5p")}
              value={
                readiness
                  ? readiness.ready
                    ? i18nT("static.39rjx0")
                    : i18nT("static.t03g3p")
                  : i18nT("static.1iznmrw")
              }
              severity={readiness?.ready ? "success" : "warning"}
            />
            <Summary
              label={i18nT("static.5hvc2d")}
              value={
                data?.leave_balances
                  ? String(data.leave_balances.length)
                  : i18nT("static.1iznmrw")
              }
              severity="info"
            />
            <Summary
              label={i18nT("static.1azvkey")}
              value={
                data?.payslips
                  ? String(data.payslips.length)
                  : i18nT("static.1iznmrw")
              }
              severity="info"
            />
          </div>
          {readiness && !readiness.ready && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {i18nT("static.fuuijg")}{" "}
              {readiness.missing.map((item) => i18nT(item)).join(", ")}.
            </div>
          )}
        </div>
      </Card>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <h2 className="m-0 text-base font-semibold text-slate-800">
            {i18nT("static.1es4nt0")}{" "}
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
              emptyMessage={i18nT("static.1iagzy")}
            >
              <Column field="leave_type_name" header={i18nT("static.se3juw")} />
              <Column
                field="period_start"
                header={i18nT("static.rctpc")}
                body={(row: { period_start: string }) =>
                  formatDisplayDate(row.period_start)
                }
              />
              <Column
                field="period_end"
                header={i18nT("static.1aquwpt")}
                body={(row: { period_end: string }) =>
                  formatDisplayDate(row.period_end)
                }
              />
              <Column field="closing_balance" header={i18nT("static.vp7tiw")} />
            </DataTable>
          )}
        </div>
      </Card>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <h2 className="m-0 text-base font-semibold text-slate-800">
            {i18nT("static.773khb")}{" "}
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
  const { t: i18nT } = useI18n();
  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      {i18nT("static.9m3tzz")}{" "}
    </p>
  );
}
