"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR, { mutate } from "swr";
import dayjs from "dayjs";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Calendar } from "primereact/calendar";
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
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import {
  OvertimeRequest,
  OvertimeRequestForm,
  defaultOvertimeRequestFormValue,
} from "@/app/types/overtime-request";
import { OvertimeRequestApprovalDetail } from "@/app/types/overtime-request-approval-detail";

import {
  createOvertimeRequest,
  cancelOvertimeRequest,
  deleteOvertimeRequest,
  getOvertimeRequestApprovalDetail,
  purgeOvertimeRequest,
  restoreOvertimeRequest,
  submitOvertimeRequest,
  updateOvertimeRequest,
} from "@/app/services/overtime-request-service";

type TimeOption = {
  label: string;
  value: string;
};

const getBody = () => document.body;

const buildTimeOptions = (stepMinutes = 15): TimeOption[] => {
  const options: TimeOption[] = [];

  for (let minuteOfDay = 0; minuteOfDay < 24 * 60; minuteOfDay += stepMinutes) {
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;

    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    options.push({
      label: value,
      value,
    });
  }

  return options;
};

const toTimeValue = (value?: string | null) => {
  if (!value) {
    return null;
  }

  return dayjs(value).format("HH:mm");
};

const combineDateAndTime = (
  date: Date | null,
  time: string | null,
): Date | null => {
  if (!date || !time) {
    return null;
  }

  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return dayjs(date)
    .hour(hour)
    .minute(minute)
    .second(0)
    .millisecond(0)
    .toDate();
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

  return dayjs(value).format("HH:mm");
};

const formatSeconds = (seconds?: number | null) => {
  const totalSeconds = Number(seconds ?? 0);

  if (totalSeconds <= 0) {
    return "0h 0m";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${hours}h ${minutes}m`;
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

const isDraftRequest = (rowData: OvertimeRequest) => {
  return (
    rowData.status?.toUpperCase() === "PENDING" &&
    !rowData.deleted_at &&
    !rowData.approval_request_id &&
    !rowData.submitted_at
  );
};

const hasApprovalDetail = (rowData: OvertimeRequest) => {
  return !!rowData.approval_request_id || !!rowData.submitted_at;
};

const OvertimeRequestTableData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("overtime");

  const [selectedData, setSelectedData] = useState<OvertimeRequest | null>(
    null,
  );
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState(
    "New Overtime Request",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [cancelDialogVisible, setCancelDialogVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const [approvalDetailVisible, setApprovalDetailVisible] = useState(false);
  const [approvalDetailLoading, setApprovalDetailLoading] = useState(false);
  const [approvalDetail, setApprovalDetail] =
    useState<OvertimeRequestApprovalDetail | null>(null);

  const currentKey = `/api/overtime-request?show_all=${
    archivedAccess.canShowDeleted && isShowDeletedDataChecked
  }`;
  const timeOptions = useMemo(() => buildTimeOptions(15), []);

  const {
    control,
    handleSubmit,
    setFocus,
    reset,
    clearErrors,
    watch,
    formState: { isValid },
  } = useForm<OvertimeRequestForm>({
    defaultValues: defaultOvertimeRequestFormValue,
    mode: "onTouched",
  });

  const overtimeDate = watch("overtime_date");
  const requestedStartTime = watch("requested_start_time");
  const requestedEndTime = watch("requested_end_time");
  const canCancel = profileState.permissions.includes("overtime.cancel");
  const canManageCancel = profileState.permissions.includes(
    "overtime-management.cancel",
  );

  const previewStartAt = useMemo(() => {
    return combineDateAndTime(overtimeDate, requestedStartTime);
  }, [overtimeDate, requestedStartTime]);

  const previewEndAt = useMemo(() => {
    return combineDateAndTime(overtimeDate, requestedEndTime);
  }, [overtimeDate, requestedEndTime]);

  const previewSeconds = useMemo(() => {
    if (!previewStartAt || !previewEndAt) {
      return 0;
    }

    let diff = dayjs(previewEndAt).diff(previewStartAt, "second");
    if (diff <= 0) {
      diff = dayjs(previewEndAt).add(1, "day").diff(previewStartAt, "second");
    }

    return diff > 0 ? diff : 0;
  }, [previewStartAt, previewEndAt]);

  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });

  const {
    data: overtimeRequestData,
    error,
    isLoading,
  } = useSWR<OvertimeRequest[]>(currentKey, fetcher);

  const rows = overtimeRequestData ?? [];

  const refreshData = async () => {
    await mutate(currentKey);
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
        detail: i18nT("static.1l8uddv"),
      }),
    );
  };

  const handleDialogHide = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    reset(defaultOvertimeRequestFormValue);
  };

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setPopupHeaderTitle("New Overtime Request");
    reset(defaultOvertimeRequestFormValue);

    setTimeout(() => {
      setFocus("overtime_date");
    }, 0);
  };

  const onClickUpdate = (data: OvertimeRequest) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Update Overtime Request");

    reset({
      id: data.id,
      overtime_date: data.overtime_date
        ? dayjs(data.overtime_date).toDate()
        : null,
      requested_start_time: toTimeValue(data.requested_start_at),
      requested_end_time: toTimeValue(data.requested_end_at),
      reason: data.reason ?? "",
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });

    setTimeout(() => {
      setFocus("overtime_date");
    }, 0);
  };

  const handleSubmitNew = async (data: OvertimeRequestForm) => {
    try {
      setIsSaving(true);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createOvertimeRequest(data);

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: res.message || i18nT("static.19glane"),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: OvertimeRequestForm) => {
    if (!selectedData) {
      return;
    }

    try {
      setIsSaving(true);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updateOvertimeRequest(
          selectedData.id,
          selectedData.row_version,
          data,
        );

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: res.message || i18nT("static.1ywm30h"),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: OvertimeRequest) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteOvertimeRequest(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: res.message || i18nT("static.sk82wv"),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleCancel = async () => {
    if (!selectedData) return;
    const reason = cancelReason.trim();
    if (!reason) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: i18nT("static.gy1qqi"),
          detail: i18nT("static.1svshzr"),
        }),
      );
      return;
    }
    try {
      setIsCancelling(true);
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await cancelOvertimeRequest(
          selectedData.id,
          selectedData.row_version,
          reason,
        );
      await refreshData();
      setCancelDialogVisible(false);
      setSelectedData(null);
      setCancelReason("");
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: res.message || i18nT("static.1e9r5z9"),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRestore = async (data: OvertimeRequest) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreOvertimeRequest(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: res.message || i18nT("static.1jrj3xy"),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: OvertimeRequest) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgeOvertimeRequest(data.id);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: res.message || i18nT("static.emmjxj"),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleSubmitApproval = async (data: OvertimeRequest) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await submitOvertimeRequest(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: res.message || i18nT("static.1h215mf"),
        }),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onClickApprovalDetail = async (data: OvertimeRequest) => {
    try {
      setApprovalDetailLoading(true);
      setApprovalDetailVisible(true);
      setApprovalDetail(null);

      const result = await getOvertimeRequestApprovalDetail(data.id);
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

  const onSubmit = async (data: OvertimeRequestForm) => {
    if (!isValid || isSaving) {
      return;
    }

    const startAt = combineDateAndTime(
      data.overtime_date,
      data.requested_start_time,
    );

    let endAt = combineDateAndTime(data.overtime_date, data.requested_end_time);

    if (!startAt || !endAt) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1usu9gp"),
          detail: i18nT("static.14xe6f6"),
        }),
      );
      return;
    }

    if (!dayjs(endAt).isAfter(startAt)) {
      endAt = dayjs(endAt).add(1, "day").toDate();
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickSubmit = (data: OvertimeRequest) => {
    requestActionConfirmation({
      message: i18nT("static.1bqpdg5"),
      header: i18nT("static.1clrlpu"),
      icon: "pi pi-send",
      defaultFocus: "accept",
      accept: () => handleSubmitApproval(data),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.szg4cs")}
            icon="pi pi-send"
            onClick={options.accept}
            severity="success"
          />
        </div>
      ),
    });
  };

  const onClickDelete = (data: OvertimeRequest) => {
    requestActionConfirmation({
      message: i18nT("static.1x4wrky"),
      header: i18nT("static.14tdkvz"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => handleDelete(data),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.1dudzcg")}
            icon="pi pi-check"
            onClick={options.accept}
            severity="danger"
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: OvertimeRequest) => {
    requestActionConfirmation({
      message: i18nT("static.1vtdl91"),
      header: i18nT("static.j6hscu"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => handleRestore(data),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.1dudzcg")}
            icon="pi pi-check"
            onClick={options.accept}
            severity="success"
          />
        </div>
      ),
    });
  };

  const onClickPurge = (data: OvertimeRequest) => {
    requestActionConfirmation({
      message: i18nT("static.1qdvv2j"),
      header: i18nT("static.zrx58y"),
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => handlePurge(data),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label={i18nT("static.r5wqai")}
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
          />
          <Button
            label={i18nT("static.1dudzcg")}
            icon="pi pi-check"
            onClick={options.accept}
            severity="danger"
          />
        </div>
      ),
    });
  };

  const statusBody = (rowData: OvertimeRequest) => {
    if (rowData.deleted_at) {
      return <Tag value={i18nT("static.1v6qcju")} severity="secondary" />;
    }

    const status = rowData.status?.toUpperCase();

    if (status === "APPROVED") {
      return <Tag value={i18nT("static.1j3qly2")} severity="success" />;
    }

    if (status === "REJECTED") {
      return <Tag value={i18nT("static.1uofzaf")} severity="danger" />;
    }

    if (status === "CANCELLED") {
      return <Tag value={i18nT("static.1a3t1vg")} severity="secondary" />;
    }

    if (hasApprovalDetail(rowData)) {
      return <Tag value={i18nT("static.1v7fs5n")} severity="warning" />;
    }

    return <Tag value={i18nT("static.129n38s")} severity="info" />;
  };

  const overtimeDateBody = (rowData: OvertimeRequest) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-slate-800">
          {formatDate(rowData.overtime_date)}
        </span>

        {rowData.submitted_at && (
          <span className="text-xs text-slate-500">
            {i18nT("static.12at4de")} {formatDateTime(rowData.submitted_at)}
          </span>
        )}
      </div>
    );
  };

  const timeBody = (rowData: OvertimeRequest) => {
    return (
      <div className="flex flex-col gap-1">
        <span className="font-medium text-slate-800">
          {formatTime(rowData.requested_start_at)} -{" "}
          {formatTime(rowData.requested_end_at)}
        </span>
        <span className="text-xs text-slate-500">
          {formatSeconds(rowData.requested_seconds)}
        </span>
      </div>
    );
  };

  const reasonBody = (rowData: OvertimeRequest) => {
    return (
      <span className="text-sm leading-6 text-slate-700">
        {rowData.reason || "-"}
      </span>
    );
  };

  const actionColumnBody = (rowData: OvertimeRequest) => {
    const isDraft = isDraftRequest(rowData);
    const status = rowData.status?.toUpperCase();
    const canCancelRequest =
      !rowData.deleted_at &&
      ((status === "PENDING" && (canCancel || canManageCancel)) ||
        (status === "APPROVED" && canManageCancel));

    return (
      <div className="flex flex-nowrap items-center gap-2">
        {isDraft && (
          <>
            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip={i18nT("static.q5s311")}
              rounded
              severity="success"
              icon="pi pi-send"
              size="small"
              onClick={() => onClickSubmit(rowData)}
            />

            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip={i18nT("static.pi0p75")}
              rounded
              severity="help"
              icon="pi pi-pencil"
              size="small"
              onClick={() => onClickUpdate(rowData)}
            />

            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip={i18nT("static.ssf22y")}
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
            tooltip={i18nT("static.mjrwmb")}
            rounded
            severity="secondary"
            icon="pi pi-list-check"
            size="small"
            onClick={() => onClickApprovalDetail(rowData)}
          />
        )}

        {canCancelRequest && (
          <Button
            tooltipOptions={{ appendTo: getBody, position: "top" }}
            tooltip={i18nT("static.yua8ai")}
            rounded
            severity="warning"
            icon="pi pi-ban"
            size="small"
            onClick={() => {
              setSelectedData(rowData);
              setCancelReason("");
              setCancelDialogVisible(true);
            }}
          />
        )}

        {rowData.deleted_at && archivedAccess.canShowDeleted && (
          <>
            {archivedAccess.canRestore && (
              <Button
                tooltipOptions={{ appendTo: getBody, position: "top" }}
                tooltip={i18nT("static.1p9rz69")}
                rounded
                severity="success"
                icon="pi pi-refresh"
                size="small"
                onClick={() => onClickRestore(rowData)}
              />
            )}

            {archivedAccess.canPurge && (
              <Button
                tooltipOptions={{ appendTo: getBody, position: "top" }}
                tooltip={i18nT("static.m55cx1")}
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
        label={i18nT("static.ew9em3")}
        icon="pi pi-times"
        className="p-button-text"
        onClick={handleDialogHide}
        disabled={isSaving}
      />
      <Button
        type="submit"
        label={isSaving ? i18nT("static.8kfkb3") : i18nT("static.lewgh4")}
        icon={isSaving ? "pi pi-spin pi-spinner" : "pi pi-check"}
        disabled={isSaving}
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
                {i18nT("static.x7kedz")}{" "}
              </div>
              <div className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                {i18nT("static.1hwb6a9")}{" "}
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
                    {i18nT("static.1beum2j")}{" "}
                  </label>
                </div>
              )}

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder={i18nT("static.c8h6mm")}
                  className="w-full lg:w-[20rem]"
                />
              </IconField>

              <Button
                label={i18nT("static.12ludo1")}
                icon="pi pi-plus"
                onClick={onClickNew}
              />
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
            tableStyle={{ minWidth: "80rem" }}
            emptyMessage={i18nT("static.z3l6r2")}
            currentPageReportTemplate={i18nT("static.1kqh8lr")}
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            filters={filters}
            globalFilterFields={["reason", "status", "overtime_date"]}
          >
            <Column
              header="#"
              headerStyle={{ width: "4rem" }}
              body={(_, options) => options.rowIndex + 1}
            />

            <Column
              header={i18nT("static.bp5uwu")}
              body={overtimeDateBody}
              style={{ minWidth: "16rem" }}
            />

            <Column
              header={i18nT("static.s5z0w")}
              body={timeBody}
              style={{ minWidth: "16rem" }}
            />

            <Column
              header={i18nT("static.1n1dulp")}
              body={(rowData: OvertimeRequest) =>
                formatSeconds(rowData.requested_seconds)
              }
              style={{ minWidth: "10rem" }}
            />

            <Column
              header={i18nT("static.3pd73")}
              body={statusBody}
              style={{ minWidth: "12rem" }}
            />

            <Column
              header={i18nT("static.i36sl5")}
              body={reasonBody}
              style={{ minWidth: "22rem" }}
            />

            <Column
              header={i18nT("static.2wk0tb")}
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

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: "95vw", maxWidth: "720px" }}
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
                {i18nT("static.bp5uwu")}{" "}
              </label>
              <Controller
                name="overtime_date"
                control={control}
                rules={{ required: i18nT("static.pix9mb") }}
                render={({ field, fieldState }) => (
                  <>
                    <Calendar
                      value={field.value}
                      onChange={(e) => field.onChange(e.value)}
                      dateFormat="dd MM yy"
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
                {i18nT("static.1l5g9d8")}{" "}
              </label>
              <Controller
                name="requested_start_time"
                control={control}
                rules={{ required: i18nT("static.1lu0959") }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      value={field.value}
                      options={timeOptions}
                      onChange={(e) => field.onChange(e.value)}
                      placeholder={i18nT("static.1upncpi")}
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

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">
                {i18nT("static.brrqon")}{" "}
              </label>
              <Controller
                name="requested_end_time"
                control={control}
                rules={{ required: i18nT("static.1ehgkyy") }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      value={field.value}
                      options={timeOptions}
                      onChange={(e) => field.onChange(e.value)}
                      placeholder={i18nT("static.om6tn1")}
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

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {i18nT("static.1lcz0qp")}{" "}
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-800">
                  {formatSeconds(previewSeconds)}
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {previewStartAt && previewEndAt
                    ? i18nT("static.1t1akqf", {
                        p0: formatDateTime(previewStartAt.toISOString()),
                        p1: formatDateTime(previewEndAt.toISOString()),
                      })
                    : i18nT("static.gtffuh")}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                {i18nT("static.i36sl5")}{" "}
              </label>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <InputTextarea
                    {...field}
                    rows={4}
                    placeholder={i18nT("static.7ze80k")}
                  />
                )}
              />
            </div>
          </div>
        </Dialog>
      </form>

      <Dialog
        header={i18nT("static.f2od2b")}
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
            <span>{i18nT("static.hczzbz")}</span>
          </div>
        )}

        {!approvalDetailLoading && approvalDetail && (
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Tag
                  value={i18nT("static.1j0gc54", {
                    p0: approvalDetail.overtime_status,
                  })}
                  severity={getStatusSeverity(approvalDetail.overtime_status)}
                />

                {approvalDetail.approval_status &&
                  approvalDetail.approval_status !==
                    approvalDetail.overtime_status && (
                    <Tag
                      value={i18nT("static.cntcsw", {
                        p0: approvalDetail.approval_status,
                      })}
                      severity={getStatusSeverity(
                        approvalDetail.approval_status,
                      )}
                    />
                  )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-slate-500">
                    {i18nT("static.bp5uwu")}
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatDate(approvalDetail.overtime_date)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">
                    {i18nT("static.1rlonzs")}{" "}
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {approvalDetail.approval_request_id
                      ? i18nT("static.16h857e", {
                          p0: approvalDetail.approval_request_id,
                        })
                      : "-"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">
                    {i18nT("static.s5z0w")}
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatTime(approvalDetail.requested_start_at)} -{" "}
                    {formatTime(approvalDetail.requested_end_at)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">
                    {i18nT("static.1n1dulp")}
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatSeconds(approvalDetail.requested_seconds)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">
                    {i18nT("static.5g5077")}
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatDateTime(approvalDetail.submitted_at)}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-slate-500">
                    {i18nT("static.b280cz")}
                  </div>
                  <div className="mt-1 font-semibold text-slate-800">
                    {formatDateTime(approvalDetail.completed_at)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-4 text-lg font-semibold text-slate-800">
                {i18nT("static.1ibinx5")}{" "}
              </div>

              {approvalDetail.steps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  {i18nT("static.dlz1s5")}{" "}
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
                              value={i18nT("static.gvtlm5", {
                                p0: step.step_no,
                              })}
                              severity="info"
                            />
                            <Tag
                              value={step.status}
                              severity={getStatusSeverity(step.status)}
                            />
                          </div>

                          <div className="mt-3 text-sm text-slate-500">
                            {i18nT("static.1czzcoo")}{" "}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {step.approver_name ||
                              i18nT("static.iapzf0", {
                                p0: step.approver_employee_id,
                              })}
                          </div>
                        </div>

                        <div className="text-left md:text-right">
                          <div className="text-sm text-slate-500">
                            {i18nT("static.whiz93")}
                          </div>
                          <div className="font-semibold text-slate-800">
                            {step.acted_by_name || "-"}
                          </div>

                          <div className="mt-2 text-sm text-slate-500">
                            {i18nT("static.xvsntn")}{" "}
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
                {i18nT("static.17aougp")}{" "}
              </div>

              {approvalDetail.actions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  {i18nT("static.417q9p")}{" "}
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
                            {action.step_no
                              ? i18nT("static.vr06fy", { p0: action.step_no })
                              : ""}
                          </div>

                          <div className="text-sm text-slate-500">
                            {formatDateTime(action.acted_at)}
                          </div>
                        </div>

                        <div className="mt-1 text-sm text-slate-600">
                          {i18nT("static.n9pol0")}{" "}
                          {action.actor_name ||
                            i18nT("static.iapzf0", {
                              p0: action.actor_employee_id,
                            })}
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

      <Dialog
        header={i18nT("static.11qdseb")}
        visible={cancelDialogVisible}
        style={{ width: "95vw", maxWidth: "36rem" }}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
        closable={!isCancelling}
        closeOnEscape={!isCancelling}
        onHide={() => {
          if (isCancelling) return;
          setCancelDialogVisible(false);
          setSelectedData(null);
          setCancelReason("");
        }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label={i18nT("static.1l0xxoj")}
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={isCancelling}
              onClick={() => {
                setCancelDialogVisible(false);
                setSelectedData(null);
                setCancelReason("");
              }}
            />
            <Button
              type="button"
              label={i18nT("static.1oblt16")}
              icon="pi pi-ban"
              severity="warning"
              loading={isCancelling}
              disabled={isCancelling}
              onClick={() => void handleCancel()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3 pt-2">
          {selectedData && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {i18nT("static.ud7sx3")} {formatDate(selectedData.overtime_date)}?
            </div>
          )}
          <label
            htmlFor="selfCancelReason"
            className="text-sm font-medium text-slate-700"
          >
            {i18nT("static.1361ff2")} <span className="text-red-500">*</span>
          </label>
          <InputTextarea
            id="selfCancelReason"
            value={cancelReason}
            rows={5}
            autoResize
            maxLength={1000}
            disabled={isCancelling}
            className="w-full"
            placeholder={i18nT("static.1i2fmlc")}
            onChange={(event) => setCancelReason(event.target.value)}
          />
        </div>
      </Dialog>
    </>
  );
};

export default OvertimeRequestTableData;
