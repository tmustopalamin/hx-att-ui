"use client";
import { getClientLocale, translateStaticText, useI18n } from "@/app/i18n";

import { apiFetchResponse } from "@/app/utils/api-client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import dayjs from "dayjs";
import {
  formatDate as formatDisplayDate,
  formatDateTimeWithSeconds,
} from "@/app/utils/date-format";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import {
  DataTable,
  DataTableExpandedRows,
  DataTableRowToggleEvent,
} from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Paginator, PaginatorPageChangeEvent } from "primereact/paginator";
import { Tag } from "primereact/tag";

import { useDispatch } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import { AttendanceSummary } from "@/app/types/attendance-summary";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";
import { getBackgroundJobDetail } from "@/app/services/background-job-service";

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
    job_id?: number;
    status?: string;
    deduplicated?: boolean;
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

const getBody = () => document.body;

const normalizeStatus = (status?: string | null) => {
  return String(status ?? "")
    .trim()
    .toUpperCase();
};

const formatStatusLabel = (status?: string | null) => {
  const normalized = normalizeStatus(status);

  if (!normalized) {
    return "Unknown";
  }

  return normalized
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};

const isIncompleteStatus = (status?: string | null) => {
  const normalized = normalizeStatus(status);

  return normalized === "INCOMPLETE" || normalized.startsWith("INCOMPLETE_");
};

const isLeaveRow = (row: AttendanceSummary) => {
  return normalizeStatus(row.status) === "LEAVE" || Boolean(row.is_leave);
};

const getMondayStartOfWeek = (date: dayjs.Dayjs) => {
  const currentDay = date.day();
  const daysFromMonday = (currentDay + 6) % 7;

  return date.subtract(daysFromMonday, "day").startOf("day");
};

const getDatePresetRange = (preset: DatePreset): [Date, Date] => {
  const now = dayjs();

  if (preset === "TODAY") {
    return [now.startOf("day").toDate(), now.endOf("day").toDate()];
  }

  if (preset === "THIS_WEEK") {
    const start = getMondayStartOfWeek(now);

    return [start.toDate(), start.add(6, "day").endOf("day").toDate()];
  }

  if (preset === "LAST_MONTH") {
    const lastMonth = now.subtract(1, "month");

    return [
      lastMonth.startOf("month").toDate(),
      lastMonth.endOf("month").toDate(),
    ];
  }

  return [now.startOf("month").toDate(), now.endOf("month").toDate()];
};

const getFileNameFromDisposition = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);

  return plainMatch?.[1] ?? null;
};

const downloadAttendanceSummaryExcel = async (
  startDate: Date,
  endDate: Date,
): Promise<string> => {
  const query = new URLSearchParams({
    start_date: dayjs(startDate).format("YYYY-MM-DD"),
    end_date: dayjs(endDate).format("YYYY-MM-DD"),
  });

  const response = await apiFetchResponse(
    `/api/attendance-summary/export-excel?${query.toString()}`,
    {
      method: "GET",
      credentials: "include",
    },
  );

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const json = await response.json().catch(() => null);

      throw new Error(
        json?.message ||
          json?.error ||
          translateStaticText(
            "Failed to export attendance summary.",
            getClientLocale(),
          ),
      );
    }

    const text = await response.text().catch(() => "");

    throw new Error(
      text ||
        translateStaticText(
          "Failed to export attendance summary.",
          getClientLocale(),
        ),
    );
  }

  const blob = await response.blob();

  const dispositionFileName = getFileNameFromDisposition(
    response.headers.get("content-disposition"),
  );

  const safeDispositionFileName = dispositionFileName?.split(/[/\\]/).pop();

  const fileName =
    safeDispositionFileName ||
    `attendance_summary_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;

  const url = window.URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 0);

  return fileName;
};

const processAttendanceSummary = async (
  startDate: Date,
  endDate: Date,
): Promise<ProcessResponse> => {
  const response = await apiFetchResponse("/api/attendance-summary/process", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_date: dayjs(startDate).format("YYYY-MM-DD"),
      end_date: dayjs(endDate).format("YYYY-MM-DD"),
    }),
  });

  const json = (await response
    .json()
    .catch(() => null)) as ProcessResponse | null;

  if (!response.ok) {
    throw new Error(
      json?.message ||
        translateStaticText(
          "Failed to process attendance summary.",
          getClientLocale(),
        ),
    );
  }

  return (
    json ?? {
      success: true,
      message: translateStaticText(
        "Attendance summary processed successfully.",
        getClientLocale(),
      ),
    }
  );
};

const AttendanceSummaryTableData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();

  const defaultRange = useMemo(() => {
    const [startDate, endDate] = getDatePresetRange("THIS_MONTH");

    return {
      startDate,
      endDate,
    };
  }, []);

  const { control, getValues, reset, setValue } = useForm<FilterForm>({
    defaultValues: {
      startDate: defaultRange.startDate,
      endDate: defaultRange.endDate,
      keyword: "",
      status: null,
    },
  });

  const keyword =
    useWatch({
      control,
      name: "keyword",
    }) ?? "";

  const statusFilter =
    useWatch({
      control,
      name: "status",
    }) ?? null;

  const [appliedStartDate, setAppliedStartDate] = useState<Date | null>(
    defaultRange.startDate,
  );

  const [appliedEndDate, setAppliedEndDate] = useState<Date | null>(
    defaultRange.endDate,
  );

  const [activeDatePreset, setActiveDatePreset] = useState<DatePreset | null>(
    "THIS_MONTH",
  );

  const [isProcessing, setIsProcessing] = useState(false);

  const [processingJobId, setProcessingJobId] = useState<number | null>(null);

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
    mutate: refreshAttendanceSummaryData,
  } = useSWR<AttendanceSummary[]>(swrKey, fetcher, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (processingJobId === null) {
      return;
    }

    let cancelled = false;

    const pollJob = async () => {
      try {
        const job = await getBackgroundJobDetail(processingJobId);
        if (cancelled) {
          return;
        }

        if (["SUCCEEDED", "PARTIAL_SUCCESS"].includes(job.status)) {
          setProcessingJobId(null);
          await refreshAttendanceSummaryData();
          setActionSuccess(
            `Attendance Summary selesai diproses oleh Background Job #${processingJobId}.`,
          );
          return;
        }

        if (["FAILED", "CANCELLED"].includes(job.status)) {
          setProcessingJobId(null);
          setActionError(
            job.error_message ||
              `Background Job #${processingJobId} berakhir dengan status ${job.status}.`,
          );
        }
      } catch {
        // Processing was already accepted, but this user may only have the
        // permission to enqueue a job and not to read its details. Stop the
        // timer and make the state recoverable instead of leaving Refresh
        // disabled forever. The job can still be checked from Background
        // Jobs or by refreshing the page when access is available.
        if (cancelled) {
          return;
        }

        const message = `Background Job #${processingJobId} sudah diterima, tetapi statusnya tidak dapat dipantau dari halaman ini. Buka menu Background Jobs atau lakukan refresh manual untuk memeriksa hasilnya.`;

        setProcessingJobId(null);
        setActionError(message);
        dispatch(
          showToast({
            visible: true,
            severity: "warn",
            summary: "Status job tidak tersedia",
            detail: message,
          }),
        );
      }
    };

    void pollJob();
    const interval = window.setInterval(() => void pollJob(), 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [dispatch, processingJobId, refreshAttendanceSummaryData]);

  const rows = attendanceSummaryData ?? [];

  const statusOptions = useMemo(() => {
    const values = Array.from(
      new Set(rows.map((item) => normalizeStatus(item.status)).filter(Boolean)),
    ).sort((first, second) => first.localeCompare(second));

    return values.map((value) => ({
      label: i18nT(formatStatusLabel(value)),
      value,
    }));
  }, [i18nT, rows]);

  const filteredRows = useMemo<AttendanceSummaryRowView[]>(() => {
    const search = keyword.trim().toLowerCase();

    return rows
      .map((item) => {
        const summaryDate = dayjs(item.summary_date);

        const dateIsValid = summaryDate.isValid();

        const employeeDisplayName =
          item.employee_name ??
          i18nT("Employee #{p0}", { p0: item.employee_id });

        return {
          ...item,
          group_date_key: dateIsValid
            ? summaryDate.format("YYYY-MM-DD")
            : "unknown-date",
          group_date_label: dateIsValid
            ? formatDisplayDate(summaryDate.toDate())
            : i18nT("Unknown Date"),
          employee_display_name: employeeDisplayName,
          employee_search_name: employeeDisplayName.toLowerCase(),
        };
      })
      .filter((item) => {
        const normalizedStatus = normalizeStatus(item.status);

        const shift = item.shift_name ?? "";

        const dateText =
          item.group_date_key === "unknown-date"
            ? ""
            : dayjs(item.summary_date).format("DD-MM-YYYY");

        const leaveText = item.leave_name ?? "";

        const overtimeText = item.overtime_status ?? "";

        const matchKeyword =
          !search ||
          item.employee_search_name.includes(search) ||
          shift.toLowerCase().includes(search) ||
          normalizedStatus.toLowerCase().includes(search) ||
          leaveText.toLowerCase().includes(search) ||
          overtimeText.toLowerCase().includes(search) ||
          dateText.includes(search);

        const matchStatus =
          !statusFilter || normalizedStatus === normalizeStatus(statusFilter);

        return matchKeyword && matchStatus;
      })
      .sort((first, second) => {
        const dateCompare = first.group_date_key.localeCompare(
          second.group_date_key,
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        return first.employee_display_name.localeCompare(
          second.employee_display_name,
        );
      });
  }, [i18nT, rows, keyword, statusFilter]);

  const groupedData = useMemo<AttendanceSummaryDateGroup[]>(() => {
    const groups = new Map<string, AttendanceSummaryRowView[]>();

    for (const row of filteredRows) {
      const existingRows = groups.get(row.group_date_key) ?? [];

      groups.set(row.group_date_key, [...existingRows, row]);
    }

    return Array.from(groups.entries()).map(([dateKey, groupRows]) => {
      return {
        dateKey,
        dateLabel: groupRows[0]?.group_date_label ?? dateKey,
        rows: groupRows,
        presentCount: groupRows.filter(
          (item) => normalizeStatus(item.status) === "PRESENT",
        ).length,
        inProgressCount: groupRows.filter(
          (item) => normalizeStatus(item.status) === "IN_PROGRESS",
        ).length,
        incompleteCount: groupRows.filter((item) =>
          isIncompleteStatus(item.status),
        ).length,
        absentCount: groupRows.filter(
          (item) => normalizeStatus(item.status) === "ABSENT",
        ).length,
        dayOffCount: groupRows.filter(
          (item) => normalizeStatus(item.status) === "DAY_OFF",
        ).length,
        leaveCount: groupRows.filter((item) => isLeaveRow(item)).length,
      };
    });
  }, [filteredRows]);

  useEffect(() => {
    if (groupedData.length === 0) {
      setSelectedDateKey(null);
      setEmployeeFirst(0);
      setExpandedRows(undefined);
      return;
    }

    const selectedStillExists =
      selectedDateKey !== null &&
      groupedData.some((group) => group.dateKey === selectedDateKey);

    if (!selectedStillExists) {
      setSelectedDateKey(groupedData[0].dateKey);

      setEmployeeFirst(0);
      setExpandedRows(undefined);
    }
  }, [groupedData, selectedDateKey]);

  useEffect(() => {
    if (groupFirst < groupedData.length) {
      return;
    }

    const lastPageFirst =
      groupedData.length === 0
        ? 0
        : Math.floor((groupedData.length - 1) / groupsPerPage) * groupsPerPage;

    setGroupFirst(lastPageFirst);
  }, [groupedData.length, groupFirst, groupsPerPage]);

  useEffect(() => {
    setEmployeeFirst(0);
    setExpandedRows(undefined);
  }, [keyword, statusFilter]);

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
      const normalizedStatus = normalizeStatus(item.status);

      let matchQuickFilter = true;

      if (detailQuickFilter === "LEAVE") {
        matchQuickFilter = isLeaveRow(item);
      } else if (detailQuickFilter === "INCOMPLETE") {
        matchQuickFilter = isIncompleteStatus(item.status);
      } else if (detailQuickFilter !== "ALL") {
        matchQuickFilter = normalizedStatus === detailQuickFilter;
      }

      const matchEmployee =
        !employeeSearch || item.employee_search_name.includes(employeeSearch);

      return matchQuickFilter && matchEmployee;
    });
  }, [selectedGroup, detailQuickFilter, detailEmployeeSearch]);

  useEffect(() => {
    if (employeeFirst < selectedGroupRows.length) {
      return;
    }

    const lastPageFirst =
      selectedGroupRows.length === 0
        ? 0
        : Math.floor((selectedGroupRows.length - 1) / employeeRowsPerPage) *
          employeeRowsPerPage;

    setEmployeeFirst(lastPageFirst);
  }, [selectedGroupRows.length, employeeFirst, employeeRowsPerPage]);

  const summaryStats = useMemo(() => {
    return {
      total: filteredRows.length,
      present: filteredRows.filter(
        (item) => normalizeStatus(item.status) === "PRESENT",
      ).length,
      inProgress: filteredRows.filter(
        (item) => normalizeStatus(item.status) === "IN_PROGRESS",
      ).length,
      incomplete: filteredRows.filter((item) => isIncompleteStatus(item.status))
        .length,
      absent: filteredRows.filter(
        (item) => normalizeStatus(item.status) === "ABSENT",
      ).length,
      dayOff: filteredRows.filter(
        (item) => normalizeStatus(item.status) === "DAY_OFF",
      ).length,
      leave: filteredRows.filter((item) => isLeaveRow(item)).length,
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

    return `${formatDisplayDate(appliedStartDate)} – ${formatDisplayDate(
      appliedEndDate,
    )}`;
  }, [appliedStartDate, appliedEndDate]);

  const isActionRunning =
    isProcessing || isExporting || processingJobId !== null;

  const showSuccess = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "success",
        summary: i18nT("static.udvru8"),
        detail: message,
      }),
    );
  };

  const showError = (err: unknown) => {
    if (isResponseTypeError(err)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: getErrorMessage(err, "message"),
        }),
      );

      return;
    }

    if (err instanceof Error) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: i18nT(err.message),
        }),
      );

      return;
    }

    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: i18nT("static.1vks92p"),
        detail: i18nT("static.37lwsc"),
      }),
    );
  };

  const clearActionMessage = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const resetViewState = () => {
    setSelectedDateKey(null);
    setExpandedRows(undefined);
    setGroupFirst(0);
    setEmployeeFirst(0);
    setDetailEmployeeSearch("");
    setDetailQuickFilter("ALL");
  };

  const handleRefresh = async () => {
    try {
      await refreshAttendanceSummaryData();
    } catch (err: unknown) {
      showError(err);
    }
  };

  const applyDatePreset = (preset: DatePreset) => {
    const [startDate, endDate] = getDatePresetRange(preset);

    setValue("startDate", startDate);

    setValue("endDate", endDate);

    setAppliedStartDate(startDate);

    setAppliedEndDate(endDate);
    setActiveDatePreset(preset);

    resetViewState();
    clearActionMessage();
  };

  const onApplyFilter = () => {
    clearActionMessage();

    const { startDate, endDate } = getValues();

    if (!startDate || !endDate) {
      const message = i18nT("Start Date and End Date are required.");

      setActionError(message);
      showError(new Error(message));
      return;
    }

    if (dayjs(startDate).isAfter(dayjs(endDate), "day")) {
      const message = i18nT("Start Date cannot be later than End Date.");

      setActionError(message);
      showError(new Error(message));
      return;
    }

    setAppliedStartDate(startDate);

    setAppliedEndDate(endDate);
    setActiveDatePreset(null);

    resetViewState();
  };

  const onResetFilter = () => {
    reset({
      startDate: defaultRange.startDate,
      endDate: defaultRange.endDate,
      keyword: "",
      status: null,
    });

    setAppliedStartDate(defaultRange.startDate);

    setAppliedEndDate(defaultRange.endDate);

    setActiveDatePreset("THIS_MONTH");

    resetViewState();
    clearActionMessage();
  };

  const handleProcessAttendance = async () => {
    if (!appliedStartDate || !appliedEndDate) {
      return;
    }

    try {
      setIsProcessing(true);
      clearActionMessage();

      const result = await processAttendanceSummary(
        appliedStartDate,
        appliedEndDate,
      );

      const jobId = result.data?.job_id;

      const message =
        jobId !== undefined
          ? `Attendance Summary masuk antrean Background Job #${jobId}. Data akan diperbarui setelah job selesai.`
          : result.message || "Attendance Summary berhasil diproses.";

      setActionSuccess(message);
      if (jobId !== undefined) {
        setProcessingJobId(jobId);
      }
      dispatch(
        showToast({
          visible: true,
          severity: "info",
          summary: result.data?.deduplicated
            ? "Job sudah tersedia"
            : "Job berhasil dibuat",
          detail: message,
        }),
      );
      if (jobId === undefined) {
        await refreshAttendanceSummaryData();
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : i18nT("Failed to process attendance summary.");

      setActionError(message);
      showError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const onClickProcessAttendance = () => {
    clearActionMessage();

    if (!appliedStartDate || !appliedEndDate) {
      const message = i18nT("Apply Start Date and End Date before processing.");

      setActionError(message);
      showError(new Error(message));

      return;
    }

    requestActionConfirmation({
      header: i18nT("static.1kq1p6x"),
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.be9v53")} </span>

          <span className="font-semibold text-slate-800">
            {i18nT(currentRangeLabel)}
          </span>

          <span className="text-sm text-slate-500">
            {i18nT("static.sdy1z")}{" "}
          </span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => {
        void handleProcessAttendance();
      },
      reject: () => undefined,
      footer: (options) => (
        <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
          <Button
            type="button"
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.2ua80q")}
            icon="pi pi-refresh"
            severity="warning"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const exportExcel = async () => {
    clearActionMessage();

    if (!appliedStartDate || !appliedEndDate) {
      const message = i18nT("Apply Start Date and End Date before exporting.");

      setActionError(message);
      showError(new Error(message));

      return;
    }

    if (dayjs(appliedStartDate).isAfter(dayjs(appliedEndDate), "day")) {
      const message = i18nT("Start Date cannot be later than End Date.");

      setActionError(message);
      showError(new Error(message));

      return;
    }

    try {
      setIsExporting(true);

      const fileName = await downloadAttendanceSummaryExcel(
        appliedStartDate,
        appliedEndDate,
      );

      const message = i18nT("Attendance summary exported successfully: {p0}", {
        p0: fileName,
      });

      setActionSuccess(message);
      showSuccess(message);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : i18nT("Failed to export attendance summary.");

      setActionError(message);
      showError(err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) {
      return "-";
    }

    const parsed = dayjs(value);

    return formatDateTimeWithSeconds(parsed.toDate());
  };

  const formatTimeOnly = (value?: string | null) => {
    if (!value) {
      return "-";
    }

    const parsed = dayjs(value);

    return parsed.isValid() ? parsed.format("HH:mm") : "-";
  };

  const formatSeconds = (seconds?: number | null) => {
    const totalSeconds = Math.max(0, Number(seconds ?? 0));

    const hours = Math.floor(totalSeconds / 3600);

    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours}h ${minutes}m`;
  };

  const renderStatusTag = (status?: string | null) => {
    const normalized = normalizeStatus(status);

    if (normalized === "PRESENT") {
      return (
        <Tag
          value={i18nT("static.1m3e00c")}
          severity="success"
          icon="pi pi-check-circle"
          rounded
        />
      );
    }

    if (normalized === "IN_PROGRESS") {
      return (
        <Tag
          value={i18nT("static.w3n5x")}
          severity="info"
          icon="pi pi-clock"
          rounded
        />
      );
    }

    if (isIncompleteStatus(normalized)) {
      return (
        <Tag
          value={i18nT(formatStatusLabel(normalized))}
          severity="warning"
          icon="pi pi-exclamation-circle"
          rounded
        />
      );
    }

    if (normalized === "ABSENT") {
      return (
        <Tag
          value={i18nT("static.meu720")}
          severity="danger"
          icon="pi pi-times-circle"
          rounded
        />
      );
    }

    if (normalized === "DAY_OFF") {
      return (
        <Tag
          value={i18nT("static.776hx0")}
          severity="secondary"
          icon="pi pi-calendar-times"
          rounded
        />
      );
    }

    if (normalized === "LEAVE") {
      return (
        <Tag
          value={i18nT("static.1xf0sbk")}
          severity="info"
          icon="pi pi-briefcase"
          rounded
        />
      );
    }

    if (normalized === "UNSCHEDULED") {
      return (
        <Tag value={i18nT("static.1ntsght")} severity="secondary" rounded />
      );
    }

    return (
      <Tag
        value={i18nT(formatStatusLabel(normalized))}
        severity="secondary"
        rounded
      />
    );
  };

  const renderCompactFlags = (rowData: AttendanceSummaryRowView) => {
    const flags: ReactNode[] = [];

    if (rowData.is_leave || rowData.leave_id) {
      flags.push(
        <Tag
          key="leave"
          value={
            rowData.leave_name
              ? i18nT("static.1qfm976", { p0: rowData.leave_name })
              : i18nT("static.1xf0sbk")
          }
          severity="warning"
          rounded
        />,
      );
    }

    if (
      rowData.is_overtime ||
      rowData.overtime_request_id ||
      Number(rowData.overtime_seconds ?? 0) > 0
    ) {
      const overtimeDuration = formatSeconds(rowData.overtime_seconds);

      const overtimeTime =
        rowData.overtime_start_time && rowData.overtime_end_time
          ? `${formatTimeOnly(rowData.overtime_start_time)} – ${formatTimeOnly(
              rowData.overtime_end_time,
            )}`
          : null;

      flags.push(
        <Tag
          key="overtime"
          value={
            overtimeTime
              ? i18nT("static.12vkwso", {
                  p0: overtimeDuration,
                  p1: overtimeTime,
                })
              : i18nT("static.1j0gc54", { p0: overtimeDuration })
          }
          severity="info"
          rounded
        />,
      );
    }

    if (rowData.is_missing_check_in) {
      flags.push(
        <Tag
          key="missing-in"
          value={i18nT("static.gt5j7i")}
          severity="danger"
          rounded
        />,
      );
    }

    if (rowData.is_missing_check_out) {
      flags.push(
        <Tag
          key="missing-out"
          value={i18nT("static.ye2qin")}
          severity="danger"
          rounded
        />,
      );
    }

    if (rowData.is_late) {
      flags.push(
        <Tag
          key="late"
          value={i18nT("static.u9ge9")}
          severity="warning"
          rounded
        />,
      );
    }

    if (rowData.is_early_co) {
      flags.push(
        <Tag
          key="early"
          value={i18nT("static.saa7p4")}
          severity="warning"
          rounded
        />,
      );
    }

    if (rowData.is_holiday) {
      flags.push(
        <Tag
          key="holiday"
          value={i18nT("static.ih7a2j")}
          severity="info"
          rounded
        />,
      );
    }

    if (rowData.is_weekend) {
      flags.push(
        <Tag
          key="weekend"
          value={i18nT("static.1kghrsy")}
          severity="secondary"
          rounded
        />,
      );
    }

    if (rowData.is_absent) {
      flags.push(
        <Tag
          key="absent"
          value={i18nT("static.meu720")}
          severity="danger"
          rounded
        />,
      );
    }

    if (rowData.is_unscheduled) {
      flags.push(
        <Tag
          key="unscheduled"
          value={i18nT("static.1ntsght")}
          severity="secondary"
          rounded
        />,
      );
    }

    if (!flags.length) {
      return (
        <span className="text-sm text-slate-400">
          {i18nT("static.18bns95")}
        </span>
      );
    }

    return <div className="flex flex-wrap gap-1">{flags}</div>;
  };

  const renderScanSummary = (rowData: AttendanceSummaryRowView) => {
    const logCount = Number(rowData.attendance_log_count ?? 0);

    return (
      <div className="min-w-[11rem]">
        <div className="whitespace-nowrap text-sm font-medium text-slate-700">
          {rowData.check_in_time
            ? dayjs(rowData.check_in_time).format("HH:mm:ss")
            : "-"}

          <span className="mx-1 text-slate-400">{i18nT("static.142kvve")}</span>

          {rowData.check_out_time
            ? dayjs(rowData.check_out_time).format("HH:mm:ss")
            : "-"}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {logCount} {i18nT("static.hkgn69")}{" "}
          {logCount === 1 ? "" : i18nT("static.1w9pcoy")}
        </div>
      </div>
    );
  };

  const renderWorkSummary = (rowData: AttendanceSummaryRowView) => {
    return (
      <div className="min-w-[9rem]">
        <div className="text-sm font-medium text-slate-700">
          {formatSeconds(rowData.work_seconds)}
        </div>

        <div className="mt-1 text-xs text-slate-500">
          {i18nT("static.17spnvc")} {formatSeconds(rowData.break_seconds)}
        </div>
      </div>
    );
  };

  const renderExceptionSummary = (rowData: AttendanceSummaryRowView) => {
    const lateSeconds = Number(rowData.late_seconds ?? 0);

    const earlyOutSeconds = Number(rowData.early_out_seconds ?? 0);

    const hasException =
      lateSeconds > 0 ||
      earlyOutSeconds > 0 ||
      rowData.is_missing_check_in ||
      rowData.is_missing_check_out;

    if (!hasException) {
      return (
        <span className="text-sm text-slate-400">{i18nT("static.deku7v")}</span>
      );
    }

    return (
      <div className="flex flex-col gap-1 text-xs">
        {lateSeconds > 0 && (
          <span className="text-amber-700">
            {i18nT("static.u9ge9")} {formatSeconds(lateSeconds)}
          </span>
        )}

        {earlyOutSeconds > 0 && (
          <span className="text-amber-700">
            {i18nT("static.1zlcfw")} {formatSeconds(earlyOutSeconds)}
          </span>
        )}

        {rowData.is_missing_check_in && (
          <span className="text-red-600">{i18nT("static.1kl86ht")}</span>
        )}

        {rowData.is_missing_check_out && (
          <span className="text-red-600">{i18nT("static.78bkv6")}</span>
        )}
      </div>
    );
  };

  const rowExpansionTemplate = (rowData: AttendanceSummaryRowView) => {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {i18nT("static.qn7l2w")}{" "}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.2m3vb2")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatDateTime(rowData.check_in_time)}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.efitfj")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatDateTime(rowData.check_out_time)}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.mnp3mu")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {rowData.attendance_log_count ?? 0}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.3pd73")}
                </p>

                <div className="mt-1">{renderStatusTag(rowData.status)}</div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {i18nT("static.1iiunk1")}{" "}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.30xvgf")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatDateTime(rowData.scheduled_start_time)}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.1llf32i")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatDateTime(rowData.scheduled_end_time)}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.149t0qc")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatDateTime(rowData.scheduled_break_start_time)}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.sviki5")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatDateTime(rowData.scheduled_break_end_time)}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {i18nT("static.k39ps8")}{" "}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.x8vlpb")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatSeconds(rowData.work_seconds)}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.17spnvc")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatSeconds(rowData.break_seconds)}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.u9ge9")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatSeconds(rowData.late_seconds)}
                </p>
              </div>

              <div>
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.saa7p4")}
                </p>

                <p className="m-0 mt-1 font-medium text-slate-800">
                  {formatSeconds(rowData.early_out_seconds)}
                </p>
              </div>

              <div className="col-span-2">
                <p className="m-0 mb-2 text-xs text-slate-500">
                  {i18nT("static.icm958")}
                </p>

                {renderCompactFlags(rowData)}
              </div>
            </div>
          </section>
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

  const quickFilterOptions: {
    key: DetailQuickFilter;
    label: string;
    count: number;
  }[] = [
    {
      key: "ALL",
      label: i18nT("static.wnjk2s"),
      count: selectedGroupSummary.total,
    },
    {
      key: "PRESENT",
      label: i18nT("static.1m3e00c"),
      count: selectedGroupSummary.present,
    },
    {
      key: "IN_PROGRESS",
      label: i18nT("static.w3n5x"),
      count: selectedGroupSummary.inProgress,
    },
    {
      key: "INCOMPLETE",
      label: i18nT("static.t03g3p"),
      count: selectedGroupSummary.incomplete,
    },
    {
      key: "ABSENT",
      label: i18nT("static.meu720"),
      count: selectedGroupSummary.absent,
    },
    {
      key: "DAY_OFF",
      label: i18nT("static.776hx0"),
      count: selectedGroupSummary.dayOff,
    },
    {
      key: "LEAVE",
      label: i18nT("static.1xf0sbk"),
      count: selectedGroupSummary.leave,
    },
  ];

  if (isLoading && !attendanceSummaryData) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={swrKey} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Page Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-chart-bar text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.1w1ugxu")}{" "}
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.uda9vd")}{" "}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                label={i18nT("static.28r6qc")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isValidating}
                disabled={isValidating || isActionRunning}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />

              <Button
                type="button"
                label={i18nT("static.1eit71x")}
                icon="pi pi-cog"
                severity="warning"
                size="small"
                loading={isProcessing}
                disabled={isExporting}
                className="w-full sm:w-auto"
                onClick={onClickProcessAttendance}
              />

              <Button
                type="button"
                label={i18nT("static.1tpgeic")}
                icon="pi pi-file-excel"
                severity="success"
                outlined
                size="small"
                loading={isExporting}
                disabled={isProcessing || !appliedStartDate || !appliedEndDate}
                className="w-full sm:w-auto"
                onClick={() => {
                  void exportExcel();
                }}
              />
            </div>
          </div>

          {(actionError || actionSuccess) && (
            <div
              className={`rounded-xl border p-4 ${
                actionError
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 text-sm leading-6">
                  <i
                    className={`mt-1 ${
                      actionError
                        ? "pi pi-exclamation-circle"
                        : "pi pi-check-circle"
                    }`}
                  />

                  <span>{actionError || actionSuccess}</span>
                </div>

                <Button
                  type="button"
                  icon="pi pi-times"
                  text
                  rounded
                  severity="secondary"
                  size="small"
                  aria-label={i18nT("static.1q15bfk")}
                  tooltip={i18nT("static.1q15bfk")}
                  onClick={clearActionMessage}
                />
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
              <p className="m-0 text-xs text-slate-500">
                {i18nT("static.1k1zuej")}
              </p>

              <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                {i18nT(currentRangeLabel)}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-400">
                {summaryStats.total} {i18nT("static.16lj2ws")}{" "}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="m-0 text-xs text-green-700">
                {i18nT("static.1m3e00c")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-green-800">
                {summaryStats.present}
              </p>
            </div>

            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="m-0 text-xs text-blue-700">
                {i18nT("static.w3n5x")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-blue-800">
                {summaryStats.inProgress}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="m-0 text-xs text-amber-700">
                {i18nT("static.t03g3p")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-amber-800">
                {summaryStats.incomplete}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="m-0 text-xs text-red-700">
                {i18nT("static.meu720")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-red-800">
                {summaryStats.absent}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="m-0 text-xs text-slate-600">
                {i18nT("static.j4km6m")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
                {summaryStats.dayOff + summaryStats.leave}
              </p>
            </div>
          </div>

          {/* Filters */}
          <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.adlnp7")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {i18nT("static.1fpsl1")}{" "}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                [
                  {
                    key: "TODAY",
                    label: i18nT("static.1sawk0u"),
                    icon: "pi pi-calendar",
                  },
                  {
                    key: "THIS_WEEK",
                    label: i18nT("static.he9t3n"),
                    icon: "pi pi-calendar",
                  },
                  {
                    key: "THIS_MONTH",
                    label: i18nT("static.usin9z"),
                    icon: "pi pi-calendar",
                  },
                  {
                    key: "LAST_MONTH",
                    label: i18nT("static.shnumn"),
                    icon: "pi pi-history",
                  },
                ] as {
                  key: DatePreset;
                  label: string;
                  icon: string;
                }[]
              ).map((preset) => {
                const isActive = activeDatePreset === preset.key;

                return (
                  <Button
                    key={preset.key}
                    type="button"
                    label={preset.label}
                    icon={preset.icon}
                    size="small"
                    severity={isActive ? "info" : "secondary"}
                    outlined={!isActive}
                    onClick={() => applyDatePreset(preset.key)}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(18rem,2fr)_minmax(13rem,1fr)]">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="summary_start_date"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.7bl5hd")}{" "}
                </label>

                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <Calendar
                      id="summary_start_date"
                      appendTo={getBody}
                      value={field.value}
                      dateFormat="dd MM yy"
                      showIcon
                      placeholder={i18nT("static.7bl5hd")}
                      className="w-full"
                      onChange={(event) => {
                        field.onChange(event.value ?? null);

                        setActiveDatePreset(null);
                      }}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="summary_end_date"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1j4m31m")}{" "}
                </label>

                <Controller
                  name="endDate"
                  control={control}
                  render={({ field }) => (
                    <Calendar
                      id="summary_end_date"
                      appendTo={getBody}
                      value={field.value}
                      dateFormat="dd MM yy"
                      showIcon
                      placeholder={i18nT("static.1j4m31m")}
                      className="w-full"
                      onChange={(event) => {
                        field.onChange(event.value ?? null);

                        setActiveDatePreset(null);
                      }}
                    />
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="summary_keyword"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1j0itop")}{" "}
                </label>

                <Controller
                  name="keyword"
                  control={control}
                  render={({ field }) => (
                    <IconField iconPosition="left" className="w-full">
                      <InputIcon className="pi pi-search" />

                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="summary_keyword"
                        placeholder={i18nT("static.sin5v2")}
                        className="w-full"
                      />
                    </IconField>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="summary_status"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.3pd73")}{" "}
                </label>

                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Dropdown
                      id="summary_status"
                      appendTo={getBody}
                      value={field.value}
                      options={statusOptions}
                      placeholder={i18nT("static.18zxnji")}
                      showClear
                      className="w-full"
                      onChange={(event) => field.onChange(event.value ?? null)}
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                label={i18nT("static.1ljj5w3")}
                icon="pi pi-filter-slash"
                severity="secondary"
                outlined
                className="w-full sm:w-auto"
                onClick={onResetFilter}
              />

              <Button
                type="button"
                label={i18nT("static.vcbuap")}
                icon="pi pi-filter"
                className="w-full sm:w-auto"
                onClick={onApplyFilter}
              />
            </div>
          </section>

          {groupedData.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
              <i className="pi pi-calendar-times mb-3 text-3xl text-slate-400" />

              <p className="m-0 text-sm font-semibold text-slate-700">
                {i18nT("static.6ot065")}{" "}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.j2fqrf")}{" "}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              {/* Daily Overview */}
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="m-0 text-base font-semibold text-slate-800">
                      {i18nT("static.1vom8ft")}{" "}
                    </h2>

                    <p className="m-0 mt-1 text-xs text-slate-500">
                      {i18nT("static.1kn7rqg")}{" "}
                    </p>
                  </div>

                  <Tag
                    value={i18nT("static.hfmgvu", {
                      p0: groupedData.length,
                      p1:
                        groupedData.length === 1 ? "" : i18nT("static.1w9pcoy"),
                    })}
                    severity="secondary"
                    rounded
                  />
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
                        className={`rounded-xl border p-4 text-left transition hover:shadow-sm ${
                          isSelected
                            ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
                            : hasAbsent
                              ? "border-red-200 bg-red-50/40 hover:border-red-300"
                              : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-base font-semibold text-slate-800">
                              {group.dateLabel}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {group.rows.length} {i18nT("static.1h11q02")}{" "}
                              {group.rows.length === 1
                                ? ""
                                : i18nT("static.1w9pcoy")}
                            </div>
                          </div>

                          {isSelected && (
                            <i className="pi pi-check-circle text-blue-600" />
                          )}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="rounded-lg border border-green-100 bg-green-50 px-3 py-2">
                            <div className="text-xs text-green-700">
                              {i18nT("static.1m3e00c")}{" "}
                            </div>

                            <div className="text-base font-semibold text-green-800">
                              {group.presentCount}
                            </div>
                          </div>

                          <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                            <div className="text-xs text-blue-700">
                              {i18nT("static.79u6hy")}{" "}
                            </div>

                            <div className="text-base font-semibold text-blue-800">
                              {group.inProgressCount}
                            </div>
                          </div>

                          <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
                            <div className="text-xs text-amber-700">
                              {i18nT("static.t03g3p")}{" "}
                            </div>

                            <div className="text-base font-semibold text-amber-800">
                              {group.incompleteCount}
                            </div>
                          </div>

                          <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2">
                            <div className="text-xs text-red-700">
                              {i18nT("static.meu720")}
                            </div>

                            <div className="text-base font-semibold text-red-800">
                              {group.absentCount}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1">
                          <Tag
                            value={i18nT("static.dsk4nq", {
                              p0: group.dayOffCount,
                            })}
                            severity="secondary"
                            rounded
                          />

                          {group.leaveCount > 0 && (
                            <Tag
                              value={i18nT("static.f27o62", {
                                p0: group.leaveCount,
                              })}
                              severity="warning"
                              rounded
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

              {/* Employee Detail */}
              {selectedGroup && (
                <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <h2 className="m-0 text-base font-semibold text-slate-800">
                          {i18nT("static.h89fcm")} {selectedGroup.dateLabel}
                        </h2>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          {i18nT("static.1j6rifw")} {selectedGroupRows.length}{" "}
                          {i18nT("static.t6uqnc")} {selectedGroup.rows.length}{" "}
                          {i18nT("static.1rv8bm3")}{" "}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Tag
                          value={i18nT("static.1lmpux2", {
                            p0: selectedGroupSummary.present,
                          })}
                          severity="success"
                          rounded
                        />

                        <Tag
                          value={i18nT("static.1p8mz3r", {
                            p0: selectedGroupSummary.inProgress,
                          })}
                          severity="info"
                          rounded
                        />

                        <Tag
                          value={i18nT("static.1uww7sr", {
                            p0: selectedGroupSummary.incomplete,
                          })}
                          severity="warning"
                          rounded
                        />

                        <Tag
                          value={i18nT("static.tkkhwm", {
                            p0: selectedGroupSummary.absent,
                          })}
                          severity="danger"
                          rounded
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_20rem]">
                      <div className="flex flex-wrap gap-2">
                        {quickFilterOptions.map((item) => {
                          const isActive = detailQuickFilter === item.key;

                          return (
                            <Button
                              key={item.key}
                              type="button"
                              label={i18nT("static.y7k7q", {
                                p0: item.label,
                                p1: item.count,
                              })}
                              size="small"
                              severity={isActive ? "info" : "secondary"}
                              outlined={!isActive}
                              onClick={() =>
                                onSelectDetailQuickFilter(item.key)
                              }
                            />
                          );
                        })}
                      </div>

                      <IconField iconPosition="left" className="w-full">
                        <InputIcon className="pi pi-search" />

                        <InputText
                          value={detailEmployeeSearch}
                          placeholder={i18nT("static.1otbkcq")}
                          className="w-full"
                          onChange={(event) => {
                            setDetailEmployeeSearch(event.target.value);

                            setEmployeeFirst(0);

                            setExpandedRows(undefined);
                          }}
                        />
                      </IconField>
                    </div>
                  </div>

                  <div className="w-full overflow-hidden">
                    <DataTable
                      value={selectedGroupRows}
                      dataKey="id"
                      expandedRows={expandedRows}
                      onRowToggle={(event: DataTableRowToggleEvent) =>
                        setExpandedRows(
                          event.data as DataTableExpandedRows | undefined,
                        )
                      }
                      rowExpansionTemplate={rowExpansionTemplate}
                      paginator
                      first={employeeFirst}
                      rows={employeeRowsPerPage}
                      rowsPerPageOptions={[25, 50, 100]}
                      onPage={(event) => {
                        setEmployeeFirst(event.first);

                        setEmployeeRowsPerPage(event.rows);
                      }}
                      stripedRows
                      rowHover
                      scrollable
                      removableSort
                      responsiveLayout="scroll"
                      size="small"
                      scrollHeight="520px"
                      loading={isValidating}
                      tableStyle={{
                        minWidth: "78rem",
                      }}
                      emptyMessage={i18nT("static.1ru6s3r")}
                    >
                      <Column
                        expander
                        style={{
                          width: "3.5rem",
                        }}
                      />

                      <Column
                        header={i18nT("static.1fak8xt")}
                        sortable
                        sortField="employee_display_name"
                        body={(rowData: AttendanceSummaryRowView) => (
                          <div className="min-w-[14rem]">
                            <div className="font-medium text-slate-800">
                              {rowData.employee_display_name}
                            </div>

                            <div className="mt-1 text-xs text-slate-500">
                              {rowData.shift_name ?? i18nT("static.iwdx2m")}
                            </div>
                          </div>
                        )}
                        style={{
                          minWidth: "17rem",
                        }}
                      />

                      <Column
                        field="status"
                        header={i18nT("static.3pd73")}
                        sortable
                        body={(rowData: AttendanceSummaryRowView) =>
                          renderStatusTag(rowData.status)
                        }
                        style={{
                          minWidth: "12rem",
                        }}
                      />

                      <Column
                        header={i18nT("static.u9kkco")}
                        body={renderScanSummary}
                        style={{
                          minWidth: "13rem",
                        }}
                      />

                      <Column
                        header={i18nT("static.1tkxo5d")}
                        body={renderWorkSummary}
                        style={{
                          minWidth: "10rem",
                        }}
                      />

                      <Column
                        header={i18nT("static.1vo1s1r")}
                        body={renderExceptionSummary}
                        style={{
                          minWidth: "13rem",
                        }}
                      />

                      <Column
                        header={i18nT("static.icm958")}
                        body={renderCompactFlags}
                        style={{
                          minWidth: "23rem",
                        }}
                      />
                    </DataTable>
                  </div>
                </section>
              )}
            </div>
          )}

          {isValidating && attendanceSummaryData && (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
              <i className="pi pi-spin pi-spinner" />
              {i18nT("static.ae0y93")}{" "}
            </div>
          )}
        </div>
      </Card>
    </>
  );
};

export default AttendanceSummaryTableData;
