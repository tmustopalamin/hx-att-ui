"use client";
import { useI18n } from "@/app/i18n";

import { useMemo } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { Button } from "primereact/button";
import { useRouter } from "next/navigation";
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";
import useSWR from "swr";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { getAdminDashboard } from "@/app/services/admin-dashboard-service";
import { AdminDashboardResponse } from "@/app/types/admin-dashboard";
import { formatWeekdayDate } from "@/app/utils/date-format";

type DashboardCard = {
  label: string;
  value: number | string;
  icon: string;
  iconBg: string;
  iconColor: string;
  note: string;
  info: string;
  href?: string;
  permission?: string;
};

type QuickAccessItem = {
  label: string;
  icon: string;
  href: string;
  permission?: string;
};

const chartColors = {
  blue: "#3B82F6",
  red: "#EF4444",
  amber: "#F59E0B",
  emerald: "#10B981",
  violet: "#8B5CF6",
  cyan: "#06B6D4",
  pink: "#F43F5E",
  slate: "#94A3B8",
  teal: "#14B8A6",
};

const fallbackDepartmentColors = [
  chartColors.blue,
  chartColors.teal,
  chartColors.amber,
  chartColors.violet,
  chartColors.pink,
  chartColors.slate,
  chartColors.cyan,
  chartColors.emerald,
];

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

const getTodayDate = () => {
  return formatWeekdayDate(new Date());
};

const getProfilePermissions = (profileState: unknown): string[] => {
  const profile = profileState as { permissions?: unknown };

  if (!Array.isArray(profile.permissions)) {
    return [];
  }

  return profile.permissions.filter(
    (permission): permission is string => typeof permission === "string",
  );
};

const formatNumber = (value: number | string) => {
  if (typeof value === "string") {
    return value;
  }

  return value.toLocaleString("id-ID");
};

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) {
    return "0%";
  }

  return `${Math.round(value)}%`;
};

const getRate = (value: number, total: number) => {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / total) * 100));
};

const InfoHint = ({ text }: { text: string }) => {
  return (
    <span
      className="group relative inline-flex"
      onClick={(event) => event.stopPropagation()}
    >
      <i className="pi pi-info-circle cursor-help text-xs text-slate-400 transition-colors hover:text-blue-500" />

      <span className="pointer-events-none absolute right-0 top-6 z-50 hidden w-64 rounded-xl bg-slate-900 px-3 py-2 text-left text-xs font-normal leading-5 text-white shadow-xl group-hover:block">
        {text}
      </span>
    </span>
  );
};

const DashboardPageComponent = () => {
  const { t: i18nT, tText } = useI18n();
  const router = useRouter();
  const profileState = useSelector((state: RootState) => state.profile);

  const { data, error, isLoading } = useSWR<AdminDashboardResponse>(
    "/api/dashboard/admin",
    getAdminDashboard,
  );

  const profile = profileState as {
    name?: string | null;
    permissions?: unknown;
  };

  const profileName = String(profile.name ?? "").trim();
  const adminName = profileName || tText("Admin");

  const permissionSet = useMemo(() => {
    return new Set(getProfilePermissions(profileState));
  }, [profileState]);

  const hasPermission = (permission?: string) => {
    if (!permission) {
      return true;
    }

    return permissionSet.has(permission);
  };

  const activeEmployees = data?.today_overview?.active_employees ?? 0;
  const presentToday = data?.today_overview?.present_today ?? 0;
  const absentToday = data?.today_overview?.absent_today ?? 0;
  const lateToday = data?.today_overview?.late_today ?? 0;
  const onLeaveToday = data?.today_overview?.on_leave_today ?? 0;

  const attendanceRate = getRate(presentToday, activeEmployees);
  const absenceRate = getRate(absentToday, activeEmployees);
  const lateRate = getRate(lateToday, activeEmployees);
  const leaveRate = getRate(onLeaveToday, activeEmployees);

  const quickAccessItems: QuickAccessItem[] = [
    {
      label: i18nT("static.1w1ugxu"),
      icon: "pi-file-check",
      href: "/attendance-summary",
      permission: "attendance-summary.read",
    },
    {
      label: i18nT("static.rjym30"),
      icon: "pi-clock",
      href: "/attendance-log",
      permission: "attendance-log.read",
    },
    {
      label: i18nT("static.f4bo3a"),
      icon: "pi-users",
      href: "/employees",
      permission: "employee.read",
    },
    {
      label: i18nT("static.51exaz"),
      icon: "pi-calendar-minus",
      href: "/leave-management",
      permission: "leave-management.read",
    },
    {
      label: i18nT("static.1oswk5t"),
      icon: "pi-stopwatch",
      href: "/overtime-management",
      permission: "overtime-management.read",
    },
  ];

  const visibleQuickAccessItems = quickAccessItems.filter((item) =>
    hasPermission(item.permission),
  );

  const todayCards: DashboardCard[] = useMemo(() => {
    return [
      {
        label: i18nT("static.jqophg"),
        value: formatPercent(attendanceRate),
        icon: "pi-chart-line",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        note: tText("{present} present from {active} active employees", {
          present: presentToday,
          active: activeEmployees,
        }),
        info: tText(
          "Percentage of active employees who are marked present today. This is calculated from Present Today divided by Active Employees.",
        ),
        href: "/attendance-summary",
        permission: "attendance-summary.read",
      },
      {
        label: i18nT("static.1nvmzhh"),
        value: presentToday,
        icon: "pi-check-circle",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        note: tText("Employees marked present today"),
        info: tText(
          "Number of employees whose attendance summary status is present for today.",
        ),
        href: "/attendance-summary",
        permission: "attendance-summary.read",
      },
      {
        label: i18nT("static.1wtl09"),
        value: absentToday,
        icon: "pi-times-circle",
        iconBg: "bg-red-50",
        iconColor: "text-red-600",
        note: tText("{rate} of active employees", {
          rate: formatPercent(absenceRate),
        }),
        info: tText(
          "Number of employees marked absent today from attendance summary.",
        ),
        href: "/attendance-summary",
        permission: "attendance-summary.read",
      },
      {
        label: i18nT("static.gckkj0"),
        value: lateToday,
        icon: "pi-clock",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        note: tText("{rate} of active employees", {
          rate: formatPercent(lateRate),
        }),
        info: tText(
          "Number of employees marked late today based on attendance summary.",
        ),
        href: "/attendance-summary",
        permission: "attendance-summary.read",
      },
      {
        label: i18nT("static.sa9ww6"),
        value: onLeaveToday,
        icon: "pi-calendar-minus",
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
        note: tText("{rate} of active employees", {
          rate: formatPercent(leaveRate),
        }),
        info: tText(
          "Number of employees marked as leave today in attendance summary after attendance processing.",
        ),
        href: "/leave-management",
        permission: "leave-management.read",
      },
      {
        label: i18nT("static.hn4r4u"),
        value: activeEmployees,
        icon: "pi-users",
        iconBg: "bg-sky-50",
        iconColor: "text-sky-600",
        note: tText("Current active workforce"),
        info: tText(
          "Total active employees currently available in employee master data.",
        ),
        href: "/employees",
        permission: "employee.read",
      },
    ];
  }, [
    activeEmployees,
    attendanceRate,
    absenceRate,
    lateRate,
    leaveRate,
    presentToday,
    absentToday,
    lateToday,
    onLeaveToday,
    i18nT,
    tText,
  ]);

  const organizationCards: DashboardCard[] = useMemo(() => {
    return [
      {
        label: i18nT("static.ei3vmk"),
        value: data?.organization_snapshot?.total_employees ?? 0,
        icon: "pi-users",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        note: tText("All registered employees"),
        info: tText("Total employees from employee master data."),
        href: "/employees",
        permission: "employee.read",
      },
      {
        label: i18nT("static.zcmjcs"),
        value: data?.organization_snapshot?.departments ?? 0,
        icon: "pi-briefcase",
        iconBg: "bg-purple-50",
        iconColor: "text-purple-600",
        note: tText("Active department master data"),
        info: tText("Total active departments in master data."),
        href: "/setting/department",
        permission: "master-data.read",
      },
      {
        label: i18nT("static.10dqi2x"),
        value: data?.organization_snapshot?.branches ?? 0,
        icon: "pi-sitemap",
        iconBg: "bg-cyan-50",
        iconColor: "text-cyan-600",
        note: tText("Available branch setup"),
        info: tText("Total active branches in master data."),
        href: "/setting/branch",
        permission: "master-data.read",
      },
      {
        label: i18nT("static.1u1gjv1"),
        value: data?.people_admin_notes?.birthdays_this_week ?? 0,
        icon: "pi-gift",
        iconBg: "bg-pink-50",
        iconColor: "text-pink-600",
        note: tText("Employee birthdays this week"),
        info: tText(
          "Number of employees whose birthday falls within the current week.",
        ),
        href: "/employees",
        permission: "employee.read",
      },
    ];
  }, [data, i18nT, tText]);

  const attendanceTrendData = useMemo(() => {
    const rows = data?.charts?.attendance_trend ?? [];
    const labels = rows.map((item) => item.label);

    return {
      labels,
      datasets: [
        {
          label: i18nT("static.1m3e00c"),
          data: rows.map((item) => item.present),
          borderColor: chartColors.blue,
          backgroundColor: chartColors.blue,
          tension: 0.35,
          fill: false,
        },
        {
          label: i18nT("static.meu720"),
          data: rows.map((item) => item.absent),
          borderColor: chartColors.red,
          backgroundColor: chartColors.red,
          tension: 0.35,
          fill: false,
        },
      ],
    };
  }, [data, i18nT]);

  const lateTrendData = useMemo(() => {
    const rows = data?.charts?.late_trend ?? [];
    const labels = rows.map((item) => item.label);

    return {
      labels,
      datasets: [
        {
          label: i18nT("static.moo8dc"),
          data: rows.map((item) => item.value),
          backgroundColor: chartColors.amber,
          borderRadius: 8,
        },
      ],
    };
  }, [data, i18nT]);

  const departmentData = useMemo(() => {
    const rows = data?.charts?.employees_by_department ?? [];

    if (rows.length === 0) {
      return {
        labels: [tText("No Data")],
        datasets: [
          {
            data: [1],
            backgroundColor: [chartColors.slate],
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      };
    }

    return {
      labels: rows.map((item) => item.label),
      datasets: [
        {
          data: rows.map((item) => item.value),
          backgroundColor: rows.map(
            (_, index) =>
              fallbackDepartmentColors[index % fallbackDepartmentColors.length],
          ),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  }, [data, tText]);

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          boxWidth: 8,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          minRotation: 0,
        },
        grid: {
          color: "#E5E7EB",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#E5E7EB",
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "58%",
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          boxWidth: 14,
        },
      },
    },
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#E5E7EB",
        },
      },
    },
  };

  const renderMetricCards = (items: DashboardCard[]) => {
    return items.map((item) => {
      const canOpen = !!item.href && hasPermission(item.permission);

      return (
        <Card
          key={item.label}
          className={`shadow-sm transition-all duration-200 ${
            canOpen
              ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
              : "cursor-default"
          }`}
          onClick={() => {
            if (canOpen && item.href) {
              router.push(item.href);
            }
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-500">
                  {item.label}
                </p>
                <InfoHint text={item.info} />
              </div>

              <p className="mt-2 text-3xl font-bold text-slate-800">
                {formatNumber(item.value)}
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-400">
                {item.note}
              </p>
            </div>

            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconBg}`}
            >
              <i className={`pi ${item.icon} text-xl ${item.iconColor}`} />
            </div>
          </div>
        </Card>
      );
    });
  };

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey="/api/dashboard/admin" />;
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Card
        className="w-full overflow-hidden"
        pt={{ content: { className: "p-0" } }}
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-6 text-white">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-5">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                  <i className="pi pi-calendar text-xs" />
                  <span>{getTodayDate()}</span>
                </div>

                <h2 className="text-3xl font-bold tracking-tight">
                  {getGreeting(adminName, tText)}!
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
                  {i18nT("static.1cz7gt0")}{" "}
                </p>
              </div>

              {visibleQuickAccessItems.length > 0 && (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                    {i18nT("static.bj0pda")}{" "}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {visibleQuickAccessItems.map((item, index) => (
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
              )}
            </div>

            <div className="hidden items-end justify-center lg:flex lg:w-[260px]">
              <img
                src="/images/welcome-dashboard.png"
                alt={i18nT("static.p6kkxr")}
                className="w-56 drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {renderMetricCards(todayCards)}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-slate-800">
                      {i18nT("static.19oenup")}{" "}
                    </h3>
                    <InfoHint text={i18nT("static.107p5rp")} />
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {i18nT("static.hh6me1")}{" "}
                  </p>
                </div>

                {hasPermission("attendance-summary.read") && (
                  <Button
                    type="button"
                    label={i18nT("static.13909ph")}
                    icon="pi pi-arrow-right"
                    text
                    onClick={() => router.push("/attendance-summary")}
                  />
                )}
              </div>

              <div className="h-[260px] w-full sm:h-[300px] lg:h-[320px]">
                <Chart
                  type="line"
                  data={attendanceTrendData}
                  options={lineChartOptions}
                  className="h-full"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="h-full shadow-sm">
            <div className="flex h-full flex-col gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-slate-800">
                    {i18nT("static.1qvjwiu")}{" "}
                  </h3>
                  <InfoHint text={i18nT("static.ldx8nk")} />
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  {i18nT("static.rkgkwk")}{" "}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      {i18nT("static.jqophg")}{" "}
                    </span>
                    <span className="text-sm font-bold text-blue-600">
                      {formatPercent(attendanceRate)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      {i18nT("static.18u1pqi")}{" "}
                    </span>
                    <span className="text-sm font-bold text-red-600">
                      {formatPercent(absenceRate)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-red-500"
                      style={{ width: `${absenceRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      {i18nT("static.bpsa3d")}{" "}
                    </span>
                    <span className="text-sm font-bold text-amber-600">
                      {formatPercent(lateRate)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${lateRate}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      {i18nT("static.nzw0ki")}{" "}
                    </span>
                    <span className="text-sm font-bold text-violet-600">
                      {formatPercent(leaveRate)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${leaveRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-auto rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div>
                    <p className="text-xs text-slate-500">
                      {i18nT("static.1m3e00c")}
                    </p>
                    <p className="mt-1 text-lg font-bold text-emerald-600">
                      {presentToday}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      {i18nT("static.qq2r5l")}
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-600">
                      {activeEmployees}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-slate-800">
                      {i18nT("static.p5a46y")}{" "}
                    </h3>
                    <InfoHint text={i18nT("static.k9f9c7")} />
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {i18nT("static.dapb09")}{" "}
                  </p>
                </div>

                {hasPermission("attendance-summary.read") && (
                  <Button
                    type="button"
                    label={i18nT("static.13909ph")}
                    icon="pi pi-arrow-right"
                    text
                    onClick={() => router.push("/attendance-summary")}
                  />
                )}
              </div>

              <div className="h-[250px] w-full sm:h-[280px] lg:h-[300px]">
                <Chart
                  type="bar"
                  data={lateTrendData}
                  options={barChartOptions}
                  className="h-full"
                />
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-slate-800">
                      {i18nT("static.1nnr9m3")}{" "}
                    </h3>
                    <InfoHint text={i18nT("static.p6zifc")} />
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {i18nT("static.c6k61t")}{" "}
                  </p>
                </div>

                {hasPermission("master-data.read") && (
                  <Button
                    type="button"
                    label={i18nT("static.zcmjcs")}
                    icon="pi pi-arrow-right"
                    text
                    onClick={() => router.push("/setting/department")}
                  />
                )}
              </div>

              <div className="h-[250px] w-full sm:h-[280px] lg:h-[300px]">
                <Chart
                  type="doughnut"
                  data={departmentData}
                  options={doughnutOptions}
                  className="h-full"
                />
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-xl font-bold text-slate-800">
            {i18nT("static.3mqvuq")}{" "}
          </h3>
          <InfoHint text={i18nT("static.13ixpwe")} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {renderMetricCards(organizationCards)}
        </div>
      </div>
    </div>
  );
};

export default DashboardPageComponent;
