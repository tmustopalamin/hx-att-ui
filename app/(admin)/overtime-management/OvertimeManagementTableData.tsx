"use client";
import { useI18n } from "@/app/i18n";

import { ChangeEvent, useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
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

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  createMassOvertime,
  approveOvertimeManagement,
  previewMassOvertime,
  MassOvertimePayload,
  MassOvertimeTarget,
  rejectOvertimeManagement,
} from "@/app/services/overtime-management-service";
import { cancelOvertimeRequest } from "@/app/services/overtime-request-service";

import { OvertimeRequest } from "@/app/types/overtime-request";
import { Department } from "@/app/types/department";
import { Position } from "@/app/types/position";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";

type ProcessingAction = "approve" | "reject" | "cancel" | "mass" | null;

const API_KEY = "/api/overtime-management?show_all=false";

const MAX_REJECTION_NOTE_LENGTH = 1000;

const getBody = () => document.body;

const normalizeStatus = (status?: string | null) => {
  return String(status ?? "")
    .trim()
    .toUpperCase();
};

const formatStatusLabel = (status?: string | null) => {
  const normalized = normalizeStatus(status);

  if (!normalized) {
    return "Pending";
  }

  return normalized
    .split("_")
    .map((word) => {
      const lower = word.toLowerCase();

      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
};

const formatDate = (value?: string | null) => {
  return formatDisplayDate(value);
};

const formatDateTime = (value?: string | null) => {
  return formatDisplayDateTime(value);
};

const formatTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  /*
   * Mendukung nilai time-only seperti
   * 18:30:00 maupun timestamp lengkap.
   */
  const timeOnlyMatch = value.match(/^(\d{2}):(\d{2})(?::\d{2})?/);

  if (timeOnlyMatch) {
    return `${timeOnlyMatch[1]}:${timeOnlyMatch[2]}`;
  }

  const date = dayjs(value);

  return date.isValid() ? date.format("HH:mm") : "-";
};

const formatDuration = (seconds?: number | null) => {
  const safeSeconds = Math.max(0, Number(seconds ?? 0));

  const hours = Math.floor(safeSeconds / 3600);

  const minutes = Math.floor((safeSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
};

const OvertimeManagementTableData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canApprove = permissions.includes("overtime-management.approve");
  const canReject = permissions.includes("overtime-management.reject");
  const canCreate = permissions.includes("overtime-management.create");
  const canCancel = permissions.includes("overtime-management.cancel");

  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);

  const [selectedData, setSelectedData] = useState<OvertimeRequest | null>(
    null,
  );

  const [rejectNote, setRejectNote] = useState("");
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelNote, setCancelNote] = useState("");

  const [keyword, setKeyword] = useState("");

  const [statusFilter, setStatusFilter] = useState<string | null>("PENDING");

  const [dateFrom, setDateFrom] = useState<Date | null>(null);

  const [dateTo, setDateTo] = useState<Date | null>(null);

  const [processingRowId, setProcessingRowId] = useState<number | null>(null);

  const [processingAction, setProcessingAction] =
    useState<ProcessingAction>(null);

  const [massDialogVisible, setMassDialogVisible] = useState(false);
  const [massDate, setMassDate] = useState<Date | null>(null);
  const [massStart, setMassStart] = useState<string | null>(null);
  const [massEnd, setMassEnd] = useState<string | null>(null);
  const [massReason, setMassReason] = useState("");
  const [massDepartmentId, setMassDepartmentId] = useState<number | null>(null);
  const [massPositionId, setMassPositionId] = useState<number | null>(null);
  const [massTargets, setMassTargets] = useState<MassOvertimeTarget[]>([]);
  const [massLoading, setMassLoading] = useState(false);

  const { data: departments = [] } = useSWR<Department[]>(
    canCreate ? "/api/department?show_all=false" : null,
    fetcher,
  );
  const { data: positions = [] } = useSWR<Position[]>(
    canCreate ? "/api/position?show_all=false" : null,
    fetcher,
  );

  const {
    data: overtimeManagementData,
    error,
    isLoading,
    isValidating,
    mutate: refreshOvertimeManagementData,
  } = useSWR<OvertimeRequest[]>(API_KEY, fetcher);

  const rows = overtimeManagementData ?? [];

  const isActionRunning = processingRowId !== null;

  const hasInvalidDateRange = Boolean(
    dateFrom &&
    dateTo &&
    dayjs(dateFrom).startOf("day").isAfter(dayjs(dateTo).endOf("day")),
  );

  const statusOptions = useMemo(() => {
    const availableStatuses = new Set<string>([
      "PENDING",
      "APPROVED",
      "REJECTED",
      "CANCELLED",
    ]);

    for (const row of rows) {
      const status = normalizeStatus(row.status);

      if (status) {
        availableStatuses.add(status);
      }
    }

    return Array.from(availableStatuses)
      .sort((first, second) => first.localeCompare(second))
      .map((status) => ({
        label: i18nT(formatStatusLabel(status)),
        value: status,
      }));
  }, [i18nT, rows]);

  const filteredData = useMemo(() => {
    if (hasInvalidDateRange) {
      return [];
    }

    const search = keyword.trim().toLowerCase();

    return rows.filter((row) => {
      const normalizedStatus = normalizeStatus(row.status);

      const searchableValues = [
        row.employee_name,
        row.reason,
        row.rejection_reason,
        row.approved_by_name,
        normalizedStatus,
        formatDate(row.overtime_date),
        formatTime(row.requested_start_at),
        formatTime(row.requested_end_at),
      ];

      const matchesKeyword =
        !search ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );

      const matchesStatus = !statusFilter || normalizedStatus === statusFilter;

      const overtimeDate = row.overtime_date
        ? dayjs(row.overtime_date).startOf("day")
        : null;

      const validOvertimeDate = overtimeDate?.isValid() ? overtimeDate : null;

      const matchesDateFrom =
        !dateFrom ||
        Boolean(
          validOvertimeDate &&
          validOvertimeDate.valueOf() >=
            dayjs(dateFrom).startOf("day").valueOf(),
        );

      const matchesDateTo =
        !dateTo ||
        Boolean(
          validOvertimeDate &&
          validOvertimeDate.valueOf() <= dayjs(dateTo).endOf("day").valueOf(),
        );

      return (
        matchesKeyword && matchesStatus && matchesDateFrom && matchesDateTo
      );
    });
  }, [rows, keyword, statusFilter, dateFrom, dateTo, hasInvalidDateRange]);

  const summaryStats = useMemo(() => {
    return {
      total: filteredData.length,
      pending: filteredData.filter(
        (row) => normalizeStatus(row.status) === "PENDING",
      ).length,
      approved: filteredData.filter(
        (row) => normalizeStatus(row.status) === "APPROVED",
      ).length,
      rejected: filteredData.filter(
        (row) => normalizeStatus(row.status) === "REJECTED",
      ).length,
      cancelled: filteredData.filter(
        (row) => normalizeStatus(row.status) === "CANCELLED",
      ).length,
    };
  }, [filteredData]);

  const hasActiveFilter =
    Boolean(keyword.trim()) ||
    statusFilter !== "PENDING" ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

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

  const showWarning = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "warn",
        summary: i18nT("static.gy1qqi"),
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
          detail: err.message,
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
      await refreshOvertimeManagementData();
    } catch (err: unknown) {
      showError(err);
    }
  };

  const resetFilters = () => {
    setKeyword("");
    setStatusFilter("PENDING");
    setDateFrom(null);
    setDateTo(null);
  };

  const resetMassForm = () => {
    setMassDate(null);
    setMassStart(null);
    setMassEnd(null);
    setMassReason("");
    setMassDepartmentId(null);
    setMassPositionId(null);
    setMassTargets([]);
  };

  const closeMassDialog = () => {
    setMassDialogVisible(false);
    resetMassForm();
  };

  const buildMassPayload = (): MassOvertimePayload => {
    if (!massDate || !massStart || !massEnd) {
      throw new Error("Overtime date, start time, and end time are required.");
    }

    const [startHour, startMinute] = massStart.split(":").map(Number);
    const [endHour, endMinute] = massEnd.split(":").map(Number);
    const start = dayjs(massDate)
      .hour(startHour)
      .minute(startMinute)
      .second(0)
      .millisecond(0);
    let end = dayjs(massDate)
      .hour(endHour)
      .minute(endMinute)
      .second(0)
      .millisecond(0);

    if (!start.isValid() || !end.isValid()) {
      throw new Error("Invalid overtime time.");
    }
    if (!end.isAfter(start)) {
      end = end.add(1, "day");
    }

    if (!massDepartmentId && !massPositionId) {
      throw new Error("Select a department or department and position.");
    }
    if (massPositionId && !massDepartmentId) {
      throw new Error("Department is required when selecting a position.");
    }

    return {
      overtime_date: dayjs(massDate).format("YYYY-MM-DD"),
      requested_start_at: start.toISOString(),
      requested_end_at: end.toISOString(),
      reason: massReason.trim() || null,
      department_id: massDepartmentId,
      position_id: massPositionId,
    };
  };

  const handlePreviewMass = async () => {
    try {
      setMassLoading(true);
      const targets = await previewMassOvertime(buildMassPayload());
      setMassTargets(targets);
      if (targets.length === 0) showWarning(i18nT("static.s407aa"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setMassLoading(false);
    }
  };

  const handleCreateMass = async () => {
    try {
      const payload = buildMassPayload();
      if (massTargets.length === 0) {
        showWarning(i18nT("static.15y6fh4"));
        return;
      }
      if (massTargets.some((target) => target.has_active_request)) {
        showWarning(i18nT("static.9lraxd"));
        return;
      }
      setMassLoading(true);
      const response = await createMassOvertime(payload);
      await refreshOvertimeManagementData();
      showSuccess(
        response.message || i18nT("static.jobeya", { p0: massTargets.length }),
      );
      closeMassDialog();
    } catch (err: unknown) {
      showError(err);
    } finally {
      setMassLoading(false);
    }
  };

  const closeRejectDialog = () => {
    if (processingAction === "reject") {
      return;
    }

    setRejectDialogVisible(false);

    setSelectedData(null);
    setRejectNote("");
  };

  const closeCancelDialog = () => {
    if (processingAction === "cancel") return;
    setCancelDialogVisible(false);
    setSelectedData(null);
    setCancelNote("");
  };

  const handleCancel = async () => {
    if (!selectedData) return;
    const reason = cancelNote.trim();
    if (!reason) {
      showWarning(i18nT("static.1svshzr"));
      return;
    }
    try {
      setProcessingRowId(selectedData.id);
      setProcessingAction("cancel");
      const response = await cancelOvertimeRequest(
        selectedData.id,
        selectedData.row_version,
        reason,
      );
      await refreshOvertimeManagementData();
      setCancelDialogVisible(false);
      setSelectedData(null);
      setCancelNote("");
      showSuccess(response.message || i18nT("static.1e9r5z9"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleApprove = async (row: OvertimeRequest) => {
    try {
      setProcessingRowId(row.id);
      setProcessingAction("approve");

      const response = await approveOvertimeManagement(
        row.id,
        row.row_version,
        "Approved manually by admin.",
      );

      await refreshOvertimeManagementData();

      showSuccess(response.message || i18nT("static.mbul73"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const onClickApprove = (row: OvertimeRequest) => {
    requestActionConfirmation({
      header: i18nT("static.6ue2nk"),
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.7zrksq")} </span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {row.employee_name || i18nT("static.1drwniz")}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {formatDate(row.overtime_date)} {i18nT("static.19xoda3")}{" "}
              {formatTime(row.requested_start_at)} {i18nT("static.hnl64v")}{" "}
              {formatTime(row.requested_end_at)}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {i18nT("static.d78p3t")} {formatDuration(row.requested_seconds)}
            </p>
          </div>
        </div>
      ),
      icon: "pi pi-check-circle",
      defaultFocus: "reject",
      accept: () => {
        void handleApprove(row);
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
            label={i18nT("static.1s2ov2y")}
            icon="pi pi-check"
            severity="success"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickReject = (row: OvertimeRequest) => {
    setSelectedData(row);
    setRejectNote("");
    setRejectDialogVisible(true);
  };

  const handleReject = async () => {
    if (!selectedData) {
      showError(new Error("Overtime request is not selected."));

      return;
    }

    const cleanNote = rejectNote.trim();

    if (!cleanNote) {
      showWarning(i18nT("static.hvpt41"));

      return;
    }

    if (cleanNote.length > MAX_REJECTION_NOTE_LENGTH) {
      showWarning(i18nT("static.14is6ph", { p0: MAX_REJECTION_NOTE_LENGTH }));

      return;
    }

    try {
      setProcessingRowId(selectedData.id);

      setProcessingAction("reject");

      const response = await rejectOvertimeManagement(
        selectedData.id,
        selectedData.row_version,
        cleanNote,
      );

      await refreshOvertimeManagementData();

      setRejectDialogVisible(false);

      setSelectedData(null);
      setRejectNote("");

      showSuccess(response.message || i18nT("static.1u5dua6"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const statusBody = (row: OvertimeRequest) => {
    const status = normalizeStatus(row.status);

    if (status === "APPROVED") {
      return (
        <Tag
          value={i18nT("static.1j3qly2")}
          severity="success"
          icon="pi pi-check-circle"
          rounded
        />
      );
    }

    if (status === "REJECTED") {
      return (
        <Tag
          value={i18nT("static.1uofzaf")}
          severity="danger"
          icon="pi pi-times-circle"
          rounded
        />
      );
    }

    if (status === "CANCELLED") {
      return (
        <Tag
          value={i18nT("static.1a3t1vg")}
          severity="secondary"
          icon="pi pi-ban"
          rounded
        />
      );
    }

    return (
      <Tag
        value={i18nT(formatStatusLabel(status || "PENDING"))}
        severity="warning"
        icon="pi pi-clock"
        rounded
      />
    );
  };

  const employeeBody = (row: OvertimeRequest) => {
    return (
      <span className="text-sm font-medium text-slate-800">
        {row.employee_name || i18nT("static.1drwniz")}
      </span>
    );
  };

  const overtimePeriodBody = (row: OvertimeRequest) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
          {formatTime(row.requested_start_at)} {i18nT("static.hnl64v")}{" "}
          {formatTime(row.requested_end_at)}
        </span>

        <span className="text-xs text-slate-500">
          {formatDuration(row.requested_seconds)}
        </span>
      </div>
    );
  };

  const reasonBody = (row: OvertimeRequest) => {
    if (!row.reason) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span
        className="block max-w-xs whitespace-normal text-sm text-slate-700"
        title={row.reason}
      >
        {row.reason}
      </span>
    );
  };

  const rejectionReasonBody = (row: OvertimeRequest) => {
    if (!row.rejection_reason) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span
        className="block max-w-xs whitespace-normal text-sm text-red-600"
        title={row.rejection_reason}
      >
        {row.rejection_reason}
      </span>
    );
  };

  const approvalBody = (row: OvertimeRequest) => {
    if (!row.approved_by_name) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-700">
          {row.approved_by_name}
        </span>

        <span className="whitespace-nowrap text-xs text-slate-500">
          {formatDateTime(row.approved_at)}
        </span>
      </div>
    );
  };

  const actionBody = (row: OvertimeRequest) => {
    const isPending = normalizeStatus(row.status) === "PENDING";
    const isCancellable =
      isPending || normalizeStatus(row.status) === "APPROVED";
    const showManagementDecision = isPending && !row.approval_request_id;

    const isCurrentRowProcessing = processingRowId === row.id;

    if (
      (!showManagementDecision || (!canApprove && !canReject)) &&
      !(canCancel && isCancellable)
    ) {
      return (
        <span className="text-sm text-slate-400">{i18nT("static.yaeuo4")}</span>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        {showManagementDecision && canApprove && (
          <Button
            type="button"
            icon="pi pi-check"
            rounded
            outlined
            size="small"
            severity="success"
            loading={isCurrentRowProcessing && processingAction === "approve"}
            disabled={isActionRunning}
            tooltip={i18nT("static.1s2ov2y")}
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            onClick={() => onClickApprove(row)}
          />
        )}

        {showManagementDecision && canReject && (
          <Button
            type="button"
            icon="pi pi-times"
            rounded
            outlined
            size="small"
            severity="danger"
            loading={isCurrentRowProcessing && processingAction === "reject"}
            disabled={isActionRunning}
            tooltip={i18nT("static.1kej36u")}
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            onClick={() => onClickReject(row)}
          />
        )}

        {canCancel && isCancellable && (
          <Button
            type="button"
            icon="pi pi-ban"
            rounded
            outlined
            size="small"
            severity="warning"
            loading={isCurrentRowProcessing && processingAction === "cancel"}
            disabled={isActionRunning}
            tooltip={i18nT("static.ew9em3")}
            tooltipOptions={{ appendTo: getBody, position: "top" }}
            onClick={() => {
              setSelectedData(row);
              setCancelNote("");
              setCancelDialogVisible(true);
            }}
          />
        )}
      </div>
    );
  };

  const rowClassName = (row: OvertimeRequest) => {
    const status = normalizeStatus(row.status);

    if (status === "PENDING") {
      return "bg-amber-50/30";
    }

    if (status === "REJECTED") {
      return "bg-red-50/20";
    }

    return "";
  };

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={API_KEY} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Page Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-clock text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.1oswk5t")}{" "}
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.722yfg")}{" "}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {canCreate && (
                <Button
                  type="button"
                  label={i18nT("static.zdnhm")}
                  icon="pi pi-users"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={() => setMassDialogVisible(true)}
                />
              )}
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
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="m-0 text-xs text-slate-500">
                {i18nT("static.j9j9tg")}
              </p>

              <p className="m-0 mt-1 truncate text-xl font-bold text-slate-800 sm:text-2xl">
                {summaryStats.total}
              </p>

              <p className="m-0 mt-1 truncate text-xs text-slate-400">
                {rows.length} {i18nT("static.tmqg87")}{" "}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="m-0 text-xs text-amber-700">
                {i18nT("static.e8nfto")}
              </p>

              <p className="m-0 mt-1 truncate text-xl font-bold text-amber-800 sm:text-2xl">
                {summaryStats.pending}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="m-0 text-xs text-green-700">
                {i18nT("static.1j3qly2")}
              </p>

              <p className="m-0 mt-1 truncate text-xl font-bold text-green-800 sm:text-2xl">
                {summaryStats.approved}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="m-0 text-xs text-red-700">
                {i18nT("static.1uofzaf")}
              </p>

              <p className="m-0 mt-1 truncate text-xl font-bold text-red-800 sm:text-2xl">
                {summaryStats.rejected}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-1">
              <p className="m-0 text-xs text-slate-600">
                {i18nT("static.1a3t1vg")}
              </p>

              <p className="m-0 mt-1 truncate text-xl font-bold text-slate-800 sm:text-2xl">
                {summaryStats.cancelled}
              </p>
            </div>
          </div>

          {/* Filters */}
          <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.1jyfstj")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {i18nT("static.1ioq2zc")}{" "}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <IconField iconPosition="left" className="w-full">
                <InputIcon className="pi pi-search" />

                <InputText
                  value={keyword}
                  placeholder={i18nT("static.1m228g6")}
                  className="w-full"
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setKeyword(event.target.value)
                  }
                />
              </IconField>

              <Dropdown
                appendTo={getBody}
                value={statusFilter}
                options={statusOptions}
                placeholder={i18nT("static.18zxnji")}
                showClear
                className="w-full"
                onChange={(event) => setStatusFilter(event.value ?? null)}
              />

              <Calendar
                appendTo={getBody}
                value={dateFrom}
                dateFormat="dd MM yy"
                showIcon
                placeholder={i18nT("static.11hroym")}
                className="w-full"
                onChange={(event) =>
                  setDateFrom((event.value as Date | null) ?? null)
                }
              />

              <Calendar
                appendTo={getBody}
                value={dateTo}
                dateFormat="dd MM yy"
                showIcon
                placeholder={i18nT("static.ltgcf")}
                className="w-full"
                onChange={(event) =>
                  setDateTo((event.value as Date | null) ?? null)
                }
              />
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>{i18nT("static.17m7nzz")}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500">
                {filteredData.length} {i18nT("static.giuo2r")}{" "}
                {filteredData.length === 1 ? "" : i18nT("static.1w9pcoy")}
              </span>

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

          {/* Overtime Request Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={filteredData}
              dataKey="id"
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              stripedRows
              rowHover
              scrollable
              removableSort
              responsiveLayout="scroll"
              size="small"
              loading={isValidating}
              rowClassName={rowClassName}
              tableStyle={{
                minWidth: "100rem",
              }}
              emptyMessage={i18nT("static.lrx1y")}
              currentPageReportTemplate={i18nT("static.1kqh8lr")}
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
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
                  minWidth: "18rem",
                }}
              />

              <Column
                field="overtime_date"
                header={i18nT("static.bp5uwu")}
                sortable
                body={(row: OvertimeRequest) => (
                  <span className="whitespace-nowrap text-sm font-medium text-slate-700">
                    {formatDate(row.overtime_date)}
                  </span>
                )}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                header={i18nT("static.s5z0w")}
                body={overtimePeriodBody}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="status"
                header={i18nT("static.3pd73")}
                sortable
                body={statusBody}
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="reason"
                header={i18nT("static.i36sl5")}
                body={reasonBody}
                style={{
                  minWidth: "21rem",
                }}
              />

              <Column
                field="rejection_reason"
                header={i18nT("static.1ib4ur8")}
                body={rejectionReasonBody}
                style={{
                  minWidth: "22rem",
                }}
              />

              <Column
                field="approved_by_name"
                header={i18nT("static.17ztw7a")}
                body={approvalBody}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="submitted_at"
                header={i18nT("static.5g5077")}
                sortable
                body={(row: OvertimeRequest) => (
                  <span className="whitespace-nowrap text-sm text-slate-700">
                    {formatDateTime(row.submitted_at)}
                  </span>
                )}
                style={{
                  minWidth: "16rem",
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
                  width: "9rem",
                  minWidth: "9rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "9rem",
                  minWidth: "9rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        header={i18nT("static.gnyeqs")}
        visible={rejectDialogVisible}
        style={{
          width: "95vw",
          maxWidth: "36rem",
        }}
        breakpoints={{
          "640px": "95vw",
        }}
        modal
        draggable={false}
        resizable={false}
        closable={processingAction !== "reject"}
        closeOnEscape={processingAction !== "reject"}
        onHide={closeRejectDialog}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label={i18nT("static.ew9em3")}
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={processingAction === "reject"}
              className="w-full sm:w-auto"
              onClick={closeRejectDialog}
            />

            <Button
              type="button"
              label={i18nT("static.1khp33z")}
              icon="pi pi-times-circle"
              severity="danger"
              loading={processingAction === "reject"}
              disabled={processingAction === "reject"}
              className="w-full sm:w-auto"
              onClick={() => {
                void handleReject();
              }}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-5 pt-2">
          {selectedData && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="m-0 text-sm font-semibold text-slate-800">
                {selectedData.employee_name || i18nT("static.1drwniz")}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {formatDate(selectedData.overtime_date)}{" "}
                {i18nT("static.19xoda3")}{" "}
                {formatTime(selectedData.requested_start_at)}{" "}
                {i18nT("static.hnl64v")}{" "}
                {formatTime(selectedData.requested_end_at)}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.d78p3t")}{" "}
                {formatDuration(selectedData.requested_seconds)}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="rejectNote"
              className="text-sm font-medium text-slate-700"
            >
              {i18nT("static.1ib4ur8")}{" "}
              <span className="ml-1 text-red-500">*</span>
            </label>

            <InputTextarea
              id="rejectNote"
              value={rejectNote}
              rows={6}
              autoResize
              maxLength={MAX_REJECTION_NOTE_LENGTH}
              disabled={processingAction === "reject"}
              placeholder={i18nT("static.kj0d8q")}
              className="w-full"
              onChange={(event) => setRejectNote(event.target.value)}
            />

            <div className="flex items-start justify-between gap-3">
              <small className="text-slate-500">
                {i18nT("static.1nsrprn")}{" "}
              </small>

              <small className="shrink-0 text-slate-400">
                {rejectNote.length}/{MAX_REJECTION_NOTE_LENGTH}
              </small>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        header={i18nT("static.11qdseb")}
        visible={cancelDialogVisible}
        style={{ width: "95vw", maxWidth: "36rem" }}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
        closable={processingAction !== "cancel"}
        closeOnEscape={processingAction !== "cancel"}
        onHide={closeCancelDialog}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label={i18nT("static.1l0xxoj")}
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={processingAction === "cancel"}
              onClick={closeCancelDialog}
            />
            <Button
              type="button"
              label={i18nT("static.1oblt16")}
              icon="pi pi-ban"
              severity="warning"
              loading={processingAction === "cancel"}
              disabled={processingAction === "cancel"}
              onClick={() => void handleCancel()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3 pt-2">
          {selectedData && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {i18nT("static.16m3ww5")}{" "}
              <strong>
                {selectedData.employee_name || i18nT("static.5gxg69")}
              </strong>{" "}
              {i18nT("static.qyxx3k")} {formatDate(selectedData.overtime_date)}.
            </div>
          )}
          <label
            htmlFor="cancelNote"
            className="text-sm font-medium text-slate-700"
          >
            {i18nT("static.1361ff2")} <span className="text-red-500">*</span>
          </label>
          <InputTextarea
            id="cancelNote"
            value={cancelNote}
            rows={5}
            autoResize
            maxLength={MAX_REJECTION_NOTE_LENGTH}
            disabled={processingAction === "cancel"}
            placeholder={i18nT("static.1ykn5oo")}
            className="w-full"
            onChange={(event) => setCancelNote(event.target.value)}
          />
        </div>
      </Dialog>

      <Dialog
        header={i18nT("static.zdnhm")}
        visible={massDialogVisible}
        style={{ width: "96vw", maxWidth: "58rem" }}
        breakpoints={{ "960px": "96vw", "640px": "98vw" }}
        modal
        draggable={false}
        resizable={false}
        closable={!massLoading}
        closeOnEscape={!massLoading}
        onHide={closeMassDialog}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label={i18nT("static.1l0xxoj")}
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={massLoading}
              onClick={closeMassDialog}
            />
            <Button
              type="button"
              label={i18nT("static.x8eiqu")}
              icon="pi pi-search"
              severity="secondary"
              outlined
              loading={massLoading}
              disabled={massLoading}
              onClick={() => void handlePreviewMass()}
            />
            <Button
              type="button"
              label={i18nT("static.n0f0hd")}
              icon="pi pi-check"
              loading={massLoading}
              disabled={
                massLoading ||
                massTargets.length === 0 ||
                massTargets.some((target) => target.has_active_request)
              }
              onClick={() => void handleCreateMass()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-5 pt-2">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-800">
            {i18nT("static.14jh5a6")}{" "}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                {i18nT("static.chrwy8")}{" "}
              </label>
              <Calendar
                value={massDate}
                onChange={(event) =>
                  setMassDate((event.value as Date | null) ?? null)
                }
                showIcon
                dateFormat="dd MM yy"
                appendTo={getBody}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                {i18nT("static.1ju2ukd")}{" "}
              </label>
              <Dropdown
                value={massDepartmentId}
                options={departments
                  .filter((item) => item.is_active)
                  .map((item) => ({
                    label: i18nT("static.14r9r1n", {
                      p0: item.name,
                      p1: item.code,
                    }),
                    value: item.id,
                  }))}
                onChange={(event) => {
                  setMassDepartmentId(event.value ?? null);
                  setMassPositionId(null);
                  setMassTargets([]);
                }}
                placeholder={i18nT("static.sln621")}
                showClear
                filter
                appendTo={getBody}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                {i18nT("static.13ar4mx")}{" "}
              </label>
              <Dropdown
                value={massPositionId}
                options={positions
                  .filter(
                    (item) =>
                      item.is_active &&
                      (massDepartmentId === null ||
                        item.department_id === massDepartmentId ||
                        item.department_id === null),
                  )
                  .map((item) => ({
                    label: i18nT("static.14r9r1n", {
                      p0: item.name,
                      p1: item.code,
                    }),
                    value: item.id,
                  }))}
                onChange={(event) => {
                  setMassPositionId(event.value ?? null);
                  setMassTargets([]);
                }}
                placeholder={i18nT("static.1t0n4tv")}
                showClear
                filter
                appendTo={getBody}
                disabled={!massDepartmentId}
                className="w-full"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  {i18nT("static.neuj8l")}{" "}
                </label>
                <InputText
                  type="time"
                  value={massStart ?? ""}
                  onChange={(event) => {
                    setMassStart(event.target.value || null);
                    setMassTargets([]);
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">
                  {i18nT("static.bayyak")}{" "}
                </label>
                <InputText
                  type="time"
                  value={massEnd ?? ""}
                  onChange={(event) => {
                    setMassEnd(event.target.value || null);
                    setMassTargets([]);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              {i18nT("static.i36sl5")}
            </label>
            <InputTextarea
              value={massReason}
              rows={3}
              autoResize
              maxLength={1000}
              placeholder={i18nT("static.1vw3ybd")}
              onChange={(event) => {
                setMassReason(event.target.value);
                setMassTargets([]);
              }}
            />
          </div>
          <div className="rounded-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.vjbys1")}{" "}
                </p>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {massTargets.length} {i18nT("static.cpjjtl")}{" "}
                </p>
              </div>
              {massTargets.length > 0 && (
                <Tag
                  value={i18nT("static.1q510b6", { p0: massTargets.length })}
                  severity="info"
                  rounded
                />
              )}
            </div>
            <div className="max-h-56 overflow-auto p-3">
              {massTargets.length === 0 ? (
                <p className="m-0 p-3 text-sm text-slate-500">
                  {i18nT("static.11y2ujb")}{" "}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {massTargets.map((target) => (
                    <div
                      key={target.id}
                      className={`rounded-lg border p-3 ${target.has_active_request ? "border-red-200 bg-red-50" : "border-slate-200"}`}
                    >
                      <p className="m-0 text-sm font-medium text-slate-800">
                        {target.full_name}
                      </p>
                      <p className="m-0 mt-1 text-xs text-slate-500">
                        {target.department_name} {i18nT("static.19xoda3")}{" "}
                        {target.position_name}
                      </p>
                      {target.validation_error && (
                        <p className="m-0 mt-2 text-xs text-red-600">
                          {target.validation_error}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default OvertimeManagementTableData;
