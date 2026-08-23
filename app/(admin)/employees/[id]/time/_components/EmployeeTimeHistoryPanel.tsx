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
  EmployeeAttendanceSummary,
  EmployeeLeaveRequestHistory,
  EmployeeOvertimeRequestHistory,
  EmployeeTimeDetail,
} from "@/app/types/employee-time";
import { fetcher } from "@/app/utils/fetcher";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";

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
const dateTime = (value: string | null) => formatDisplayDateTime(value);

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
  const { t: i18nT } = useI18n();
  return (
    <Panel
      title={i18nT("static.16ukhgu")}
      description={i18nT("static.15r85c2")}
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
        currentPageReportTemplate={i18nT("static.1kqh8lr")}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage={i18nT("static.cqawmy")}
      >
        <Column
          field="summary_date"
          header={i18nT("static.ggjuyh")}
          body={(row: EmployeeAttendanceSummary) =>
            formatDisplayDate(row.summary_date)
          }
        />
        <Column
          field="shift_name"
          header={i18nT("static.1xakelj")}
          body={(row: EmployeeAttendanceSummary) =>
            row.shift_name ?? "Unscheduled"
          }
        />
        <Column
          header={i18nT("static.2m3vb2")}
          body={(row: EmployeeAttendanceSummary) => dateTime(row.check_in_time)}
        />
        <Column
          header={i18nT("static.efitfj")}
          body={(row: EmployeeAttendanceSummary) =>
            dateTime(row.check_out_time)
          }
        />
        <Column
          header={i18nT("static.1oz7yps")}
          body={(row: EmployeeAttendanceSummary) => duration(row.work_seconds)}
        />
        <Column
          header={i18nT("static.sw56zn")}
          body={(row: EmployeeAttendanceSummary) =>
            `${duration(row.late_seconds)} / ${duration(row.early_out_seconds)}`
          }
        />
        <Column
          header={i18nT("static.3pd73")}
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
  const { t: i18nT } = useI18n();
  return (
    <Panel title={i18nT("static.ni16")} description={i18nT("static.1c3fn7p")}>
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
        currentPageReportTemplate={i18nT("static.1kqh8lr")}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage={i18nT("static.srq52f")}
      >
        <Column
          field="overtime_date"
          header={i18nT("static.ggjuyh")}
          body={(row: EmployeeOvertimeRequestHistory) =>
            formatDisplayDate(row.overtime_date)
          }
        />
        <Column
          header={i18nT("static.s5z0w")}
          body={(row: EmployeeOvertimeRequestHistory) =>
            `${dateTime(row.requested_start_at)} – ${dateTime(row.requested_end_at)}`
          }
        />
        <Column
          header={i18nT("static.1n1dulp")}
          body={(row: EmployeeOvertimeRequestHistory) =>
            duration(row.requested_seconds)
          }
        />
        <Column
          field="reason"
          header={i18nT("static.i36sl5")}
          body={(row: EmployeeOvertimeRequestHistory) => row.reason ?? "-"}
        />
        <Column
          header={i18nT("static.1czzcoo")}
          body={(row: EmployeeOvertimeRequestHistory) =>
            row.approved_by_name ?? "-"
          }
        />
        <Column
          header={i18nT("static.3pd73")}
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
  const { t: i18nT } = useI18n();
  return (
    <Panel title={i18nT("static.3ntzyl")} description={i18nT("static.5w2tqu")}>
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
        currentPageReportTemplate={i18nT("static.1kqh8lr")}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage={i18nT("static.ajp1f3")}
      >
        <Column field="leave_type_name" header={i18nT("static.se3juw")} />
        <Column
          field="start_date"
          header={i18nT("static.30xvgf")}
          body={(row: EmployeeLeaveRequestHistory) =>
            formatDisplayDate(row.start_date)
          }
        />
        <Column
          field="end_date"
          header={i18nT("static.1llf32i")}
          body={(row: EmployeeLeaveRequestHistory) =>
            formatDisplayDate(row.end_date)
          }
        />
        <Column field="total_days" header={i18nT("static.pxfr8q")} />
        <Column
          field="reason"
          header={i18nT("static.i36sl5")}
          body={(row: EmployeeLeaveRequestHistory) => row.reason ?? "-"}
        />
        <Column
          header={i18nT("static.3pd73")}
          body={(row: EmployeeLeaveRequestHistory) => (
            <Tag value={row.status} severity={severity(row.status)} />
          )}
        />
      </DataTable>
    </Panel>
  );
}
