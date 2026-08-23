"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { Tag } from "primereact/tag";
import { formatDateTimeWithSeconds } from "@/app/utils/date-format";

import { useDispatch } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  AttendanceLogSyncResult,
  AttendanceLogSyncScannerResult,
  checkConnectionFingerprintScanner,
  createFingerprintScanner,
  deleteFingerprintScanner,
  FingerprintScannerUserInfoRow,
  getAllUserListFingerprintScanner,
  purgeFingerprintScanner,
  restoreFingerprintScanner,
  syncFingerprintScannerAttendanceLog,
  updateFingerprintScanner,
} from "@/app/services/fingerprintscanner-service";

import { FingerprintScanner } from "@/app/types/fingerprint-scanner";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";

import { showToast } from "@/store/ToastSlice";

type ProcessingAction = "delete" | "restore" | "purge" | null;

const SYNC_INTERVAL_OPTIONS = [
  {
    label: "Every 1 minute",
    value: 1,
  },
  {
    label: "Every 2 minutes",
    value: 2,
  },
  {
    label: "Every 5 minutes",
    value: 5,
  },
  {
    label: "Every 10 minutes",
    value: 10,
  },
  {
    label: "Every 15 minutes",
    value: 15,
  },
  {
    label: "Every 30 minutes",
    value: 30,
  },
  {
    label: "Every 60 minutes",
    value: 60,
  },
];

const TIMEZONE_OPTIONS = [
  {
    label: "WIB (UTC+07:00)",
    value: 420,
  },
  {
    label: "WITA (UTC+08:00)",
    value: 480,
  },
  {
    label: "WIT (UTC+09:00)",
    value: 540,
  },
];

const EMPTY_FORM: FingerprintScanner = {
  id: 0,
  code: "",
  name: "",
  ip: "",
  port: "",
  password: "",
  has_password: false,

  last_pull_time: null,
  last_sync_at: null,
  last_sync_status: null,
  last_sync_error: null,
  last_successful_sync_at: null,

  timezone_offset_minutes: 420,

  auto_sync_enabled: true,
  sync_interval_minutes: 5,

  is_active: true,
  deleted_at: null,
  row_version: 0,
};

const PASSWORD_PASS_THROUGH = {
  root: {
    style: {
      width: "100%",
    },
  },
  iconField: {
    root: {
      style: {
        width: "100%",
      },
    },
  },
  input: {
    style: {
      width: "100%",
    },
  },
};

const getBody = () => document.body;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return formatDateTimeWithSeconds(value);
};

const formatTimezoneOffset = (value?: number | null) => {
  const totalMinutes = Number(value ?? 420);

  const sign = totalMinutes >= 0 ? "+" : "-";

  const absoluteMinutes = Math.abs(totalMinutes);

  const hours = Math.floor(absoluteMinutes / 60);

  const minutes = absoluteMinutes % 60;

  return `UTC${sign}${String(hours).padStart(2, "0")}:${String(
    minutes,
  ).padStart(2, "0")}`;
};

const getSyncSeverity = (
  status?: string | null,
): "success" | "secondary" | "info" | "warning" | "danger" => {
  const normalized = status?.toUpperCase();

  if (!normalized) {
    return "secondary";
  }

  if (normalized === "SUCCESS") {
    return "success";
  }

  if (normalized === "PARTIAL") {
    return "warning";
  }

  if (normalized === "FAILED") {
    return "danger";
  }

  return "info";
};

const getSyncLabel = (status?: string | null) => {
  const normalized = status?.toUpperCase();

  if (!normalized) {
    return "Never Synced";
  }

  if (normalized === "SUCCESS") {
    return "Success";
  }

  if (normalized === "PARTIAL") {
    return "Partial";
  }

  if (normalized === "FAILED") {
    return "Failed";
  }

  return normalized;
};

const FingerprintScannerTableData = () => {
  const dispatch = useDispatch();

  const archivedAccess = useArchivedDataAccess("master-data");

  const [selectedData, setSelectedData] = useState<FingerprintScanner | null>(
    null,
  );

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState({
    global: {
      value: "",
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const [isAddNew, setIsAddNew] = useState(false);

  const [visible, setVisible] = useState(false);

  const [popupHeaderTitle, setPopupHeaderTitle] = useState(
    "New Fingerprint Scanner",
  );

  const [isSaving, setIsSaving] = useState(false);

  const [processingRowId, setProcessingRowId] = useState<number | null>(null);

  const [processingAction, setProcessingAction] =
    useState<ProcessingAction>(null);

  const [checkLoadingId, setCheckLoadingId] = useState<number | null>(null);

  const [syncLoadingId, setSyncLoadingId] = useState<number | null>(null);

  const [userListLoadingId, setUserListLoadingId] = useState<number | null>(
    null,
  );

  const [syncResultDialog, setSyncResultDialog] = useState(false);

  const [syncResult, setSyncResult] = useState<AttendanceLogSyncResult | null>(
    null,
  );

  const [userListDialog, setUserListDialog] = useState(false);

  const [userListData, setUserListData] = useState<
    FingerprintScannerUserInfoRow[]
  >([]);

  const [userListScannerName, setUserListScannerName] = useState("");

  const [userListSearchValue, setUserListSearchValue] = useState("");

  const scannerKey = `/api/fingerprint-scanner?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`;

  const {
    data: fingerprintScannerData,
    error,
    isLoading,
    isValidating,
    mutate: refreshFingerprintScannerData,
  } = useSWR<FingerprintScanner[]>(scannerKey, fetcher);

  const { control, handleSubmit, setFocus, reset, clearErrors } =
    useForm<FingerprintScanner>({
      defaultValues: EMPTY_FORM,
      mode: "onTouched",
    });

  const watchedAutoSyncEnabled =
    useWatch({
      control,
      name: "auto_sync_enabled",
    }) ?? false;

  const isSuperadmin = archivedAccess.canShowDeleted;

  const isMutationRunning = processingRowId !== null;

  const isDeviceActionRunning =
    checkLoadingId !== null ||
    syncLoadingId !== null ||
    userListLoadingId !== null ||
    isMutationRunning;

  const filteredUserListData = useMemo(() => {
    const query = userListSearchValue.trim().toLowerCase();

    if (!query) {
      return userListData;
    }

    return userListData.filter((user) => {
      return [
        user.pin,
        user.pin2,
        user.name,
        user.privilege,
        user.group,
        user.card,
        user.tz1,
        user.tz2,
        user.tz3,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(query),
      );
    });
  }, [userListData, userListSearchValue]);

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

  const buildPayload = (data: FingerprintScanner): FingerprintScanner => {
    return {
      ...data,
      code: data.code?.trim() ?? "",
      name: data.name.trim(),
      ip: data.ip.trim(),
      port: String(data.port ?? "").trim(),
      password: data.password?.trim() ?? "",
      timezone_offset_minutes: Number(data.timezone_offset_minutes ?? 420),
      auto_sync_enabled: Boolean(data.auto_sync_enabled),
      sync_interval_minutes: Number(data.sync_interval_minutes ?? 5),
      is_active: Boolean(data.is_active),
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);

    setPopupHeaderTitle("New Fingerprint Scanner");

    clearErrors();
    reset(EMPTY_FORM);
  };

  const handleRefresh = async () => {
    try {
      await refreshFingerprintScannerData();
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

  const openNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);

    setPopupHeaderTitle("New Fingerprint Scanner");

    reset(EMPTY_FORM);
    setVisible(true);
  };

  const openEdit = (data: FingerprintScanner) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);

    setPopupHeaderTitle("Edit Fingerprint Scanner");

    reset({
      ...data,
      code: data.code ?? "",
      name: data.name ?? "",
      ip: data.ip ?? "",
      port: String(data.port ?? ""),
      password: "",
      timezone_offset_minutes: data.timezone_offset_minutes ?? 420,
      auto_sync_enabled: data.auto_sync_enabled ?? true,
      sync_interval_minutes: data.sync_interval_minutes ?? 5,
      is_active: data.is_active ?? true,
      deleted_at: data.deleted_at ?? null,
    });

    setVisible(true);
  };

  const handleSubmitNew = async (data: FingerprintScanner) => {
    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createFingerprintScanner(buildPayload(data));

      await refreshFingerprintScannerData();

      handleCloseDialog();

      showSuccess(
        response.message || "Fingerprint scanner created successfully.",
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: FingerprintScanner) => {
    if (!selectedData) {
      showError(new Error("Fingerprint scanner data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        ...buildPayload(data),
        row_version: selectedData.row_version,
      };

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updateFingerprintScanner(
          selectedData.id,
          selectedData.row_version,
          payload,
        );

      await refreshFingerprintScannerData();

      handleCloseDialog();

      showSuccess(
        response.message || "Fingerprint scanner updated successfully.",
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: FingerprintScanner) => {
    try {
      setProcessingRowId(data.id);
      setProcessingAction("delete");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteFingerprintScanner(data.id, data.row_version);

      await refreshFingerprintScannerData();

      showSuccess(
        response.message || "Fingerprint scanner deleted successfully.",
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleRestore = async (data: FingerprintScanner) => {
    try {
      setProcessingRowId(data.id);
      setProcessingAction("restore");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreFingerprintScanner(data.id, data.row_version);

      await refreshFingerprintScannerData();

      showSuccess(
        response.message || "Fingerprint scanner restored successfully.",
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handlePurge = async (data: FingerprintScanner) => {
    try {
      setProcessingRowId(data.id);
      setProcessingAction("purge");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgeFingerprintScanner(data.id);

      await refreshFingerprintScannerData();

      showSuccess(
        response.message || "Fingerprint scanner permanently deleted.",
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleCheckConnection = async (data: FingerprintScanner) => {
    try {
      setCheckLoadingId(data.id);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await checkConnectionFingerprintScanner(data);

      showSuccess(
        response.message || "Fingerprint scanner connection is available.",
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setCheckLoadingId(null);
    }
  };

  const handleSyncScanner = async (data: FingerprintScanner) => {
    try {
      setSyncLoadingId(data.id);

      const response = await syncFingerprintScannerAttendanceLog(data.id);

      if (!response.data?.job_id) {
        throw new Error("The synchronization job was not created.");
      }

      await refreshFingerprintScannerData();

      dispatch(
        showToast({
          visible: true,
          severity: "info",
          summary: response.data.deduplicated
            ? "Sync Already Queued"
            : "Sync Queued",
          detail: `${response.message || "Attendance log synchronization was queued."} For details, go to Settings → Background Jobs.`,
        }),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setSyncLoadingId(null);
    }
  };

  const handleGetUserList = async (data: FingerprintScanner) => {
    try {
      setUserListLoadingId(data.id);

      const response = await getAllUserListFingerprintScanner(data.id);

      setUserListScannerName(data.name);

      setUserListData(response.data ?? []);

      setUserListSearchValue("");
      setUserListDialog(true);

      showSuccess(
        response.message ||
          "Fingerprint scanner user list loaded successfully.",
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setUserListLoadingId(null);
    }
  };

  const onSubmit = async (data: FingerprintScanner) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: FingerprintScanner) => {
    requestActionConfirmation({
      header: "Delete Fingerprint Scanner",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this fingerprint scanner?
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>

          <span className="font-mono text-xs text-slate-500">
            {data.ip}:{data.port}
          </span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => {
        void handleDelete(data);
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
            label="Delete"
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: FingerprintScanner) => {
    requestActionConfirmation({
      header: "Restore Fingerprint Scanner",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this fingerprint scanner?
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>
        </div>
      ),
      icon: "pi pi-refresh",
      defaultFocus: "accept",
      accept: () => {
        void handleRestore(data);
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
            label="Restore"
            icon="pi pi-refresh"
            severity="success"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickPurge = (data: FingerprintScanner) => {
    requestActionConfirmation({
      header: "Delete Fingerprint Scanner Permanently",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            This action cannot be undone. Permanently delete:
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>

          <span className="font-mono text-xs text-slate-500">
            {data.ip}:{data.port}
          </span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => {
        void handlePurge(data);
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
            label="Delete Permanently"
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const onClickSyncScanner = (data: FingerprintScanner) => {
    requestActionConfirmation({
      header: "Sync Fingerprint Scanner",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Pull attendance logs from this fingerprint scanner now?
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>

          <span className="font-mono text-xs text-slate-500">
            {data.ip}:{data.port}
          </span>
        </div>
      ),
      icon: "pi pi-sync",
      defaultFocus: "reject",
      accept: () => {
        void handleSyncScanner(data);
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
            label="Start Sync"
            icon="pi pi-sync"
            severity="success"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const deviceStatusBodyTemplate = (rowData: FingerprintScanner) => {
    if (rowData.deleted_at) {
      return (
        <Tag value="Deleted" severity="secondary" icon="pi pi-trash" rounded />
      );
    }

    if (rowData.is_active) {
      return (
        <Tag
          value="Active"
          severity="success"
          icon="pi pi-check-circle"
          rounded
        />
      );
    }

    return (
      <Tag
        value="Inactive"
        severity="warning"
        icon="pi pi-minus-circle"
        rounded
      />
    );
  };

  const credentialStatusBodyTemplate = (rowData: FingerprintScanner) => (
    <Tag
      value={rowData.has_password ? "Configured" : "Missing"}
      severity={rowData.has_password ? "success" : "danger"}
      icon={rowData.has_password ? "pi pi-lock" : "pi pi-exclamation-triangle"}
      rounded
    />
  );

  const autoSyncBodyTemplate = (rowData: FingerprintScanner) => {
    if (!rowData.auto_sync_enabled) {
      return <Tag value="Off" severity="secondary" rounded />;
    }

    return <Tag value="On" severity="success" icon="pi pi-check" rounded />;
  };

  const syncIntervalBodyTemplate = (rowData: FingerprintScanner) => {
    if (!rowData.auto_sync_enabled) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span className="whitespace-nowrap text-sm text-slate-700">
        Every {rowData.sync_interval_minutes ?? 5} min
      </span>
    );
  };

  const timezoneBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <span className="whitespace-nowrap font-mono text-sm text-slate-700">
        {formatTimezoneOffset(rowData.timezone_offset_minutes)}
      </span>
    );
  };

  const lastPullBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <span className="whitespace-nowrap text-sm text-slate-700">
        {formatDateTime(rowData.last_pull_time)}
      </span>
    );
  };

  const lastSyncBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <span className="whitespace-nowrap text-sm text-slate-700">
        {formatDateTime(rowData.last_sync_at)}
      </span>
    );
  };

  const lastSuccessBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <span className="whitespace-nowrap text-sm text-slate-700">
        {formatDateTime(rowData.last_successful_sync_at)}
      </span>
    );
  };

  const syncStatusBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <Tag
        value={getSyncLabel(rowData.last_sync_status)}
        severity={getSyncSeverity(rowData.last_sync_status)}
        rounded
      />
    );
  };

  const syncErrorBodyTemplate = (rowData: FingerprintScanner) => {
    if (!rowData.last_sync_error) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span
        className="block max-w-xs truncate text-sm text-red-600"
        title={rowData.last_sync_error}
      >
        {rowData.last_sync_error}
      </span>
    );
  };

  const connectionBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="font-mono text-sm font-medium text-slate-700">
          {rowData.ip}:{rowData.port}
        </span>

        <span className="text-xs text-slate-500">
          {formatTimezoneOffset(rowData.timezone_offset_minutes)}
        </span>
      </div>
    );
  };

  const actionBodyTemplate = (rowData: FingerprintScanner) => {
    const isDeleted = Boolean(rowData.deleted_at);

    const isCurrentMutation = processingRowId === rowData.id;

    if (isDeleted) {
      if (!isSuperadmin) {
        return <span className="text-sm text-slate-400">No action</span>;
      }

      return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {archivedAccess.canRestore && (
            <Button
              type="button"
              icon="pi pi-refresh"
              rounded
              outlined
              severity="success"
              size="small"
              tooltip="Restore"
              tooltipOptions={{
                appendTo: getBody,
                position: "top",
              }}
              loading={isCurrentMutation && processingAction === "restore"}
              disabled={isDeviceActionRunning}
              onClick={() => onClickRestore(rowData)}
            />
          )}

          {archivedAccess.canPurge && (
            <Button
              type="button"
              icon="pi pi-trash"
              rounded
              outlined
              severity="danger"
              size="small"
              tooltip="Delete permanently"
              tooltipOptions={{
                appendTo: getBody,
                position: "top",
              }}
              loading={isCurrentMutation && processingAction === "purge"}
              disabled={isDeviceActionRunning}
              onClick={() => onClickPurge(rowData)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <Button
          type="button"
          icon="pi pi-wifi"
          rounded
          outlined
          severity="info"
          size="small"
          loading={checkLoadingId === rowData.id}
          disabled={isDeviceActionRunning}
          tooltip="Check connection"
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => {
            void handleCheckConnection(rowData);
          }}
        />

        <Button
          type="button"
          icon="pi pi-sync"
          rounded
          outlined
          severity="success"
          size="small"
          loading={syncLoadingId === rowData.id}
          disabled={isDeviceActionRunning || !rowData.is_active}
          tooltip={
            rowData.is_active
              ? "Sync attendance logs"
              : "Activate scanner before syncing"
          }
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => onClickSyncScanner(rowData)}
        />

        <Button
          type="button"
          icon="pi pi-users"
          rounded
          outlined
          severity="warning"
          size="small"
          loading={userListLoadingId === rowData.id}
          disabled={isDeviceActionRunning || !rowData.is_active}
          tooltip={
            rowData.is_active
              ? "Get scanner user list"
              : "Activate scanner before loading users"
          }
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => {
            void handleGetUserList(rowData);
          }}
        />

        <Button
          type="button"
          icon="pi pi-pencil"
          rounded
          outlined
          severity="secondary"
          size="small"
          disabled={isDeviceActionRunning}
          tooltip="Edit"
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => openEdit(rowData)}
        />

        <Button
          type="button"
          icon="pi pi-trash"
          rounded
          outlined
          severity="danger"
          size="small"
          disabled={isDeviceActionRunning}
          tooltip="Delete"
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  const syncDetailStatusBody = (rowData: AttendanceLogSyncScannerResult) => {
    return (
      <Tag
        value={getSyncLabel(rowData.status)}
        severity={getSyncSeverity(rowData.status)}
        rounded
      />
    );
  };

  const syncDetailErrorBody = (rowData: AttendanceLogSyncScannerResult) => {
    if (!rowData.error_message) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span
        className="block max-w-sm whitespace-normal text-sm text-red-600"
        title={rowData.error_message}
      >
        {rowData.error_message}
      </span>
    );
  };

  const syncDetailSuggestionBody = (
    rowData: AttendanceLogSyncScannerResult,
  ) => {
    if (!rowData.suggestion) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span className="block max-w-md whitespace-normal text-sm text-slate-600">
        {rowData.suggestion}
      </span>
    );
  };

  const dialogFooter = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        text
        severity="secondary"
        disabled={isSaving}
        className="w-full sm:w-auto"
        onClick={handleCloseDialog}
      />

      <Button
        type="submit"
        form="fingerprint-scanner-form"
        label={isAddNew ? "Create Scanner" : "Save Changes"}
        icon="pi pi-check"
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
    return <ErrorNotConnectedToApi mutateKey={scannerKey} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Page Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-desktop text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Fingerprint Scanner
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage fingerprint devices, connection settings, attendance
                  log synchronization, and scanner users.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                label="Refresh"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isValidating}
                disabled={isValidating || isDeviceActionRunning}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />

              <Button
                type="button"
                label="New Scanner"
                icon="pi pi-plus"
                size="small"
                disabled={isDeviceActionRunning}
                className="w-full sm:w-auto"
                onClick={openNew}
              />
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {archivedAccess.canShowDeleted && (
              <div className="flex items-center gap-2">
                <Checkbox
                  inputId="showDeletedScanner"
                  checked={isShowDeletedDataChecked}
                  onChange={(event) =>
                    setIsShowDeletedDataChecked(Boolean(event.checked))
                  }
                />

                <label
                  htmlFor="showDeletedScanner"
                  className="cursor-pointer select-none text-sm text-slate-600"
                >
                  Show deleted records
                </label>
              </div>
            )}

            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />

              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder="Search scanner, IP, or sync status"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Scanner Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={fingerprintScannerData ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "code",
                "name",
                "ip",
                "port",
                "last_sync_status",
                "last_sync_error",
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
                minWidth: "126rem",
              }}
              emptyMessage="No fingerprint scanner data found."
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
                field="code"
                header="Code"
                sortable
                style={{
                  minWidth: "10rem",
                }}
                body={(rowData: FingerprintScanner) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {rowData.code || "-"}
                  </span>
                )}
              />

              <Column
                field="name"
                header="Scanner Name"
                sortable
                style={{
                  minWidth: "17rem",
                }}
                body={(rowData: FingerprintScanner) => (
                  <span className="font-medium text-slate-800">
                    {rowData.name}
                  </span>
                )}
              />

              <Column
                field="ip"
                header="Connection"
                sortable
                body={connectionBodyTemplate}
                style={{
                  minWidth: "16rem",
                }}
              />

              <Column
                field="is_active"
                header="Device Status"
                sortable
                body={deviceStatusBodyTemplate}
                style={{
                  minWidth: "11rem",
                }}
              />

              <Column
                field="has_password"
                header="Credential"
                body={credentialStatusBodyTemplate}
                style={{
                  minWidth: "11rem",
                }}
              />

              <Column
                field="auto_sync_enabled"
                header="Auto Sync"
                sortable
                body={autoSyncBodyTemplate}
                style={{
                  minWidth: "10rem",
                }}
              />

              <Column
                field="sync_interval_minutes"
                header="Sync Interval"
                sortable
                body={syncIntervalBodyTemplate}
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="timezone_offset_minutes"
                header="Timezone"
                sortable
                body={timezoneBodyTemplate}
                style={{
                  minWidth: "10rem",
                }}
              />

              <Column
                field="last_pull_time"
                header="Last Pull"
                sortable
                body={lastPullBodyTemplate}
                style={{
                  minWidth: "15rem",
                }}
              />

              <Column
                field="last_sync_at"
                header="Last Sync"
                sortable
                body={lastSyncBodyTemplate}
                style={{
                  minWidth: "15rem",
                }}
              />

              <Column
                field="last_successful_sync_at"
                header="Last Successful Sync"
                sortable
                body={lastSuccessBodyTemplate}
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="last_sync_status"
                header="Sync Status"
                sortable
                body={syncStatusBodyTemplate}
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="last_sync_error"
                header="Last Sync Error"
                body={syncErrorBodyTemplate}
                style={{
                  minWidth: "20rem",
                }}
              />

              <Column
                header="Action"
                body={actionBodyTemplate}
                frozen
                alignFrozen="right"
                headerClassName="bg-white"
                className="bg-white"
                headerStyle={{
                  width: "17rem",
                  minWidth: "17rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "17rem",
                  minWidth: "17rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* Scanner Form Dialog */}
      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{
          width: "95vw",
          maxWidth: "56rem",
        }}
        breakpoints={{
          "960px": "90vw",
          "640px": "95vw",
        }}
        footer={dialogFooter}
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!isSaving}
        closable={!isSaving}
        onHide={handleCloseDialog}
        onShow={() => {
          setTimeout(() => {
            setFocus("name");
          }, 0);
        }}
      >
        <form
          id="fingerprint-scanner-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 pt-2"
        >
          {/* Device Information */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Device Information
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                Configure the scanner identity and network connection.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="code"
                  className="text-sm font-medium text-slate-700"
                >
                  Scanner Code
                </label>

                <Controller
                  name="code"
                  control={control}
                  rules={{
                    maxLength: {
                      value: 50,
                      message: "Scanner code cannot exceed 50 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="code"
                        autoComplete="off"
                        placeholder="Example: SCN-01"
                        disabled={isSaving}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                      />

                      {fieldState.error ? (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      ) : (
                        <small className="text-slate-500">
                          Optional unique device code.
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-slate-700"
                >
                  Scanner Name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="name"
                  control={control}
                  rules={{
                    required: "Scanner name is required.",
                    maxLength: {
                      value: 100,
                      message: "Scanner name cannot exceed 100 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="name"
                        autoComplete="off"
                        placeholder="Example: Main Office Scanner"
                        disabled={isSaving}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="ip"
                  className="text-sm font-medium text-slate-700"
                >
                  IP Address
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="ip"
                  control={control}
                  rules={{
                    required: "IP address is required.",
                    validate: {
                      noSpaces: (value) =>
                        !/\s/.test(value) ||
                        "IP address must not contain spaces.",
                    },
                    maxLength: {
                      value: 255,
                      message: "IP address cannot exceed 255 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="ip"
                        autoComplete="off"
                        placeholder="Example: 192.168.1.100"
                        disabled={isSaving}
                        className={`w-full font-mono ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="port"
                  className="text-sm font-medium text-slate-700"
                >
                  Port
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="port"
                  control={control}
                  rules={{
                    required: "Port is required.",
                    validate: {
                      numeric: (value) =>
                        /^\d+$/.test(String(value)) ||
                        "Port must contain numbers only.",
                      range: (value) => {
                        const port = Number(value);

                        return (
                          (port >= 1 && port <= 65535) ||
                          "Port must be between 1 and 65535."
                        );
                      },
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={String(field.value ?? "")}
                        id="port"
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="Example: 4370"
                        disabled={isSaving}
                        className={`w-full font-mono ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-slate-700"
                >
                  Communication Key
                  {isAddNew && <span className="ml-1 text-red-500">*</span>}
                </label>

                <Controller
                  name="password"
                  control={control}
                  rules={{
                    required: isAddNew
                      ? "Communication key is required."
                      : false,
                    maxLength: {
                      value: 100,
                      message:
                        "Communication key cannot exceed 100 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Password
                        id="password"
                        value={field.value ?? ""}
                        feedback={false}
                        toggleMask
                        autoComplete="off"
                        placeholder={
                          isAddNew
                            ? "Enter scanner communication key"
                            : "Leave blank to keep the configured key"
                        }
                        disabled={isSaving}
                        inputClassName="w-full"
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        pt={PASSWORD_PASS_THROUGH}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(event.target.value)}
                      />

                      {fieldState.error && (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      )}

                      {!isAddNew && !fieldState.error && (
                        <small className="text-slate-500">
                          {selectedData?.has_password
                            ? "Leave blank to keep the configured key."
                            : "Set a communication key to connect to this scanner."}
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="timezone_offset_minutes"
                  className="text-sm font-medium text-slate-700"
                >
                  Timezone Offset
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="timezone_offset_minutes"
                  control={control}
                  rules={{
                    required: "Timezone offset is required.",
                    validate: (value) =>
                      TIMEZONE_OPTIONS.some(
                        (option) => option.value === Number(value),
                      ) || "Select a valid Indonesian timezone.",
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="timezone_offset_minutes"
                        appendTo={getBody}
                        value={Number(field.value ?? 420)}
                        options={TIMEZONE_OPTIONS}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select timezone"
                        disabled={isSaving}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        onBlur={field.onBlur}
                        onChange={(event) => field.onChange(event.value)}
                      />

                      {fieldState.error ? (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      ) : (
                        <small className="text-slate-500">
                          Pilih timezone sesuai lokasi mesin fingerprint.
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Synchronization */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Synchronization
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                Configure automatic attendance log synchronization for this
                scanner.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="auto_sync_enabled"
                  control={control}
                  defaultValue
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="auto_sync_enabled"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          Automatic Sync
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          Pull attendance logs automatically according to the
                          configured interval.
                        </p>
                      </div>

                      <InputSwitch
                        inputId="auto_sync_enabled"
                        checked={Boolean(field.value)}
                        disabled={isSaving}
                        onChange={(event) => field.onChange(event.value)}
                      />
                    </div>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label
                  htmlFor="sync_interval_minutes"
                  className="text-sm font-medium text-slate-700"
                >
                  Sync Interval
                  {watchedAutoSyncEnabled && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>

                <Controller
                  name="sync_interval_minutes"
                  control={control}
                  rules={{
                    validate: (value) => {
                      if (!watchedAutoSyncEnabled) {
                        return true;
                      }

                      const interval = Number(value);

                      return (
                        (interval >= 1 && interval <= 1440) ||
                        "Sync interval must be between 1 and 1440 minutes."
                      );
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="sync_interval_minutes"
                        appendTo={getBody}
                        value={field.value ?? 5}
                        options={SYNC_INTERVAL_OPTIONS}
                        optionLabel="label"
                        optionValue="value"
                        placeholder="Select sync interval"
                        disabled={isSaving || !watchedAutoSyncEnabled}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        onChange={(event) => field.onChange(event.value)}
                      />

                      {fieldState.error ? (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      ) : (
                        <small className="text-slate-500">
                          The worker may check frequently, but this scanner only
                          synchronizes at the selected interval.
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Device Status */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <Controller
              name="is_active"
              control={control}
              defaultValue
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <label
                      htmlFor="is_active"
                      className="cursor-pointer text-sm font-medium text-slate-700"
                    >
                      Active Scanner
                    </label>

                    <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                      Inactive scanners are excluded from manual attendance
                      synchronization and automatic synchronization.
                    </p>
                  </div>

                  <InputSwitch
                    inputId="is_active"
                    checked={Boolean(field.value)}
                    disabled={isSaving}
                    onChange={(event) => field.onChange(event.value)}
                  />
                </div>
              )}
            />
          </div>
        </form>
      </Dialog>

      {/* Sync Result Dialog */}
      <Dialog
        header="Attendance Log Sync Result"
        visible={syncResultDialog}
        style={{
          width: "96vw",
          maxWidth: "76rem",
        }}
        breakpoints={{
          "960px": "95vw",
        }}
        modal
        draggable={false}
        resizable={false}
        onHide={() => {
          setSyncResultDialog(false);
          setSyncResult(null);
        }}
      >
        {!syncResult ? (
          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <i className="pi pi-info-circle mt-0.5" />

            <span>No synchronization result is available.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="m-0 text-xs text-slate-500">Status</p>

                <div className="mt-2">
                  <Tag
                    value={getSyncLabel(syncResult.status)}
                    severity={getSyncSeverity(syncResult.status)}
                    rounded
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="m-0 text-xs text-slate-500">Fetched</p>

                <p className="m-0 mt-2 text-2xl font-semibold text-slate-800">
                  {syncResult.total_fetched}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="m-0 text-xs text-slate-500">Inserted</p>

                <p className="m-0 mt-2 text-2xl font-semibold text-slate-800">
                  {syncResult.total_inserted}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="m-0 text-xs text-slate-500">Invalid Mapping</p>

                <p className="m-0 mt-2 text-2xl font-semibold text-slate-800">
                  {syncResult.total_invalid_mapping}
                </p>
              </div>
            </div>

            {syncResult.message && (
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                <i className="pi pi-info-circle mt-0.5" />

                <span>{syncResult.message}</span>
              </div>
            )}

            <div className="w-full overflow-hidden rounded-xl border border-slate-200">
              <DataTable
                value={syncResult.details ?? []}
                dataKey="scanner_name"
                scrollable
                stripedRows
                rowHover
                responsiveLayout="scroll"
                size="small"
                tableStyle={{
                  minWidth: "88rem",
                }}
                emptyMessage="No scanner synchronization details found."
              >
                <Column
                  field="scanner_name"
                  header="Scanner"
                  style={{
                    minWidth: "16rem",
                  }}
                />

                <Column
                  field="status"
                  header="Status"
                  body={syncDetailStatusBody}
                  style={{
                    minWidth: "10rem",
                  }}
                />

                <Column
                  field="fetched"
                  header="Fetched"
                  style={{
                    minWidth: "8rem",
                  }}
                />

                <Column
                  field="after_filter"
                  header="After Filter"
                  style={{
                    minWidth: "10rem",
                  }}
                />

                <Column
                  field="inserted"
                  header="Inserted"
                  style={{
                    minWidth: "8rem",
                  }}
                />

                <Column
                  field="duplicate"
                  header="Duplicate"
                  style={{
                    minWidth: "9rem",
                  }}
                />

                <Column
                  field="invalid_mapping"
                  header="Invalid Mapping"
                  style={{
                    minWidth: "11rem",
                  }}
                />

                <Column
                  field="error_message"
                  header="Error"
                  body={syncDetailErrorBody}
                  style={{
                    minWidth: "20rem",
                  }}
                />

                <Column
                  field="suggestion"
                  header="Suggestion"
                  body={syncDetailSuggestionBody}
                  style={{
                    minWidth: "24rem",
                  }}
                />
              </DataTable>
            </div>
          </div>
        )}
      </Dialog>

      {/* Scanner User List Dialog */}
      <Dialog
        header={`Scanner Users — ${userListScannerName}`}
        visible={userListDialog}
        style={{
          width: "96vw",
          maxWidth: "80rem",
        }}
        breakpoints={{
          "960px": "95vw",
        }}
        modal
        draggable={false}
        resizable={false}
        onHide={() => {
          setUserListDialog(false);
          setUserListData([]);
          setUserListSearchValue("");
          setUserListScannerName("");
        }}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Registered Scanner Users
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {filteredUserListData.length} of {userListData.length} user
                records shown.
              </p>
            </div>

            <IconField iconPosition="left" className="w-full sm:w-80">
              <InputIcon className="pi pi-search" />

              <InputText
                value={userListSearchValue}
                placeholder="Search PIN, name, card, or group"
                className="w-full"
                onChange={(event) => setUserListSearchValue(event.target.value)}
              />
            </IconField>
          </div>

          <div className="w-full overflow-hidden rounded-xl border border-slate-200">
            <DataTable
              value={filteredUserListData}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50, 100]}
              scrollable
              stripedRows
              rowHover
              responsiveLayout="scroll"
              size="small"
              tableStyle={{
                minWidth: "82rem",
              }}
              emptyMessage="No scanner user data found."
              currentPageReportTemplate="{first} to {last} of {totalRecords}"
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            >
              <Column
                field="pin"
                header="PIN / PIN1"
                style={{
                  minWidth: "10rem",
                }}
              />

              <Column
                field="pin2"
                header="PIN2 / User ID"
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="name"
                header="Name"
                style={{
                  minWidth: "17rem",
                }}
              />

              <Column
                field="privilege"
                header="Privilege"
                style={{
                  minWidth: "10rem",
                }}
              />

              <Column
                field="group"
                header="Group"
                style={{
                  minWidth: "10rem",
                }}
              />

              <Column
                field="card"
                header="Card"
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="tz1"
                header="TZ1"
                style={{
                  minWidth: "9rem",
                }}
              />

              <Column
                field="tz2"
                header="TZ2"
                style={{
                  minWidth: "9rem",
                }}
              />

              <Column
                field="tz3"
                header="TZ3"
                style={{
                  minWidth: "9rem",
                }}
              />
            </DataTable>
          </div>

          <details className="rounded-xl border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
              View Raw JSON
            </summary>

            <div className="border-t border-slate-200 p-4">
              <pre className="m-0 max-h-80 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(userListData, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      </Dialog>
    </>
  );
};

export default FingerprintScannerTableData;
