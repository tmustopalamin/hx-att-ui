"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import type {
  EmployeeAttendanceSummary,
  EmployeeLeaveRequestHistory,
  EmployeeOvertimeRequestHistory,
  EmployeeTimeDetail,
} from "@/app/types/employee-time";
import { fetcher } from "@/app/utils/fetcher";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";

type View = "attendance" | "overtime" | "leave";

const duration = (seconds: number) => {
  const safe = Math.max(0, seconds || 0);
  return `${Math.floor(safe / 3600)}h ${Math.floor((safe % 3600) / 60)}m`;
};
const severity = (status: string) =>
  ["APPROVED", "PRESENT", "VALID"].includes(status)
    ? "success"
    : ["REJECTED", "ABSENT", "INVALID"].includes(status)
      ? "danger"
      : ["PENDING", "INCOMPLETE"].includes(status)
        ? "warning"
        : "secondary";
const dateTime = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "-";

export default function EmployeeTimeHistoryPanel({ view }: { view: View }) {
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const key =
    Number.isSafeInteger(employeeId) && employeeId > 0
      ? `/api/employees/${employeeId}/time-detail?section=${view}`
      : null;
  const { data, isLoading } = useSWR<EmployeeTimeDetail>(key, fetcher);

  if (view === "overtime") {
    return (
      <OvertimeHistory
        data={data?.overtime_requests ?? []}
        loading={isLoading}
      />
    );
  }
  if (view === "leave") {
    return (
      <LeaveHistory data={data?.leave_requests ?? []} loading={isLoading} />
    );
  }
  return (
    <AttendanceHistory
      data={data?.attendance_summaries ?? []}
      loading={isLoading}
    />
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

function AttendanceHistory({
  data,
  loading,
}: {
  data: EmployeeAttendanceSummary[];
  loading: boolean;
}) {
  return (
    <Panel
      title="Attendance History"
      description="Processed daily attendance used by reporting and payroll validation."
    >
      <DataTable
        value={data}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        paginator
        rows={15}
        tableStyle={{ minWidth: "56rem" }}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage="No attendance summary is available."
      >
        <Column field="summary_date" header="Date" />
        <Column
          field="shift_name"
          header="Shift"
          body={(row: EmployeeAttendanceSummary) =>
            row.shift_name ?? "Unscheduled"
          }
        />
        <Column
          header="Check In"
          body={(row: EmployeeAttendanceSummary) => dateTime(row.check_in_time)}
        />
        <Column
          header="Check Out"
          body={(row: EmployeeAttendanceSummary) =>
            dateTime(row.check_out_time)
          }
        />
        <Column
          header="Work"
          body={(row: EmployeeAttendanceSummary) => duration(row.work_seconds)}
        />
        <Column
          header="Late / Early"
          body={(row: EmployeeAttendanceSummary) =>
            `${duration(row.late_seconds)} / ${duration(row.early_out_seconds)}`
          }
        />
        <Column
          header="Status"
          body={(row: EmployeeAttendanceSummary) => (
            <Tag value={row.status} severity={severity(row.status)} />
          )}
        />
      </DataTable>
    </Panel>
  );
}

function OvertimeHistory({
  data,
  loading,
}: {
  data: EmployeeOvertimeRequestHistory[];
  loading: boolean;
}) {
  return (
    <Panel
      title="Overtime History"
      description="Approved overtime is used as payroll input according to the payroll period."
    >
      <DataTable
        value={data}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        paginator
        rows={15}
        tableStyle={{ minWidth: "58rem" }}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage="No overtime request is available."
      >
        <Column field="overtime_date" header="Date" />
        <Column
          header="Requested Time"
          body={(row: EmployeeOvertimeRequestHistory) =>
            `${dateTime(row.requested_start_at)} – ${dateTime(row.requested_end_at)}`
          }
        />
        <Column
          header="Duration"
          body={(row: EmployeeOvertimeRequestHistory) =>
            duration(row.requested_seconds)
          }
        />
        <Column
          field="reason"
          header="Reason"
          body={(row: EmployeeOvertimeRequestHistory) => row.reason ?? "-"}
        />
        <Column
          header="Approver"
          body={(row: EmployeeOvertimeRequestHistory) =>
            row.approved_by_name ?? "-"
          }
        />
        <Column
          header="Status"
          body={(row: EmployeeOvertimeRequestHistory) => (
            <Tag value={row.status} severity={severity(row.status)} />
          )}
        />
      </DataTable>
    </Panel>
  );
}

function LeaveHistory({
  data,
  loading,
}: {
  data: EmployeeLeaveRequestHistory[];
  loading: boolean;
}) {
  return (
    <Panel
      title="Leave Request History"
      description="Approved leave is reconciled with attendance and leave balance."
    >
      <DataTable
        value={data}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        paginator
        rows={15}
        tableStyle={{ minWidth: "50rem" }}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage="No leave request is available."
      >
        <Column field="leave_type_name" header="Leave Type" />
        <Column field="start_date" header="Start" />
        <Column field="end_date" header="End" />
        <Column field="total_days" header="Days" />
        <Column
          field="reason"
          header="Reason"
          body={(row: EmployeeLeaveRequestHistory) => row.reason ?? "-"}
        />
        <Column
          header="Status"
          body={(row: EmployeeLeaveRequestHistory) => (
            <Tag value={row.status} severity={severity(row.status)} />
          )}
        />
      </DataTable>
    </Panel>
  );
}
