"use client";
import { useI18n } from "@/app/i18n";

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

const OBSOLETE_APPROVAL_ERROR_CODES = new Set([
  "INVALID_STATUS",
  "InvalidStatus",
  "REQUEST_NOT_FOUND",
  "STEP_NOT_FOUND",
  "PERMISSION_DENIED",
  "PermissionDenied",
]);

const employmentChangeFields: Array<{
  key: keyof EmployeeLifecycleEmploymentSnapshot;
  labelKey: string;
}> = [
  { key: "join_date", labelKey: "Join Date" },
  { key: "code", labelKey: "Employment Code" },
  { key: "agency_name", labelKey: "Agency" },
  { key: "branch_name", labelKey: "Branch" },
  { key: "department_name", labelKey: "Department" },
  { key: "position_name", labelKey: "Position" },
  { key: "employment_status_name", labelKey: "Employment Status" },
  { key: "supervisor_name", labelKey: "Direct Supervisor" },
  { key: "end_date", labelKey: "End Date" },
  { key: "probation_end_date", labelKey: "Probation End Date" },
  { key: "confirmation_date", labelKey: "Confirmation Date" },
  { key: "notes", labelKey: "Notes" },
];

const displayLifecycleValue = (value: string | null) => value || "-";

const MODULE_FILTER_OPTIONS: {
  labelKey: string;
  value: ModuleFilter;
}[] = [
  {
    labelKey: "All Request Types",
    value: "ALL",
  },
  {
    labelKey: "Leave",
    value: "LEAVE",
  },
  {
    labelKey: "Overtime",
    value: "OVERTIME",
  },
  {
    labelKey: "Employee Lifecycle",
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

type TextTranslator = (
  key: string,
  params?: Record<string, string | number | null | undefined>,
) => string;

const getRequestTitle = (
  rowData: ApprovalPendingItem,
  translate?: TextTranslator,
) => {
  if (normalizeModuleCode(rowData.module_code) === "LEAVE") {
    const leaveType =
      rowData.request_type_name || (translate ? translate("Leave") : "Leave");
    const startDate = formatDate(rowData.request_date);
    const endDate = formatDate(
      rowData.request_end_date || rowData.request_date,
    );

    return translate
      ? translate("{p0}: {p1} – {p2}", {
          p0: leaveType,
          p1: startDate,
          p2: endDate,
        })
      : `${leaveType}: ${startDate} – ${endDate}`;
  }

  if (normalizeModuleCode(rowData.module_code) === "EMPLOYEE_LIFECYCLE") {
    const effectiveDate = formatDate(rowData.request_date);
    return translate
      ? translate("Effective: {p0}", { p0: effectiveDate })
      : `Effective: ${effectiveDate}`;
  }

  return formatDate(rowData.request_date);
};

const getRequestSubtitle = (
  rowData: ApprovalPendingItem,
  translate?: TextTranslator,
) => {
  const moduleCode = normalizeModuleCode(rowData.module_code);

  if (moduleCode === "LEAVE") {
    const totalDays = rowData.request_seconds;

    return translate
      ? translate("Total days: {p0}", { p0: totalDays ?? "-" })
      : `Total days: ${totalDays ?? "-"}`;
  }

  if (moduleCode === "OVERTIME") {
    const start = formatTime(rowData.request_start_at);
    const end = formatTime(rowData.request_end_at);
    const duration = formatDuration(rowData.request_seconds);
    return translate
      ? translate("{p0} – {p1} • {p2}", {
          p0: start,
          p1: end,
          p2: duration,
        })
      : `${start} – ${end} • ${duration}`;
  }

  if (moduleCode === "EMPLOYEE_LIFECYCLE") {
    const status = formatStatusLabel(rowData.request_status);
    return translate
      ? translate("Current status: {p0}", { p0: status })
      : `Current status: ${status}`;
  }

  return "-";
};

const ApprovalInboxTableData = () => {
  const { t: i18nT } = useI18n();
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
        getRequestTitle(item, i18nT),
        getRequestSubtitle(item, i18nT),
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [moduleFilteredRows, globalFilterValue, i18nT]);

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

  const showError = (err: unknown, preferInstruction = false) => {
    if (isResponseTypeError(err)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1vks92p"),
          detail: getErrorMessage(err, preferInstruction ? "code" : "message"),
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
      showWarning(i18nT("Rejection reason is required."));

      return;
    }

    if (cleanNote.length > MAX_NOTE_LENGTH) {
      showWarning(
        i18nT("Note cannot exceed {p0} characters.", { p0: MAX_NOTE_LENGTH }),
      );

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
          ? i18nT("Approval request approved successfully.")
          : i18nT("Approval request rejected successfully."),
      );

      /*
       * Jangan memanggil
       * closeActionDialog() di sini,
       * karena fungsi tersebut menolak
       * ditutup saat isSaving masih true.
       */
      resetActionDialogState();
    } catch (err: unknown) {
      showError(err, true);
      await refreshApprovalData().catch(() => undefined);

      if (
        isResponseTypeError(err) &&
        OBSOLETE_APPROVAL_ERROR_CODES.has(err.code)
      ) {
        resetActionDialogState();
      }
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
      showWarning(i18nT("Rejection reason is required."));

      return;
    }

    const isApprove = actionType === "approve";

    requestActionConfirmation({
      header: isApprove ? i18nT("static.3mp8f7") : i18nT("static.1khp33z"),

      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            {isApprove ? i18nT("static.tuuzn4") : i18nT("static.194ofjw")}
          </span>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="m-0 text-sm font-semibold text-slate-800">
              {selectedData.requester_name || i18nT("static.toncj")}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {i18nT(getModuleLabel(selectedData.module_code))}{" "}
              {i18nT("static.19xoda3")} {getRequestTitle(selectedData, i18nT)}
            </p>

            <p className="m-0 mt-1 text-xs text-slate-500">
              {getRequestSubtitle(selectedData, i18nT)}
            </p>
          </div>

          {!isApprove && (
            <span className="text-xs text-red-600">
              {i18nT("static.1oqgb7t")}{" "}
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
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            disabled={isSaving}
            onClick={options.reject}
          />

          <Button
            type="button"
            label={
              isApprove ? i18nT("static.1s2ov2y") : i18nT("static.1kej36u")
            }
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
        value={i18nT(getModuleLabel(rowData.module_code))}
        severity={getModuleSeverity(rowData.module_code)}
        rounded
      />
    );
  };

  const approvalStepBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Tag
          value={i18nT("static.gvtlm5", { p0: rowData.step_no })}
          severity="info"
          rounded
        />

        <Tag
          value={i18nT(formatStatusLabel(rowData.status))}
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
          {getRequestTitle(rowData, i18nT)}
        </span>

        <span className="whitespace-normal text-xs leading-5 text-slate-500">
          {getRequestSubtitle(rowData, i18nT)}
        </span>
      </div>
    );
  };

  const requesterBody = (rowData: ApprovalPendingItem) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-800">
          {rowData.requester_name || i18nT("static.toncj")}
        </span>

        <span className="whitespace-nowrap text-xs text-slate-500">
          {i18nT("static.12at4de")} {formatDateTime(rowData.submitted_at)}
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
          tooltip={i18nT("static.1dtxu7d")}
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
            tooltip={i18nT("static.1s2ov2y")}
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
            tooltip={i18nT("static.1kej36u")}
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
          emptyMessage={i18nT("static.8q9lcu")}
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
            field="module_code"
            header={i18nT("static.1m2zofh")}
            sortable
            body={moduleBody}
            style={{
              minWidth: "10rem",
            }}
          />

          <Column
            field="requester_name"
            header={i18nT("static.uhx31h")}
            sortable
            body={requesterBody}
            style={{
              minWidth: "19rem",
            }}
          />

          <Column
            field="request_date"
            header={i18nT("static.1058hua")}
            sortable
            body={requestInfoBody}
            style={{
              minWidth: "17rem",
            }}
          />

          <Column
            field="request_reason"
            header={i18nT("static.i36sl5")}
            body={reasonBody}
            style={{
              minWidth: "24rem",
            }}
          />

          <Column
            field="step_no"
            header={i18nT("static.uc6ocw")}
            sortable
            body={approvalStepBody}
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
            {i18nT("static.ijauoc")}{" "}
          </p>

          <p className="m-0 mt-1 text-xs text-slate-500">
            {i18nT("static.8fjxul")}{" "}
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
                    value={i18nT("static.gvtlm5", { p0: rowData.step_no })}
                    severity="info"
                    rounded
                  />
                </div>

                <p className="m-0 mt-3 truncate text-base font-semibold text-slate-800">
                  {rowData.requester_name || i18nT("static.toncj")}
                </p>

                <p className="m-0 mt-1 text-xs text-slate-500">
                  {i18nT("static.12at4de")}{" "}
                  {formatDateTime(rowData.submitted_at)}
                </p>
              </div>

              <Tag
                value={i18nT(formatStatusLabel(rowData.status))}
                severity={getStatusSeverity(rowData.status)}
                rounded
              />
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="m-0 text-sm font-semibold text-slate-800">
                {getRequestTitle(rowData, i18nT)}
              </p>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {getRequestSubtitle(rowData, i18nT)}
              </p>
            </div>

            <div className="mt-4">
              <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {i18nT("static.i36sl5")}{" "}
              </p>

              <p className="m-0 mt-1 text-sm leading-6 text-slate-700">
                {truncateText(rowData.request_reason, 150)}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button
                type="button"
                label={i18nT("static.ei31dg")}
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
                  label={i18nT("static.1s2ov2y")}
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
                  label={i18nT("static.1kej36u")}
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
      ? i18nT("Approve Request")
      : actionType === "reject"
        ? i18nT("Reject Request")
        : i18nT("Approval Action");

  const actionDialogFooter = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label={i18nT("static.ew9em3")}
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
            ? i18nT("static.uqx6hw")
            : i18nT("static.vld9uk")
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
                <p className="m-0 text-xs text-slate-500">
                  {i18nT("static.1a9z3n3")}
                </p>

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
                <p className="m-0 text-xs text-blue-700">
                  {i18nT("static.4d7nzg")}
                </p>

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
                <p className="m-0 text-xs text-green-700">
                  {i18nT("static.1nd1tjq")}
                </p>

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
                    {i18nT("static.utf80q")}{" "}
                  </h1>

                  <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                    {i18nT("static.1oskxe4")}{" "}
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
                  options={MODULE_FILTER_OPTIONS.map((option) => ({
                    label: i18nT(option.labelKey),
                    value: option.value,
                  }))}
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
                    placeholder={i18nT("static.1dqdhhw")}
                    className="w-full"
                  />
                </IconField>

                <Button
                  type="button"
                  label={i18nT("static.2zps2o")}
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
                {i18nT("static.172j1il")}{" "}
                {(isMobile
                  ? filteredMobileRows.length
                  : moduleFilteredRows.length) === 1
                  ? ""
                  : i18nT("static.1w9pcoy")}
              </span>
            </section>

            {isMobile ? renderMobileCards() : renderDesktopTable()}
          </div>
        </Card>
      </div>

      {/* Approval Detail */}
      <Dialog
        header={i18nT("static.f2od2b")}
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
                  value={i18nT("static.gvtlm5", { p0: selectedData.step_no })}
                  severity="info"
                  rounded
                />

                <Tag
                  value={i18nT(formatStatusLabel(selectedData.status))}
                  severity={getStatusSeverity(selectedData.status)}
                  rounded
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.uhx31h")}
                  </p>

                  <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                    {selectedData.requester_name || "-"}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.4ovcdv")}
                  </p>

                  <p className="m-0 mt-1 font-mono text-sm font-semibold text-slate-800">
                    #{selectedData.reference_id}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.5g5077")}
                  </p>

                  <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                    {formatDateTime(selectedData.submitted_at)}
                  </p>
                </div>

                <div>
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.jqkaiq")}
                  </p>

                  <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                    {getRequestTitle(selectedData, i18nT)}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.1wt12hk")}{" "}
                  </p>

                  <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                    {getRequestSubtitle(selectedData, i18nT)}
                  </p>
                </div>
              </div>
            </section>

            {normalizeModuleCode(selectedData.module_code) === "LEAVE" && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.nkoqnq")}{" "}
                </h2>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="m-0 text-xs text-slate-500">
                      {i18nT("static.se3juw")}
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                      {selectedData.request_type_name || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="m-0 text-xs text-slate-500">
                      {i18nT("static.1k8mzxs")}
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                      {formatDate(selectedData.request_date)}{" "}
                      {i18nT("static.hnl64v")}{" "}
                      {formatDate(
                        selectedData.request_end_date ||
                          selectedData.request_date,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="m-0 text-xs text-slate-500">
                      {i18nT("static.196bbqb")}
                    </p>
                    <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                      {selectedData.request_seconds ?? "-"}
                    </p>
                  </div>
                </div>
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.hyvn9u")}{" "}
              </h2>

              <p className="m-0 mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                {selectedData.request_reason || "-"}
              </p>
            </section>

            {normalizeModuleCode(selectedData.module_code) ===
              "EMPLOYEE_LIFECYCLE" && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.1yr8c2v")}{" "}
                </h2>

                {isLoadingLifecycleDetail ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <i className="pi pi-spin pi-spinner" />
                    {i18nT("static.f7tii9")}{" "}
                  </div>
                ) : lifecycleDetail ? (
                  <div className="mt-4 flex flex-col gap-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <p className="m-0 text-xs text-slate-500">
                          {i18nT("static.1fak8xt")}
                        </p>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {lifecycleDetail.case.employee_name}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500">
                          {i18nT("static.crwzgc")}{" "}
                        </p>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {lifecycleDetail.case.requested_by_name}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500">
                          {i18nT("static.1cozql1")}{" "}
                        </p>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {i18nT(
                            formatStatusLabel(
                              lifecycleDetail.case.lifecycle_type,
                            ),
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500">
                          {i18nT("static.dfnnk2")}{" "}
                        </p>
                        <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
                          {formatDate(lifecycleDetail.case.effective_date)}
                        </p>
                      </div>
                    </div>

                    {lifecycleDetail.employment_change && (
                      <div>
                        <h3 className="m-0 text-sm font-semibold text-slate-800">
                          {i18nT("static.qlpiit")}{" "}
                        </h3>
                        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-600">
                              <tr>
                                <th className="px-3 py-2 font-medium">
                                  {i18nT("static.4d0paf")}
                                </th>
                                <th className="px-3 py-2 font-medium">
                                  {i18nT("static.1dw4k8q")}{" "}
                                </th>
                                <th className="px-3 py-2 font-medium">
                                  {i18nT("static.1bv6k83")}{" "}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {employmentChangeFields.map(
                                ({ key, labelKey }) => (
                                  <tr
                                    key={key}
                                    className="border-t border-slate-100"
                                  >
                                    <td className="px-3 py-2 font-medium text-slate-700">
                                      {i18nT(labelKey)}
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
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="m-0 mt-4 text-sm text-slate-500">
                    {i18nT("static.yzxvql")}{" "}
                  </p>
                )}
              </section>
            )}

            {normalizeModuleCode(selectedData.module_code) === "LEAVE" && (
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.8925gh")}{" "}
                </h2>

                {isLoadingAttachments ? (
                  <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                    <i className="pi pi-spin pi-spinner" />
                    {i18nT("static.183xj9x")}{" "}
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                    {i18nT("static.1pxc5h")}{" "}
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
                            {i18nT("static.av53jt")}
                            {attachment.content_type || i18nT("static.t2i5f")}
                            {i18nT("static.av53jt")}
                            {formatDateTime(attachment.created_at)}
                          </p>
                        </div>

                        <Button
                          type="button"
                          label={i18nT("static.q5w460")}
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
                  label={i18nT("static.1kej36u")}
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
                  label={i18nT("static.1s2ov2y")}
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
        header={
          previewAttachment?.original_file_name ?? i18nT("static.1e6olng")
        }
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
                  value={i18nT("static.gvtlm5", { p0: selectedData.step_no })}
                  severity="info"
                  rounded
                />

                <Tag
                  value={i18nT(formatStatusLabel(selectedData.status))}
                  severity={getStatusSeverity(selectedData.status)}
                  rounded
                />
              </div>

              <p className="m-0 mt-3 text-sm font-semibold text-slate-800">
                {selectedData.requester_name || "-"}
              </p>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {getRequestTitle(selectedData, i18nT)} {i18nT("static.syyan8")}{" "}
                {getRequestSubtitle(selectedData, i18nT)}
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
              ? i18nT("static.y27nc5")
              : i18nT("static.1qdfwok")}
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="note"
              className="text-sm font-medium text-slate-700"
            >
              {i18nT("static.5mau71")}{" "}
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
                  message: i18nT("static.1863636", { p0: MAX_NOTE_LENGTH }),
                },

                validate: (value) => {
                  if (actionType === "reject" && !value.trim()) {
                    return i18nT("Rejection reason is required.");
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
                        ? i18nT("static.1iw98xo")
                        : i18nT("static.170dl1u")
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
