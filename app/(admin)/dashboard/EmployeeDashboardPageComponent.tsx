"use client";

import { useMemo } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { getEmployeeDashboard } from "@/app/services/employee-dashboard-service";
import { EmployeeDashboardResponse } from "@/app/types/employee-dashboard";

type QuickAccessItem = {
    label: string;
    icon: string;
    href: string;
};

const formatTime = (value?: string | null) => {
    if (!value) {
        return "-";
    }

    return dayjs(value).format("HH:mm");
};

const formatDate = (value?: string | null) => {
    if (!value) {
        return "-";
    }

    return dayjs(value).format("DD MMM YYYY");
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

const getGreeting = (name: string) => {
    const hour = new Date().getHours();

    if (hour < 12) return `Good morning, ${name}`;
    if (hour < 18) return `Good afternoon, ${name}`;
    if (hour < 21) return `Good evening, ${name}`;
    return `Good night, ${name}`;
};

const getStatusSeverity = (status: string) => {
    const normalized = status.toUpperCase();

    if (normalized === "PRESENT" || normalized === "APPROVED") {
        return "success";
    }

    if (normalized === "PENDING" || normalized === "INCOMPLETE" || normalized === "NOT_PROCESSED") {
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
    const router = useRouter();

    const { data, error, isLoading } = useSWR<EmployeeDashboardResponse>(
        "/api/dashboard/employee",
        getEmployeeDashboard
    );

    const quickAccessItems: QuickAccessItem[] = useMemo(() => {
        return [
            {
                label: "Mobile Attendance",
                icon: "pi-map-marker",
                href: "/my-attendance/mobile-attendance",
            },
            {
                label: "Attendance History",
                icon: "pi-history",
                href: "/my-attendance/attendance-history",
            },
            {
                label: "Request Leave",
                icon: "pi-calendar",
                href: "/request-leave",
            },
            {
                label: "Overtime Request",
                icon: "pi-clock",
                href: "/overtime/request",
            },
        ];
    }, []);

    const quickAccessWithApproval = useMemo(() => {
        if (!data?.approval_summary.is_approver) {
            return quickAccessItems;
        }

        return [
            ...quickAccessItems,
            {
                label: "Approval Inbox",
                icon: "pi-inbox",
                href: "/approval",
            },
        ];
    }, [data, quickAccessItems]);

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
            <Card className="w-full overflow-hidden" pt={{ content: { className: "p-0" } }}>
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-500 p-6 text-white">
                    <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />

                    <div className="relative flex flex-col gap-5">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                                <i className="pi pi-calendar text-xs" />
                                <span>{dayjs().format("dddd, DD MMMM YYYY")}</span>
                            </div>

                            <h2 className="text-3xl font-bold tracking-tight">
                                {getGreeting(data.profile.name || "Employee")}!
                            </h2>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">
                                Here is your attendance, leave, overtime, and approval summary for today.
                            </p>
                        </div>

                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100">
                                Quick Access
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
                                        Today Attendance
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Your current attendance result for today.
                                    </p>
                                </div>

                                <Tag
                                    value={attendance.status.replaceAll("_", " ")}
                                    severity={getStatusSeverity(attendance.status)}
                                    className="w-fit"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-xs text-slate-500">Check In</p>
                                    <p className="mt-1 text-xl font-bold text-slate-800">
                                        {formatTime(attendance.check_in_time)}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-xs text-slate-500">Check Out</p>
                                    <p className="mt-1 text-xl font-bold text-slate-800">
                                        {formatTime(attendance.check_out_time)}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-xs text-slate-500">Late</p>
                                    <p className="mt-1 text-xl font-bold text-amber-600">
                                        {formatDuration(attendance.late_seconds)}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <p className="text-xs text-slate-500">Work Time</p>
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
                                            Your attendance summary for today has not been processed yet.
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
                                    Today Shift
                                </h3>
                                <p className="mt-1 text-sm text-slate-500">
                                    Your schedule assignment for today.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm text-slate-500">Shift</p>
                                        <p className="mt-1 text-2xl font-bold text-slate-800">
                                            {shift.has_shift ? shift.shift_name || "Shift" : "No Shift"}
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
                                    {shift.is_day_off && <Tag value="Day Off" severity="info" />}
                                    {shift.is_holiday && <Tag value="Holiday" severity="warning" />}
                                    {shift.is_locked && <Tag value="Locked" severity="secondary" />}
                                    {!shift.has_shift && <Tag value="Not Assigned" severity="danger" />}
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
                                Leave Request
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Your leave request summary.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-2xl bg-amber-50 p-3">
                                <p className="text-xs text-amber-700">Pending</p>
                                <p className="mt-1 text-2xl font-bold text-amber-700">
                                    {data.leave_summary.pending}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-50 p-3">
                                <p className="text-xs text-emerald-700">Approved</p>
                                <p className="mt-1 text-2xl font-bold text-emerald-700">
                                    {data.leave_summary.approved_this_month}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-red-50 p-3">
                                <p className="text-xs text-red-700">Rejected</p>
                                <p className="mt-1 text-2xl font-bold text-red-700">
                                    {data.leave_summary.rejected_this_month}
                                </p>
                            </div>
                        </div>

                        <Button
                            label="Open Request Leave"
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
                                Overtime Request
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Your overtime request summary.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-center">
                            <div className="rounded-2xl bg-amber-50 p-3">
                                <p className="text-xs text-amber-700">Pending</p>
                                <p className="mt-1 text-2xl font-bold text-amber-700">
                                    {data.overtime_summary.pending}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-emerald-50 p-3">
                                <p className="text-xs text-emerald-700">Approved</p>
                                <p className="mt-1 text-2xl font-bold text-emerald-700">
                                    {data.overtime_summary.approved_this_month}
                                </p>
                            </div>

                            <div className="rounded-2xl bg-red-50 p-3">
                                <p className="text-xs text-red-700">Rejected</p>
                                <p className="mt-1 text-2xl font-bold text-red-700">
                                    {data.overtime_summary.rejected_this_month}
                                </p>
                            </div>
                        </div>

                        <Button
                            label="Open Overtime Request"
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
                                Approval Inbox
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Only appears useful when you are assigned as approver.
                            </p>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                            <p className="text-sm text-slate-500">Pending Approval</p>
                            <p className="mt-1 text-3xl font-bold text-slate-800">
                                {data.approval_summary.pending_approval_count}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                                <Tag
                                    value={`Leave ${data.approval_summary.pending_leave_count}`}
                                    severity="info"
                                />
                                <Tag
                                    value={`Overtime ${data.approval_summary.pending_overtime_count}`}
                                    severity="warning"
                                />
                            </div>
                        </div>

                        {data.approval_summary.is_approver && (
                            <Button
                                label="Open Approval Inbox"
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
                            Leave Balance
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Your latest active leave balance periods.
                        </p>
                    </div>

                    {data.leave_balances.length === 0 ? (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 text-center">
                            <p className="text-sm text-slate-500">
                                No leave balance data found.
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
                                                {formatDate(item.period_start)} - {formatDate(item.period_end)}
                                            </p>
                                        </div>

                                        <Tag
                                            value={`${item.closing_balance} left`}
                                            severity={item.closing_balance > 0 ? "success" : "secondary"}
                                        />
                                    </div>

                                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <p className="text-xs text-slate-500">Entitlement</p>
                                            <p className="font-bold text-slate-800">
                                                {item.entitlement}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Taken</p>
                                            <p className="font-bold text-slate-800">
                                                {item.taken}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500">Remaining</p>
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