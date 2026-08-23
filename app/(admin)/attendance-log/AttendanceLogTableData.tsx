"use client";
import { useI18n } from "@/app/i18n";

import { ChangeEvent, useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import * as XLSX from "@e965/xlsx";
import { saveAs } from "file-saver";
import {
  formatDate as formatDisplayDate,
  formatDateTimeWithSeconds,
} from "@/app/utils/date-format";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import { useDispatch } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import Can from "@/app/_components/CanPermission";

import {
  AttendanceLogSyncResult,
  remapEmployeeAttendanceLog,
  reviewMobileAttendanceSecurity,
  syncAttendanceLog,
} from "@/app/services/attendance-log-service";

import { AttendanceLog } from "@/app/types/attendance-log";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";
import { formatStatusLabel } from "@/app/i18n/statusLabel";

type AttendanceLogRow = AttendanceLog & {
  employee_name?: string | null;
  machine_name?: string | null;
};

type PaginatedAttendanceLogResponse = {
  data: AttendanceLogRow[];
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
};

type ProcessedFilter = "ALL" | "PROCESSED" | "UNPROCESSED";

type QuickRange = "today" | "this_week" | "this_month" | null;

type SyncDetail = AttendanceLogSyncResult["details"][number];

const PROCESSED_OPTIONS = [
  {
    labelKey: "All Processing Status",
    value: "ALL",
  },
  {
    labelKey: "Processed",
    value: "PROCESSED",
  },
  {
    labelKey: "Unprocessed",
    value: "UNPROCESSED",
  },
];

const getBody = () => document.body;

const getAttendancePhotoUrl = (photoUrl: string) => {
  const filename = photoUrl.split(/[\\/]/).pop();
  return filename
    ? `/api/public/upload/attendance/${encodeURIComponent(filename)}`
    : "";
};

const safeJsonStringify = (value: unknown) => {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return String(value ?? "");
  }
};

const getSecurityData = (row: AttendanceLogRow | null) => {
  const extra = row?.extra_data;
  const security =
    extra && typeof extra.security === "object" && extra.security !== null
      ? (extra.security as Record<string, unknown>)
      : null;
  const reasons = Array.isArray(security?.reasons)
    ? security.reasons.map((reason) => String(reason))
    : [];
  const evidence =
    security?.evidence && typeof security.evidence === "object"
      ? security.evidence
      : null;
  return { reasons, evidence };
};

const AttendanceLogTableData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();

  const [syncLoading, setSyncLoading] = useState(false);

  const [remapLoading, setRemapLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  const [syncResultDialog, setSyncResultDialog] = useState(false);

  const [syncResult, setSyncResult] = useState<AttendanceLogSyncResult | null>(
    null,
  );

  const [dateFrom, setDateFrom] = useState<Date | null>(null);

  const [dateTo, setDateTo] = useState<Date | null>(null);

  const [quickRange, setQuickRange] = useState<QuickRange>(null);

  const [keyword, setKeyword] = useState("");

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const [processedFilter, setProcessedFilter] =
    useState<ProcessedFilter>("ALL");

  const [detailDialog, setDetailDialog] = useState(false);

  const [selectedLog, setSelectedLog] = useState<AttendanceLogRow | null>(null);

  const [reviewDialog, setReviewDialog] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"APPROVE" | "REJECT">(
    "APPROVE",
  );
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const [first, setFirst] = useState(0);

  const [rowsPerPage, setRowsPerPage] = useState(25);

  const currentPage = Math.floor(first / rowsPerPage) + 1;

  const swrKey = useMemo(() => {
    const params = new URLSearchParams();

    params.set("page", String(currentPage));

    params.set("page_size", String(rowsPerPage));

    if (statusFilter) params.set("status", statusFilter);

    return `/api/attendance-log?${params.toString()}`;
  }, [currentPage, rowsPerPage, statusFilter]);

  const {
    data: attendanceLogData,
    error,
    isLoading,
    isValidating,
    mutate: refreshAttendanceLogData,
  } = useSWR<PaginatedAttendanceLogResponse>(swrKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  const rows = attendanceLogData?.data ?? [];

  const totalRecords = attendanceLogData?.total_records ?? 0;

  const totalPages = attendanceLogData?.total_pages ?? 0;

  const statusOptions = useMemo(() => {
    const statuses = Array.from(
      new Set(
        [
          "VALID",
          "INVALID",
          "PENDING_REVIEW",
          "DUPLICATE",
          "IGNORED",
          ...rows.map((item) => String(item.status ?? "").trim()),
        ].filter(Boolean),
      ),
    ).sort((first, second) => first.localeCompare(second));

    return statuses.map((status) => ({
      label: i18nT(formatStatusLabel(status)),
      value: status,
    }));
  }, [i18nT, rows]);

  const hasInvalidDateRange = Boolean(
    dateFrom &&
    dateTo &&
    dayjs(dateFrom).startOf("day").isAfter(dayjs(dateTo).endOf("day")),
  );

  const filteredData = useMemo(() => {
    if (hasInvalidDateRange) {
      return [];
    }

    const search = keyword.trim().toLowerCase();

    return rows.filter((item) => {
      const displayDate = item.event_time_source_local
        ? dayjs(item.event_time_source_local)
        : item.event_time
          ? dayjs(item.event_time)
          : null;

      const employeeDisplay =
        item.employee_name ??
        (item.employee_id ? `Employee #${item.employee_id}` : "Unmapped");

      const machineDisplay = item.machine_name ?? "Unknown machine";

      const matchKeyword =
        !search ||
        employeeDisplay.toLowerCase().includes(search) ||
        machineDisplay.toLowerCase().includes(search) ||
        String(item.machine_pin ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.status ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.source_type ?? "")
          .toLowerCase()
          .includes(search) ||
        String(item.external_system ?? "")
          .toLowerCase()
          .includes(search);

      const validDisplayDate = displayDate?.isValid() ? displayDate : null;

      const matchDateFrom =
        !dateFrom ||
        Boolean(
          validDisplayDate &&
          validDisplayDate.startOf("day").valueOf() >=
            dayjs(dateFrom).startOf("day").valueOf(),
        );

      const matchDateTo =
        !dateTo ||
        Boolean(
          validDisplayDate &&
          validDisplayDate.endOf("day").valueOf() <=
            dayjs(dateTo).endOf("day").valueOf(),
        );

      const matchStatus = !statusFilter || item.status === statusFilter;

      const matchProcessed =
        processedFilter === "ALL" ||
        (processedFilter === "PROCESSED" && item.processed) ||
        (processedFilter === "UNPROCESSED" && !item.processed);

      return (
        matchKeyword &&
        matchDateFrom &&
        matchDateTo &&
        matchStatus &&
        matchProcessed
      );
    });
  }, [
    rows,
    keyword,
    dateFrom,
    dateTo,
    statusFilter,
    processedFilter,
    hasInvalidDateRange,
  ]);

  const summaryStats = useMemo(() => {
    return {
      total: filteredData.length,
      processed: filteredData.filter((item) => item.processed).length,
      unprocessed: filteredData.filter((item) => !item.processed).length,
      invalid: filteredData.filter(
        (item) => item.status?.toUpperCase() === "INVALID",
      ).length,
      employees: new Set(
        filteredData
          .map((item) => item.employee_id)
          .filter(
            (value): value is number => value !== null && value !== undefined,
          ),
      ).size,
    };
  }, [filteredData]);

  const dateRangeLabel = useMemo(() => {
    if (!dateFrom && !dateTo) {
      return "All dates";
    }

    const startLabel = dateFrom ? formatDisplayDate(dateFrom, "...") : "...";

    const endLabel = dateTo ? formatDisplayDate(dateTo, "...") : "...";

    return `${startLabel} – ${endLabel}`;
  }, [dateFrom, dateTo]);

  const hasActiveFilter =
    Boolean(keyword.trim()) ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    Boolean(statusFilter) ||
    processedFilter !== "ALL";

  const isActionRunning = syncLoading || remapLoading || exportLoading;

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

  const handleRefresh = async () => {
    try {
      await refreshAttendanceLogData();
    } catch (err: unknown) {
      showError(err);
    }
  };

  const applyQuickRange = (range: Exclude<QuickRange, null>) => {
    const today = dayjs();

    setQuickRange(range);
    resetPagination();

    if (range === "today") {
      setDateFrom(today.startOf("day").toDate());

      setDateTo(today.endOf("day").toDate());

      return;
    }

    if (range === "this_week") {
      setDateFrom(today.startOf("week").toDate());

      setDateTo(today.endOf("week").toDate());

      return;
    }

    setDateFrom(today.startOf("month").toDate());

    setDateTo(today.endOf("month").toDate());
  };

  const onDateFromChange = (value: Date | null) => {
    setDateFrom(value);
    setQuickRange(null);
    resetPagination();
  };

  const onDateToChange = (value: Date | null) => {
    setDateTo(value);
    setQuickRange(null);
    resetPagination();
  };

  const resetFilters = () => {
    setDateFrom(null);
    setDateTo(null);
    setQuickRange(null);
    setKeyword("");
    setStatusFilter(null);
    setProcessedFilter("ALL");
    setFirst(0);
  };

  const handleSyncAttendanceLog = async () => {
    try {
      setSyncLoading(true);

      const response = await syncAttendanceLog();

      if (!response.data?.job_id) {
        throw new Error("The synchronization job was not created.");
      }

      returnToFirstPage();

      if (first === 0) {
        await refreshAttendanceLogData();
      }

      dispatch(
        showToast({
          visible: true,
          severity: "info",
          summary: response.data.deduplicated
            ? i18nT("static.12rl6qf")
            : i18nT("static.iag0jr"),
          detail: i18nT("static.11fc7sl", {
            p0: response.message || i18nT("static.12wly34"),
          }),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setSyncLoading(false);
    }
  };

  const onClickSyncLog = () => {
    requestActionConfirmation({
      header: i18nT("static.60htrz"),
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.1d0kg1t")} </span>

          <span className="text-sm text-slate-500">
            {i18nT("static.eos6df")}{" "}
          </span>
        </div>
      ),
      icon: "pi pi-sync",
      defaultFocus: "reject",
      accept: () => {
        void handleSyncAttendanceLog();
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
            label={i18nT("static.1wcvyci")}
            icon="pi pi-sync"
            severity="success"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const resetPagination = () => {
    setFirst(0);
  };

  const handleRemapEmployee = async () => {
    try {
      setRemapLoading(true);

      await remapEmployeeAttendanceLog();

      returnToFirstPage();

      if (first === 0) {
        await refreshAttendanceLogData();
      }

      showSuccess(i18nT("static.1egza5t"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setRemapLoading(false);
    }
  };

  const returnToFirstPage = () => {
    setFirst(0);
  };

  const onClickRemapEmployee = () => {
    requestActionConfirmation({
      header: i18nT("static.42np7r"),
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.1mel9il")} </span>

          <span className="text-sm text-slate-500">
            {i18nT("static.2k78h2")}{" "}
          </span>
        </div>
      ),
      icon: "pi pi-user-edit",
      defaultFocus: "reject",
      accept: () => {
        void handleRemapEmployee();
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
            label={i18nT("static.42np7r")}
            icon="pi pi-user-edit"
            severity="warning"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const formatDisplayTime = (item: AttendanceLogRow) => {
    const displayDate = item.event_time_source_local
      ? dayjs(item.event_time_source_local)
      : item.event_time
        ? dayjs(item.event_time)
        : null;

    if (!displayDate || !displayDate.isValid()) {
      return "-";
    }

    return formatDateTimeWithSeconds(displayDate.toDate());
  };

  const formatUtcTime = (value?: string | null) => {
    if (!value) {
      return "-";
    }

    const date = dayjs(value);

    if (!date.isValid()) {
      return "-";
    }

    return formatDateTimeWithSeconds(date.toDate());
  };

  const getEmployeeName = (item: AttendanceLogRow) => {
    return (
      item.employee_name ??
      (item.employee_id
        ? i18nT("Employee #{p0}", { p0: item.employee_id })
        : i18nT("Unmapped"))
    );
  };

  const getMachineName = (item: AttendanceLogRow) => {
    return item.machine_name ?? i18nT("Unknown machine");
  };

  const formatSourceLabel = (source?: string | null) => {
    switch (
      String(source ?? "")
        .trim()
        .toUpperCase()
    ) {
      case "MOBILE":
        return "Mobile App";
      case "MACHINE":
        return "Machine";
      case "WEB":
        return "Web";
      case "API":
        return "API";
      case "FACE":
        return "Face";
      case "GPS":
        return "GPS";
      default:
        return source || "Unknown";
    }
  };

  const autoFitColumns = (
    worksheet: XLSX.WorkSheet,
    rowsForWidth: Record<string, unknown>[],
  ) => {
    if (!rowsForWidth.length) {
      return;
    }

    const keys = Object.keys(rowsForWidth[0]);

    worksheet["!cols"] = keys.map((key) => {
      const maximumLength = Math.max(
        key.length,
        ...rowsForWidth.map((row) => String(row[key] ?? "").length),
      );

      return {
        wch: Math.min(Math.max(maximumLength + 2, 12), 45),
      };
    });
  };

  const exportExcel = async () => {
    if (!filteredData.length) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: i18nT("static.fh2d8v"),
          detail: i18nT("static.pwab41"),
        }),
      );

      return;
    }

    try {
      setExportLoading(true);

      await Promise.resolve();

      const exportedAt = formatDateTimeWithSeconds(new Date());

      const summarySheetRows = [
        {
          Field: "Report Name",
          Value: "Attendance Log Export",
        },
        {
          Field: "Exported At",
          Value: exportedAt,
        },
        {
          Field: "Total Exported Rows",
          Value: filteredData.length,
        },
        {
          Field: "Processed Rows",
          Value: summaryStats.processed,
        },
        {
          Field: "Unprocessed Rows",
          Value: summaryStats.unprocessed,
        },
        {
          Field: "Invalid Rows",
          Value: summaryStats.invalid,
        },
        {
          Field: "Unique Employees",
          Value: summaryStats.employees,
        },
        {
          Field: "Keyword Filter",
          Value: keyword || "All",
        },
        {
          Field: "Date Range",
          Value: dateRangeLabel,
        },
        {
          Field: "Status Filter",
          Value: statusFilter || "All",
        },
        {
          Field: "Processed Filter",
          Value: processedFilter,
        },
      ];

      const detailSheetRows = filteredData.map((item, index) => ({
        No: index + 1,
        Employee: getEmployeeName(item),
        EmployeeId: item.employee_id ?? "",
        Machine: getMachineName(item),
        MachineId: item.machine_id ?? "",
        PIN: item.machine_pin ?? "",
        EventTimeDisplayed: formatDisplayTime(item),
        EventTimeUTC: formatUtcTime(item.event_time),
        SourceType: item.source_type ?? "",
        Status: item.status ?? "",
        Processed: item.processed ? "Yes" : "No",
        ProcessedAt: formatUtcTime(item.processed_at),
        ExternalSystem: item.external_system ?? "",
        ExternalReference: item.external_ref_id ?? "",
        Latitude: item.latitude ?? "",
        Longitude: item.longitude ?? "",
        FaceId: item.face_id ?? "",
        Photo: item.photo_url ?? "",
        ExtraData: safeJsonStringify(item.extra_data).replace(/\s+/g, " "),
      }));

      const workbook = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.json_to_sheet(summarySheetRows);

      autoFitColumns(summarySheet, summarySheetRows);

      if (summarySheet["!ref"]) {
        summarySheet["!autofilter"] = {
          ref: summarySheet["!ref"],
        };
      }

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

      const detailSheet = XLSX.utils.json_to_sheet(detailSheetRows);

      autoFitColumns(detailSheet, detailSheetRows);

      if (detailSheet["!ref"]) {
        detailSheet["!autofilter"] = {
          ref: detailSheet["!ref"],
        };
      }

      XLSX.utils.book_append_sheet(workbook, detailSheet, "Attendance Log");

      const excelBuffer = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });

      const fileData = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fileName = `attendance_log_${dayjs().format(
        "YYYYMMDD_HHmmss",
      )}.xlsx`;

      saveAs(fileData, fileName);

      showSuccess(i18nT("static.1ddzxya"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setExportLoading(false);
    }
  };

  const openDetail = (row: AttendanceLogRow) => {
    setSelectedLog(row);
    setDetailDialog(true);
  };

  const closeDetailDialog = () => {
    setDetailDialog(false);
    setSelectedLog(null);
  };

  const openSecurityReview = (decision: "APPROVE" | "REJECT") => {
    setReviewDecision(decision);
    setReviewNote("");
    setReviewDialog(true);
  };

  const submitSecurityReview = async () => {
    if (!selectedLog) return;
    if (reviewDecision === "REJECT" && !reviewNote.trim()) {
      showError(new Error(i18nT("A rejection note is required.")));
      return;
    }
    try {
      setReviewLoading(true);
      await reviewMobileAttendanceSecurity(
        selectedLog.id,
        selectedLog.row_version,
        reviewDecision,
        reviewNote,
      );
      setReviewDialog(false);
      closeDetailDialog();
      await refreshAttendanceLogData();
      showSuccess(
        reviewDecision === "APPROVE"
          ? i18nT("static.2hvv8f")
          : i18nT("static.10y1dyr"),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setReviewLoading(false);
    }
  };

  const renderStatusTag = (status?: string | null) => {
    const normalized = status?.toUpperCase();

    if (normalized === "VALID") {
      return (
        <Tag
          value={i18nT("static.1mdm3gx")}
          severity="success"
          icon="pi pi-check-circle"
          rounded
        />
      );
    }

    if (normalized === "INVALID") {
      return (
        <Tag
          value={i18nT("static.1y20ekw")}
          severity="danger"
          icon="pi pi-exclamation-circle"
          rounded
        />
      );
    }

    if (normalized === "PENDING_REVIEW") {
      return (
        <Tag
          value={i18nT("static.6zotr1")}
          severity="warning"
          icon="pi pi-shield"
          rounded
        />
      );
    }

    if (normalized === "DUPLICATE") {
      return (
        <Tag
          value={i18nT("static.1xz5c1i")}
          severity="warning"
          icon="pi pi-copy"
          rounded
        />
      );
    }

    if (normalized === "IGNORED") {
      return (
        <Tag
          value={i18nT("static.6ictfp")}
          severity="secondary"
          icon="pi pi-minus-circle"
          rounded
        />
      );
    }

    return (
      <Tag value={i18nT(formatStatusLabel(status))} severity="info" rounded />
    );
  };

  const renderProcessedTag = (processed: boolean) => {
    if (processed) {
      return (
        <Tag
          value={i18nT("static.1k5drjf")}
          severity="success"
          icon="pi pi-check"
          rounded
        />
      );
    }

    return (
      <Tag
        value={i18nT("static.14gnciu")}
        severity="warning"
        icon="pi pi-clock"
        rounded
      />
    );
  };

  const employeeBody = (rowData: AttendanceLogRow) => {
    const isMapped =
      rowData.employee_id !== null && rowData.employee_id !== undefined;

    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span
          className={`truncate text-sm font-medium ${
            isMapped ? "text-slate-800" : "text-red-600"
          }`}
        >
          {getEmployeeName(rowData)}
        </span>

        <span className="font-mono text-xs text-slate-500">
          {isMapped
            ? i18nT("static.1cvkmxe", { p0: rowData.employee_id })
            : i18nT("static.1suvj2", { p0: rowData.machine_pin ?? "-" })}
        </span>
      </div>
    );
  };

  const machineBody = (rowData: AttendanceLogRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm text-slate-700">
          {getMachineName(rowData)}
        </span>

        {rowData.machine_id !== null && rowData.machine_id !== undefined && (
          <span className="font-mono text-xs text-slate-500">
            {i18nT("static.bu6fn2")} {rowData.machine_id}
          </span>
        )}
      </div>
    );
  };

  const displayTimeBody = (rowData: AttendanceLogRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
          {formatDisplayTime(rowData)}
        </span>

        {rowData.event_time && (
          <span className="whitespace-nowrap text-xs text-slate-500">
            {i18nT("static.emcnut")} {formatUtcTime(rowData.event_time)}
          </span>
        )}
      </div>
    );
  };

  const sourceBody = (rowData: AttendanceLogRow) => {
    if (!rowData.source_type) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <Tag
        value={i18nT(formatSourceLabel(rowData.source_type))}
        severity="info"
        rounded
      />
    );
  };

  const actionBody = (rowData: AttendanceLogRow) => {
    return (
      <div className="flex justify-end">
        <Button
          type="button"
          icon="pi pi-eye"
          rounded
          outlined
          severity="secondary"
          size="small"
          tooltip={i18nT("static.1dtxu7d")}
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => openDetail(rowData)}
        />
      </div>
    );
  };

  const rowClassName = (rowData: AttendanceLogRow) => {
    if (rowData.status?.toUpperCase() === "PENDING_REVIEW") {
      return "bg-amber-100/50";
    }
    if (rowData.status?.toUpperCase() === "INVALID") {
      return "bg-red-50/40";
    }

    if (!rowData.processed) {
      return "bg-amber-50/30";
    }

    return "";
  };

  const syncDetailStatusBody = (rowData: SyncDetail) => {
    const normalized = rowData.status?.toUpperCase();

    if (normalized === "SUCCESS") {
      return <Tag value={i18nT("static.udvru8")} severity="success" rounded />;
    }

    if (normalized === "PARTIAL") {
      return <Tag value={i18nT("static.xcezp6")} severity="warning" rounded />;
    }

    if (normalized === "FAILED") {
      return <Tag value={i18nT("static.npsixg")} severity="danger" rounded />;
    }

    return (
      <Tag
        value={i18nT(formatStatusLabel(rowData.status))}
        severity="info"
        rounded
      />
    );
  };

  const syncDetailMessageBody = (rowData: SyncDetail) => {
    if (!rowData.error_message) {
      return (
        <span className="text-sm text-green-700">{i18nT("static.udvru8")}</span>
      );
    }

    return (
      <div className="max-w-md">
        <div className="whitespace-normal text-sm font-medium text-red-600">
          {rowData.error_message}
        </div>

        {rowData.suggestion && (
          <div className="mt-1 whitespace-normal text-xs leading-5 text-slate-500">
            {rowData.suggestion}
          </div>
        )}
      </div>
    );
  };

  const selectedSecurity = getSecurityData(selectedLog);

  if (isLoading && !attendanceLogData) {
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
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-list-check text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.rjym30")}{" "}
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.ymc7a2")}{" "}
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
                label={i18nT("static.d3bk7p")}
                icon="pi pi-sync"
                severity="success"
                size="small"
                loading={syncLoading}
                disabled={remapLoading || exportLoading}
                className="w-full sm:w-auto"
                onClick={onClickSyncLog}
              />

              <Button
                type="button"
                label={i18nT("static.42np7r")}
                icon="pi pi-user-edit"
                severity="warning"
                outlined
                size="small"
                loading={remapLoading}
                disabled={syncLoading || exportLoading}
                className="w-full sm:w-auto"
                onClick={onClickRemapEmployee}
              />

              <Button
                type="button"
                label={i18nT("static.1cwzvbt")}
                icon="pi pi-file-excel"
                severity="success"
                outlined
                size="small"
                loading={exportLoading}
                disabled={!filteredData.length || syncLoading || remapLoading}
                className="w-full sm:w-auto"
                onClick={() => {
                  void exportExcel();
                }}
              />
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="m-0 text-xs text-slate-500">
                {i18nT("static.7chzvl")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
                {summaryStats.total}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-400">
                {i18nT("static.1sfsa6u")} {currentPage} {i18nT("static.t6uqnc")}{" "}
                {totalPages || 1} {i18nT("static.syyan8")}{" "}
                {totalRecords.toLocaleString("id-ID")}{" "}
                {i18nT("static.tmqg87")}{" "}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="m-0 text-xs text-green-700">
                {i18nT("static.1k5drjf")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-green-800">
                {summaryStats.processed}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="m-0 text-xs text-amber-700">
                {i18nT("static.14gnciu")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-amber-800">
                {summaryStats.unprocessed}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="m-0 text-xs text-red-700">
                {i18nT("static.1y20ekw")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-red-800">
                {summaryStats.invalid}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4 md:col-span-1">
              <p className="m-0 text-xs text-blue-700">
                {i18nT("static.f4bo3a")}
              </p>

              <p className="m-0 mt-1 text-2xl font-semibold text-blue-800">
                {summaryStats.employees}
              </p>
            </div>
          </div>

          {/* Filters */}
          <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.y6kili")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {i18nT("static.11l6263")}{" "}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                label={i18nT("static.1sawk0u")}
                size="small"
                severity={quickRange === "today" ? "info" : "secondary"}
                outlined={quickRange !== "today"}
                onClick={() => applyQuickRange("today")}
              />

              <Button
                type="button"
                label={i18nT("static.he9t3n")}
                size="small"
                severity={quickRange === "this_week" ? "info" : "secondary"}
                outlined={quickRange !== "this_week"}
                onClick={() => applyQuickRange("this_week")}
              />

              <Button
                type="button"
                label={i18nT("static.usin9z")}
                size="small"
                severity={quickRange === "this_month" ? "info" : "secondary"}
                outlined={quickRange !== "this_month"}
                onClick={() => applyQuickRange("this_month")}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1.5fr)_minmax(11rem,1fr)_minmax(11rem,1fr)_minmax(12rem,1fr)_minmax(14rem,1fr)]">
              <IconField iconPosition="left" className="w-full">
                <InputIcon className="pi pi-search" />

                <InputText
                  value={keyword}
                  placeholder={i18nT("static.1mb238k")}
                  className="w-full"
                  onChange={(event: ChangeEvent<HTMLInputElement>) => {
                    setKeyword(event.target.value);
                    resetPagination();
                  }}
                />
              </IconField>

              <Calendar
                appendTo={getBody}
                value={dateFrom}
                dateFormat="dd MM yy"
                showIcon
                placeholder={i18nT("static.pkgk6v")}
                className="w-full"
                onChange={(event) =>
                  onDateFromChange((event.value as Date | null) ?? null)
                }
              />

              <Calendar
                appendTo={getBody}
                value={dateTo}
                dateFormat="dd MM yy"
                showIcon
                placeholder={i18nT("static.1iqht4m")}
                className="w-full"
                onChange={(event) =>
                  onDateToChange((event.value as Date | null) ?? null)
                }
              />

              <Dropdown
                appendTo={getBody}
                value={statusFilter}
                options={statusOptions}
                placeholder={i18nT("static.18zxnji")}
                showClear
                className="w-full"
                onChange={(event) => {
                  setStatusFilter(event.value ?? null);

                  resetPagination();
                }}
              />

              <Dropdown
                appendTo={getBody}
                value={processedFilter}
                options={PROCESSED_OPTIONS.map((option) => ({
                  label: i18nT(option.labelKey),
                  value: option.value,
                }))}
                className="w-full"
                onChange={(event) => {
                  setProcessedFilter(event.value as ProcessedFilter);

                  resetPagination();
                }}
              />
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>{i18nT("static.1k8q7ax")}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Tag
                  value={i18nT(dateRangeLabel)}
                  severity="info"
                  icon="pi pi-calendar"
                  rounded
                />

                <span className="text-xs text-slate-500">
                  {filteredData.length} {i18nT("static.9xnbwb")}{" "}
                  {filteredData.length === 1 ? "" : i18nT("static.1w9pcoy")}
                </span>
              </div>

              <Button
                type="button"
                label={i18nT("static.1ljj5w3")}
                icon="pi pi-filter-slash"
                severity="secondary"
                outlined
                size="small"
                disabled={!hasActiveFilter}
                className="w-full sm:w-auto"
                onClick={resetFilters}
              />
            </div>
          </section>

          {/* Legend */}
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="flex items-start gap-3">
              {renderStatusTag("VALID")}

              <p className="m-0 text-xs leading-5 text-slate-600">
                {i18nT("static.8wxvlg")}{" "}
              </p>
            </div>

            <div className="flex items-start gap-3">
              {renderStatusTag("INVALID")}

              <p className="m-0 text-xs leading-5 text-slate-600">
                {i18nT("static.nbxxab")}{" "}
              </p>
            </div>

            <div className="flex items-start gap-3">
              {renderStatusTag("PENDING_REVIEW")}

              <p className="m-0 text-xs leading-5 text-slate-600">
                {i18nT("static.19nfnsh")}{" "}
              </p>
            </div>

            <div className="flex items-start gap-3">
              {renderStatusTag("DUPLICATE")}

              <p className="m-0 text-xs leading-5 text-slate-600">
                {i18nT("static.r5r7ed")}{" "}
              </p>
            </div>

            <div className="flex items-start gap-3">
              {renderProcessedTag(false)}

              <p className="m-0 text-xs leading-5 text-slate-600">
                {i18nT("static.ilugue")}{" "}
              </p>
            </div>
          </div>

          {/* Attendance Log Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={rows}
              dataKey="id"
              lazy
              paginator
              first={first}
              rows={rowsPerPage}
              totalRecords={totalRecords}
              rowsPerPageOptions={[10, 25, 50, 100]}
              stripedRows
              rowHover
              scrollable
              removableSort
              responsiveLayout="scroll"
              size="small"
              loading={isLoading || isValidating}
              rowClassName={rowClassName}
              tableStyle={{
                minWidth: "96rem",
              }}
              emptyMessage={i18nT("static.17n19d1")}
              currentPageReportTemplate={i18nT("static.1kqh8lr")}
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
              onPage={(event) => {
                setFirst(event.first);
                setRowsPerPage(event.rows);
              }}
            >
              <Column
                header="#"
                body={(_, options) => first + options.rowIndex + 1}
                headerStyle={{
                  width: "4rem",
                }}
                bodyStyle={{
                  width: "4rem",
                }}
              />

              <Column
                field="employee_name"
                header={i18nT("static.1fak8xt")}
                sortable
                body={employeeBody}
                style={{
                  minWidth: "19rem",
                }}
              />

              <Column
                field="machine_name"
                header={i18nT("static.1bz37xh")}
                sortable
                body={machineBody}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="machine_pin"
                header={i18nT("static.1bnsff5")}
                sortable
                style={{
                  minWidth: "11rem",
                }}
                body={(rowData: AttendanceLogRow) => (
                  <span className="font-mono text-sm text-slate-700">
                    {rowData.machine_pin || "-"}
                  </span>
                )}
              />

              <Column
                field="event_time"
                header={i18nT("static.lk414c")}
                sortable
                body={displayTimeBody}
                style={{
                  minWidth: "20rem",
                }}
              />

              <Column
                field="source_type"
                header={i18nT("static.r5qyuw")}
                sortable
                body={sourceBody}
                style={{
                  minWidth: "11rem",
                }}
              />

              <Column
                field="status"
                header={i18nT("static.3pd73")}
                sortable
                body={(rowData: AttendanceLogRow) =>
                  renderStatusTag(rowData.status)
                }
                style={{
                  minWidth: "11rem",
                }}
              />

              <Column
                field="processed"
                header={i18nT("static.emytwm")}
                sortable
                body={(rowData: AttendanceLogRow) =>
                  renderProcessedTag(rowData.processed)
                }
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                header={i18nT("static.2wk0tb")}
                body={actionBody}
                frozen
                alignFrozen="right"
                headerClassName="bg-white"
                className="bg-white"
                headerStyle={{
                  width: "7rem",
                  minWidth: "7rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "7rem",
                  minWidth: "7rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* Attendance Log Detail */}
      <Dialog
        header={i18nT("static.1ab6ho5")}
        visible={detailDialog}
        style={{
          width: "95vw",
          maxWidth: "50rem",
        }}
        breakpoints={{
          "960px": "90vw",
          "640px": "95vw",
        }}
        modal
        draggable={false}
        resizable={false}
        onHide={closeDetailDialog}
      >
        {selectedLog && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h2 className="m-0 truncate text-base font-semibold text-slate-800">
                  {getEmployeeName(selectedLog)}
                </h2>

                <p className="m-0 mt-1 text-xs text-slate-500">
                  {getMachineName(selectedLog)} {i18nT("static.1rqw07t")}{" "}
                  {selectedLog.machine_pin || "-"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {renderStatusTag(selectedLog.status)}

                {renderProcessedTag(selectedLog.processed)}
              </div>
            </div>

            <section className="flex flex-col gap-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.1actnrm")}{" "}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.yfuapc")}{" "}
                  </p>

                  <p className="m-0 mt-1 text-sm font-medium text-slate-800">
                    {selectedLog.event_time_source_local
                      ? formatUtcTime(selectedLog.event_time_source_local)
                      : "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.1puqel2")}
                  </p>

                  <p className="m-0 mt-1 text-sm font-medium text-slate-800">
                    {formatUtcTime(selectedLog.event_time)}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.gzverw")}
                  </p>

                  <p className="m-0 mt-1 text-sm font-medium text-slate-800">
                    {formatUtcTime(selectedLog.processed_at)}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.147943k")}
                  </p>

                  <div className="mt-1">{sourceBody(selectedLog)}</div>
                </div>
              </div>
            </section>

            {selectedLog.status?.toUpperCase() === "PENDING_REVIEW" && (
              <section className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div>
                  <h3 className="m-0 text-sm font-semibold text-amber-950">
                    {i18nT("static.1ki30mm")}{" "}
                  </h3>
                  <p className="m-0 mt-1 text-xs leading-5 text-amber-800">
                    {i18nT("static.jsx1ev")}{" "}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedSecurity.reasons.length ? (
                    selectedSecurity.reasons.map((reason) => (
                      <Tag key={reason} value={reason} severity="warning" />
                    ))
                  ) : (
                    <span className="text-sm text-amber-800">
                      {i18nT("static.f1l6k5")}{" "}
                    </span>
                  )}
                </div>

                {selectedSecurity.evidence && (
                  <pre className="m-0 max-h-56 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-amber-950 p-3 text-xs text-amber-50">
                    {safeJsonStringify(selectedSecurity.evidence)}
                  </pre>
                )}

                <Can permission="attendance-log.update">
                  <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      label={i18nT("static.rms9s1")}
                      icon="pi pi-times"
                      severity="danger"
                      outlined
                      onClick={() => openSecurityReview("REJECT")}
                    />
                    <Button
                      type="button"
                      label={i18nT("static.umqw1h")}
                      icon="pi pi-check"
                      severity="success"
                      onClick={() => openSecurityReview("APPROVE")}
                    />
                  </div>
                </Can>
              </section>
            )}

            <section className="flex flex-col gap-4">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.ivrgq5")}{" "}
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.1lghzb2")}
                  </p>

                  <p className="m-0 mt-1 font-mono text-sm text-slate-800">
                    {selectedLog.employee_id ?? i18nT("static.axbf59")}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.1xyxdnr")}
                  </p>

                  <p className="m-0 mt-1 font-mono text-sm text-slate-800">
                    {selectedLog.machine_id ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.iyspz3")}
                  </p>

                  <p className="m-0 mt-1 text-sm text-slate-800">
                    {selectedLog.external_system ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.wojojv")}{" "}
                  </p>

                  <p className="m-0 mt-1 break-all font-mono text-sm text-slate-800">
                    {selectedLog.external_ref_id ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.udp36t")}
                  </p>

                  <p className="m-0 mt-1 font-mono text-sm text-slate-800">
                    {selectedLog.latitude ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.sltujy")}
                  </p>

                  <p className="m-0 mt-1 font-mono text-sm text-slate-800">
                    {selectedLog.longitude ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.1go0w2h")}
                  </p>

                  <p className="m-0 mt-1 font-mono text-sm text-slate-800">
                    {selectedLog.face_id ?? "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.txzz2m")}
                  </p>

                  <p className="m-0 mt-1 font-mono text-sm text-slate-800">
                    {selectedLog.id}
                  </p>
                </div>
              </div>
            </section>

            {selectedLog.photo_url && (
              <section className="flex flex-col gap-3">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="m-0 text-sm font-semibold text-slate-800">
                    {i18nT("static.1tkcrji")}{" "}
                  </h3>
                </div>

                <img
                  src={getAttendancePhotoUrl(selectedLog.photo_url)}
                  alt={i18nT("static.vu8n1j", {
                    p0: getEmployeeName(selectedLog),
                  })}
                  className="max-h-[28rem] w-full rounded-xl border border-slate-200 object-contain"
                />
              </section>
            )}

            <details className="rounded-xl border border-slate-200 bg-slate-50">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
                {i18nT("static.jhk5ru")}{" "}
              </summary>

              <div className="border-t border-slate-200 p-4">
                <pre className="m-0 max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                  {safeJsonStringify(selectedLog.extra_data)}
                </pre>
              </div>
            </details>
          </div>
        )}
      </Dialog>

      <Dialog
        header={
          reviewDecision === "APPROVE"
            ? i18nT("static.umqw1h")
            : i18nT("static.rms9s1")
        }
        visible={reviewDialog}
        style={{ width: "95vw", maxWidth: "34rem" }}
        modal
        draggable={false}
        resizable={false}
        closable={!reviewLoading}
        onHide={() => !reviewLoading && setReviewDialog(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              disabled={reviewLoading}
              onClick={() => setReviewDialog(false)}
            />
            <Button
              type="button"
              label={
                reviewDecision === "APPROVE"
                  ? i18nT("static.1s2ov2y")
                  : i18nT("static.1kej36u")
              }
              severity={reviewDecision === "APPROVE" ? "success" : "danger"}
              loading={reviewLoading}
              disabled={reviewDecision === "REJECT" && !reviewNote.trim()}
              onClick={() => void submitSecurityReview()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="m-0 text-sm leading-6 text-slate-600">
            {reviewDecision === "APPROVE"
              ? i18nT("static.x6870t")
              : i18nT("static.7jxvzy")}
          </p>
          <label htmlFor="security-review-note" className="text-sm font-medium">
            {i18nT("static.1gvdiib")}{" "}
            {reviewDecision === "REJECT" ? "*" : i18nT("static.6pi6gi")}
          </label>
          <InputTextarea
            id="security-review-note"
            value={reviewNote}
            placeholder={i18nT("Enter review note")}
            rows={5}
            maxLength={1000}
            autoResize
            disabled={reviewLoading}
            onChange={(event) => setReviewNote(event.target.value)}
          />
        </div>
      </Dialog>

      {/* Sync Result */}
      <Dialog
        header={i18nT("static.jcf2ys")}
        visible={syncResultDialog}
        style={{
          width: "96vw",
          maxWidth: "76rem",
        }}
        breakpoints={{
          "960px": "95vw",
        }}
        modal
        draggable={false}
        resizable={false}
        onHide={() => {
          setSyncResultDialog(false);
          setSyncResult(null);
        }}
      >
        {!syncResult ? (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <i className="pi pi-info-circle mt-0.5" />

            <span>{i18nT("static.o3h7wg")}</span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div
              className={`rounded-xl border p-4 ${
                syncResult.scanner_failed > 0
                  ? syncResult.scanner_success > 0
                    ? "border-amber-200 bg-amber-50"
                    : "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
              }`}
            >
              <h2 className="m-0 text-base font-semibold text-slate-800">
                {syncResult.message || i18nT("static.1oapug5")}
              </h2>

              <p className="m-0 mt-1 text-sm text-slate-600">
                {i18nT("static.1k6dje7")}{" "}
                {i18nT(formatStatusLabel(syncResult.status))}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.1j0p99e")}
                </p>

                <p className="m-0 mt-1 text-xl font-semibold text-slate-800">
                  {syncResult.scanner_success}/{syncResult.scanner_total}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.1k672yq")}
                </p>

                <p className="m-0 mt-1 text-xl font-semibold text-slate-800">
                  {syncResult.total_fetched.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="m-0 text-xs text-green-700">
                  {i18nT("static.kx1wp5")}
                </p>

                <p className="m-0 mt-1 text-xl font-semibold text-green-800">
                  {syncResult.total_inserted.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="m-0 text-xs text-amber-700">
                  {i18nT("static.1xz5c1i")}
                </p>

                <p className="m-0 mt-1 text-xl font-semibold text-amber-800">
                  {syncResult.total_duplicate.toLocaleString("id-ID")}
                </p>
              </div>

              <div className="col-span-2 rounded-xl border border-red-200 bg-red-50 p-4 md:col-span-1">
                <p className="m-0 text-xs text-red-700">
                  {i18nT("static.jg801q")}
                </p>

                <p className="m-0 mt-1 text-xl font-semibold text-red-800">
                  {syncResult.total_invalid_mapping.toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <div className="w-full overflow-hidden rounded-xl border border-slate-200">
              <DataTable
                value={syncResult.details ?? []}
                paginator
                rows={10}
                rowsPerPageOptions={[10, 25, 50]}
                stripedRows
                rowHover
                scrollable
                responsiveLayout="scroll"
                size="small"
                tableStyle={{
                  minWidth: "90rem",
                }}
                emptyMessage={i18nT("static.1mgy3fc")}
              >
                <Column
                  field="scanner_name"
                  header={i18nT("static.1bz37xh")}
                  style={{
                    minWidth: "16rem",
                  }}
                />

                <Column
                  field="scanner_ip"
                  header={i18nT("static.1vjcbqs")}
                  style={{
                    minWidth: "12rem",
                  }}
                />

                <Column
                  field="status"
                  header={i18nT("static.3pd73")}
                  body={syncDetailStatusBody}
                  style={{
                    minWidth: "10rem",
                  }}
                />

                <Column
                  field="fetched"
                  header={i18nT("static.1k672yq")}
                  style={{
                    minWidth: "8rem",
                  }}
                />

                <Column
                  field="inserted"
                  header={i18nT("static.kx1wp5")}
                  style={{
                    minWidth: "8rem",
                  }}
                />

                <Column
                  field="duplicate"
                  header={i18nT("static.1xz5c1i")}
                  style={{
                    minWidth: "9rem",
                  }}
                />

                <Column
                  field="invalid_mapping"
                  header={i18nT("static.1y20ekw")}
                  style={{
                    minWidth: "9rem",
                  }}
                />

                <Column
                  header={i18nT("static.1cam7ic")}
                  body={syncDetailMessageBody}
                  style={{
                    minWidth: "28rem",
                  }}
                />
              </DataTable>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};

export default AttendanceLogTableData;
