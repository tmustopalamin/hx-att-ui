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
  approveLeaveManagement,
  rejectLeaveManagement,
} from "@/app/services/leave-management-service";

import { LeaveManagementRow } from "@/app/types/request-leave";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";

type ProcessingAction = "approve" | "reject" | null;

const API_KEY = "/api/leave-management?show_all=false";

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

const LeaveManagementTableData = () => {
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canApprove = permissions.includes("leave-management.approve");
  const canReject = permissions.includes("leave-management.reject");

  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);

  const [selectedData, setSelectedData] = useState<LeaveManagementRow | null>(
    null,
  );

  const [rejectNote, setRejectNote] = useState("");

  const [keyword, setKeyword] = useState("");

  const [statusFilter, setStatusFilter] = useState<string | null>("PENDING");

  const [dateFrom, setDateFrom] = useState<Date | null>(null);

  const [dateTo, setDateTo] = useState<Date | null>(null);

  const [processingRowId, setProcessingRowId] = useState<number | null>(null);

  const [processingAction, setProcessingAction] =
    useState<ProcessingAction>(null);

  const {
    data: leaveManagementData,
    error,
    isLoading,
    isValidating,
    mutate: refreshLeaveManagementData,
  } = useSWR<LeaveManagementRow[]>(API_KEY, fetcher);

  const rows = leaveManagementData ?? [];

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
        row.request_no,
        row.employee_code,
        row.employee_name,
        row.leave_name,
        row.reason,
        row.rejection_reason,
        row.approved_by_name,
        normalizedStatus,
      ];

      const matchesKeyword =
        !search ||
        searchableValues.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(search),
        );

      const matchesStatus = !statusFilter || normalizedStatus === statusFilter;

      const leaveStartDate = row.start_date
        ? dayjs(row.start_date).startOf("day")
        : null;

      const leaveEndDate = row.end_date
        ? dayjs(row.end_date).endOf("day")
        : leaveStartDate;

      const validStartDate = leaveStartDate?.isValid() ? leaveStartDate : null;

      const validEndDate = leaveEndDate?.isValid()
        ? leaveEndDate
        : validStartDate;

      /*
       * Menampilkan permohonan cuti
       * yang periodenya beririsan
       * dengan periode filter.
       */
      const matchesDateFrom =
        !dateFrom ||
        Boolean(
          validEndDate &&
          validEndDate.valueOf() >= dayjs(dateFrom).startOf("day").valueOf(),
        );

      const matchesDateTo =
        !dateTo ||
        Boolean(
          validStartDate &&
          validStartDate.valueOf() <= dayjs(dateTo).endOf("day").valueOf(),
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
    Boolean(statusFilter) ||
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
      await refreshLeaveManagementData();
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

  const closeRejectDialog = () => {
    if (processingAction === "reject") {
      return;
    }

    setRejectDialogVisible(false);

    setSelectedData(null);
    setRejectNote("");
  };

  const handleApprove = async (row: LeaveManagementRow) => {
    try {
      setProcessingRowId(row.id);
      setProcessingAction("approve");

      const response = await approveLeaveManagement(
        row.id,
        row.row_version,
        "Approved manually by admin.",
      );

      await refreshLeaveManagementData();

      showSuccess(response.message || "Leave request approved successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const onClickApprove = (row: LeaveManagementRow) => {
    requestActionConfirmation({
      header: "Approve Leave Request",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            Approve this leave request manually?
          </span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {row.employee_name || "Unknown employee"}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {row.request_no || "No request number"} ·{" "}
              {row.leave_name || "Unknown leave type"}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {formatDate(row.start_date)} – {formatDate(row.end_date)}
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

  const onClickReject = (row: LeaveManagementRow) => {
    setSelectedData(row);
    setRejectNote("");
    setRejectDialogVisible(true);
  };

  const handleReject = async () => {
    if (!selectedData) {
      showError(new Error("Leave request is not selected."));

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

      const response = await rejectLeaveManagement(
        selectedData.id,
        selectedData.row_version,
        cleanNote,
      );

      await refreshLeaveManagementData();

      setRejectDialogVisible(false);

      setSelectedData(null);
      setRejectNote("");

      showSuccess(response.message || "Leave request rejected successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const statusBody = (row: LeaveManagementRow) => {
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

  const employeeBody = (row: LeaveManagementRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-800">
          {row.employee_name || "Unknown employee"}
        </span>

        <span className="font-mono text-xs text-slate-500">
          {row.employee_code || "No employee code"}
        </span>
      </div>
    );
  };

  const requestBody = (row: LeaveManagementRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-sm font-semibold text-slate-700">
          {row.request_no || "-"}
        </span>

        <span className="text-xs text-slate-500">
          Submitted {formatDateTime(row.submitted_at)}
        </span>
      </div>
    );
  };

  const leavePeriodBody = (row: LeaveManagementRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
          {formatDate(row.start_date)} – {formatDate(row.end_date)}
        </span>

        <span className="text-xs text-slate-500">
          {Number(row.total_days ?? 0)} day
          {Number(row.total_days ?? 0) === 1 ? "" : "s"}
        </span>
      </div>
    );
  };

  const attachmentBody = (row: LeaveManagementRow) => {
    const count = Number(row.attachment_count ?? 0);

    if (count <= 0) {
      return <span className="text-sm text-slate-400">None</span>;
    }

    return (
      <Tag
        value={`${count} file${count === 1 ? "" : "s"}`}
        severity="info"
        icon="pi pi-paperclip"
        rounded
      />
    );
  };

  const reasonBody = (row: LeaveManagementRow) => {
    if (!row.reason) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span
        className="block max-w-xs truncate text-sm text-slate-700"
        title={row.reason}
      >
        {row.reason}
      </span>
    );
  };

  const rejectionReasonBody = (row: LeaveManagementRow) => {
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

  const approvalBody = (row: LeaveManagementRow) => {
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

  const actionBody = (row: LeaveManagementRow) => {
    const isPending = normalizeStatus(row.status) === "PENDING";

    const isCurrentRowProcessing = processingRowId === row.id;

    if (
      !isPending ||
      row.approval_request_id ||
      !row.submitted_at ||
      (!canApprove && !canReject)
    ) {
      return <span className="text-sm text-slate-400">No action</span>;
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        {canApprove && (
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

        {canReject && (
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
      </div>
    );
  };

  const rowClassName = (row: LeaveManagementRow) => {
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
                <i className="pi pi-calendar-plus text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Leave Management
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Review employee leave requests. Requests with an approval
                  workflow are processed from Approval Inbox.
                </p>
              </div>
            </div>

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
                Leave Request Filter
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                The date filter shows leave requests whose periods overlap the
                selected range.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,2fr)_minmax(13rem,1fr)_minmax(12rem,1fr)_minmax(12rem,1fr)]">
              <IconField iconPosition="left" className="w-full">
                <InputIcon className="pi pi-search" />

                <InputText
                  value={keyword}
                  placeholder="Search request, employee, leave type, or reason"
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
                placeholder="Leave From"
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
                placeholder="Leave To"
                className="w-full"
                onChange={(event) =>
                  setDateTo((event.value as Date | null) ?? null)
                }
              />
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>Leave From cannot be later than Leave To.</span>
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

          {/* Leave Request Table */}
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
                minWidth: "112rem",
              }}
              emptyMessage="No leave request data found."
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
                field="request_no"
                header="Request"
                sortable
                body={requestBody}
                style={{
                  minWidth: "17rem",
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
                field="leave_name"
                header="Leave Type"
                sortable
                style={{
                  minWidth: "14rem",
                }}
                body={(row: LeaveManagementRow) => (
                  <span className="text-sm font-medium text-slate-700">
                    {row.leave_name || "-"}
                  </span>
                )}
              />

              <Column
                field="start_date"
                header="Leave Period"
                sortable
                body={leavePeriodBody}
                style={{
                  minWidth: "20rem",
                }}
              />

              <Column
                field="attachment_count"
                header="Attachments"
                body={attachmentBody}
                style={{
                  minWidth: "11rem",
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
                  minWidth: "20rem",
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
        header="Reject Leave Request"
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
                {selectedData.request_no || "No request number"} ·{" "}
                {selectedData.leave_name || "Unknown leave type"}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {formatDate(selectedData.start_date)} –{" "}
                {formatDate(selectedData.end_date)}
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
              placeholder="Explain why this leave request is rejected"
              className={`w-full ${
                !rejectNote.trim()
                  ? ""
                  : rejectNote.length > MAX_REJECTION_NOTE_LENGTH
                    ? "p-invalid"
                    : ""
              }`}
              onChange={(event) => setRejectNote(event.target.value)}
            />

            <div className="flex items-start justify-between gap-3">
              <small className="text-slate-500">
                This reason will be stored and shown to the employee.
              </small>

              <small
                className={`shrink-0 ${
                  rejectNote.length > MAX_REJECTION_NOTE_LENGTH
                    ? "text-red-600"
                    : "text-slate-400"
                }`}
              >
                {rejectNote.length}/{MAX_REJECTION_NOTE_LENGTH}
              </small>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default LeaveManagementTableData;
