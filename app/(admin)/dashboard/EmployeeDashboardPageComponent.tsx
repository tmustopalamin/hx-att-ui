"use client";
import { useI18n } from "@/app/i18n";

import { useMemo } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import {
  formatDate as formatDisplayDate,
  formatWeekdayDate,
} from "@/app/utils/date-format";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { getEmployeeDashboard } from "@/app/services/employee-dashboard-service";
import { EmployeeDashboardResponse } from "@/app/types/employee-dashboard";
import { RootState } from "@/store/store";

type QuickAccessItem = {
  label: string;
  icon: string;
  href: string;
  permission?: string;
};

const formatTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return dayjs(value).format("HH:mm");
};

const formatDate = (value?: string | null) => {
  return formatDisplayDate(value);
};

const formatDuration = (seconds?: number | null) => {
  const totalSeconds = Number(seconds ?? 0);

  if (totalSeconds <= 0) {
    return "-";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const getGreeting = (
  name: string,
  translate: (
    source: string,
    params?: Record<string, string | number | null | undefined>,
  ) => string,
) => {
  const hour = new Date().getHours();

  if (hour < 12) return translate("Good morning, {name}", { name });
  if (hour < 18) return translate("Good afternoon, {name}", { name });
  if (hour < 21) return translate("Good evening, {name}", { name });
  return translate("Good night, {name}", { name });
};

const formatStatusLabel = (
  status: string,
  translate: (source: string) => string,
) => {
  const normalized = status.trim().toUpperCase();
  const labels: Record<string, string> = {
    PRESENT: "Present",
    APPROVED: "Approved",
    PENDING: "Pending",
    INCOMPLETE: "Incomplete",
    NOT_PROCESSED: "Not Processed",
    ABSENT: "Absent",
    REJECTED: "Rejected",
    LEAVE: "Leave",
  };

  return translate(labels[normalized] ?? normalized.replaceAll("_", " "));
};

const getStatusSeverity = (status: string) => {
  const normalized = status.toUpperCase();

  if (normalized === "PRESENT" || normalized === "APPROVED") {
    return "success";
  }

  if (
    normalized === "PENDING" ||
    normalized === "INCOMPLETE" ||
    normalized === "NOT_PROCESSED"
  ) {
    return "warning";
  }

  if (normalized === "ABSENT" || normalized === "REJECTED") {
    return "danger";
  }

  if (normalized === "LEAVE") {
    return "info";
  }

  return "secondary";
};

const EmployeeDashboardPageComponent = () => {
  const { t: i18nT, tText } = useI18n();
  const router = useRouter();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );

  const { data, error, isLoading } = useSWR<EmployeeDashboardResponse>(
    "/api/dashboard/employee",
    getEmployeeDashboard,
  );

  const quickAccessItems: QuickAccessItem[] = useMemo(() => {
    return [
      {
        label: i18nT("static.1sb2mmk"),
        icon: "pi-map-marker",
        href: "/my-attendance/mobile-attendance",
        permission: "mobile-attendance.create",
      },
      {
        label: i18nT("static.16ukhgu"),
        icon: "pi-history",
        href: "/my-attendance/attendance-history",
      },
      {
        label: i18nT("static.y4pt85"),
        icon: "pi-calendar",
        href: "/request-leave",
        permission: "request-leave.read",
      },
      {
        label: i18nT("static.x7kedz"),
        icon: "pi-clock",
        href: "/overtime/request",
        permission: "overtime.read",
      },
    ];
  }, [i18nT]);

  const permittedQuickAccessItems = useMemo(
    () =>
      quickAccessItems.filter(
        (item) => !item.permission || permissions.includes(item.permission),
      ),
    [permissions, quickAccessItems],
  );

  const quickAccessWithApproval = useMemo(() => {
    if (!data?.approval_summary?.is_approver) {
      return permittedQuickAccessItems;
    }

    return [
      ...permittedQuickAccessItems,
      {
        label: i18nT("static.utf80q"),
        icon: "pi-inbox",
        href: "/approval",
        permission: "approval.read",
      },
    ].filter(
      (item) => !item.permission || permissions.includes(item.permission),
    );
  }, [data, i18nT, permittedQuickAccessItems, permissions]);

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey="/api/dashboard/employee" />;
  }

  if (!data) {
    return null;
  }

  const attendance = data.today_attendance;
  const shift = data.today_shift;

  return (
    <div className="flex w-full flex-col gap-5">
      <Card
        className="w-full overflow-hidden"
        pt={{ content: { className: "p-0" } }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-6 text-white">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col gap-5">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                <i className="pi pi-calendar text-xs" />
                <span>{formatWeekdayDate(new Date())}</span>
              </div>

              <h2 className="text-3xl font-bold tracking-tight">
                {getGreeting(data.profile.name || tText("Employee"), tText)}!
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
                {i18nT("static.1wgmz3r")}{" "}
              </p>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                {i18nT("static.bj0pda")}{" "}
              </p>

              <div className="flex flex-wrap gap-3">
                {quickAccessWithApproval.map((item, index) => (
                  <Button
                    key={item.href}
                    type="button"
                    label={item.label}
                    icon={`pi ${item.icon}`}
                    rounded
                    outlined={index !== 0}
                    className={
                      index === 0
                        ? "border-white/30 bg-white text-blue-700 hover:bg-blue-50"
                        : "border-white/40 text-white hover:bg-white/10"
                    }
                    onClick={() => router.push(item.href)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full shadow-sm">
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {i18nT("static.459bih")}{" "}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {i18nT("static.15gfs6t")}{" "}
                  </p>
                </div>

                <Tag
                  value={formatStatusLabel(attendance.status, tText)}
                  severity={getStatusSeverity(attendance.status)}
                  className="w-fit"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.2m3vb2")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-800">
                    {formatTime(attendance.check_in_time)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.efitfj")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-800">
                    {formatTime(attendance.check_out_time)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.u9ge9")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-amber-600">
                    {formatDuration(attendance.late_seconds)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    {i18nT("static.q52jcp")}
                  </p>
                  <p className="mt-1 text-xl font-bold text-blue-600">
                    {formatDuration(attendance.work_seconds)}
                  </p>
                </div>
              </div>

              {!attendance.is_processed && (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <i className="pi pi-info-circle mt-0.5 text-amber-600" />
                    <p className="text-sm leading-5 text-amber-700">
                      {i18nT("static.ac53uc")}{" "}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="h-full shadow-sm">
            <div className="flex flex-col gap-5">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">
                  {i18nT("static.11jeroi")}{" "}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {i18nT("static.2j8evw")}{" "}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-500">
                      {i18nT("static.1xakelj")}
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-800">
                      {shift.has_shift
                        ? shift.shift_name || i18nT("static.1xakelj")
                        : i18nT("static.1svu7v2")}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatDate(shift.shift_date)}
                    </p>
                  </div>

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <i className="pi pi-calendar text-xl" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {shift.is_day_off && (
                    <Tag value={i18nT("static.776hx0")} severity="info" />
                  )}
                  {shift.is_holiday && (
                    <Tag value={i18nT("static.ih7a2j")} severity="warning" />
                  )}
                  {shift.is_locked && (
                    <Tag value={i18nT("static.hvffeb")} severity="secondary" />
                  )}
                  {!shift.has_shift && (
                    <Tag value={i18nT("static.1054npi")} severity="danger" />
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {i18nT("static.a3cyqp")}{" "}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {i18nT("static.eenjze")}{" "}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700">
                  {i18nT("static.e8nfto")}
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {data.leave_summary.pending}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">
                  {i18nT("static.1j3qly2")}
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {data.leave_summary.approved_this_month}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-3">
                <p className="text-xs text-red-700">
                  {i18nT("static.1uofzaf")}
                </p>
                <p className="mt-1 text-2xl font-bold text-red-700">
                  {data.leave_summary.rejected_this_month}
                </p>
              </div>
            </div>

            <Button
              label={i18nT("static.11w0geb")}
              icon="pi pi-arrow-right"
              text
              className="w-fit px-0"
              onClick={() => router.push("/request-leave")}
            />
          </div>
        </Card>

        <Card className="shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {i18nT("static.x7kedz")}{" "}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {i18nT("static.1digu8y")}{" "}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700">
                  {i18nT("static.e8nfto")}
                </p>
                <p className="mt-1 text-2xl font-bold text-amber-700">
                  {data.overtime_summary.pending}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">
                  {i18nT("static.1j3qly2")}
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-700">
                  {data.overtime_summary.approved_this_month}
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-3">
                <p className="text-xs text-red-700">
                  {i18nT("static.1uofzaf")}
                </p>
                <p className="mt-1 text-2xl font-bold text-red-700">
                  {data.overtime_summary.rejected_this_month}
                </p>
              </div>
            </div>

            <Button
              label={i18nT("static.v86pgx")}
              icon="pi pi-arrow-right"
              text
              className="w-fit px-0"
              onClick={() => router.push("/overtime/request")}
            />
          </div>
        </Card>

        <Card className="shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {i18nT("static.utf80q")}{" "}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {i18nT("static.tqgfxf")}{" "}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
              <p className="text-sm text-slate-500">
                {i18nT("static.1a9z3n3")}
              </p>
              <p className="mt-1 text-3xl font-bold text-slate-800">
                {data.approval_summary.pending_approval_count}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Tag
                  value={i18nT("static.impan0", {
                    p0: data.approval_summary.pending_leave_count,
                  })}
                  severity="info"
                />
                <Tag
                  value={i18nT("static.1dao1nm", {
                    p0: data.approval_summary.pending_overtime_count,
                  })}
                  severity="warning"
                />
              </div>
            </div>

            {data.approval_summary.is_approver && (
              <Button
                label={i18nT("static.4hoauo")}
                icon="pi pi-arrow-right"
                text
                className="w-fit px-0"
                onClick={() => router.push("/approval")}
              />
            )}
          </div>
        </Card>
      </div>

      <Card className="shadow-sm">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              {i18nT("static.1es4nt0")}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {i18nT("static.1t0cl6i")}{" "}
            </p>
          </div>

          {data.leave_balances.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm text-slate-500">
                {i18nT("static.nsbk43")}{" "}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {data.leave_balances.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {item.leave_type_name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(item.period_start)} -{" "}
                        {formatDate(item.period_end)}
                      </p>
                    </div>

                    <Tag
                      value={i18nT("static.ahc2x2", {
                        p0: item.closing_balance,
                      })}
                      severity={
                        item.closing_balance > 0 ? "success" : "secondary"
                      }
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs text-slate-500">
                        {i18nT("static.ija3a8")}
                      </p>
                      <p className="font-bold text-slate-800">
                        {item.entitlement}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">
                        {i18nT("static.1neeuvc")}
                      </p>
                      <p className="font-bold text-slate-800">{item.taken}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">
                        {i18nT("static.gvvrj7")}
                      </p>
                      <p className="font-bold text-emerald-600">
                        {item.closing_balance}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default EmployeeDashboardPageComponent;
