"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import dayjs from "dayjs";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
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
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { hasRole } from "@/app/utils/role-utils";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

import {
  RequestLeave,
  RequestLeaveForm,
  defaultRequestLeaveFormValue,
} from "@/app/types/request-leave";
import { RequestLeaveApprovalDetail } from "@/app/types/request-leave-approval-detail";

import { getRequestLeaveApprovalDetail } from "@/app/services/request-leave-service";

type EmployeeLeaveBalanceOption = {
  id: number;
  employee_id: number;
  leave_type_id: number;
  leave_type_name?: string | null;
  period_start: string;
  period_end: string;
  opening_balance: number;
  entitlement: number;
  taken: number;
  adjustment: number;
  closing_balance: number;
  expired_balance: number;
  deleted_at?: string | null;
  row_version: number;
};

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
const LEAVE_BALANCE_KEY = "/api/employees/leave-balance";

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

const getResponseId = (response: ApiResponse<ApiIdResponse>) => {
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
    reason: data.reason?.trim() || null,
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

  return (await res.json()) as ApiResponse<ApiIdResponse>;
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
    reason: data.reason?.trim() || null,
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

const calculateWorkingDays = (startDate: Date | null, endDate: Date | null) => {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = dayjs(startDate).startOf("day");
  const end = dayjs(endDate).startOf("day");

  if (end.isBefore(start)) {
    return 0;
  }

  let total = 0;
  let current = start;

  while (current.isSame(end) || current.isBefore(end)) {
    const day = current.day();

    if (day !== 0 && day !== 6) {
      total += 1;
    }

    current = current.add(1, "day");
  }

  return total;
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

  const [selectedData, setSelectedData] = useState<RequestLeave | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Request Leave");
  const [isSaving, setIsSaving] = useState(false);

  const [approvalDetailVisible, setApprovalDetailVisible] = useState(false);
  const [approvalDetailLoading, setApprovalDetailLoading] = useState(false);
  const [approvalDetail, setApprovalDetail] =
    useState<RequestLeaveApprovalDetail | null>(null);

  const currentKey = `${REQUEST_LEAVE_KEY_PREFIX}?show_all=${isShowDeletedDataChecked}`;

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
  const employeeLeaveBalanceId = watch("employee_leave_balance_id");

  const previewTotalDays = useMemo(() => {
    return calculateWorkingDays(startDate, endDate);
  }, [startDate, endDate]);

  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });

  const {
    data: requestLeaveData,
    error,
    isLoading,
  } = useSWR<RequestLeave[]>(currentKey, fetcher);

  const { data: leaveBalanceData } = useSWR<EmployeeLeaveBalanceOption[]>(
    LEAVE_BALANCE_KEY,
    fetcher,
  );

  const rows = requestLeaveData ?? [];
  const leaveBalanceRows = leaveBalanceData ?? [];

  const leaveBalanceOptions = useMemo(() => {
    return leaveBalanceRows
      .filter((item) => !item.deleted_at)
      .map((item) => ({
        label: `${item.leave_type_name ?? `Leave Type #${item.leave_type_id}`} • ${formatDate(
          item.period_start,
        )} - ${formatDate(item.period_end)} • Balance ${item.closing_balance}`,
        value: item.id,
      }));
  }, [leaveBalanceRows]);

  const selectedLeaveBalance = useMemo(() => {
    return (
      leaveBalanceRows.find((item) => item.id === employeeLeaveBalanceId) ??
      null
    );
  }, [leaveBalanceRows, employeeLeaveBalanceId]);

  const refreshData = async () => {
    await mutate(currentKey);
    await mutate(LEAVE_BALANCE_KEY);
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
    reset(defaultRequestLeaveFormValue);
  };

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });

    setGlobalFilterValue(value);
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Request Leave");
    reset(defaultRequestLeaveFormValue);

    setTimeout(() => {
      setFocus("employee_leave_balance_id");
    }, 0);
  };

  const onClickUpdate = (data: RequestLeave) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Update Request Leave");

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
      setFocus("employee_leave_balance_id");
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

    if (!data.employee_leave_balance_id || !data.leave_type_id) {
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
    confirmDialog({
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
    confirmDialog({
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
    confirmDialog({
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
    confirmDialog({
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
        {isDraft && (
          <>
            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip="submit for approval"
              rounded
              severity="success"
              icon="pi pi-send"
              size="small"
              onClick={() => onClickSubmit(rowData)}
            />

            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip="edit"
              rounded
              severity="help"
              icon="pi pi-pencil"
              size="small"
              onClick={() => onClickUpdate(rowData)}
            />

            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip="delete"
              rounded
              severity="danger"
              icon="pi pi-trash"
              size="small"
              onClick={() => onClickDelete(rowData)}
            />
          </>
        )}

        {!isDraft && hasApprovalDetail(rowData) && !rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: getBody, position: "top" }}
            tooltip="approval detail"
            rounded
            severity="secondary"
            icon="pi pi-list-check"
            size="small"
            onClick={() => onClickApprovalDetail(rowData)}
          />
        )}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && (
          <>
            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip="restore"
              rounded
              severity="success"
              icon="pi pi-refresh"
              size="small"
              onClick={() => onClickRestore(rowData)}
            />

            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip="delete forever"
              rounded
              severity="secondary"
              icon="pi pi-times"
              size="small"
              onClick={() => onClickPurge(rowData)}
            />
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
      <ConfirmDialog />

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
              <div className="flex items-center gap-2">
                <Checkbox
                  inputId="showDeleted"
                  checked={isShowDeletedDataChecked}
                  onChange={(e) =>
                    setIsShowDeletedDataChecked(Boolean(e.checked))
                  }
                />
                <label htmlFor="showDeleted" className="text-sm text-slate-700">
                  Show deleted data
                </label>
              </div>

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search reason or status"
                  className="w-full lg:w-[20rem]"
                />
              </IconField>

              <Button label="New" icon="pi pi-plus" onClick={onClickNew} />
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
              style={{ minWidth: "12rem", width: "12rem" }}
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
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Leave Balance
            </label>

            <Controller
              name="employee_leave_balance_id"
              control={control}
              rules={{ required: "Leave balance is required" }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    value={field.value || null}
                    options={leaveBalanceOptions}
                    optionLabel="label"
                    optionValue="value"
                    onChange={(e) => {
                      field.onChange(e.value);

                      const selected = leaveBalanceRows.find(
                        (item) => item.id === e.value,
                      );

                      setValue("leave_type_id", selected?.leave_type_id ?? 0, {
                        shouldValidate: true,
                      });
                    }}
                    placeholder="Select leave balance"
                    filter
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
              Start Date
            </label>
            <Controller
              name="start_date"
              control={control}
              rules={{ required: "Start date is required" }}
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
              rules={{ required: "End date is required" }}
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
                {previewTotalDays} day(s)
              </div>
              <div className="mt-1 text-sm text-slate-500">
                Preview counts working days only, excluding Saturday and Sunday.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Reason</label>
            <Controller
              name="reason"
              control={control}
              rules={{ required: "Reason is required" }}
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

          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Attachment
            </label>
            <Controller
              name="attachment_file"
              control={control}
              render={({ field }) => (
                <input
                  type="file"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  onChange={(event) => {
                    field.onChange(event.target.files?.[0] ?? null);
                  }}
                />
              )}
            />
            <div className="text-xs text-slate-500">
              Upload only if this leave type requires attachment.
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
