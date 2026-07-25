"use client";

import { JSX, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from "swr";
import dayjs from "dayjs";

import {
  DataTable,
  DataTableExpandedRows,
  DataTableRowToggleEvent,
} from "primereact/datatable";
import { Column } from "primereact/column";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Calendar } from "primereact/calendar";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { Divider } from "primereact/divider";
import { Paginator, PaginatorPageChangeEvent } from "primereact/paginator";

import { fetcher } from "@/app/utils/fetcher";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { AttendanceSummary } from "@/app/types/attendance-summary";
import AttendanceAutoProcessSettingPanel from "./AttendanceAutoProcessSettingPanel";

interface FilterForm {
  startDate: Date | null;
  endDate: Date | null;
  keyword: string;
  status: string | null;
}

interface ProcessResponse {
  success: boolean;
  message?: string;
  data?: {
    processed_count?: number;
  };
}

type AttendanceSummaryRowView = AttendanceSummary & {
  group_date_key: string;
  group_date_label: string;
  employee_display_name: string;
  employee_search_name: string;
};

type AttendanceSummaryDateGroup = {
  dateKey: string;
  dateLabel: string;
  rows: AttendanceSummaryRowView[];
  presentCount: number;
  inProgressCount: number;
  incompleteCount: number;
  absentCount: number;
  dayOffCount: number;
  leaveCount: number;
};

type DetailQuickFilter =
  | "ALL"
  | "PRESENT"
  | "IN_PROGRESS"
  | "INCOMPLETE"
  | "ABSENT"
  | "DAY_OFF"
  | "LEAVE";

type DatePreset = "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH";

const getFileNameFromDisposition = (contentDisposition: string | null) => {
  if (!contentDisposition) return null;

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return null;
};

const formatStatusLabel = (status: string) => {
  return status
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};

const getMondayStartOfWeek = (date: dayjs.Dayjs) => {
  const day = date.day();
  const daysFromMonday = (day + 6) % 7;

  return date.subtract(daysFromMonday, "day").startOf("day");
};

const downloadAttendanceSummaryExcel = async (
  startDate: Date,
  endDate: Date,
): Promise<string> => {
  const query = new URLSearchParams({
    start_date: dayjs(startDate).format("YYYY-MM-DD"),
    end_date: dayjs(endDate).format("YYYY-MM-DD"),
  });

  const response = await fetch(
    `/api/attendance-summary/export-excel?${query.toString()}`,
    {
      method: "GET",
    },
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json().catch(() => null);
      throw new Error(
        json?.message || json?.error || "Failed to export attendance summary.",
      );
    }

    const text = await response.text().catch(() => "");
    throw new Error(text || "Failed to export attendance summary.");
  }

  const blob = await response.blob();
  const fileName =
    getFileNameFromDisposition(response.headers.get("content-disposition")) ||
    `attendance_summary_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);

  return fileName;
};

const processAttendanceSummary = async (
  startDate: Date,
  endDate: Date,
): Promise<ProcessResponse> => {
  const response = await fetch("/api/attendance-summary/process", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_date: dayjs(startDate).format("YYYY-MM-DD"),
      end_date: dayjs(endDate).format("YYYY-MM-DD"),
    }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      json?.message || json?.error || "Failed to process attendance summary.";

    throw new Error(message);
  }

  return json;
};

const AttendanceSummaryTableData = () => {
  const today = dayjs();
  const defaultStartDate = today.startOf("month").toDate();
  const defaultEndDate = today.endOf("month").toDate();

  const { control, watch, setValue } = useForm<FilterForm>({
    defaultValues: {
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      keyword: "",
      status: null,
    },
  });

  const [appliedStartDate, setAppliedStartDate] = useState<Date | null>(
    defaultStartDate,
  );
  const [appliedEndDate, setAppliedEndDate] = useState<Date | null>(
    defaultEndDate,
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [expandedRows, setExpandedRows] = useState<
    DataTableExpandedRows | undefined
  >(undefined);

  const [groupFirst, setGroupFirst] = useState(0);
  const [groupsPerPage, setGroupsPerPage] = useState(31);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const [employeeFirst, setEmployeeFirst] = useState(0);
  const [employeeRowsPerPage, setEmployeeRowsPerPage] = useState(25);
  const [detailQuickFilter, setDetailQuickFilter] =
    useState<DetailQuickFilter>("ALL");
  const [detailEmployeeSearch, setDetailEmployeeSearch] = useState("");

  const [showAutoProcessSettingPanel, setShowAutoProcessSettingPanel] =
    useState(false);

  const keyword = watch("keyword");
  const statusFilter = watch("status");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (appliedStartDate) {
      params.set("start_date", dayjs(appliedStartDate).format("YYYY-MM-DD"));
    }

    if (appliedEndDate) {
      params.set("end_date", dayjs(appliedEndDate).format("YYYY-MM-DD"));
    }

    const text = params.toString();

    return text ? `?${text}` : "";
  }, [appliedStartDate, appliedEndDate]);

  const swrKey = `/api/attendance-summary${queryString}`;

  const {
    data: attendanceSummaryData,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<AttendanceSummary[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  const rows = attendanceSummaryData ?? [];

  const statusOptions = useMemo(() => {
    const values = [
      ...new Set(rows.map((item) => item.status).filter(Boolean)),
    ];

    return values.map((value) => ({
      label: formatStatusLabel(value),
      value,
    }));
  }, [rows]);

  const filteredRows = useMemo<AttendanceSummaryRowView[]>(() => {
    const search = keyword.trim().toLowerCase();

    return rows
      .map((item) => {
        const employeeDisplayName =
          item.employee_name ?? `Employee #${item.employee_id}`;

        return {
          ...item,
          group_date_key: dayjs(item.summary_date).format("YYYY-MM-DD"),
          group_date_label: dayjs(item.summary_date).format("DD MMM YYYY"),
          employee_display_name: employeeDisplayName,
          employee_search_name: employeeDisplayName.toLowerCase(),
        };
      })
      .filter((item) => {
        const shift = item.shift_name ?? "";
        const dateText = dayjs(item.summary_date).format("DD-MM-YYYY");
        const leaveText = item.leave_name ?? "";
        const overtimeText = item.overtime_status ?? "";

        const matchKeyword =
          !search ||
          item.employee_search_name.includes(search) ||
          shift.toLowerCase().includes(search) ||
          item.status.toLowerCase().includes(search) ||
          leaveText.toLowerCase().includes(search) ||
          overtimeText.toLowerCase().includes(search) ||
          dateText.includes(search);

        const matchStatus = !statusFilter || item.status === statusFilter;

        return matchKeyword && matchStatus;
      })
      .sort((a, b) => {
        const dateCompare = a.group_date_key.localeCompare(b.group_date_key);

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return a.employee_display_name.localeCompare(b.employee_display_name);
      });
  }, [rows, keyword, statusFilter]);

  const groupedData = useMemo<AttendanceSummaryDateGroup[]>(() => {
    const groups = new Map<string, AttendanceSummaryRowView[]>();

    filteredRows.forEach((row) => {
      const existing = groups.get(row.group_date_key) ?? [];
      existing.push(row);
      groups.set(row.group_date_key, existing);
    });

    return Array.from(groups.entries()).map(([dateKey, groupRows]) => ({
      dateKey,
      dateLabel:
        groupRows[0]?.group_date_label ?? dayjs(dateKey).format("DD MMM YYYY"),
      rows: groupRows,
      presentCount: groupRows.filter((item) => item.status === "PRESENT")
        .length,
      inProgressCount: groupRows.filter((item) => item.status === "IN_PROGRESS")
        .length,
      incompleteCount: groupRows.filter((item) => item.status === "INCOMPLETE")
        .length,
      absentCount: groupRows.filter((item) => item.status === "ABSENT").length,
      dayOffCount: groupRows.filter((item) => item.status === "DAY_OFF").length,
      leaveCount: groupRows.filter(
        (item) => item.status === "LEAVE" || item.is_leave,
      ).length,
    }));
  }, [filteredRows]);

  useEffect(() => {
    if (groupedData.length === 0) {
      setSelectedDateKey(null);
      setEmployeeFirst(0);
      setExpandedRows(undefined);
      return;
    }

    const currentStillExists =
      selectedDateKey != null &&
      groupedData.some((group) => group.dateKey === selectedDateKey);

    if (!currentStillExists) {
      setSelectedDateKey(groupedData[0].dateKey);
      setEmployeeFirst(0);
      setExpandedRows(undefined);
    }
  }, [groupedData, selectedDateKey]);

  const pagedGroups = useMemo(() => {
    return groupedData.slice(groupFirst, groupFirst + groupsPerPage);
  }, [groupedData, groupFirst, groupsPerPage]);

  const selectedGroup = useMemo(() => {
    if (!selectedDateKey) {
      return groupedData[0] ?? null;
    }

    return (
      groupedData.find((group) => group.dateKey === selectedDateKey) ??
      groupedData[0] ??
      null
    );
  }, [groupedData, selectedDateKey]);

  const selectedGroupRows = useMemo(() => {
    if (!selectedGroup) {
      return [];
    }

    const employeeSearch = detailEmployeeSearch.trim().toLowerCase();

    return selectedGroup.rows.filter((item) => {
      const matchQuickFilter =
        detailQuickFilter === "ALL"
          ? true
          : detailQuickFilter === "LEAVE"
            ? item.status === "LEAVE" || item.is_leave
            : item.status === detailQuickFilter;

      const matchEmployeeName =
        !employeeSearch || item.employee_search_name.includes(employeeSearch);

      return matchQuickFilter && matchEmployeeName;
    });
  }, [selectedGroup, detailQuickFilter, detailEmployeeSearch]);

  const summaryStats = useMemo(() => {
    return {
      total: filteredRows.length,
      present: filteredRows.filter((item) => item.status === "PRESENT").length,
      inProgress: filteredRows.filter((item) => item.status === "IN_PROGRESS")
        .length,
      incomplete: filteredRows.filter((item) => item.status === "INCOMPLETE")
        .length,
      absent: filteredRows.filter((item) => item.status === "ABSENT").length,
      dayOff: filteredRows.filter((item) => item.status === "DAY_OFF").length,
      leave: filteredRows.filter(
        (item) => item.status === "LEAVE" || item.is_leave,
      ).length,
    };
  }, [filteredRows]);

  const selectedGroupSummary = useMemo(() => {
    if (!selectedGroup) {
      return {
        total: 0,
        present: 0,
        inProgress: 0,
        incomplete: 0,
        absent: 0,
        dayOff: 0,
        leave: 0,
      };
    }

    return {
      total: selectedGroup.rows.length,
      present: selectedGroup.presentCount,
      inProgress: selectedGroup.inProgressCount,
      incomplete: selectedGroup.incompleteCount,
      absent: selectedGroup.absentCount,
      dayOff: selectedGroup.dayOffCount,
      leave: selectedGroup.leaveCount,
    };
  }, [selectedGroup]);

  const currentRangeLabel = useMemo(() => {
    if (!appliedStartDate || !appliedEndDate) {
      return "All dates";
    }

    return `${dayjs(appliedStartDate).format("DD MMM YYYY")} - ${dayjs(
      appliedEndDate,
    ).format("DD MMM YYYY")}`;
  }, [appliedStartDate, appliedEndDate]);

  const applyDatePreset = (preset: DatePreset) => {
    const now = dayjs();
    let start = now.startOf("day");
    let end = now.endOf("day");

    if (preset === "TODAY") {
      start = now.startOf("day");
      end = now.endOf("day");
    }

    if (preset === "THIS_WEEK") {
      start = getMondayStartOfWeek(now);
      end = start.add(6, "day").endOf("day");
    }

    if (preset === "THIS_MONTH") {
      start = now.startOf("month");
      end = now.endOf("month");
    }

    if (preset === "LAST_MONTH") {
      const lastMonth = now.subtract(1, "month");
      start = lastMonth.startOf("month");
      end = lastMonth.endOf("month");
    }

    const startDate = start.toDate();
    const endDate = end.toDate();

    setValue("startDate", startDate);
    setValue("endDate", endDate);

    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);

    setSelectedDateKey(null);
    setExpandedRows(undefined);
    setGroupFirst(0);
    setEmployeeFirst(0);
    setDetailEmployeeSearch("");
    setDetailQuickFilter("ALL");
    setActionError(null);
    setActionSuccess(null);
  };

  const formatDateTime = (value: string | null) => {
    if (!value) return "-";

    const parsed = dayjs(value);

    return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm:ss") : "-";
  };

  const formatTimeOnly = (value: string | null) => {
    if (!value) return "-";

    const parsed = dayjs(value);

    return parsed.isValid() ? parsed.format("HH:mm") : "-";
  };

  const formatSeconds = (seconds: number | null | undefined) => {
    const totalSeconds = seconds ?? 0;
    const hour = Math.floor(totalSeconds / 3600);
    const minute = Math.floor((totalSeconds % 3600) / 60);

    return `${hour}h ${minute}m`;
  };

  const renderStatusTag = (status: string) => {
    const normalized = status.toUpperCase();

    if (normalized === "PRESENT") {
      return <Tag value="Present" severity="success" />;
    }

    if (normalized === "IN_PROGRESS") {
      return <Tag value="In Progress" severity="info" />;
    }

    if (normalized === "INCOMPLETE") {
      return <Tag value="Incomplete" severity="warning" />;
    }

    if (normalized === "ABSENT") {
      return <Tag value="Absent" severity="danger" />;
    }

    if (normalized === "DAY_OFF") {
      return <Tag value="Day Off" severity="info" />;
    }

    if (normalized === "LEAVE") {
      return <Tag value="Leave" severity="info" />;
    }

    if (normalized === "UNSCHEDULED") {
      return <Tag value="Unscheduled" severity="secondary" />;
    }

    return <Tag value={status} severity="secondary" />;
  };

  const renderCompactFlags = (rowData: AttendanceSummaryRowView) => {
    const flags: JSX.Element[] = [];

    if (rowData.is_leave || rowData.leave_id) {
      flags.push(
        <Tag
          key="leave"
          value={rowData.leave_name ? `Leave: ${rowData.leave_name}` : "Leave"}
          severity="warning"
        />,
      );
    }

    if (
      rowData.is_overtime ||
      rowData.overtime_request_id ||
      rowData.overtime_seconds > 0
    ) {
      const overtimeDuration = formatSeconds(rowData.overtime_seconds);

      const overtimeTime =
        rowData.overtime_start_time && rowData.overtime_end_time
          ? `${formatTimeOnly(rowData.overtime_start_time)} - ${formatTimeOnly(
              rowData.overtime_end_time,
            )}`
          : null;

      flags.push(
        <Tag
          key="overtime"
          value={
            overtimeTime
              ? `Overtime: ${overtimeDuration} (${overtimeTime})`
              : `Overtime: ${overtimeDuration}`
          }
          severity="info"
        />,
      );
    }

    if (rowData.is_missing_check_in) {
      flags.push(<Tag key="missing-in" value="Missing In" severity="danger" />);
    }

    if (rowData.is_missing_check_out) {
      flags.push(
        <Tag key="missing-out" value="Missing Out" severity="danger" />,
      );
    }

    if (rowData.is_late) {
      flags.push(<Tag key="late" value="Late" severity="warning" />);
    }

    if (rowData.is_early_co) {
      flags.push(<Tag key="early" value="Early Out" severity="warning" />);
    }

    if (rowData.is_holiday) {
      flags.push(<Tag key="holiday" value="Holiday" severity="info" />);
    }

    if (rowData.is_weekend) {
      flags.push(<Tag key="weekend" value="Weekend" severity="info" />);
    }

    if (rowData.is_absent) {
      flags.push(<Tag key="absent" value="Absent" severity="danger" />);
    }

    if (rowData.is_unscheduled) {
      flags.push(
        <Tag key="unscheduled" value="Unscheduled" severity="secondary" />,
      );
    }

    if (!flags.length) {
      return <span className="text-sm text-slate-400">No flags</span>;
    }

    return <div className="flex flex-wrap gap-1">{flags}</div>;
  };

  const renderScanSummary = (rowData: AttendanceSummaryRowView) => {
    return (
      <div className="min-w-[10rem]">
        <div className="text-sm font-medium text-slate-700">
          {rowData.check_in_time
            ? dayjs(rowData.check_in_time).format("HH:mm:ss")
            : "-"}
          <span className="mx-1 text-slate-400">→</span>
          {rowData.check_out_time
            ? dayjs(rowData.check_out_time).format("HH:mm:ss")
            : "-"}
        </div>
        <div className="text-xs text-slate-500">
          {rowData.attendance_log_count} log
          {rowData.attendance_log_count > 1 ? "s" : ""}
        </div>
      </div>
    );
  };

  const renderWorkSummary = (rowData: AttendanceSummaryRowView) => {
    return (
      <div className="min-w-[8rem]">
        <div className="text-sm font-medium text-slate-700">
          {formatSeconds(rowData.work_seconds)}
        </div>
        <div className="text-xs text-slate-500">
          Break {formatSeconds(rowData.break_seconds)}
        </div>
      </div>
    );
  };

  const renderExceptionSummary = (rowData: AttendanceSummaryRowView) => {
    const hasException =
      rowData.late_seconds > 0 ||
      rowData.early_out_seconds > 0 ||
      rowData.is_missing_check_in ||
      rowData.is_missing_check_out;

    if (!hasException) {
      return <span className="text-sm text-slate-400">None</span>;
    }

    return (
      <div className="flex flex-col gap-1 text-xs">
        {rowData.late_seconds > 0 && (
          <span className="text-orange-600">
            Late {formatSeconds(rowData.late_seconds)}
          </span>
        )}
        {rowData.early_out_seconds > 0 && (
          <span className="text-orange-600">
            Early {formatSeconds(rowData.early_out_seconds)}
          </span>
        )}
        {rowData.is_missing_check_in && (
          <span className="text-red-600">Missing check-in</span>
        )}
        {rowData.is_missing_check_out && (
          <span className="text-red-600">Missing check-out</span>
        )}
      </div>
    );
  };

  const onApplyFilter = () => {
    setActionError(null);
    setActionSuccess(null);

    const startDate = watch("startDate");
    const endDate = watch("endDate");

    if (!startDate || !endDate) {
      setActionError("Start Date and End Date are required.");
      return;
    }

    if (dayjs(startDate).isAfter(dayjs(endDate), "day")) {
      setActionError("Start Date cannot be later than End Date.");
      return;
    }

    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
    setSelectedDateKey(null);
    setExpandedRows(undefined);
    setGroupFirst(0);
    setEmployeeFirst(0);
    setDetailEmployeeSearch("");
    setDetailQuickFilter("ALL");
  };

  const onResetFilter = () => {
    setValue("startDate", defaultStartDate);
    setValue("endDate", defaultEndDate);
    setValue("keyword", "");
    setValue("status", null);

    setAppliedStartDate(defaultStartDate);
    setAppliedEndDate(defaultEndDate);
    setSelectedDateKey(null);
    setExpandedRows(undefined);
    setGroupFirst(0);
    setEmployeeFirst(0);
    setDetailQuickFilter("ALL");
    setDetailEmployeeSearch("");
    setActionError(null);
    setActionSuccess(null);
  };

  const onClickProcessAttendance = () => {
    setActionError(null);
    setActionSuccess(null);

    if (!appliedStartDate || !appliedEndDate) {
      setActionError("Please apply Start Date and End Date before processing.");
      return;
    }

    confirmDialog({
      header: "Process Attendance Summary",
      message: `Process unresolved attendance summary for ${currentRangeLabel}?`,
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: async () => {
        try {
          setIsProcessing(true);

          const result = await processAttendanceSummary(
            appliedStartDate,
            appliedEndDate,
          );

          await mutate();

          const processedCount = result?.data?.processed_count;

          setActionSuccess(
            processedCount != null
              ? `Attendance summary processed successfully. ${processedCount} row(s) updated.`
              : result?.message || "Attendance summary processed successfully.",
          );
        } catch (err) {
          setActionError(
            err instanceof Error
              ? err.message
              : "Failed to process attendance summary.",
          );
        } finally {
          setIsProcessing(false);
        }
      },
      reject: () => {},
    });
  };

  const exportExcel = async () => {
    setActionError(null);
    setActionSuccess(null);

    if (!appliedStartDate || !appliedEndDate) {
      setActionError("Please apply Start Date and End Date before exporting.");
      return;
    }

    if (dayjs(appliedStartDate).isAfter(dayjs(appliedEndDate), "day")) {
      setActionError("Start Date cannot be later than End Date.");
      return;
    }

    try {
      setIsExporting(true);

      const fileName = await downloadAttendanceSummaryExcel(
        appliedStartDate,
        appliedEndDate,
      );

      setActionSuccess(`Attendance summary exported successfully: ${fileName}`);
    } catch (err) {
      setActionError(
        err instanceof Error
          ? err.message
          : "Failed to export attendance summary.",
      );
    } finally {
      setIsExporting(false);
    }
  };

  const rowExpansionTemplate = (rowData: AttendanceSummaryRowView) => {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Actual Scan
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500">Check In</div>
                <div className="font-medium text-slate-800">
                  {formatDateTime(rowData.check_in_time)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Check Out</div>
                <div className="font-medium text-slate-800">
                  {formatDateTime(rowData.check_out_time)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Logs</div>
                <div className="font-medium text-slate-800">
                  {rowData.attendance_log_count}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Status</div>
                <div className="mt-1">{renderStatusTag(rowData.status)}</div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Scheduled Time
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500">Start</div>
                <div className="font-medium text-slate-800">
                  {formatDateTime(rowData.scheduled_start_time)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">End</div>
                <div className="font-medium text-slate-800">
                  {formatDateTime(rowData.scheduled_end_time)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Break Start</div>
                <div className="font-medium text-slate-800">
                  {formatDateTime(rowData.scheduled_break_start_time)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Break End</div>
                <div className="font-medium text-slate-800">
                  {formatDateTime(rowData.scheduled_break_end_time)}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Summary Result
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-slate-500">Work Hours</div>
                <div className="font-medium text-slate-800">
                  {formatSeconds(rowData.work_seconds)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Break</div>
                <div className="font-medium text-slate-800">
                  {formatSeconds(rowData.break_seconds)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Late</div>
                <div className="font-medium text-slate-800">
                  {formatSeconds(rowData.late_seconds)}
                </div>
              </div>
              <div>
                <div className="text-slate-500">Early Out</div>
                <div className="font-medium text-slate-800">
                  {formatSeconds(rowData.early_out_seconds)}
                </div>
              </div>
              <div className="col-span-2">
                <div className="mb-2 text-slate-500">Flags</div>
                {renderCompactFlags(rowData)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const onDateOverviewPageChange = (event: PaginatorPageChangeEvent) => {
    setGroupFirst(event.first);
    setGroupsPerPage(event.rows);
  };

  const onSelectDateGroup = (dateKey: string) => {
    setSelectedDateKey(dateKey);
    setEmployeeFirst(0);
    setExpandedRows(undefined);
    setDetailQuickFilter("ALL");
    setDetailEmployeeSearch("");
  };

  const onSelectDetailQuickFilter = (filter: DetailQuickFilter) => {
    setDetailQuickFilter(filter);
    setEmployeeFirst(0);
    setExpandedRows(undefined);
  };

  if (isLoading && !attendanceSummaryData) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={swrKey} />;
  }

  const quickFilterOptions: Array<{
    key: DetailQuickFilter;
    label: string;
    count: number;
  }> = [
    {
      key: "ALL",
      label: "All",
      count: selectedGroupSummary.total,
    },
    {
      key: "PRESENT",
      label: "Present",
      count: selectedGroupSummary.present,
    },
    {
      key: "IN_PROGRESS",
      label: "In Progress",
      count: selectedGroupSummary.inProgress,
    },
    {
      key: "INCOMPLETE",
      label: "Incomplete",
      count: selectedGroupSummary.incomplete,
    },
    {
      key: "ABSENT",
      label: "Absent",
      count: selectedGroupSummary.absent,
    },
    {
      key: "DAY_OFF",
      label: "Day Off",
      count: selectedGroupSummary.dayOff,
    },
    {
      key: "LEAVE",
      label: "Leave",
      count: selectedGroupSummary.leave,
    },
  ];

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 border-b pb-3 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="text-2xl font-semibold">Attendance Summary</div>
              <div className="text-sm text-slate-500">
                Daily overview with focused employee detail table.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                label="Process Attendance"
                icon="pi pi-refresh"
                loading={isProcessing}
                onClick={onClickProcessAttendance}
              />
              <Button
                tooltip="Export Excel"
                icon="pi pi-file-excel"
                className="p-button-success"
                onClick={exportExcel}
                loading={isExporting}
                tooltipOptions={{
                  appendTo: () => document.body,
                  position: "top",
                }}
              />
              <Button
                icon="pi pi-cog"
                className={
                  showAutoProcessSettingPanel
                    ? "p-button-warning"
                    : "p-button-secondary"
                }
                tooltip="Auto Process Setting"
                tooltipOptions={{
                  appendTo: () => document.body,
                  position: "top",
                }}
                onClick={() => setShowAutoProcessSettingPanel((prev) => !prev)}
              />
            </div>
          </div>

          {showAutoProcessSettingPanel && <AttendanceAutoProcessSettingPanel />}

          {(actionError || actionSuccess) && (
            <div
              className={`rounded-xl border px-4 py-3 ${
                actionError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm leading-6">
                  {actionError || actionSuccess}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActionError(null);
                    setActionSuccess(null);
                  }}
                  className="shrink-0 text-xs underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-7">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:col-span-2">
              <div className="text-xs text-slate-500">Range</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">
                {currentRangeLabel}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs text-slate-500">Rows</div>
              <div className="mt-1 text-xl font-semibold text-slate-900">
                {summaryStats.total}
              </div>
            </div>

            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="text-xs text-green-700">Present</div>
              <div className="mt-1 text-xl font-semibold text-green-800">
                {summaryStats.present}
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3">
              <div className="text-xs text-blue-700">In Progress</div>
              <div className="mt-1 text-xl font-semibold text-blue-800">
                {summaryStats.inProgress}
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">
              <div className="text-xs text-yellow-700">Incomplete</div>
              <div className="mt-1 text-xl font-semibold text-yellow-800">
                {summaryStats.incomplete}
              </div>
            </div>

            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="text-xs text-red-700">Absent</div>
              <div className="mt-1 text-xl font-semibold text-red-800">
                {summaryStats.absent}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                type="button"
                label="Today"
                icon="pi pi-calendar"
                className="p-button-sm p-button-secondary"
                onClick={() => applyDatePreset("TODAY")}
              />
              <Button
                type="button"
                label="This Week"
                icon="pi pi-calendar"
                className="p-button-sm p-button-secondary"
                onClick={() => applyDatePreset("THIS_WEEK")}
              />
              <Button
                type="button"
                label="This Month"
                icon="pi pi-calendar"
                className="p-button-sm p-button-secondary"
                onClick={() => applyDatePreset("THIS_MONTH")}
              />
              <Button
                type="button"
                label="Last Month"
                icon="pi pi-history"
                className="p-button-sm p-button-secondary"
                onClick={() => applyDatePreset("LAST_MONTH")}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Start Date
                </label>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Calendar
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      placeholder="Start Date"
                      dateFormat="dd-mm-yy"
                      showIcon
                      appendTo={() => document.body}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  End Date
                </label>
                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Calendar
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      placeholder="End Date"
                      dateFormat="dd-mm-yy"
                      showIcon
                      appendTo={() => document.body}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 lg:col-span-2">
                <label className="text-sm font-medium text-slate-700">
                  Search
                </label>
                <Controller
                  name="keyword"
                  control={control}
                  render={({ field }) => (
                    <InputText
                      {...field}
                      value={field.value}
                      placeholder="Search employee, shift, status, leave, overtime, date"
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Status
                </label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      value={field.value}
                      options={statusOptions}
                      onChange={(e) => field.onChange(e.value)}
                      placeholder="All Status"
                      showClear
                      appendTo={() => document.body}
                    />
                  )}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button
                label="Reset Filter"
                icon="pi pi-filter-slash"
                className="p-button-secondary"
                onClick={onResetFilter}
              />
              <Button
                label="Apply Filter"
                icon="pi pi-filter"
                onClick={onApplyFilter}
              />
            </div>
          </div>

          <Divider className="my-0" />

          {groupedData.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-10 text-center">
              <div className="text-base font-medium text-slate-700">
                No attendance summary found
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Try changing the date range, status, or keyword filter.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-lg font-semibold text-slate-800">
                      Daily Overview
                    </div>
                    <div className="text-xs text-slate-500">
                      Select one date to inspect employee attendance detail.
                    </div>
                  </div>

                  <div className="text-xs text-slate-500">
                    {groupedData.length} day
                    {groupedData.length > 1 ? "s" : ""} found
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {pagedGroups.map((group) => {
                    const isSelected = selectedGroup?.dateKey === group.dateKey;
                    const hasAbsent = group.absentCount > 0;

                    return (
                      <button
                        key={group.dateKey}
                        type="button"
                        onClick={() => onSelectDateGroup(group.dateKey)}
                        className={`rounded-2xl border p-4 text-left transition hover:shadow-sm ${
                          isSelected
                            ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                            : hasAbsent
                              ? "border-red-100 bg-red-50/40 hover:border-red-200"
                              : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-slate-900">
                              {group.dateLabel}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {group.rows.length} employee record
                              {group.rows.length > 1 ? "s" : ""}
                            </div>
                          </div>

                          {isSelected && (
                            <span className="pi pi-check-circle text-blue-600" />
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-green-100 bg-green-50 px-3 py-2">
                            <div className="text-xs text-green-700">
                              Present
                            </div>
                            <div className="text-base font-semibold text-green-800">
                              {group.presentCount}
                            </div>
                          </div>

                          <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                            <div className="text-xs text-blue-700">
                              Progress
                            </div>
                            <div className="text-base font-semibold text-blue-800">
                              {group.inProgressCount}
                            </div>
                          </div>

                          <div className="rounded-xl border border-yellow-100 bg-yellow-50 px-3 py-2">
                            <div className="text-xs text-yellow-700">
                              Incomplete
                            </div>
                            <div className="text-base font-semibold text-yellow-800">
                              {group.incompleteCount}
                            </div>
                          </div>

                          <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                            <div className="text-xs text-red-700">Absent</div>
                            <div className="text-base font-semibold text-red-800">
                              {group.absentCount}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          <Tag
                            value={`${group.absentCount} Absent`}
                            severity="danger"
                          />
                          <Tag
                            value={`${group.dayOffCount} Day Off`}
                            severity="info"
                          />
                          {group.leaveCount > 0 && (
                            <Tag
                              value={`${group.leaveCount} Leave`}
                              severity="warning"
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200">
                  <Paginator
                    first={groupFirst}
                    rows={groupsPerPage}
                    totalRecords={groupedData.length}
                    rowsPerPageOptions={[7, 14, 31, 62]}
                    onPageChange={onDateOverviewPageChange}
                  />
                </div>
              </section>

              {selectedGroup && (
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-slate-800">
                          Employee Detail — {selectedGroup.dateLabel}
                        </div>
                        <div className="text-xs text-slate-500">
                          Showing {selectedGroupRows.length} of{" "}
                          {selectedGroup.rows.length} employee record
                          {selectedGroup.rows.length > 1 ? "s" : ""}. Expand a
                          row to view scan and schedule detail.
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Tag
                          value={`${selectedGroupSummary.present} Present`}
                          severity="success"
                        />
                        <Tag
                          value={`${selectedGroupSummary.inProgress} In Progress`}
                          severity="info"
                        />
                        <Tag
                          value={`${selectedGroupSummary.incomplete} Incomplete`}
                          severity="warning"
                        />
                        <Tag
                          value={`${selectedGroupSummary.absent} Absent`}
                          severity="danger"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="flex flex-wrap gap-2">
                        {quickFilterOptions.map((item) => {
                          const isActive = detailQuickFilter === item.key;

                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() =>
                                onSelectDetailQuickFilter(item.key)
                              }
                              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                                isActive
                                  ? "border-blue-500 bg-blue-600 text-white"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              {item.label}
                              <span
                                className={`ml-1 ${
                                  isActive ? "text-blue-100" : "text-slate-400"
                                }`}
                              >
                                {item.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative">
                        <span className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
                        <InputText
                          value={detailEmployeeSearch}
                          onChange={(e) => {
                            setDetailEmployeeSearch(e.target.value);
                            setEmployeeFirst(0);
                            setExpandedRows(undefined);
                          }}
                          placeholder="Search employee name"
                          className="w-full pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <DataTable
                    value={selectedGroupRows}
                    dataKey="id"
                    expandedRows={expandedRows}
                    onRowToggle={(e: DataTableRowToggleEvent) => {
                      setExpandedRows(
                        e.data as DataTableExpandedRows | undefined,
                      );
                    }}
                    rowExpansionTemplate={rowExpansionTemplate}
                    stripedRows
                    scrollable
                    scrollHeight="520px"
                    paginator
                    first={employeeFirst}
                    rows={employeeRowsPerPage}
                    rowsPerPageOptions={[25, 50, 100]}
                    onPage={(event) => {
                      setEmployeeFirst(event.first);
                      setEmployeeRowsPerPage(event.rows);
                    }}
                    className="attendance-summary-inner-table"
                    emptyMessage="No employee data for this filter"
                  >
                    <Column expander style={{ width: "3rem" }} />

                    <Column
                      header="Employee"
                      body={(rowData: AttendanceSummaryRowView) => (
                        <div>
                          <div className="font-medium text-slate-800">
                            {rowData.employee_display_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {rowData.shift_name ?? "-"}
                          </div>
                        </div>
                      )}
                      style={{ minWidth: "14rem" }}
                    />

                    <Column
                      header="Status"
                      body={(rowData: AttendanceSummaryRowView) =>
                        renderStatusTag(rowData.status)
                      }
                      style={{ minWidth: "9rem" }}
                    />

                    <Column
                      header="Scan"
                      body={renderScanSummary}
                      style={{ minWidth: "12rem" }}
                    />

                    <Column
                      header="Worked"
                      body={renderWorkSummary}
                      style={{ minWidth: "9rem" }}
                    />

                    <Column
                      header="Exceptions"
                      body={renderExceptionSummary}
                      style={{ minWidth: "11rem" }}
                    />

                    <Column
                      header="Flags"
                      body={renderCompactFlags}
                      style={{ minWidth: "18rem" }}
                    />
                  </DataTable>
                </section>
              )}
            </div>
          )}

          {isValidating && (
            <div className="text-right text-xs text-slate-500">
              Refreshing data...
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

export default AttendanceSummaryTableData;
