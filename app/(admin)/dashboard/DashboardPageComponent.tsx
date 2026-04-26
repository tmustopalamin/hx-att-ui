"use client";

import { useMemo } from "react";
import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import { Button } from "primereact/button";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";
import useSWR from "swr";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { getAdminDashboard } from "@/app/services/admin-dashboard-service";
import { AdminDashboardResponse } from "@/app/types/admin-dashboard";

type DashboardCard = {
  label: string;
  value: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  note: string;
  href: string;
};

const getGreeting = (name: string) => {
  const hour = new Date().getHours();

  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  if (hour < 21) return `Good evening, ${name}`;
  return `Good night, ${name}`;
};

const getTodayDate = () => {
  return dayjs().format("dddd, DD MMMM YYYY");
};

const clickableCardClass =
  "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md";

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

const DashboardPageComponent = () => {
  const router = useRouter();
  const profileState = useSelector((state: RootState) => state.profile);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<AdminDashboardResponse>("/api/dashboard/admin", getAdminDashboard);

  const todayOverview: DashboardCard[] = useMemo(() => {
    return [
      {
        label: "Present Today",
        value: data?.today_overview.present_today ?? 0,
        icon: "pi-check-circle",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        note: "Employees marked present today",
        href: "/attendance-summary",
      },
      {
        label: "Absent Today",
        value: data?.today_overview.absent_today ?? 0,
        icon: "pi-times-circle",
        iconBg: "bg-red-50",
        iconColor: "text-red-600",
        note: "Employees not present today",
        href: "/attendance-summary",
      },
      {
        label: "Late Today",
        value: data?.today_overview.late_today ?? 0,
        icon: "pi-clock",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        note: "Arrived after shift start",
        href: "/attendance-summary",
      },
      {
        label: "On Leave Today",
        value: data?.today_overview.on_leave_today ?? 0,
        icon: "pi-calendar-minus",
        iconBg: "bg-violet-50",
        iconColor: "text-violet-600",
        note: "Employees on approved leave",
        href: "/request-leave",
      },
      {
        label: "Active Employees",
        value: data?.today_overview.active_employees ?? 0,
        icon: "pi-users",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        note: "Current active workforce",
        href: "/employees",
      },
      {
        label: "Attendance Exceptions",
        value: data?.today_overview.attendance_exceptions ?? 0,
        icon: "pi-exclamation-triangle",
        iconBg: "bg-orange-50",
        iconColor: "text-orange-600",
        note: "Logs or summaries needing review",
        href: "/attendance-log",
      },
    ];
  }, [data]);

  const needsAttention: DashboardCard[] = useMemo(() => {
    return [
      {
        label: "Unprocessed Attendance Logs",
        value: data?.needs_attention.unprocessed_attendance_logs ?? 0,
        icon: "pi-inbox",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-600",
        note: "Logs not processed into summary",
        href: "/attendance-log",
      },
      {
        label: "Unmapped Attendance Logs",
        value: data?.needs_attention.unmapped_attendance_logs ?? 0,
        icon: "pi-link-slash",
        iconBg: "bg-red-50",
        iconColor: "text-red-600",
        note: "Logs without employee mapping",
        href: "/attendance-log",
      },
      {
        label: "Missing Shift Assignment",
        value: data?.needs_attention.missing_shift_assignment ?? 0,
        icon: "pi-calendar-times",
        iconBg: "bg-yellow-50",
        iconColor: "text-yellow-700",
        note: "Employees without shift setup today",
        href: "/setting/employee-shift-assignment",
      },
      {
        label: "Incomplete Attendance",
        value: data?.needs_attention.incomplete_attendance ?? 0,
        icon: "pi-info-circle",
        iconBg: "bg-orange-50",
        iconColor: "text-orange-600",
        note: "Missing check pair or incomplete summary",
        href: "/attendance-summary",
      },
    ];
  }, [data]);

  const organizationSummary: DashboardCard[] = useMemo(() => {
    return [
      {
        label: "Total Employees",
        value: data?.organization_snapshot.total_employees ?? 0,
        icon: "pi-users",
        iconBg: "bg-blue-50",
        iconColor: "text-blue-600",
        note: "All registered employees",
        href: "/employees",
      },
      {
        label: "Departments",
        value: data?.organization_snapshot.departments ?? 0,
        icon: "pi-briefcase",
        iconBg: "bg-purple-50",
        iconColor: "text-purple-600",
        note: "Active department master data",
        href: "/setting/department",
      },
      {
        label: "Branches",
        value: data?.organization_snapshot.branches ?? 0,
        icon: "pi-sitemap",
        iconBg: "bg-cyan-50",
        iconColor: "text-cyan-600",
        note: "Available branch setup",
        href: "/setting/branch",
      },
      {
        label: "New Employees This Month",
        value: data?.organization_snapshot.new_employees_this_month ?? 0,
        icon: "pi-user-plus",
        iconBg: "bg-emerald-50",
        iconColor: "text-emerald-600",
        note: "New joiners this month",
        href: "/employees",
      },
    ];
  }, [data]);

  const peopleAdminSummary: DashboardCard[] = useMemo(() => {
    return [
      {
        label: "Active Contracts",
        value: data?.people_admin_notes.active_contracts ?? 0,
        icon: "pi-id-card",
        iconBg: "bg-slate-100",
        iconColor: "text-slate-700",
        note: "Employees with active contracts",
        href: "/employees",
      },
      {
        label: "Expiring in 7 Days",
        value: data?.people_admin_notes.expiring_in_7_days ?? 0,
        icon: "pi-exclamation-circle",
        iconBg: "bg-orange-50",
        iconColor: "text-orange-600",
        note: "Contracts needing immediate review",
        href: "/employees",
      },
      {
        label: "Expiring in 30 Days",
        value: data?.people_admin_notes.expiring_in_30_days ?? 0,
        icon: "pi-calendar",
        iconBg: "bg-amber-50",
        iconColor: "text-amber-700",
        note: "Upcoming contract expirations",
        href: "/employees",
      },
      {
        label: "Birthdays This Week",
        value: data?.people_admin_notes.birthdays_this_week ?? 0,
        icon: "pi-gift",
        iconBg: "bg-pink-50",
        iconColor: "text-pink-600",
        note: "Employees celebrating this week",
        href: "/employees",
      },
    ];
  }, [data]);

  const attendanceTrendData = useMemo(() => {
    const rows = data?.charts.attendance_trend ?? [];
    const labels = rows.map((item) => item.label);

    return {
      labels,
      datasets: [
        {
          label: "Present",
          data: rows.map((item) => item.present),
          borderColor: chartColors.blue,
          backgroundColor: chartColors.blue,
          tension: 0.35,
          fill: false,
        },
        {
          label: "Absent",
          data: rows.map((item) => item.absent),
          borderColor: chartColors.red,
          backgroundColor: chartColors.red,
          tension: 0.35,
          fill: false,
        },
      ],
    };
  }, [data]);

  const lateTrendData = useMemo(() => {
    const rows = data?.charts.late_trend ?? [];
    const labels = rows.map((item) => item.label);

    return {
      labels,
      datasets: [
        {
          label: "Late Employees",
          data: rows.map((item) => item.value),
          backgroundColor: chartColors.amber,
          borderRadius: 8,
        },
      ],
    };
  }, [data]);

  const departmentData = useMemo(() => {
    const rows = data?.charts.employees_by_department ?? [];

    if (rows.length === 0) {
      return {
        labels: ["No Data"],
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
            (_, index) => fallbackDepartmentColors[index % fallbackDepartmentColors.length]
          ),
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    };
  }, [data]);

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
    return items.map((item) => (
      <Card
        key={item.label}
        className={`shadow-sm ${clickableCardClass}`}
        onClick={() => router.push(item.href)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-800">{item.value}</p>
            <p className="mt-2 text-xs text-slate-400">{item.note}</p>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${item.iconBg}`}
          >
            <i className={`pi ${item.icon} text-xl ${item.iconColor}`} />
          </div>
        </div>
      </Card>
    ));
  };

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey="/api/dashboard/admin" />;
  }

  return (
    <div className="flex w-full flex-col gap-5">
      <Card className="w-full" pt={{ content: { className: "p-0" } }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">
                {getGreeting(profileState.name)}!
              </h2>
              <p className="mt-1 text-sm text-slate-500">It is {getTodayDate()}</p>
              <p className="mt-3 max-w-2xl text-sm text-slate-500">
                Review today’s attendance condition, operational issues, and workforce overview.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                label="Attendance Summary"
                icon="pi pi-file-check"
                rounded
                onClick={() => router.push("/attendance-summary")}
              />
              <Button
                type="button"
                label="Attendance Log"
                icon="pi pi-clock"
                rounded
                outlined
                onClick={() => router.push("/attendance-log")}
              />
              <Button
                type="button"
                label="Employees"
                icon="pi pi-users"
                rounded
                outlined
                onClick={() => router.push("/employees")}
              />
              <Button
                type="button"
                label="Refresh"
                icon="pi pi-refresh"
                rounded
                outlined
                onClick={() => mutate()}
              />
            </div>
          </div>

          <div className="flex items-end justify-center lg:w-[260px]">
            <img
              src="/images/welcome-dashboard.png"
              alt="Welcome Dashboard"
              className="w-44 md:w-52 lg:w-60"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {renderMetricCards(todayOverview)}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <Card className="h-full shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Needs Attention</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Priority operational items for admin review today.
                  </p>
                </div>

                <Button
                  type="button"
                  label="Open Attendance Log"
                  icon="pi pi-arrow-right"
                  text
                  onClick={() => router.push("/attendance-log")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {renderMetricCards(needsAttention)}
              </div>
            </div>
          </Card>
        </div>

        <div className="xl:col-span-5">
          <Card className="h-full shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">People Admin Notes</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Employee lifecycle and contract reminders.
                  </p>
                </div>

                <Button
                  type="button"
                  label="Open Employees"
                  icon="pi pi-arrow-right"
                  text
                  onClick={() => router.push("/employees")}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {renderMetricCards(peopleAdminSummary)}
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
                  <h3 className="text-2xl font-bold text-slate-800">Attendance Trend</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Daily present versus absent trend for the current period.
                  </p>
                </div>

                <Button
                  type="button"
                  label="Open Summary"
                  icon="pi pi-arrow-right"
                  text
                  onClick={() => router.push("/attendance-summary")}
                />
              </div>

              <div className="h-[320px] w-full">
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
          <Card className="shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">Employees by Department</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Current active employee distribution by department.
                  </p>
                </div>

                <Button
                  type="button"
                  label="Open Departments"
                  icon="pi pi-arrow-right"
                  text
                  onClick={() => router.push("/setting/department")}
                />
              </div>

              <div className="h-[320px] w-full">
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {renderMetricCards(organizationSummary)}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Late Trend</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Daily number of employees arriving late.
                </p>
              </div>

              <Button
                type="button"
                label="Open Summary"
                icon="pi pi-arrow-right"
                text
                onClick={() => router.push("/attendance-summary")}
              />
            </div>

            <div className="h-[300px] w-full">
              <Chart
                type="bar"
                data={lateTrendData}
                options={barChartOptions}
                className="h-full"
              />
            </div>
          </div>
        </Card>

        <Card className="shadow-sm">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-800">Dashboard Status</h3>
              <p className="mt-1 text-sm text-slate-500">
                Dashboard is now connected to backend data and ready for further metric expansion.
              </p>
            </div>

            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
              <p className="text-sm font-semibold text-slate-700">Current live sections</p>
              <ul className="mt-3 space-y-2 text-sm text-slate-500">
                <li>• Today Overview</li>
                <li>• Needs Attention</li>
                <li>• Organization Snapshot</li>
                <li>• Attendance Trend</li>
                <li>• Late Trend</li>
                <li>• Employees by Department</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPageComponent;