"use client";

import { ChangeEvent, useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
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

import {
  approveOvertimeManagement,
  rejectOvertimeManagement,
} from "@/app/services/overtime-management-service";

import { OvertimeRequest } from "@/app/types/overtime-request";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";

type ProcessingAction = "approve" | "reject" | null;

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

  const [rejectDialogVisible, setRejectDialogVisible] = useState(false);

  const [selectedData, setSelectedData] = useState<OvertimeRequest | null>(
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

  const closeRejectDialog = () => {
    if (processingAction === "reject") {
      return;
    }

    setRejectDialogVisible(false);

    setSelectedData(null);
    setRejectNote("");
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
    confirmDialog({
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

    const isCurrentRowProcessing = processingRowId === row.id;

    if (!isPending) {
      return <span className="text-sm text-slate-400">No action</span>;
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
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
      <ConfirmDialog />

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
                  Review employee overtime requests and perform manual approval
                  or rejection.
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
    </>
  );
};

export default OvertimeManagementTableData;
