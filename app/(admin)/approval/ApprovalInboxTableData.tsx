"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import dayjs from "dayjs";

import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";

import { useDispatch } from "react-redux";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { fetcher } from "@/app/utils/fetcher";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

import {
  ApprovalActionForm,
  ApprovalPendingItem,
  defaultApprovalActionFormValue,
} from "@/app/types/approval";

import {
  approveApprovalRequest,
  rejectApprovalRequest,
} from "@/app/services/approval-service";

const API_KEY = "/api/approval/pending";

const getBody = () => document.body;

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => {
      window.removeEventListener("resize", checkScreen);
    };
  }, []);

  return isMobile;
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return dayjs(value).format("DD MMM YYYY");
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return dayjs(value).format("DD MMM YYYY HH:mm");
};

const formatTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return dayjs(value).format("HH:mm");
};

const formatDuration = (seconds?: number | null) => {
  const totalSeconds = Number(seconds ?? 0);

  if (totalSeconds <= 0) {
    return "-";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
};

const truncateText = (value?: string | null, maxLength = 90) => {
  const text = (value ?? "").trim();

  if (!text) {
    return "-";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength)}...`;
};

const getModuleLabel = (moduleCode?: string | null) => {
  const code = (moduleCode ?? "").toUpperCase();

  if (code === "OVERTIME") {
    return "Overtime";
  }

  if (code === "LEAVE") {
    return "Leave";
  }

  return moduleCode ?? "-";
};

const getModuleSeverity = (moduleCode?: string | null) => {
  const code = (moduleCode ?? "").toUpperCase();

  if (code === "OVERTIME") {
    return "info";
  }

  if (code === "LEAVE") {
    return "success";
  }

  return "secondary";
};

const getStatusSeverity = (status?: string | null) => {
  const value = (status ?? "").toUpperCase();

  if (value === "PENDING") {
    return "warning";
  }

  if (value === "APPROVED") {
    return "success";
  }

  if (value === "REJECTED") {
    return "danger";
  }

  if (value === "CANCELLED") {
    return "secondary";
  }

  if (value === "WAITING") {
    return "info";
  }

  return "info";
};

const getRequestTitle = (rowData: ApprovalPendingItem) => {
  return formatDate(rowData.request_date);
};

const getRequestSubtitle = (rowData: ApprovalPendingItem) => {
  const moduleCode = rowData.module_code?.toUpperCase();

  if (moduleCode === "LEAVE") {
    return `Total days: ${rowData.request_seconds ?? "-"}`;
  }

  if (moduleCode === "OVERTIME") {
    return `${formatTime(rowData.request_start_at)} - ${formatTime(
      rowData.request_end_at,
    )} • ${formatDuration(rowData.request_seconds)}`;
  }

  return "-";
};

const ApprovalInboxTableData = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();

  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [selectedData, setSelectedData] = useState<ApprovalPendingItem | null>(
    null,
  );
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(
    null,
  );
  const [detailVisible, setDetailVisible] = useState(false);
  const [actionVisible, setActionVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setFocus,
    formState: { isValid },
  } = useForm<ApprovalActionForm>({
    defaultValues: defaultApprovalActionFormValue,
    mode: "onTouched",
  });

  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });

  const {
    data: approvalData,
    error,
    isLoading,
  } = useSWR<ApprovalPendingItem[]>(API_KEY, fetcher);

  const rows = approvalData ?? [];

  const filteredMobileRows = useMemo(() => {
    const keyword = globalFilterValue.trim().toLowerCase();

    if (!keyword) {
      return rows;
    }

    return rows.filter((item) => {
      const searchable = [
        item.module_code,
        item.requester_name,
        item.request_reason,
        item.request_status,
        item.status,
        getRequestTitle(item),
        getRequestSubtitle(item),
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(keyword);
    });
  }, [rows, globalFilterValue]);

  const summary = useMemo(() => {
    const overtime = rows.filter(
      (item) => item.module_code?.toUpperCase() === "OVERTIME",
    ).length;

    const leave = rows.filter(
      (item) => item.module_code?.toUpperCase() === "LEAVE",
    ).length;

    return {
      total: rows.length,
      overtime,
      leave,
    };
  }, [rows]);

  const refreshData = async () => {
    await mutate(API_KEY);
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
        detail: "Unknown error",
      }),
    );
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });

    setGlobalFilterValue(value);
  };

  const openDetail = (data: ApprovalPendingItem) => {
    setSelectedData(data);
    setDetailVisible(true);
  };

  const closeDetail = () => {
    setDetailVisible(false);
    setSelectedData(null);
  };

  const openActionDialog = (
    data: ApprovalPendingItem,
    type: "approve" | "reject",
  ) => {
    setSelectedData(data);
    setActionType(type);
    setDetailVisible(false);
    reset(defaultApprovalActionFormValue);
    setActionVisible(true);

    setTimeout(() => {
      setFocus("note");
    }, 0);
  };

  const closeActionDialog = () => {
    if (isSaving) {
      return;
    }

    setSelectedData(null);
    setActionType(null);
    setActionVisible(false);
    reset(defaultApprovalActionFormValue);
  };

  const handleApprovalAction = async (formData: ApprovalActionForm) => {
    if (!selectedData || !actionType || !isValid || isSaving) {
      return;
    }

    try {
      setIsSaving(true);

      if (actionType === "approve") {
        await approveApprovalRequest(
          selectedData.approval_request_id,
          selectedData.row_version,
          formData.note,
        );
      }

      if (actionType === "reject") {
        await rejectApprovalRequest(
          selectedData.approval_request_id,
          selectedData.row_version,
          formData.note,
        );
      }

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail:
            actionType === "approve"
              ? "Approval request approved successfully."
              : "Approval request rejected successfully.",
        }),
      );

      closeActionDialog();
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmActionSubmit = (formData: ApprovalActionForm) => {
    if (!selectedData || !actionType) {
      return;
    }

    const isApprove = actionType === "approve";

    confirmDialog({
      message: isApprove
        ? "Do you want to approve this request?"
        : "Do you want to reject this request?",
      header: isApprove ? "Approve Confirmation" : "Reject Confirmation",
      icon: isApprove ? "pi pi-check-circle" : "pi pi-times-circle",
      defaultFocus: "accept",
      accept: () => handleApprovalAction(formData),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
            disabled={isSaving}
          />
          <Button
            label={isApprove ? "Yes, Approve" : "Yes, Reject"}
            icon={isApprove ? "pi pi-check" : "pi pi-times"}
            onClick={options.accept}
            severity={isApprove ? "success" : "danger"}
            disabled={isSaving}
          />
        </div>
      ),
    });
  };

  const moduleBody = (rowData: ApprovalPendingItem) => {
    return (
      <Tag
        value={getModuleLabel(rowData.module_code)}
        severity={getModuleSeverity(rowData.module_code)}
      />
    );
  };

  const approvalStepBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex items-center gap-2">
        <Tag value={`Step ${rowData.step_no}`} severity="info" />
        <Tag
          value={rowData.status ?? "-"}
          severity={getStatusSeverity(rowData.status)}
        />
      </div>
    );
  };

  const requestInfoBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-slate-800">
          {getRequestTitle(rowData)}
        </span>
        <span className="text-sm text-slate-500">
          {getRequestSubtitle(rowData)}
        </span>
      </div>
    );
  };

  const requesterBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-slate-800">
          {rowData.requester_name ?? "-"}
        </span>
        <span className="text-xs text-slate-500">
          Submitted {formatDateTime(rowData.submitted_at)}
        </span>
      </div>
    );
  };

  const reasonBody = (rowData: ApprovalPendingItem) => {
    return (
      <span className="text-sm leading-6 text-slate-700">
        {truncateText(rowData.request_reason, 80)}
      </span>
    );
  };

  const actionBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex flex-nowrap items-center justify-start gap-2">
        <Button
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          tooltip="View detail"
          rounded
          severity="info"
          icon="pi pi-eye"
          size="small"
          onClick={() => openDetail(rowData)}
        />

        <Button
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          tooltip="Approve"
          rounded
          severity="success"
          icon="pi pi-check"
          size="small"
          onClick={() => openActionDialog(rowData, "approve")}
        />

        <Button
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          tooltip="Reject"
          rounded
          severity="danger"
          icon="pi pi-times"
          size="small"
          onClick={() => openActionDialog(rowData, "reject")}
        />
      </div>
    );
  };

  const actionDialogTitle =
    actionType === "approve"
      ? "Approve Request"
      : actionType === "reject"
        ? "Reject Request"
        : "Approval Action";

  const actionDialogFooter = (
    <div className="flex flex-row justify-end gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        onClick={closeActionDialog}
        className="p-button-text"
        disabled={isSaving}
      />

      <Button
        type="submit"
        label={
          isSaving
            ? actionType === "approve"
              ? "Approving..."
              : "Rejecting..."
            : actionType === "approve"
              ? "Approve"
              : "Reject"
        }
        icon={isSaving ? "pi pi-spin pi-spinner" : "pi pi-check"}
        severity={actionType === "approve" ? "success" : "danger"}
        disabled={isSaving}
      />
    </div>
  );

  const renderDesktopTable = () => {
    return (
      <DataTable
        value={rows}
        tableStyle={{ minWidth: "76rem" }}
        stripedRows
        paginator
        rows={10}
        rowsPerPageOptions={[10, 25, 50]}
        dataKey="approval_request_step_id"
        globalFilterFields={[
          "module_code",
          "requester_name",
          "request_reason",
          "request_status",
          "status",
        ]}
        emptyMessage="No pending approval found."
        filters={filters}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        loading={isLoading}
        scrollable
        responsiveLayout="scroll"
        className="text-sm"
      >
        <Column
          header="#"
          headerStyle={{ width: "4rem" }}
          body={(_, options) => options.rowIndex + 1}
        />

        <Column
          header="Type"
          body={moduleBody}
          style={{ width: "8rem", minWidth: "8rem" }}
        />

        <Column
          header="Requester"
          body={requesterBody}
          style={{ minWidth: "17rem" }}
        />

        <Column
          header="Request"
          body={requestInfoBody}
          style={{ minWidth: "15rem" }}
        />

        <Column
          header="Reason"
          body={reasonBody}
          style={{ minWidth: "20rem" }}
        />

        <Column
          header="Approval"
          body={approvalStepBody}
          style={{ minWidth: "13rem" }}
        />

        <Column
          header="Action"
          body={actionBody}
          frozen
          alignFrozen="right"
          style={{
            width: "12rem",
            minWidth: "12rem",
          }}
          headerStyle={{
            width: "12rem",
            minWidth: "12rem",
            background: "#ffffff",
            zIndex: 1,
          }}
          bodyStyle={{
            width: "12rem",
            minWidth: "12rem",
            background: "#ffffff",
            whiteSpace: "nowrap",
          }}
        />
      </DataTable>
    );
  };

  const renderMobileCards = () => {
    if (filteredMobileRows.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
          <div className="text-base font-semibold text-slate-700">
            No pending approval found
          </div>
          <div className="mt-1 text-sm text-slate-500">
            Try changing your search keyword.
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        {filteredMobileRows.map((rowData) => (
          <div
            key={rowData.approval_request_step_id}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag
                    value={getModuleLabel(rowData.module_code)}
                    severity={getModuleSeverity(rowData.module_code)}
                  />
                  <Tag value={`Step ${rowData.step_no}`} severity="info" />
                </div>

                <div className="mt-3 truncate text-base font-semibold text-slate-900">
                  {rowData.requester_name ?? "-"}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  Submitted {formatDateTime(rowData.submitted_at)}
                </div>
              </div>

              <Tag
                value={rowData.status ?? "-"}
                severity={getStatusSeverity(rowData.status)}
              />
            </div>

            <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-sm font-semibold text-slate-800">
                {getRequestTitle(rowData)}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {getRequestSubtitle(rowData)}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reason
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-700">
                {truncateText(rowData.request_reason, 130)}
              </div>
            </div>

            <div className="mt-4 flex flex-row gap-2">
              <Button
                icon="pi pi-eye"
                severity="info"
                size="small"
                className="flex-1"
                onClick={() => openDetail(rowData)}
              />

              <Button
                icon="pi pi-check"
                severity="success"
                size="small"
                className="flex-1"
                onClick={() => openActionDialog(rowData, "approve")}
              />

              <Button
                icon="pi pi-times"
                severity="danger"
                size="small"
                className="flex-1"
                onClick={() => openActionDialog(rowData, "reject")}
              />
            </div>
          </div>
        ))}
      </div>
    );
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

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Pending Approval</div>
              <div className="mt-2 text-3xl font-semibold text-slate-800">
                {summary.total}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <i className="pi pi-inbox text-xl" />
            </div>
          </div>
        </Card>

        <Card className="border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Overtime Request</div>
              <div className="mt-2 text-3xl font-semibold text-blue-600">
                {summary.overtime}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <i className="pi pi-clock text-xl" />
            </div>
          </div>
        </Card>

        <Card className="border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Leave Request</div>
              <div className="mt-2 text-3xl font-semibold text-green-600">
                {summary.leave}
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <i className="pi pi-calendar text-xl" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-5 p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-800">
                Approval Inbox
              </div>
              <div className="mt-1 text-sm leading-6 text-slate-500">
                Review requests that are waiting for your approval.
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="w-full sm:w-[22rem]"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search requester, module, reason"
                />
              </IconField>

              <Button
                label="Refresh"
                icon="pi pi-refresh"
                className="p-button-outlined"
                onClick={refreshData}
              />
            </div>
          </div>

          {isMobile ? renderMobileCards() : renderDesktopTable()}
        </div>
      </Card>

      <Dialog
        header="Approval Detail"
        visible={detailVisible}
        style={{ width: "95vw", maxWidth: "780px" }}
        breakpoints={{ "960px": "95vw" }}
        onHide={closeDetail}
        modal
        draggable={false}
        resizable={false}
      >
        {selectedData && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Tag
                  value={getModuleLabel(selectedData.module_code)}
                  severity={getModuleSeverity(selectedData.module_code)}
                />
                <Tag value={`Step ${selectedData.step_no}`} severity="info" />
                <Tag
                  value={selectedData.status ?? "-"}
                  severity={getStatusSeverity(selectedData.status)}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <div className="text-sm text-slate-500">Requester</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {selectedData.requester_name ?? "-"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Reference ID</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    #{selectedData.reference_id}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Submitted At</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatDateTime(selectedData.submitted_at)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Request Date</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {getRequestTitle(selectedData)}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-sm text-slate-500">Request Info</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {getRequestSubtitle(selectedData)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm text-slate-500">Reason</div>
              <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">
                {selectedData.request_reason ?? "-"}
              </div>
            </div>

            <div className="flex flex-row gap-3">
              <Button
                label="Reject"
                icon="pi pi-times"
                severity="danger"
                className="flex-1"
                onClick={() => openActionDialog(selectedData, "reject")}
              />

              <Button
                label="Approve"
                icon="pi pi-check"
                severity="success"
                className="flex-1"
                onClick={() => openActionDialog(selectedData, "approve")}
              />
            </div>
          </div>
        )}
      </Dialog>

      <form onSubmit={handleSubmit(confirmActionSubmit)}>
        <Dialog
          header={actionDialogTitle}
          visible={actionVisible}
          style={{ width: "95vw", maxWidth: "620px" }}
          breakpoints={{ "960px": "95vw" }}
          onHide={closeActionDialog}
          footer={actionDialogFooter}
          modal
          draggable={false}
          resizable={false}
        >
          <div className="flex flex-col gap-5">
            {selectedData && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag
                    value={getModuleLabel(selectedData.module_code)}
                    severity={getModuleSeverity(selectedData.module_code)}
                  />
                  <Tag value={`Step ${selectedData.step_no}`} severity="info" />
                  <Tag
                    value={selectedData.status ?? "-"}
                    severity={getStatusSeverity(selectedData.status)}
                  />
                </div>

                <div className="mt-3 font-semibold text-slate-800">
                  {selectedData.requester_name ?? "-"}
                </div>

                <div className="mt-1 text-sm text-slate-500">
                  {getRequestTitle(selectedData)} •{" "}
                  {getRequestSubtitle(selectedData)}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
              {actionType === "approve"
                ? "Add an optional note before approving this request."
                : "Add a rejection reason before rejecting this request."}
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="note"
                className="text-sm font-medium text-slate-700"
              >
                Note {actionType === "reject" ? "*" : ""}
              </label>

              <Controller
                name="note"
                control={control}
                rules={{
                  validate: (value) => {
                    if (actionType === "reject" && !value.trim()) {
                      return "Rejection reason is required";
                    }

                    return true;
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputTextarea
                      id="note"
                      {...field}
                      rows={5}
                      placeholder={
                        actionType === "approve"
                          ? "Approval note"
                          : "Rejection reason"
                      }
                      className={fieldState.invalid ? "p-invalid" : ""}
                      disabled={isSaving}
                    />

                    {fieldState.error && (
                      <small className="font-bold p-error">
                        {fieldState.error.message}
                      </small>
                    )}
                  </>
                )}
              />
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default ApprovalInboxTableData;
