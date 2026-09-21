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
  return formatDisplayDate(value);
};

const formatDateTime = (value?: string | null) => {
  return formatDisplayDateTime(value);
};

const LeaveManagementTableData = () => {
  const { t: i18nT } = useI18n();
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

      showSuccess(response.message || i18nT("static.1amfu6l"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const onClickApprove = (row: LeaveManagementRow) => {
    requestActionConfirmation({
      header: i18nT("static.vpxz54"),
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.aeani2")} </span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {row.employee_name || i18nT("static.1drwniz")}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {row.request_no || i18nT("static.ngaclg")}{" "}
              {i18nT("static.19xoda3")}{" "}
              {row.leave_name || i18nT("static.15uhn5m")}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {formatDate(row.start_date)} {i18nT("static.hnl64v")}{" "}
              {formatDate(row.end_date)}
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

      const response = await rejectLeaveManagement(
        selectedData.id,
        selectedData.row_version,
        cleanNote,
      );

      await refreshLeaveManagementData();

      setRejectDialogVisible(false);

      setSelectedData(null);
      setRejectNote("");

      showSuccess(response.message || i18nT("static.10zcc5w"));
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

  const employeeBody = (row: LeaveManagementRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-800">
          {row.employee_name || i18nT("static.1drwniz")}
        </span>

        <span className="font-mono text-xs text-slate-500">
          {row.employee_code || i18nT("static.1t8ynib")}
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
          {i18nT("static.12at4de")} {formatDateTime(row.submitted_at)}
        </span>
      </div>
    );
  };

  const leavePeriodBody = (row: LeaveManagementRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
          {formatDate(row.start_date)} {i18nT("static.hnl64v")}{" "}
          {formatDate(row.end_date)}
        </span>

        <span className="text-xs text-slate-500">
          {Number(row.total_days ?? 0)} {i18nT("static.1rciku5")}{" "}
          {Number(row.total_days ?? 0) === 1 ? "" : i18nT("static.1w9pcoy")}
        </span>
      </div>
    );
  };

  const attachmentBody = (row: LeaveManagementRow) => {
    const count = Number(row.attachment_count ?? 0);

    if (count <= 0) {
      return (
        <span className="text-sm text-slate-400">{i18nT("static.deku7v")}</span>
      );
    }

    return (
      <Tag
        value={i18nT("static.kh1thg", {
          p0: count,
          p1: count === 1 ? "" : i18nT("static.1w9pcoy"),
        })}
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
      return (
        <span className="text-sm text-slate-400">{i18nT("static.yaeuo4")}</span>
      );
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
            tooltip={i18nT("static.1s2ov2y")}
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
            tooltip={i18nT("static.1kej36u")}
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
                  {i18nT("static.51exaz")}{" "}
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.d80wo2")}{" "}
                </p>
              </div>
            </div>

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
                {i18nT("static.1ctj519")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {i18nT("static.11ksx8b")}{" "}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <IconField iconPosition="left" className="w-full">
                <InputIcon className="pi pi-search" />

                <InputText
                  value={keyword}
                  placeholder={i18nT("static.19ijljc")}
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
                placeholder={i18nT("static.mqlz3k")}
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
                placeholder={i18nT("static.ccbt")}
                className="w-full"
                onChange={(event) =>
                  setDateTo((event.value as Date | null) ?? null)
                }
              />
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>{i18nT("static.6ujd33")}</span>
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
              emptyMessage={i18nT("static.7u08u")}
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
                field="request_no"
                header={i18nT("static.1058hua")}
                sortable
                body={requestBody}
                style={{
                  minWidth: "17rem",
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
                field="leave_name"
                header={i18nT("static.se3juw")}
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
                header={i18nT("static.1qllmox")}
                sortable
                body={leavePeriodBody}
                style={{
                  minWidth: "20rem",
                }}
              />

              <Column
                field="attachment_count"
                header={i18nT("static.8925gh")}
                body={attachmentBody}
                style={{
                  minWidth: "11rem",
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
                  minWidth: "20rem",
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
        header={i18nT("static.1g09590")}
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
                {selectedData.request_no || i18nT("static.ngaclg")}{" "}
                {i18nT("static.19xoda3")}{" "}
                {selectedData.leave_name || i18nT("static.15uhn5m")}
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {formatDate(selectedData.start_date)} {i18nT("static.hnl64v")}{" "}
                {formatDate(selectedData.end_date)}
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
              placeholder={i18nT("static.1l2r2qq")}
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
                {i18nT("static.1nsrprn")}{" "}
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
