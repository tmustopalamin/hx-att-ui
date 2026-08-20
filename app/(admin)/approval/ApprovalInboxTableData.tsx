"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from "swr";
import dayjs from "dayjs";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
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
  approveApprovalRequest,
  getPendingLifecycleApprovalDetail,
  rejectApprovalRequest,
} from "@/app/services/approval-service";
import {
  getRequestLeaveAttachments,
  viewRequestLeaveAttachmentUrl,
} from "@/app/services/request-leave-attachment-service";

import {
  ApprovalActionForm,
  ApprovalPendingItem,
  defaultApprovalActionFormValue,
} from "@/app/types/approval";
import type {
  EmployeeLifecycleEmploymentSnapshot,
  LifecycleApprovalDetail,
} from "@/app/types/employee-lifecycle";
import { RequestLeaveAttachment } from "@/app/types/request-leave-attachment";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";

type ApprovalActionType = "approve" | "reject" | null;

type ModuleFilter = "ALL" | "LEAVE" | "OVERTIME" | "EMPLOYEE_LIFECYCLE";

type TagSeverity =
  "success" | "secondary" | "info" | "warning" | "danger" | "contrast";

const API_KEY = "/api/approval/pending";

const MAX_NOTE_LENGTH = 1000;

const employmentChangeFields: Array<{
  key: keyof EmployeeLifecycleEmploymentSnapshot;
  label: string;
}> = [
  { key: "join_date", label: "Join Date" },
  { key: "code", label: "Employment Code" },
  { key: "agency_name", label: "Agency" },
  { key: "branch_name", label: "Branch" },
  { key: "department_name", label: "Department" },
  { key: "position_name", label: "Position" },
  { key: "employment_status_name", label: "Employment Status" },
  { key: "supervisor_name", label: "Direct Supervisor" },
  { key: "end_date", label: "End Date" },
  { key: "probation_end_date", label: "Probation End Date" },
  { key: "confirmation_date", label: "Confirmation Date" },
  { key: "notes", label: "Notes" },
];

const displayLifecycleValue = (value: string | null) => value || "-";

const MODULE_FILTER_OPTIONS: {
  label: string;
  value: ModuleFilter;
}[] = [
  {
    label: "All Request Types",
    value: "ALL",
  },
  {
    label: "Leave",
    value: "LEAVE",
  },
  {
    label: "Overtime",
    value: "OVERTIME",
  },
  {
    label: "Employee Lifecycle",
    value: "EMPLOYEE_LIFECYCLE",
  },
];

const getBody = () => document.body;

const normalizeModuleCode = (moduleCode?: string | null) => {
  return String(moduleCode ?? "")
    .trim()
    .toUpperCase();
};

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

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkScreenSize();

    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  return isMobile;
};

const formatFileSize = (size?: number | null) => {
  const safeSize = Math.max(0, Number(size ?? 0));

  if (safeSize < 1024) {
    return `${safeSize} B`;
  }

  if (safeSize < 1024 * 1024) {
    return `${(safeSize / 1024).toFixed(1)} KB`;
  }

  return `${(safeSize / (1024 * 1024)).toFixed(1)} MB`;
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

  const timeOnlyMatch = value.match(/^(\d{2}):(\d{2})(?::\d{2})?/);

  if (timeOnlyMatch) {
    return `${timeOnlyMatch[1]}:${timeOnlyMatch[2]}`;
  }

  const date = dayjs(value);

  return date.isValid() ? date.format("HH:mm") : "-";
};

const formatDuration = (seconds?: number | null) => {
  const totalSeconds = Math.max(0, Number(seconds ?? 0));

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
  const text = String(value ?? "").trim();

  if (!text) {
    return "-";
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength)}...`;
};

const getModuleLabel = (moduleCode?: string | null) => {
  const code = normalizeModuleCode(moduleCode);

  if (code === "OVERTIME") {
    return "Overtime";
  }

  if (code === "LEAVE") {
    return "Leave";
  }

  if (code === "EMPLOYEE_LIFECYCLE") {
    return "Employee Lifecycle";
  }

  return moduleCode || "Unknown";
};

const getModuleSeverity = (moduleCode?: string | null): TagSeverity => {
  const code = normalizeModuleCode(moduleCode);

  if (code === "OVERTIME") {
    return "info";
  }

  if (code === "LEAVE") {
    return "success";
  }

  if (code === "EMPLOYEE_LIFECYCLE") {
    return "warning";
  }

  return "secondary";
};

const getStatusSeverity = (status?: string | null): TagSeverity => {
  const value = normalizeStatus(status);

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
  if (normalizeModuleCode(rowData.module_code) === "LEAVE") {
    const leaveType = rowData.request_type_name || "Leave";
    const startDate = formatDate(rowData.request_date);
    const endDate = formatDate(
      rowData.request_end_date || rowData.request_date,
    );

    return `${leaveType}: ${startDate} – ${endDate}`;
  }

  if (normalizeModuleCode(rowData.module_code) === "EMPLOYEE_LIFECYCLE") {
    return `Effective: ${formatDate(rowData.request_date)}`;
  }

  return formatDate(rowData.request_date);
};

const getRequestSubtitle = (rowData: ApprovalPendingItem) => {
  const moduleCode = normalizeModuleCode(rowData.module_code);

  if (moduleCode === "LEAVE") {
    const totalDays = rowData.request_seconds;

    return `Total days: ${totalDays ?? "-"}`;
  }

  if (moduleCode === "OVERTIME") {
    return `${formatTime(rowData.request_start_at)} – ${formatTime(
      rowData.request_end_at,
    )} • ${formatDuration(rowData.request_seconds)}`;
  }

  if (moduleCode === "EMPLOYEE_LIFECYCLE") {
    return `Current status: ${formatStatusLabel(rowData.request_status)}`;
  }

  return "-";
};

const ApprovalInboxTableData = () => {
  const dispatch = useDispatch();
  const isMobile = useIsMobile();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canApprove = permissions.includes("approval.approve");
  const canReject = permissions.includes("approval.reject");

  const attachmentLoadSequence = useRef(0);

  const lifecycleDetailLoadSequence = useRef(0);

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState({
    global: {
      value: "",
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("ALL");

  const [selectedData, setSelectedData] = useState<ApprovalPendingItem | null>(
    null,
  );

  const [actionType, setActionType] = useState<ApprovalActionType>(null);

  const [detailVisible, setDetailVisible] = useState(false);

  const [actionVisible, setActionVisible] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [attachments, setAttachments] = useState<RequestLeaveAttachment[]>([]);

  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);

  const [lifecycleDetail, setLifecycleDetail] =
    useState<LifecycleApprovalDetail | null>(null);

  const [isLoadingLifecycleDetail, setIsLoadingLifecycleDetail] =
    useState(false);

  const [previewAttachment, setPreviewAttachment] =
    useState<RequestLeaveAttachment | null>(null);

  const [attachmentPreviewVisible, setAttachmentPreviewVisible] =
    useState(false);

  const { control, handleSubmit, reset, setFocus } =
    useForm<ApprovalActionForm>({
      defaultValues: defaultApprovalActionFormValue,
      mode: "onTouched",
    });

  const {
    data: approvalData,
    error,
    isLoading,
    isValidating,
    mutate: refreshApprovalData,
  } = useSWR<ApprovalPendingItem[]>(API_KEY, fetcher, {
    revalidateOnFocus: false,
  });

  const rows = approvalData ?? [];

  const moduleFilteredRows = useMemo(() => {
    if (moduleFilter === "ALL") {
      return rows;
    }

    return rows.filter(
      (item) => normalizeModuleCode(item.module_code) === moduleFilter,
    );
  }, [rows, moduleFilter]);

  const filteredMobileRows = useMemo(() => {
    const keyword = globalFilterValue.trim().toLowerCase();

    if (!keyword) {
      return moduleFilteredRows;
    }

    return moduleFilteredRows.filter((item) => {
      const searchableValues = [
        item.module_code,
        item.requester_name,
        item.request_reason,
        item.request_status,
        item.status,
        getRequestTitle(item),
        getRequestSubtitle(item),
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [moduleFilteredRows, globalFilterValue]);

  const summary = useMemo(() => {
    return {
      total: rows.length,

      overtime: rows.filter(
        (item) => normalizeModuleCode(item.module_code) === "OVERTIME",
      ).length,

      leave: rows.filter(
        (item) => normalizeModuleCode(item.module_code) === "LEAVE",
      ).length,
    };
  }, [rows]);

  const hasActiveFilter =
    Boolean(globalFilterValue.trim()) || moduleFilter !== "ALL";

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

  const refreshData = async () => {
    try {
      await refreshApprovalData();
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onGlobalFilterChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    setFilters({
      global: {
        value,
        matchMode: FilterMatchMode.CONTAINS,
      },
    });

    setGlobalFilterValue(value);
  };

  const resetFilters = () => {
    setGlobalFilterValue("");

    setFilters({
      global: {
        value: "",
        matchMode: FilterMatchMode.CONTAINS,
      },
    });

    setModuleFilter("ALL");
  };

  const closeAttachmentPreview = () => {
    setAttachmentPreviewVisible(false);

    setPreviewAttachment(null);
  };

  const openAttachmentPreview = (attachment: RequestLeaveAttachment) => {
    setPreviewAttachment(attachment);

    setAttachmentPreviewVisible(true);
  };

  const loadLeaveAttachments = async (requestLeaveId: number) => {
    const loadSequence = attachmentLoadSequence.current + 1;

    attachmentLoadSequence.current = loadSequence;

    try {
      setIsLoadingAttachments(true);

      const attachmentData = await getRequestLeaveAttachments(requestLeaveId);

      if (attachmentLoadSequence.current !== loadSequence) {
        return;
      }

      setAttachments(attachmentData ?? []);
    } catch (err: unknown) {
      if (attachmentLoadSequence.current !== loadSequence) {
        return;
      }

      setAttachments([]);
      showError(err);
    } finally {
      if (attachmentLoadSequence.current === loadSequence) {
        setIsLoadingAttachments(false);
      }
    }
  };

  const loadLifecycleDetail = async (approvalRequestId: number) => {
    const loadSequence = lifecycleDetailLoadSequence.current + 1;
    lifecycleDetailLoadSequence.current = loadSequence;
    setIsLoadingLifecycleDetail(true);

    try {
      const detail = await getPendingLifecycleApprovalDetail(approvalRequestId);
      if (lifecycleDetailLoadSequence.current === loadSequence) {
        setLifecycleDetail(detail);
      }
    } catch (err: unknown) {
      if (lifecycleDetailLoadSequence.current === loadSequence) {
        setLifecycleDetail(null);
        showError(err);
      }
    } finally {
      if (lifecycleDetailLoadSequence.current === loadSequence) {
        setIsLoadingLifecycleDetail(false);
      }
    }
  };

  const openDetail = (data: ApprovalPendingItem) => {
    attachmentLoadSequence.current += 1;

    setSelectedData(data);
    setAttachments([]);
    setIsLoadingAttachments(false);
    lifecycleDetailLoadSequence.current += 1;
    setLifecycleDetail(null);
    setIsLoadingLifecycleDetail(false);

    closeAttachmentPreview();

    setDetailVisible(true);

    if (normalizeModuleCode(data.module_code) === "LEAVE") {
      void loadLeaveAttachments(data.reference_id);
    }

    if (normalizeModuleCode(data.module_code) === "EMPLOYEE_LIFECYCLE") {
      void loadLifecycleDetail(data.approval_request_id);
    }
  };

  const closeDetail = () => {
    attachmentLoadSequence.current += 1;

    setDetailVisible(false);
    setSelectedData(null);
    setAttachments([]);
    setIsLoadingAttachments(false);
    lifecycleDetailLoadSequence.current += 1;
    setLifecycleDetail(null);
    setIsLoadingLifecycleDetail(false);

    closeAttachmentPreview();
  };

  const openActionDialog = (
    data: ApprovalPendingItem,
    type: Exclude<ApprovalActionType, null>,
  ) => {
    attachmentLoadSequence.current += 1;

    setSelectedData(data);
    setActionType(type);

    setDetailVisible(false);
    setAttachments([]);

    closeAttachmentPreview();

    reset(defaultApprovalActionFormValue);

    setActionVisible(true);
  };

  const resetActionDialogState = () => {
    setSelectedData(null);
    setActionType(null);
    setActionVisible(false);

    reset(defaultApprovalActionFormValue);
  };

  const closeActionDialog = () => {
    if (isSaving) {
      return;
    }

    resetActionDialogState();
  };

  const handleApprovalAction = async (formData: ApprovalActionForm) => {
    if (!selectedData || !actionType || isSaving) {
      return;
    }

    const cleanNote = formData.note.trim();

    if (actionType === "reject" && !cleanNote) {
      showWarning("Rejection reason is required.");

      return;
    }

    if (cleanNote.length > MAX_NOTE_LENGTH) {
      showWarning(`Note cannot exceed ${MAX_NOTE_LENGTH} characters.`);

      return;
    }

    const currentAction = actionType;

    try {
      setIsSaving(true);

      if (currentAction === "approve") {
        await approveApprovalRequest(
          selectedData.approval_request_id,
          selectedData.row_version,
          cleanNote,
        );
      } else {
        await rejectApprovalRequest(
          selectedData.approval_request_id,
          selectedData.row_version,
          cleanNote,
        );
      }

      await refreshApprovalData();

      showSuccess(
        currentAction === "approve"
          ? "Approval request approved successfully."
          : "Approval request rejected successfully.",
      );

      /*
       * Jangan memanggil
       * closeActionDialog() di sini,
       * karena fungsi tersebut menolak
       * ditutup saat isSaving masih true.
       */
      resetActionDialogState();
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

    const cleanNote = formData.note.trim();

    if (actionType === "reject" && !cleanNote) {
      showWarning("Rejection reason is required.");

      return;
    }

    const isApprove = actionType === "approve";

    requestActionConfirmation({
      header: isApprove ? "Approve Request" : "Reject Request",

      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            {isApprove ? "Approve this request?" : "Reject this request?"}
          </span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {selectedData.requester_name || "Unknown requester"}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {getModuleLabel(selectedData.module_code)} ·{" "}
              {getRequestTitle(selectedData)}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {getRequestSubtitle(selectedData)}
            </p>
          </div>

          {!isApprove && (
            <span className="text-xs text-red-600">
              The rejection reason will be stored and shown to the requester.
            </span>
          )}
        </div>
      ),

      icon: isApprove ? "pi pi-check-circle" : "pi pi-exclamation-triangle",

      defaultFocus: "reject",

      accept: () => {
        void handleApprovalAction(formData);
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
            disabled={isSaving}
            onClick={options.reject}
          />

          <Button
            type="button"
            label={isApprove ? "Approve" : "Reject"}
            icon={isApprove ? "pi pi-check" : "pi pi-times"}
            severity={isApprove ? "success" : "danger"}
            disabled={isSaving}
            onClick={options.accept}
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
        rounded
      />
    );
  };

  const approvalStepBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Tag value={`Step ${rowData.step_no}`} severity="info" rounded />

        <Tag
          value={formatStatusLabel(rowData.status)}
          severity={getStatusSeverity(rowData.status)}
          rounded
        />
      </div>
    );
  };

  const requestInfoBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-medium text-slate-800">
          {getRequestTitle(rowData)}
        </span>

        <span className="whitespace-normal text-xs leading-5 text-slate-500">
          {getRequestSubtitle(rowData)}
        </span>
      </div>
    );
  };

  const requesterBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-800">
          {rowData.requester_name || "Unknown requester"}
        </span>

        <span className="whitespace-nowrap text-xs text-slate-500">
          Submitted {formatDateTime(rowData.submitted_at)}
        </span>
      </div>
    );
  };

  const reasonBody = (rowData: ApprovalPendingItem) => {
    return (
      <span
        className="block max-w-md whitespace-normal text-sm leading-6 text-slate-700"
        title={rowData.request_reason ?? undefined}
      >
        {truncateText(rowData.request_reason, 100)}
      </span>
    );
  };

  const actionBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <Button
          type="button"
          icon="pi pi-eye"
          rounded
          outlined
          severity="secondary"
          size="small"
          disabled={isSaving}
          tooltip="View detail"
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => openDetail(rowData)}
        />

        {canApprove && (
          <Button
            type="button"
            icon="pi pi-check"
            rounded
            outlined
            severity="success"
            size="small"
            disabled={isSaving}
            tooltip="Approve"
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            onClick={() => openActionDialog(rowData, "approve")}
          />
        )}

        {canReject && (
          <Button
            type="button"
            icon="pi pi-times"
            rounded
            outlined
            severity="danger"
            size="small"
            disabled={isSaving}
            tooltip="Reject"
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            onClick={() => openActionDialog(rowData, "reject")}
          />
        )}
      </div>
    );
  };

  const renderDesktopTable = () => {
    return (
      <div className="w-full overflow-hidden">
        <DataTable
          value={moduleFilteredRows}
          dataKey="approval_request_step_id"
          filters={filters}
          globalFilterFields={[
            "module_code",
            "requester_name",
            "request_reason",
            "request_status",
            "status",
          ]}
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
          tableStyle={{
            minWidth: "82rem",
          }}
          emptyMessage="No pending approval data found."
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
            field="module_code"
            header="Type"
            sortable
            body={moduleBody}
            style={{
              minWidth: "10rem",
            }}
          />

          <Column
            field="requester_name"
            header="Requester"
            sortable
            body={requesterBody}
            style={{
              minWidth: "19rem",
            }}
          />

          <Column
            field="request_date"
            header="Request"
            sortable
            body={requestInfoBody}
            style={{
              minWidth: "17rem",
            }}
          />

          <Column
            field="request_reason"
            header="Reason"
            body={reasonBody}
            style={{
              minWidth: "24rem",
            }}
          />

          <Column
            field="step_no"
            header="Approval Step"
            sortable
            body={approvalStepBody}
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
              width: "12rem",
              minWidth: "12rem",
              textAlign: "right",
            }}
            bodyStyle={{
              width: "12rem",
              minWidth: "12rem",
            }}
          />
        </DataTable>
      </div>
    );
  };

  const renderMobileCards = () => {
    if (filteredMobileRows.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
          <i className="pi pi-inbox mb-3 text-3xl text-slate-400" />

          <p className="m-0 text-sm font-semibold text-slate-700">
            No pending approval found
          </p>

          <p className="m-0 mt-1 text-xs text-slate-500">
            Change the request type or search keyword.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {filteredMobileRows.map((rowData) => (
          <article
            key={rowData.approval_request_step_id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {moduleBody(rowData)}

                  <Tag
                    value={`Step ${rowData.step_no}`}
                    severity="info"
                    rounded
                  />
                </div>

                <p className="m-0 mt-3 truncate text-base font-semibold text-slate-800">
                  {rowData.requester_name || "Unknown requester"}
                </p>

                <p className="m-0 mt-1 text-xs text-slate-500">
                  Submitted {formatDateTime(rowData.submitted_at)}
                </p>
              </div>

              <Tag
                value={formatStatusLabel(rowData.status)}
                severity={getStatusSeverity(rowData.status)}
                rounded
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="m-0 text-sm font-semibold text-slate-800">
                {getRequestTitle(rowData)}
              </p>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {getRequestSubtitle(rowData)}
              </p>
            </div>

            <div className="mt-4">
              <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Reason
              </p>

              <p className="m-0 mt-1 text-sm leading-6 text-slate-700">
                {truncateText(rowData.request_reason, 150)}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button
                type="button"
                label="Detail"
                icon="pi pi-eye"
                severity="secondary"
                outlined
                size="small"
                disabled={isSaving}
                onClick={() => openDetail(rowData)}
              />

              {canApprove && (
                <Button
                  type="button"
                  label="Approve"
                  icon="pi pi-check"
                  severity="success"
                  outlined
                  size="small"
                  disabled={isSaving}
                  onClick={() => openActionDialog(rowData, "approve")}
                />
              )}

              {canReject && (
                <Button
                  type="button"
                  label="Reject"
                  icon="pi pi-times"
                  severity="danger"
                  outlined
                  size="small"
                  disabled={isSaving}
                  onClick={() => openActionDialog(rowData, "reject")}
                />
              )}
            </div>
          </article>
        ))}
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
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        text
        severity="secondary"
        disabled={isSaving}
        className="w-full sm:w-auto"
        onClick={closeActionDialog}
      />

      <Button
        type="submit"
        form="approval-action-form"
        label={
          actionType === "approve"
            ? "Continue to Approve"
            : "Continue to Reject"
        }
        icon={actionType === "approve" ? "pi pi-check" : "pi pi-times"}
        severity={actionType === "approve" ? "success" : "danger"}
        loading={isSaving}
        disabled={isSaving}
        className="w-full sm:w-auto"
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={API_KEY} />;
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="border border-slate-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-xs text-slate-500">Pending Approval</p>

                <p className="m-0 mt-2 text-2xl font-semibold text-slate-800">
                  {summary.total}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <i className="pi pi-inbox text-lg" />
              </div>
            </div>
          </Card>

          <Card className="border border-blue-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-xs text-blue-700">Overtime Requests</p>

                <p className="m-0 mt-2 text-2xl font-semibold text-blue-800">
                  {summary.overtime}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <i className="pi pi-clock text-lg" />
              </div>
            </div>
          </Card>

          <Card className="border border-green-200 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="m-0 text-xs text-green-700">Leave Requests</p>

                <p className="m-0 mt-2 text-2xl font-semibold text-green-800">
                  {summary.leave}
                </p>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                <i className="pi pi-calendar text-lg" />
              </div>
            </div>
          </Card>
        </div>

        {/* Approval Inbox */}
        <Card className="border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                  <i className="pi pi-check-square text-xl" />
                </div>

                <div className="min-w-0">
                  <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                    Approval Inbox
                  </h1>

                  <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                    Review leave and overtime requests waiting for your
                    approval.
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
                disabled={isValidating || isSaving}
                className="w-full sm:w-auto"
                onClick={refreshData}
              />
            </div>

            <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(14rem,1fr)_minmax(18rem,2fr)_auto]">
                <Dropdown
                  appendTo={getBody}
                  value={moduleFilter}
                  options={MODULE_FILTER_OPTIONS}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full"
                  onChange={(event) =>
                    setModuleFilter(event.value as ModuleFilter)
                  }
                />

                <IconField iconPosition="left" className="w-full">
                  <InputIcon className="pi pi-search" />

                  <InputText
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Search requester, module, reason, or status"
                    className="w-full"
                  />
                </IconField>

                <Button
                  type="button"
                  label="Reset"
                  icon="pi pi-filter-slash"
                  severity="secondary"
                  outlined
                  disabled={!hasActiveFilter}
                  className="w-full md:w-auto"
                  onClick={resetFilters}
                />
              </div>

              <span className="text-xs text-slate-500">
                {isMobile
                  ? filteredMobileRows.length
                  : moduleFilteredRows.length}{" "}
                pending request
                {(isMobile
                  ? filteredMobileRows.length
                  : moduleFilteredRows.length) === 1
                  ? ""
                  : "s"}
              </span>
            </section>

            {isMobile ? renderMobileCards() : renderDesktopTable()}
          </div>
        </Card>
      </div>

      {/* Approval Detail */}
      <Dialog
        header="Approval Detail"
        visible={detailVisible}
        style={{
          width: "95vw",
          maxWidth: "50rem",
        }}
        breakpoints={{
          "960px": "95vw",
        }}
        modal
        draggable={false}
        resizable={false}
        onHide={closeDetail}
      >
        {selectedData && (
          <div className="flex flex-col gap-5 pt-2">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {moduleBody(selectedData)}

                <Tag
                  value={`Step ${selectedData.step_no}`}
                  severity="info"
                  rounded
                />

                <Tag
                  value={formatStatusLabel(selectedData.status)}
                  severity={getStatusSeverity(selectedData.status)}
                  rounded
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="m-0 text-xs text-slate-500">Requester</p>

                  <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                    {selectedData.requester_name || "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">Reference ID</p>

                  <p className="m-0 mt-1 font-mono text-sm font-semibold text-slate-800">
                    #{selectedData.reference_id}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">Submitted At</p>

                  <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                    {formatDateTime(selectedData.submitted_at)}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">Request Date</p>

                  <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                    {getRequestTitle(selectedData)}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="m-0 text-xs text-slate-500">
                    Request Information
                  </p>

                  <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                    {getRequestSubtitle(selectedData)}
                  </p>
                </div>
              </div>
            </section>

            {normalizeModuleCode(selectedData.module_code) === "LEAVE" && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Leave Details
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="m-0 text-xs text-slate-500">Leave Type</p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                      {selectedData.request_type_name || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="m-0 text-xs text-slate-500">Date Range</p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                      {formatDate(selectedData.request_date)} –{" "}
                      {formatDate(
                        selectedData.request_end_date ||
                          selectedData.request_date,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="m-0 text-xs text-slate-500">Working Days</p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                      {selectedData.request_seconds ?? "-"}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Request Reason
              </h2>

              <p className="m-0 mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {selectedData.request_reason || "-"}
              </p>
            </section>

            {normalizeModuleCode(selectedData.module_code) ===
              "EMPLOYEE_LIFECYCLE" && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Lifecycle Change Details
                </h2>

                {isLoadingLifecycleDetail ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <i className="pi pi-spin pi-spinner" />
                    Loading lifecycle details...
                  </div>
                ) : lifecycleDetail ? (
                  <div className="mt-4 flex flex-col gap-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="m-0 text-xs text-slate-500">Employee</p>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {lifecycleDetail.case.employee_name}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500">
                          Lifecycle Owner
                        </p>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {lifecycleDetail.case.requested_by_name}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500">
                          Lifecycle Type
                        </p>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {formatStatusLabel(
                            lifecycleDetail.case.lifecycle_type,
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500">
                          Effective Date
                        </p>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {formatDate(lifecycleDetail.case.effective_date)}
                        </p>
                      </div>
                    </div>

                    {lifecycleDetail.employment_change && (
                      <div>
                        <h3 className="m-0 text-sm font-semibold text-slate-800">
                          Employment Change Summary
                        </h3>
                        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-600">
                              <tr>
                                <th className="px-3 py-2 font-medium">Field</th>
                                <th className="px-3 py-2 font-medium">
                                  Current
                                </th>
                                <th className="px-3 py-2 font-medium">
                                  Proposed
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {employmentChangeFields.map(({ key, label }) => (
                                <tr
                                  key={key}
                                  className="border-t border-slate-100"
                                >
                                  <td className="px-3 py-2 font-medium text-slate-700">
                                    {label}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {displayLifecycleValue(
                                      lifecycleDetail.employment_change!
                                        .previous[key],
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-slate-800">
                                    {displayLifecycleValue(
                                      lifecycleDetail.employment_change!
                                        .proposed[key],
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="m-0 mt-4 text-sm text-slate-500">
                    Lifecycle details are unavailable.
                  </p>
                )}
              </section>
            )}

            {normalizeModuleCode(selectedData.module_code) === "LEAVE" && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  Attachments
                </h2>

                {isLoadingAttachments ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <i className="pi pi-spin pi-spinner" />
                    Loading attachments...
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    No attachment uploaded.
                  </div>
                ) : (
                  <div className="mt-4 flex flex-col gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="m-0 truncate text-sm font-medium text-slate-800">
                            {attachment.original_file_name}
                          </p>

                          <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                            {formatFileSize(attachment.file_size)}
                            {" • "}
                            {attachment.content_type || "Unknown type"}
                            {" • "}
                            {formatDateTime(attachment.created_at)}
                          </p>
                        </div>

                        <Button
                          type="button"
                          label="View"
                          icon="pi pi-eye"
                          size="small"
                          severity="secondary"
                          outlined
                          onClick={() => openAttachmentPreview(attachment)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {canReject && (
                <Button
                  type="button"
                  label="Reject"
                  icon="pi pi-times"
                  severity="danger"
                  outlined
                  disabled={isSaving}
                  onClick={() => openActionDialog(selectedData, "reject")}
                />
              )}

              {canApprove && (
                <Button
                  type="button"
                  label="Approve"
                  icon="pi pi-check"
                  severity="success"
                  disabled={isSaving}
                  onClick={() => openActionDialog(selectedData, "approve")}
                />
              )}
            </div>
          </div>
        )}
      </Dialog>

      {/* Attachment Preview */}
      <Dialog
        header={previewAttachment?.original_file_name ?? "Attachment Preview"}
        visible={attachmentPreviewVisible}
        style={{
          width: "95vw",
          maxWidth: "64rem",
        }}
        breakpoints={{
          "960px": "95vw",
        }}
        contentStyle={{
          padding: 0,
          overflow: "hidden",
        }}
        modal
        maximizable
        draggable={false}
        resizable={false}
        onHide={closeAttachmentPreview}
      >
        {selectedData && previewAttachment && (
          <div className="flex min-h-[60vh] items-center justify-center bg-slate-100">
            {String(previewAttachment.content_type ?? "")
              .toLowerCase()
              .startsWith("image/") ? (
              <img
                src={viewRequestLeaveAttachmentUrl(
                  selectedData.reference_id,
                  previewAttachment.id,
                )}
                alt={previewAttachment.original_file_name}
                className="max-h-[75vh] max-w-full object-contain"
              />
            ) : (
              <iframe
                src={viewRequestLeaveAttachmentUrl(
                  selectedData.reference_id,
                  previewAttachment.id,
                )}
                title={previewAttachment.original_file_name}
                className="h-[75vh] w-full border-0 bg-white"
              />
            )}
          </div>
        )}
      </Dialog>

      {/* Approval Action */}
      <Dialog
        header={actionDialogTitle}
        visible={actionVisible}
        style={{
          width: "95vw",
          maxWidth: "40rem",
        }}
        breakpoints={{
          "960px": "95vw",
        }}
        footer={actionDialogFooter}
        modal
        draggable={false}
        resizable={false}
        closable={!isSaving}
        closeOnEscape={!isSaving}
        onHide={closeActionDialog}
        onShow={() => {
          setTimeout(() => {
            setFocus("note");
          }, 0);
        }}
      >
        <form
          id="approval-action-form"
          onSubmit={handleSubmit(confirmActionSubmit)}
          className="flex flex-col gap-5 pt-2"
        >
          {selectedData && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                {moduleBody(selectedData)}

                <Tag
                  value={`Step ${selectedData.step_no}`}
                  severity="info"
                  rounded
                />

                <Tag
                  value={formatStatusLabel(selectedData.status)}
                  severity={getStatusSeverity(selectedData.status)}
                  rounded
                />
              </div>

              <p className="m-0 mt-3 text-sm font-semibold text-slate-800">
                {selectedData.requester_name || "-"}
              </p>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {getRequestTitle(selectedData)} •{" "}
                {getRequestSubtitle(selectedData)}
              </p>
            </section>
          )}

          <div
            className={`rounded-xl border p-4 text-sm leading-6 ${
              actionType === "approve"
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {actionType === "approve"
              ? "Add an optional note before approving this request."
              : "Provide a clear rejection reason before rejecting this request."}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="note"
              className="text-sm font-medium text-slate-700"
            >
              Note
              {actionType === "reject" && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </label>

            <Controller
              name="note"
              control={control}
              rules={{
                maxLength: {
                  value: MAX_NOTE_LENGTH,
                  message: `Note cannot exceed ${MAX_NOTE_LENGTH} characters.`,
                },

                validate: (value) => {
                  if (actionType === "reject" && !value.trim()) {
                    return "Rejection reason is required.";
                  }

                  return true;
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputTextarea
                    {...field}
                    id="note"
                    value={field.value ?? ""}
                    rows={6}
                    autoResize
                    maxLength={MAX_NOTE_LENGTH}
                    disabled={isSaving}
                    placeholder={
                      actionType === "approve"
                        ? "Optional approval note"
                        : "Enter rejection reason"
                    }
                    className={`w-full ${
                      fieldState.invalid ? "p-invalid" : ""
                    }`}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div>
                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}
                    </div>

                    <small className="shrink-0 text-slate-400">
                      {field.value.length}/{MAX_NOTE_LENGTH}
                    </small>
                  </div>
                </>
              )}
            />
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default ApprovalInboxTableData;
