"use client";

import { ChangeEvent, useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";

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
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  return date.isValid() ? date.format("DD MMM YYYY") : "-";
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const date = dayjs(value);

  return date.isValid() ? date.format("DD MMM YYYY HH:mm") : "-";
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
        label: formatStatusLabel(status),
        value: status,
      }));
  }, [rows]);

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
        summary: "Success",
        detail: message,
      }),
    );
  };

  const showWarning = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "warn",
        summary: "Validation",
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
          summary: "Error",
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
          summary: "Error",
          detail: err.message,
        }),
      );

      return;
    }

    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: "Error",
        detail: "An unexpected error occurred.",
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
      if (targets.length === 0)
        showWarning("No active employee matches the selected target.");
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
        showWarning("Preview the employee target before creating overtime.");
        return;
      }
      if (massTargets.some((target) => target.has_active_request)) {
        showWarning(
          "One or more target employees already have an active request. Resolve the conflict before creating the batch.",
        );
        return;
      }
      setMassLoading(true);
      const response = await createMassOvertime(payload);
      await refreshOvertimeManagementData();
      showSuccess(
        response.message ||
          `${massTargets.length} overtime request(s) created successfully.`,
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
      showWarning("Cancellation reason is required.");
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
      showSuccess(
        response.message || "Overtime request cancelled successfully.",
      );
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

      showSuccess(
        response.message || "Overtime request approved successfully.",
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const onClickApprove = (row: OvertimeRequest) => {
    requestActionConfirmation({
      header: "Approve Overtime Request",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            Approve this overtime request manually?
          </span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {row.employee_name || "Unknown employee"}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {formatDate(row.overtime_date)} ·{" "}
              {formatTime(row.requested_start_at)} –{" "}
              {formatTime(row.requested_end_at)}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              Requested duration: {formatDuration(row.requested_seconds)}
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
            label="Cancel"
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label="Approve"
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
      showWarning("Rejection reason is required.");

      return;
    }

    if (cleanNote.length > MAX_REJECTION_NOTE_LENGTH) {
      showWarning(
        `Rejection reason cannot exceed ${MAX_REJECTION_NOTE_LENGTH} characters.`,
      );

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

      showSuccess(
        response.message || "Overtime request rejected successfully.",
      );
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
          value="Approved"
          severity="success"
          icon="pi pi-check-circle"
          rounded
        />
      );
    }

    if (status === "REJECTED") {
      return (
        <Tag
          value="Rejected"
          severity="danger"
          icon="pi pi-times-circle"
          rounded
        />
      );
    }

    if (status === "CANCELLED") {
      return (
        <Tag value="Cancelled" severity="secondary" icon="pi pi-ban" rounded />
      );
    }

    return (
      <Tag
        value={formatStatusLabel(status || "PENDING")}
        severity="warning"
        icon="pi pi-clock"
        rounded
      />
    );
  };

  const employeeBody = (row: OvertimeRequest) => {
    return (
      <span className="text-sm font-medium text-slate-800">
        {row.employee_name || "Unknown employee"}
      </span>
    );
  };

  const overtimePeriodBody = (row: OvertimeRequest) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
          {formatTime(row.requested_start_at)} –{" "}
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
      return <span className="text-sm text-slate-400">No action</span>;
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
            tooltip="Approve"
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
            tooltip="Reject"
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
            tooltip="Cancel"
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
                  Overtime Management
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Review employee overtime requests. Requests with an approval
                  workflow are processed from Approval Inbox.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {canCreate && (
                <Button
                  type="button"
                  label="Create Mass Overtime"
                  icon="pi pi-users"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={() => setMassDialogVisible(true)}
                />
              )}
              <Button
                type="button"
                label="Refresh"
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
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="m-0 text-xs text-slate-500">Filtered Requests</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
                {summaryStats.total}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-400">
                {rows.length} total records
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="m-0 text-xs text-amber-700">Pending</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-amber-800">
                {summaryStats.pending}
              </p>
            </div>

            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="m-0 text-xs text-green-700">Approved</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-green-800">
                {summaryStats.approved}
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="m-0 text-xs text-red-700">Rejected</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-red-800">
                {summaryStats.rejected}
              </p>
            </div>

            <div className="col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-1">
              <p className="m-0 text-xs text-slate-600">Cancelled</p>

              <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
                {summaryStats.cancelled}
              </p>
            </div>
          </div>

          {/* Filters */}
          <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Overtime Request Filter
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                Filter requests by employee, status, or overtime date.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,2fr)_minmax(13rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)]">
              <IconField iconPosition="left" className="w-full">
                <InputIcon className="pi pi-search" />

                <InputText
                  value={keyword}
                  placeholder="Search employee, reason, approval, or time"
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
                placeholder="All Statuses"
                showClear
                className="w-full"
                onChange={(event) => setStatusFilter(event.value ?? null)}
              />

              <Calendar
                appendTo={getBody}
                value={dateFrom}
                dateFormat="dd M yy"
                showIcon
                placeholder="Overtime From"
                className="w-full"
                onChange={(event) =>
                  setDateFrom((event.value as Date | null) ?? null)
                }
              />

              <Calendar
                appendTo={getBody}
                value={dateTo}
                dateFormat="dd M yy"
                showIcon
                placeholder="Overtime To"
                className="w-full"
                onChange={(event) =>
                  setDateTo((event.value as Date | null) ?? null)
                }
              />
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>Overtime From cannot be later than Overtime To.</span>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-500">
                {filteredData.length} matching request
                {filteredData.length === 1 ? "" : "s"}
              </span>

              <Button
                type="button"
                label="Reset Filters"
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
              emptyMessage="No overtime request data found."
              currentPageReportTemplate="{first} to {last} of {totalRecords}"
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
                header="Employee"
                sortable
                body={employeeBody}
                style={{
                  minWidth: "18rem",
                }}
              />

              <Column
                field="overtime_date"
                header="Overtime Date"
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
                header="Requested Time"
                body={overtimePeriodBody}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="status"
                header="Status"
                sortable
                body={statusBody}
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="reason"
                header="Reason"
                body={reasonBody}
                style={{
                  minWidth: "21rem",
                }}
              />

              <Column
                field="rejection_reason"
                header="Rejection Reason"
                body={rejectionReasonBody}
                style={{
                  minWidth: "22rem",
                }}
              />

              <Column
                field="approved_by_name"
                header="Approval"
                body={approvalBody}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="submitted_at"
                header="Submitted At"
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
                header="Action"
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
        header="Reject Overtime Request"
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
              label="Cancel"
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={processingAction === "reject"}
              className="w-full sm:w-auto"
              onClick={closeRejectDialog}
            />

            <Button
              type="button"
              label="Reject Request"
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
                {selectedData.employee_name || "Unknown employee"}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {formatDate(selectedData.overtime_date)} ·{" "}
                {formatTime(selectedData.requested_start_at)} –{" "}
                {formatTime(selectedData.requested_end_at)}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                Requested duration:{" "}
                {formatDuration(selectedData.requested_seconds)}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label
              htmlFor="rejectNote"
              className="text-sm font-medium text-slate-700"
            >
              Rejection Reason
              <span className="ml-1 text-red-500">*</span>
            </label>

            <InputTextarea
              id="rejectNote"
              value={rejectNote}
              rows={6}
              autoResize
              maxLength={MAX_REJECTION_NOTE_LENGTH}
              disabled={processingAction === "reject"}
              placeholder="Explain why this overtime request is rejected"
              className="w-full"
              onChange={(event) => setRejectNote(event.target.value)}
            />

            <div className="flex items-start justify-between gap-3">
              <small className="text-slate-500">
                This reason will be stored and shown to the employee.
              </small>

              <small className="shrink-0 text-slate-400">
                {rejectNote.length}/{MAX_REJECTION_NOTE_LENGTH}
              </small>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Cancel Overtime Request"
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
              label="Close"
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={processingAction === "cancel"}
              onClick={closeCancelDialog}
            />
            <Button
              type="button"
              label="Cancel Overtime"
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
              Cancel overtime for{" "}
              <strong>{selectedData.employee_name || "employee"}</strong> on{" "}
              {formatDate(selectedData.overtime_date)}.
            </div>
          )}
          <label
            htmlFor="cancelNote"
            className="text-sm font-medium text-slate-700"
          >
            Cancellation reason <span className="text-red-500">*</span>
          </label>
          <InputTextarea
            id="cancelNote"
            value={cancelNote}
            rows={5}
            autoResize
            maxLength={MAX_REJECTION_NOTE_LENGTH}
            disabled={processingAction === "cancel"}
            placeholder="Explain why this overtime is cancelled"
            className="w-full"
            onChange={(event) => setCancelNote(event.target.value)}
          />
        </div>
      </Dialog>

      <Dialog
        header="Create Mass Overtime"
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
              label="Close"
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={massLoading}
              onClick={closeMassDialog}
            />
            <Button
              type="button"
              label="Preview Employees"
              icon="pi pi-search"
              severity="secondary"
              outlined
              loading={massLoading}
              disabled={massLoading}
              onClick={() => void handlePreviewMass()}
            />
            <Button
              type="button"
              label="Create Requests"
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
            Employees are resolved on the server using the employment assignment
            effective on the overtime date. All requests are created in one
            transaction and use the normal manager approval chain.
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                Overtime date *
              </label>
              <Calendar
                value={massDate}
                onChange={(event) =>
                  setMassDate((event.value as Date | null) ?? null)
                }
                showIcon
                dateFormat="dd M yy"
                appendTo={getBody}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                Department *
              </label>
              <Dropdown
                value={massDepartmentId}
                options={departments
                  .filter((item) => item.is_active)
                  .map((item) => ({
                    label: `${item.name} (${item.code})`,
                    value: item.id,
                  }))}
                onChange={(event) => {
                  setMassDepartmentId(event.value ?? null);
                  setMassPositionId(null);
                  setMassTargets([]);
                }}
                placeholder="Select department"
                showClear
                filter
                appendTo={getBody}
                className="w-full"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                Position (optional)
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
                    label: `${item.name} (${item.code})`,
                    value: item.id,
                  }))}
                onChange={(event) => {
                  setMassPositionId(event.value ?? null);
                  setMassTargets([]);
                }}
                placeholder="All positions in department"
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
                  Start *
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
                  End *
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
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <InputTextarea
              value={massReason}
              rows={3}
              autoResize
              maxLength={1000}
              placeholder="Reason for this mass overtime"
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
                  Target employees
                </p>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {massTargets.length} employee(s) selected by the server
                </p>
              </div>
              {massTargets.length > 0 && (
                <Tag
                  value={`${massTargets.length} target`}
                  severity="info"
                  rounded
                />
              )}
            </div>
            <div className="max-h-56 overflow-auto p-3">
              {massTargets.length === 0 ? (
                <p className="m-0 p-3 text-sm text-slate-500">
                  Choose a date/target and click Preview Employees.
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
                        {target.department_name} · {target.position_name}
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
