"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import dayjs from "dayjs";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { FilterMatchMode } from "primereact/api";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";

import { fetcher } from "@/app/utils/fetcher";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

import {
  RequestLeave,
  RequestLeaveForm,
  RequestLeaveOptionBalance,
  RequestLeaveOptionType,
  RequestLeaveOptions,
  defaultRequestLeaveFormValue,
} from "@/app/types/request-leave";
import { RequestLeaveApprovalDetail } from "@/app/types/request-leave-approval-detail";

import {
  getRequestLeaveApprovalDetail,
  getRequestLeaveOptions,
  previewRequestLeaveDays,
} from "@/app/services/request-leave-service";

import { RequestLeaveAttachment } from "@/app/types/request-leave-attachment";

import {
  deleteRequestLeaveAttachment,
  getRequestLeaveAttachments,
  viewRequestLeaveAttachmentUrl,
} from "@/app/services/request-leave-attachment-service";

type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
};

type ApiIdResponse = {
  id: number;
  row_version?: number;
};

const REQUEST_LEAVE_API_URL = "/api/request-leave";
const REQUEST_LEAVE_KEY_PREFIX = "/api/request-leave";
const REQUEST_LEAVE_OPTIONS_KEY = "/api/request-leave/options";

const getBody = () => document.body;

const parseErrorResponse = async (res: Response) => {
  const contentType = res.headers.get("Content-Type");

  try {
    if (contentType && contentType.includes("application/json")) {
      return await res.json();
    }

    return {
      success: false,
      code: String(res.status),
      message: await res.text(),
    };
  } catch {
    return {
      success: false,
      code: String(res.status),
      message: "Unknown error",
    };
  }
};

const getResponseMessage = (response: ApiResponse, fallback: string) => {
  return response?.message || fallback;
};

const getResponseId = (response: ApiResponse<ApiIdResponse | number>) => {
  if (typeof response?.data === "number") {
    return response.data;
  }

  return response?.data?.id ?? 0;
};

const toApiDate = (value: Date | null) => {
  if (!value) {
    return null;
  }

  return dayjs(value).format("YYYY-MM-DD");
};

const createRequestLeaveApi = async (data: RequestLeaveForm) => {
  const payload = {
    leave_type_id: data.leave_type_id,
    employee_leave_balance_id: data.employee_leave_balance_id,
    start_date: toApiDate(data.start_date),
    end_date: toApiDate(data.end_date),
    reason: data.reason?.trim() || "",
    total_days: data.total_days,
  };

  const res = await fetch(REQUEST_LEAVE_API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as ApiResponse<ApiIdResponse | number>;
};

const updateRequestLeaveApi = async (
  id: number,
  rowVersion: number,
  data: RequestLeaveForm,
) => {
  const payload = {
    leave_type_id: data.leave_type_id,
    employee_leave_balance_id: data.employee_leave_balance_id,
    start_date: toApiDate(data.start_date),
    end_date: toApiDate(data.end_date),
    reason: data.reason?.trim() || "",
    total_days: data.total_days,
  };

  const res = await fetch(`${REQUEST_LEAVE_API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as ApiResponse<ApiIdResponse>;
};

const deleteRequestLeaveApi = async (id: number, rowVersion: number) => {
  const res = await fetch(`${REQUEST_LEAVE_API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as ApiResponse<ApiIdResponse>;
};

const restoreRequestLeaveApi = async (id: number, rowVersion: number) => {
  const res = await fetch(`${REQUEST_LEAVE_API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as ApiResponse<ApiIdResponse>;
};

const purgeRequestLeaveApi = async (id: number) => {
  const res = await fetch(`${REQUEST_LEAVE_API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as ApiResponse<ApiIdResponse>;
};

const submitRequestLeaveApi = async (id: number, rowVersion: number) => {
  const res = await fetch(`${REQUEST_LEAVE_API_URL}/${id}/submit`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as ApiResponse<ApiIdResponse>;
};

const uploadRequestLeaveAttachmentApi = async (
  requestLeaveId: number,
  file: File,
) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(
    `${REQUEST_LEAVE_API_URL}/${requestLeaveId}/attachments`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  );

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return (await res.json()) as ApiResponse<ApiIdResponse>;
};

const getStatusSeverity = (status?: string | null) => {
  const value = (status ?? "").toUpperCase();

  if (value === "APPROVED") {
    return "success";
  }

  if (value === "REJECTED") {
    return "danger";
  }

  if (value === "PENDING") {
    return "warning";
  }

  if (value === "CANCELLED") {
    return "secondary";
  }

  if (value === "WAITING") {
    return "info";
  }

  return "info";
};

const formatDate = (value?: string | Date | null) => {
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

const formatFileSize = (size: number) => {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const isDraftRequest = (rowData: RequestLeave) => {
  return (
    rowData.status?.toUpperCase() === "PENDING" &&
    !rowData.deleted_at &&
    !rowData.approval_request_id &&
    !rowData.submitted_at
  );
};

const hasApprovalDetail = (rowData: RequestLeave) => {
  return !!rowData.approval_request_id || !!rowData.submitted_at;
};

const RequestLeaveTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("request-leave");
  const permissionSet = useMemo(
    () => new Set(profileState.permissions),
    [profileState.permissions],
  );
  const canCreate = permissionSet.has("request-leave.create");
  const canUpdate = permissionSet.has("request-leave.update");
  const canDelete = permissionSet.has("request-leave.delete");

  const [selectedData, setSelectedData] = useState<RequestLeave | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Request Leave");
  const [isSaving, setIsSaving] = useState(false);
  const [attachments, setAttachments] = useState<RequestLeaveAttachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    number | null
  >(null);

  const [approvalDetailVisible, setApprovalDetailVisible] = useState(false);
  const [approvalDetailLoading, setApprovalDetailLoading] = useState(false);
  const [approvalDetail, setApprovalDetail] =
    useState<RequestLeaveApprovalDetail | null>(null);

  const currentKey = `${REQUEST_LEAVE_KEY_PREFIX}?show_all=${
    archivedAccess.canShowDeleted && isShowDeletedDataChecked
  }`;

  const {
    control,
    handleSubmit,
    setFocus,
    reset,
    clearErrors,
    watch,
    setValue,
    formState: { isValid },
  } = useForm<RequestLeaveForm>({
    defaultValues: defaultRequestLeaveFormValue,
    mode: "onTouched",
  });

  const startDate = watch("start_date");
  const endDate = watch("end_date");
  const leaveTypeId = watch("leave_type_id");
  const employeeLeaveBalanceId = watch("employee_leave_balance_id");

  const [previewTotalDays, setPreviewTotalDays] = useState(0);
  const [previewHolidayDays, setPreviewHolidayDays] = useState(0);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });

  const {
    data: requestLeaveData,
    error,
    isLoading,
  } = useSWR<RequestLeave[]>(currentKey, fetcher);

  const { data: leaveOptionsData } = useSWR<RequestLeaveOptions>(
    REQUEST_LEAVE_OPTIONS_KEY,
    getRequestLeaveOptions,
  );

  const rows = requestLeaveData ?? [];
  const leaveTypeRows: RequestLeaveOptionType[] =
    leaveOptionsData?.leave_types ?? [];
  const leaveBalanceRows: RequestLeaveOptionBalance[] =
    leaveOptionsData?.balances ?? [];

  const selectedLeaveType = useMemo(
    () => leaveTypeRows.find((item) => item.id === Number(leaveTypeId)) ?? null,
    [leaveTypeRows, leaveTypeId],
  );

  const leaveTypeOptions = useMemo(
    () =>
      leaveTypeRows.map((item) => ({
        label: `${item.name} (${item.code})`,
        value: item.id,
      })),
    [leaveTypeRows],
  );

  useEffect(() => {
    let cancelled = false;

    if (!startDate || !endDate || dayjs(endDate).isBefore(startDate, "day")) {
      setPreviewTotalDays(0);
      setPreviewHolidayDays(0);
      setIsPreviewLoading(false);
      return;
    }

    setIsPreviewLoading(true);
    void previewRequestLeaveDays(startDate, endDate)
      .then((result) => {
        if (!cancelled) {
          setPreviewTotalDays(result.total_days);
          setPreviewHolidayDays(result.holiday_days);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviewTotalDays(0);
          setPreviewHolidayDays(0);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsPreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const leaveBalanceOptions = useMemo(() => {
    return leaveBalanceRows
      .filter((item) => {
        if (item.deleted_at || item.leave_type_id !== Number(leaveTypeId)) {
          return false;
        }

        if (item.closing_balance <= 0) {
          return false;
        }

        if (!startDate || !endDate) {
          return true;
        }

        return (
          !dayjs(item.period_start).isAfter(dayjs(startDate), "day") &&
          !dayjs(item.period_end).isBefore(dayjs(endDate), "day")
        );
      })
      .map((item) => ({
        label: `${item.leave_type_name ?? `Leave Type #${item.leave_type_id}`} • ${formatDate(
          item.period_start,
        )} - ${formatDate(item.period_end)} • Balance ${item.closing_balance}`,
        value: item.id,
      }));
  }, [leaveBalanceRows, leaveTypeId, startDate, endDate]);

  const selectedLeaveBalance = useMemo(() => {
    return (
      leaveBalanceRows.find((item) => item.id === employeeLeaveBalanceId) ??
      null
    );
  }, [leaveBalanceRows, employeeLeaveBalanceId]);

  const refreshData = async () => {
    await mutate(currentKey);
    await mutate(REQUEST_LEAVE_OPTIONS_KEY);
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

    const message =
      typeof err === "object" &&
      err !== null &&
      "message" in err &&
      typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : "Unknown error";

    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: "Error",
        detail: message,
      }),
    );
  };

  const handleDialogHide = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setAttachments([]);
    setIsLoadingAttachments(false);
    setDeletingAttachmentId(null);
    reset(defaultRequestLeaveFormValue);
  };

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });

    setGlobalFilterValue(value);
  };

  const loadAttachments = async (requestLeaveId: number) => {
    try {
      setIsLoadingAttachments(true);

      const data = await getRequestLeaveAttachments(requestLeaveId);

      setAttachments(data);
    } catch (err: unknown) {
      setAttachments([]);
      showError(err);
    } finally {
      setIsLoadingAttachments(false);
    }
  };

  const handleDeleteAttachment = async (attachment: RequestLeaveAttachment) => {
    if (!selectedData) {
      return;
    }

    try {
      setDeletingAttachmentId(attachment.id);

      await deleteRequestLeaveAttachment(
        selectedData.id,
        attachment.id,
        attachment.row_version,
      );

      await loadAttachments(selectedData.id);
      await mutate(currentKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: "Attachment deleted successfully.",
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setDeletingAttachmentId(null);
    }
  };

  const onClickDeleteAttachment = (attachment: RequestLeaveAttachment) => {
    requestActionConfirmation({
      message: `Do you want to delete ${attachment.original_file_name}?`,
      header: "Delete Attachment",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => handleDeleteAttachment(attachment),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes, Delete"
            icon="pi pi-trash"
            onClick={options.accept}
            severity="danger"
          />
        </div>
      ),
    });
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Request Leave");
    reset(defaultRequestLeaveFormValue);

    setTimeout(() => {
      setFocus("leave_type_id");
    }, 0);

    setAttachments([]);
  };

  const onClickUpdate = (data: RequestLeave) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Update Request Leave");
    setAttachments([]);

    void loadAttachments(data.id);

    reset({
      id: data.id,
      leave_type_id: data.leave_type_id,
      employee_leave_balance_id: data.employee_leave_balance_id,
      start_date: data.start_date ? dayjs(data.start_date).toDate() : null,
      end_date: data.end_date ? dayjs(data.end_date).toDate() : null,
      reason: data.reason ?? "",
      total_days: data.total_days,
      attachment_file: null,
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });

    setTimeout(() => {
      setFocus("leave_type_id");
    }, 0);
  };

  const handleSubmitNew = async (data: RequestLeaveForm) => {
    try {
      setIsSaving(true);

      const payload = {
        ...data,
        total_days: previewTotalDays,
      };

      const res = await createRequestLeaveApi(payload);
      const createdId = getResponseId(res);

      if (createdId > 0 && data.attachment_file) {
        await uploadRequestLeaveAttachmentApi(createdId, data.attachment_file);
      }

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: getResponseMessage(
            res,
            "Request leave created successfully.",
          ),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: RequestLeaveForm) => {
    if (!selectedData) {
      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        ...data,
        total_days: previewTotalDays,
      };

      const res = await updateRequestLeaveApi(
        selectedData.id,
        selectedData.row_version,
        payload,
      );

      if (data.attachment_file) {
        await uploadRequestLeaveAttachmentApi(
          selectedData.id,
          data.attachment_file,
        );
      }

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: getResponseMessage(
            res,
            "Request leave updated successfully.",
          ),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: RequestLeave) => {
    try {
      const res = await deleteRequestLeaveApi(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: getResponseMessage(
            res,
            "Request leave deleted successfully.",
          ),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: RequestLeave) => {
    try {
      const res = await restoreRequestLeaveApi(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: getResponseMessage(
            res,
            "Request leave restored successfully.",
          ),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: RequestLeave) => {
    try {
      const res = await purgeRequestLeaveApi(data.id);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: getResponseMessage(res, "Request leave deleted permanently."),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleSubmitApproval = async (data: RequestLeave) => {
    try {
      const res = await submitRequestLeaveApi(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: getResponseMessage(
            res,
            "Request leave submitted successfully.",
          ),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onClickApprovalDetail = async (data: RequestLeave) => {
    try {
      setApprovalDetailLoading(true);
      setApprovalDetailVisible(true);
      setApprovalDetail(null);

      const result = await getRequestLeaveApprovalDetail(data.id);
      setApprovalDetail(result);
    } catch (err: unknown) {
      setApprovalDetailVisible(false);
      showError(err);
    } finally {
      setApprovalDetailLoading(false);
    }
  };

  const closeApprovalDetailDialog = () => {
    setApprovalDetailVisible(false);
    setApprovalDetail(null);
    setApprovalDetailLoading(false);
  };

  const onSubmit = async (data: RequestLeaveForm) => {
    if (!isValid || isSaving) {
      return;
    }

    if (!data.leave_type_id) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Validation",
          detail: "Please select leave type.",
        }),
      );
      return;
    }

    if (selectedLeaveType?.is_deductible && !data.employee_leave_balance_id) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Validation",
          detail: "Please select leave balance.",
        }),
      );
      return;
    }

    if (selectedLeaveType?.requires_reason && !data.reason.trim()) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Validation",
          detail: "Reason is required for this leave type.",
        }),
      );
      return;
    }

    if (!data.start_date || !data.end_date) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Validation",
          detail: "Start date and end date are required.",
        }),
      );
      return;
    }

    if (dayjs(data.end_date).isBefore(dayjs(data.start_date), "day")) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Validation",
          detail: "End date cannot be before start date.",
        }),
      );
      return;
    }

    if (previewTotalDays <= 0) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Validation",
          detail: "Total leave days must be greater than 0.",
        }),
      );
      return;
    }

    if (
      selectedLeaveBalance &&
      previewTotalDays > selectedLeaveBalance.closing_balance
    ) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Validation",
          detail: "Total leave days cannot be greater than closing balance.",
        }),
      );
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickSubmit = (data: RequestLeave) => {
    requestActionConfirmation({
      message: "Do you want to submit this leave request for approval?",
      header: "Submit Confirmation",
      icon: "pi pi-send",
      defaultFocus: "accept",
      accept: () => handleSubmitApproval(data),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes, Submit"
            icon="pi pi-send"
            onClick={options.accept}
            severity="success"
          />
        </div>
      ),
    });
  };

  const onClickDelete = (data: RequestLeave) => {
    requestActionConfirmation({
      message: "Do you want to delete this leave request?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => handleDelete(data),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            severity="danger"
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: RequestLeave) => {
    requestActionConfirmation({
      message: "Do you want to restore this leave request?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => handleRestore(data),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            severity="success"
          />
        </div>
      ),
    });
  };

  const onClickPurge = (data: RequestLeave) => {
    requestActionConfirmation({
      message: "Do you want to delete this leave request forever?",
      header: "Delete Forever Confirmation",
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => handlePurge(data),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="No"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label="Yes"
            icon="pi pi-check"
            onClick={options.accept}
            severity="danger"
          />
        </div>
      ),
    });
  };

  const statusBody = (rowData: RequestLeave) => {
    if (rowData.deleted_at) {
      return <Tag value="Deleted" severity="secondary" />;
    }

    const status = rowData.status?.toUpperCase();

    if (status === "APPROVED") {
      return <Tag value="Approved" severity="success" />;
    }

    if (status === "REJECTED") {
      return <Tag value="Rejected" severity="danger" />;
    }

    if (status === "CANCELLED") {
      return <Tag value="Cancelled" severity="secondary" />;
    }

    if (hasApprovalDetail(rowData)) {
      return <Tag value="Waiting Approval" severity="warning" />;
    }

    return <Tag value="Draft" severity="info" />;
  };

  const leaveTypeBody = (rowData: RequestLeave) => {
    return rowData.leave_name ?? "-";
  };

  const dateBody = (rowData: RequestLeave) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-slate-800">
          {formatDate(rowData.start_date)} - {formatDate(rowData.end_date)}
        </span>
        <span className="text-sm text-slate-500">
          Total days: {rowData.total_days}
        </span>

        {rowData.submitted_at && (
          <span className="text-xs text-slate-500">
            Submitted {formatDateTime(rowData.submitted_at)}
          </span>
        )}
      </div>
    );
  };

  const reasonBody = (rowData: RequestLeave) => {
    return (
      <span className="text-sm leading-6 text-slate-700">
        {rowData.reason || "-"}
      </span>
    );
  };

  const approvalInfoBody = (rowData: RequestLeave) => {
    const status = rowData.status?.toUpperCase();

    if (status === "APPROVED") {
      return (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-slate-800">
            {rowData.approved_by_name ?? "-"}
          </span>
          <span className="text-xs text-slate-500">
            {formatDateTime(rowData.approved_at)}
          </span>
        </div>
      );
    }

    if (status === "REJECTED") {
      return <span className="text-sm text-slate-600">Rejected</span>;
    }

    if (hasApprovalDetail(rowData)) {
      return (
        <span className="text-sm text-slate-600">
          Submitted {formatDateTime(rowData.submitted_at)}
        </span>
      );
    }

    return <span className="text-sm text-slate-500">Not submitted</span>;
  };

  const actionColumnBody = (rowData: RequestLeave) => {
    const isDraft = isDraftRequest(rowData);

    return (
      <div className="flex flex-nowrap items-center gap-2">
        {isDraft && canUpdate && (
          <Button
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            tooltip="submit for approval"
            rounded
            severity="success"
            icon="pi pi-send"
            size="small"
            onClick={() => onClickSubmit(rowData)}
          />
        )}

        {isDraft && canUpdate && (
          <Button
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            tooltip="edit"
            rounded
            severity="help"
            icon="pi pi-pencil"
            size="small"
            onClick={() => onClickUpdate(rowData)}
          />
        )}

        {isDraft && canDelete && (
          <Button
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            tooltip="delete"
            rounded
            severity="danger"
            icon="pi pi-trash"
            size="small"
            onClick={() => onClickDelete(rowData)}
          />
        )}

        {!isDraft && hasApprovalDetail(rowData) && !rowData.deleted_at && (
          <Button
            tooltipOptions={{
              appendTo: getBody,
              position: "top",
            }}
            tooltip="approval detail"
            rounded
            severity="secondary"
            icon="pi pi-list-check"
            size="small"
            onClick={() => onClickApprovalDetail(rowData)}
          />
        )}

        {rowData.deleted_at && archivedAccess.canShowDeleted && (
          <>
            {archivedAccess.canRestore && (
              <Button
                tooltipOptions={{
                  appendTo: getBody,
                  position: "top",
                }}
                tooltip="restore"
                rounded
                severity="success"
                icon="pi pi-refresh"
                size="small"
                onClick={() => onClickRestore(rowData)}
              />
            )}

            {archivedAccess.canPurge && (
              <Button
                tooltipOptions={{
                  appendTo: getBody,
                  position: "top",
                }}
                tooltip="delete forever"
                rounded
                severity="secondary"
                icon="pi pi-times"
                size="small"
                onClick={() => onClickPurge(rowData)}
              />
            )}
          </>
        )}
      </div>
    );
  };

  const dialogFooter = (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        className="p-button-text"
        onClick={handleDialogHide}
        disabled={isSaving}
      />
      <Button
        type="button"
        label={isSaving ? "Saving..." : "Save"}
        icon={isSaving ? "pi pi-spin pi-spinner" : "pi pi-check"}
        disabled={isSaving}
        onClick={handleSubmit(onSubmit)}
      />
    </div>
  );

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={currentKey} />;
  }

  return (
    <>
      <Card className="border border-slate-100 shadow-sm">
        <div className="flex flex-col gap-5 p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-800">
                Request Leave
              </div>
              <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Create leave request as draft, then submit it for approval.
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {archivedAccess.canShowDeleted && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    inputId="showDeleted"
                    checked={isShowDeletedDataChecked}
                    onChange={(e) =>
                      setIsShowDeletedDataChecked(Boolean(e.checked))
                    }
                  />
                  <label
                    htmlFor="showDeleted"
                    className="text-sm text-slate-700"
                  >
                    Show deleted data
                  </label>
                </div>
              )}

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search reason or status"
                  className="w-full lg:w-[20rem]"
                />
              </IconField>

              {canCreate && (
                <Button label="New" icon="pi pi-plus" onClick={onClickNew} />
              )}
            </div>
          </div>

          <DataTable
            value={rows}
            dataKey="id"
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            stripedRows
            scrollable
            responsiveLayout="scroll"
            tableStyle={{ minWidth: "92rem" }}
            emptyMessage="No request leave found."
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            filters={filters}
            globalFilterFields={[
              "leave_name",
              "reason",
              "status",
              "start_date",
              "end_date",
            ]}
          >
            <Column
              header="#"
              headerStyle={{ width: "4rem" }}
              body={(_, options) => options.rowIndex + 1}
            />

            <Column
              header="Leave Type"
              body={leaveTypeBody}
              style={{ minWidth: "16rem" }}
            />

            <Column
              header="Date"
              body={dateBody}
              style={{ minWidth: "20rem" }}
            />

            <Column
              header="Total Days"
              body={(rowData: RequestLeave) => rowData.total_days}
              style={{ minWidth: "10rem" }}
            />

            <Column
              header="Status"
              body={statusBody}
              style={{ minWidth: "12rem" }}
            />

            <Column
              header="Reason"
              body={reasonBody}
              style={{ minWidth: "22rem" }}
            />

            <Column
              header="Approval Info"
              body={approvalInfoBody}
              style={{ minWidth: "18rem" }}
            />

            <Column
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
              style={{
                minWidth: "12rem",
                width: "12rem",
              }}
              headerStyle={{
                minWidth: "12rem",
                width: "12rem",
                background: "#ffffff",
                zIndex: 1,
              }}
              bodyStyle={{
                minWidth: "12rem",
                width: "12rem",
                background: "#ffffff",
                whiteSpace: "nowrap",
              }}
            />
          </DataTable>
        </div>
      </Card>

      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{ width: "95vw", maxWidth: "760px" }}
        breakpoints={{ "960px": "95vw" }}
        onHide={handleDialogHide}
        footer={dialogFooter}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {selectedLeaveBalance && (
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Selected Balance
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-800">
                  {selectedLeaveBalance.leave_type_name ?? "-"}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Period {formatDate(selectedLeaveBalance.period_start)} -{" "}
                  {formatDate(selectedLeaveBalance.period_end)} • Closing
                  Balance {selectedLeaveBalance.closing_balance}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Leave Type
            </label>
            <Controller
              name="leave_type_id"
              control={control}
              rules={{ required: "Leave type is required" }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    value={field.value || null}
                    options={leaveTypeOptions}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select leave type"
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    onChange={(event) => {
                      field.onChange(event.value ?? 0);
                      setValue("employee_leave_balance_id", null, {
                        shouldValidate: true,
                      });
                    }}
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

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Leave Balance{selectedLeaveType?.is_deductible ? " *" : ""}
            </label>
            <Controller
              name="employee_leave_balance_id"
              control={control}
              rules={{
                validate: (value) =>
                  !selectedLeaveType?.is_deductible ||
                  Boolean(value) ||
                  "Leave balance is required for this leave type",
              }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    value={field.value}
                    options={leaveBalanceOptions}
                    placeholder={
                      selectedLeaveType?.is_deductible
                        ? "Select leave balance"
                        : "Not required for this leave type"
                    }
                    showClear
                    disabled={!selectedLeaveType?.is_deductible}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    onChange={(event) => field.onChange(event.value ?? null)}
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

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              Start Date
            </label>
            <Controller
              name="start_date"
              control={control}
              rules={{
                required: "Start date is required",
              }}
              render={({ field, fieldState }) => (
                <>
                  <Calendar
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    dateFormat="dd-mm-yy"
                    showIcon
                    className={fieldState.invalid ? "p-invalid" : ""}
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

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-700">
              End Date
            </label>
            <Controller
              name="end_date"
              control={control}
              rules={{
                required: "End date is required",
              }}
              render={({ field, fieldState }) => (
                <>
                  <Calendar
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    dateFormat="dd-mm-yy"
                    showIcon
                    className={fieldState.invalid ? "p-invalid" : ""}
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

          <div className="md:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Leave Days Preview
              </div>
              <div className="mt-1 text-lg font-semibold text-slate-800">
                {isPreviewLoading
                  ? "Calculating..."
                  : `${previewTotalDays} day(s)`}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Backend preview excludes weekends and {previewHolidayDays}{" "}
                holiday day(s).
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <Controller
              name="reason"
              control={control}
              rules={{
                validate: (value) =>
                  !selectedLeaveType?.requires_reason ||
                  Boolean(value?.trim()) ||
                  "Reason is required for this leave type",
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputTextarea
                    {...field}
                    rows={4}
                    placeholder="Explain your leave reason"
                    className={fieldState.invalid ? "p-invalid" : ""}
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

          <div className="flex flex-col gap-3 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Attachment
            </label>

            {!isAddNew && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-700">
                  Existing Attachments
                </div>

                {isLoadingAttachments ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-slate-500">
                    <i className="pi pi-spin pi-spinner" />
                    <span>Loading attachments...</span>
                  </div>
                ) : attachments.length === 0 ? (
                  <div className="py-3 text-sm text-slate-500">
                    No attachment uploaded.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-800">
                            {attachment.original_file_name}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {formatFileSize(attachment.file_size)}
                            {" • "}
                            {attachment.content_type}
                            {" • "}
                            {formatDateTime(attachment.created_at)}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            label="View"
                            icon="pi pi-eye"
                            size="small"
                            outlined
                            onClick={() => {
                              window.open(
                                viewRequestLeaveAttachmentUrl(
                                  selectedData?.id ??
                                    attachment.employee_leave_id,
                                  attachment.id,
                                ),
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }}
                          />

                          <Button
                            type="button"
                            label={
                              deletingAttachmentId === attachment.id
                                ? "Deleting..."
                                : "Delete"
                            }
                            icon={
                              deletingAttachmentId === attachment.id
                                ? "pi pi-spin pi-spinner"
                                : "pi pi-trash"
                            }
                            size="small"
                            severity="danger"
                            outlined
                            disabled={deletingAttachmentId !== null}
                            onClick={() => onClickDeleteAttachment(attachment)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Controller
              name="attachment_file"
              control={control}
              render={({ field }) => (
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  onChange={(event) => {
                    field.onChange(event.target.files?.[0] ?? null);
                  }}
                />
              )}
            />

            <div className="text-xs text-slate-500">
              JPG, JPEG, PNG, or PDF. Maximum file size 5 MB.
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Approval Detail"
        visible={approvalDetailVisible}
        style={{ width: "95vw", maxWidth: "900px" }}
        breakpoints={{ "960px": "95vw" }}
        onHide={closeApprovalDetailDialog}
        modal
        draggable={false}
        resizable={false}
      >
        {approvalDetailLoading && (
          <div className="flex items-center justify-center py-10">
            <i className="pi pi-spin pi-spinner mr-2" />
            <span>Loading approval detail...</span>
          </div>
        )}

        {!approvalDetailLoading && approvalDetail && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Tag
                  value={`Leave: ${approvalDetail.leave_status}`}
                  severity={getStatusSeverity(approvalDetail.leave_status)}
                />

                {approvalDetail.approval_status &&
                  approvalDetail.approval_status !==
                    approvalDetail.leave_status && (
                    <Tag
                      value={`Approval: ${approvalDetail.approval_status}`}
                      severity={getStatusSeverity(
                        approvalDetail.approval_status,
                      )}
                    />
                  )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-slate-500">Request No</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {approvalDetail.request_no || "-"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">
                    Approval Request ID
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {approvalDetail.approval_request_id
                      ? `#${approvalDetail.approval_request_id}`
                      : "-"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Submitted At</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatDateTime(approvalDetail.submitted_at)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">Completed At</div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatDateTime(approvalDetail.completed_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 text-lg font-semibold text-slate-800">
                Approval Steps
              </div>

              {approvalDetail.steps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No approval step found.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {approvalDetail.steps.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Tag
                              value={`Step ${step.step_no}`}
                              severity="info"
                            />
                            <Tag
                              value={step.status}
                              severity={getStatusSeverity(step.status)}
                            />
                          </div>

                          <div className="mt-3 text-sm text-slate-500">
                            Approver
                          </div>
                          <div className="font-semibold text-slate-800">
                            {step.approver_name ||
                              `Employee #${step.approver_employee_id}`}
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <div className="text-sm text-slate-500">Acted By</div>
                          <div className="font-semibold text-slate-800">
                            {step.acted_by_name || "-"}
                          </div>

                          <div className="mt-2 text-sm text-slate-500">
                            Acted At
                          </div>
                          <div className="font-semibold text-slate-800">
                            {formatDateTime(step.acted_at)}
                          </div>
                        </div>
                      </div>

                      {step.note && (
                        <div className="mt-4 rounded-lg bg-white px-3 py-2 text-sm leading-6 text-slate-700">
                          {step.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 text-lg font-semibold text-slate-800">
                Approval Timeline
              </div>

              {approvalDetail.actions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  No approval action found.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {approvalDetail.actions.map((action) => (
                    <div
                      key={action.id}
                      className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
                    >
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <i className="pi pi-history text-sm" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div className="font-semibold text-slate-800">
                            {action.action}
                            {action.step_no ? ` - Step ${action.step_no}` : ""}
                          </div>

                          <div className="text-sm text-slate-500">
                            {formatDateTime(action.acted_at)}
                          </div>
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          By{" "}
                          {action.actor_name ||
                            `Employee #${action.actor_employee_id}`}
                        </div>

                        {action.note && (
                          <div className="mt-2 text-sm leading-6 text-slate-700">
                            {action.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};

export default RequestLeaveTableData;
