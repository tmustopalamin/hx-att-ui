"use client";
import { useI18n } from "@/app/i18n";

import Link from "next/link";
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

type MinimumSetupItem = {
  text: string;
  href?: string;
};

export default function EmployeeOverviewPage() {
  const { t: i18nT, tText } = useI18n();
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const { data, isLoading } = useSWR<EmployeeOverview>(
    Number.isSafeInteger(employeeId) && employeeId > 0
      ? `/api/employees/${employeeId}/overview`
      : null,
    fetcher,
  );
  const readiness = data?.payroll_readiness;
  const payrollSetupPaths: Record<string, string> = {
    "Active salary": `/employees/${employeeId}/payroll/salary-bank`,
    "Primary bank account": `/employees/${employeeId}/payroll/bank`,
    "Active tax profile": `/employees/${employeeId}/payroll/tax`,
    "Active statutory enrollment": `/employees/${employeeId}/payroll/bpjs`,
  };
  const minimumSetupGroups: Array<{
    title: string;
    icon: string;
    items: MinimumSetupItem[];
  }> = [
    {
      title: tText("Attendance"),
      icon: "pi pi-calendar-clock",
      items: [
        {
          text: tText(
            "Employment assignment: join date, employment status, department, position, and supervisor.",
          ),
          href: `/employees/${employeeId}/general/employment`,
        },
        {
          text: tText(
            "Assign a Shift Rule and generate the Daily Schedule for the employee's working period.",
          ),
          href: "/setting/employee-schedule",
        },
        {
          text: tText(
            "Make sure the attendance source is ready: fingerprint mapping for machine logs, or an active account for mobile/web attendance.",
          ),
          href: `/employees/${employeeId}/time/attendance`,
        },
      ],
    },
    {
      title: tText("Overtime & Leave"),
      icon: "pi pi-clock",
      items: [
        {
          text: tText(
            "Configure the approval chain for overtime and leave. A supervisor or approver must be available when approval is required.",
          ),
          href: "/setting/approval-settings",
        },
        {
          text: tText(
            "For deductible leave, create an active leave balance for the relevant leave type and period.",
          ),
          href: `/employees/${employeeId}/time/leave`,
        },
        {
          text: tText(
            "Process attendance summaries before relying on actual overtime in payroll.",
          ),
          href: `/employees/${employeeId}/time/overtime`,
        },
      ],
    },
    {
      title: tText("Payroll payslip"),
      icon: "pi pi-money-bill",
      items: [
        {
          text: tText(
            "Payroll needs an active salary, primary bank account, active tax profile, and active statutory enrollment.",
          ),
        },
        {
          text: tText(
            "After setup, attendance, approved leave/overtime, and a ready payroll batch still need to be processed before a payslip is published.",
          ),
        },
      ],
    },
  ];
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-3">
                <i className="pi pi-exclamation-triangle mt-0.5 text-amber-700" />
                <div className="min-w-0">
                  <p className="m-0 font-semibold">
                    {tText("Payroll setup is incomplete.")}
                  </p>
                  <p className="m-0 mt-1">
                    {i18nT("static.fuuijg")}{" "}
                    {readiness.missing.map((item) => i18nT(item)).join(", ")}.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {readiness.missing.map((item) => {
                  const href = payrollSetupPaths[item];
                  const label = i18nT(item);

                  return href ? (
                    <Link
                      key={item}
                      href={href}
                      className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100"
                    >
                      {label}
                      <i className="pi pi-arrow-up-right text-[0.65rem]" />
                    </Link>
                  ) : (
                    <span
                      key={item}
                      className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900"
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="flex items-start gap-3">
              <i className="pi pi-info-circle mt-0.5 text-blue-700" />
              <div className="min-w-0">
                <h2 className="m-0 text-sm font-semibold text-blue-950">
                  {tText(
                    "Minimum setup for attendance, overtime, leave, and payslip",
                  )}
                </h2>
                <p className="m-0 mt-1 text-sm leading-6 text-blue-900/80">
                  {tText(
                    "Complete these employee and system records before expecting the full HRIS flow. Some items depend on the attendance source, leave type, and approval settings.",
                  )}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {minimumSetupGroups.map((group) => (
                <section
                  key={group.title}
                  className="rounded-lg border border-blue-100 bg-white p-4"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <i className={`${group.icon} text-blue-600`} />
                    <h3 className="m-0">{group.title}</h3>
                  </div>

                  <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
                    {group.items.map((item) => (
                      <li key={item.text} className="flex items-start gap-2">
                        <i className="pi pi-circle-fill mt-1 shrink-0 text-[0.4rem] text-blue-600" />
                        <div className="min-w-0">
                          <p className="m-0 text-xs leading-5 text-slate-600">
                            {item.text}
                          </p>
                          {item.href && (
                            <Link
                              href={item.href}
                              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                            >
                              {i18nT("static.n6hn1l")}
                              <i className="pi pi-arrow-right text-[0.65rem]" />
                            </Link>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
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
