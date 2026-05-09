"use client";

import { ChangeEvent, useState } from "react";
import useSWR, { mutate } from "swr";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { InputSwitch } from "primereact/inputswitch";
import { Tag } from "primereact/tag";
import { Checkbox } from "primereact/checkbox";
import { Dropdown } from "primereact/dropdown";

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

import {
  createFingerprintScanner,
  updateFingerprintScanner,
  deleteFingerprintScanner,
  purgeFingerprintScanner,
  restoreFingerprintScanner,
  checkConnectionFingerprintScanner,
  syncFingerprintScannerAttendanceLog,
  AttendanceLogSyncResult,
  AttendanceLogSyncScannerResult,
  getAllUserListFingerprintScanner,
  FingerprintScannerUserInfoRow,
} from "@/app/services/fingerprintscanner-service";
import { FingerprintScanner } from "@/app/types/fingerprint-scanner";

const getBody = () => document.body;

const syncIntervalOptions = [
  { label: "Every 1 minute", value: 1 },
  { label: "Every 2 minutes", value: 2 },
  { label: "Every 5 minutes", value: 5 },
  { label: "Every 10 minutes", value: 10 },
  { label: "Every 15 minutes", value: 15 },
  { label: "Every 30 minutes", value: 30 },
  { label: "Every 60 minutes", value: 60 },
];

const emptyForm: FingerprintScanner = {
  id: 0,
  code: "",
  name: "",
  ip: "",
  port: "",
  password: "",

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

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const getSyncSeverity = (
  status?: string | null
): "success" | "secondary" | "info" | "warning" | "danger" => {
  const normalized = status?.toUpperCase();

  if (!normalized) return "secondary";
  if (normalized === "SUCCESS") return "success";
  if (normalized === "PARTIAL") return "warning";
  if (normalized === "FAILED") return "danger";

  return "info";
};

const getSyncLabel = (status?: string | null) => {
  const normalized = status?.toUpperCase();

  if (!normalized) return "Never Sync";
  if (normalized === "SUCCESS") return "Success";
  if (normalized === "PARTIAL") return "Partial";
  if (normalized === "FAILED") return "Failed";

  return normalized;
};

const FingerprintScannerTableData = () => {
  const dispatch = useDispatch();

  const [selectedData, setSelectedData] = useState<FingerprintScanner | null>(
    null
  );
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);
  const [checkLoadingId, setCheckLoadingId] = useState<number | null>(null);
  const [syncLoadingId, setSyncLoadingId] = useState<number | null>(null);
  const [syncResultDialog, setSyncResultDialog] = useState(false);
  const [syncResult, setSyncResult] =
    useState<AttendanceLogSyncResult | null>(null);
  const [userListLoadingId, setUserListLoadingId] = useState<number | null>(
    null
  );
  const [userListDialog, setUserListDialog] = useState(false);
  const [userListData, setUserListData] = useState<
    FingerprintScannerUserInfoRow[]
  >([]);
  const [userListScannerName, setUserListScannerName] = useState("");

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isValid },
    reset,
    clearErrors,
    watch,
  } = useForm<FingerprintScanner>({
    defaultValues: emptyForm,
    mode: "onChange",
  });

  const watchedAutoSyncEnabled = watch("auto_sync_enabled");

  const scannerKey = `/api/fingerprint-scanner?show_all=${isShowDeletedDataChecked}`;

  const {
    data: fingerprintScannerData,
    error,
    isLoading,
  } = useSWR<FingerprintScanner[]>(scannerKey, fetcher);

  const onGlobalFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const openNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Fingerprint Scanner");
    reset(emptyForm);

    setTimeout(() => setFocus("name"), 0);
  };

  const openEdit = (data: FingerprintScanner) => {
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Edit Fingerprint Scanner");
    reset({
      ...data,
      timezone_offset_minutes: data.timezone_offset_minutes ?? 420,
      auto_sync_enabled: data.auto_sync_enabled ?? true,
      sync_interval_minutes: data.sync_interval_minutes ?? 5,
      deleted_at: data.deleted_at ?? null,
    });

    setTimeout(() => setFocus("name"), 0);
  };

  const closeDialog = () => {
    setVisible(false);
    setSelectedData(null);
    reset(emptyForm);
  };

  const refreshList = async () => {
    await mutate(scannerKey);
  };

  const buildPayload = (data: FingerprintScanner): FingerprintScanner => {
    return {
      ...data,
      code: data.code?.trim() ?? "",
      name: data.name.trim(),
      ip: data.ip.trim(),
      port: String(data.port).trim(),
      password: data.password.trim(),
      timezone_offset_minutes: Number(data.timezone_offset_minutes ?? 420),
      auto_sync_enabled: !!data.auto_sync_enabled,
      sync_interval_minutes: Number(data.sync_interval_minutes ?? 5),
      is_active: !!data.is_active,
    };
  };

  const handleSubmitNew = async (data: FingerprintScanner) => {
    try {
      const payload = buildPayload(data);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createFingerprintScanner(payload);

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message || "Fingerprint scanner created successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handleUpdate = async (data: FingerprintScanner) => {
    if (!selectedData) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "error",
          detail: "Please select data",
        })
      );
      return;
    }

    try {
      const payload = buildPayload(data);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updateFingerprintScanner(
          selectedData.id,
          selectedData.row_version,
          payload
        );

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message || "Fingerprint scanner updated successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handleDelete = async (data: FingerprintScanner) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteFingerprintScanner(data.id, data.row_version);

      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message || "Fingerprint scanner deleted successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handlePurge = async (data: FingerprintScanner) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgeFingerprintScanner(data.id);

      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail:
            res.message || "Fingerprint scanner permanently deleted successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handleRestore = async (data: FingerprintScanner) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreFingerprintScanner(data.id, data.row_version);

      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message || "Fingerprint scanner restored successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          })
        );
      }
    }
  };

  const onClickCheckConnection = async (data: FingerprintScanner) => {
    try {
      setCheckLoadingId(data.id);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await checkConnectionFingerprintScanner(data);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message || "Fingerprint scanner is connected",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          })
        );
      }
    } finally {
      setCheckLoadingId(null);
    }
  };

  const onClickSyncScanner = async (data: FingerprintScanner) => {
    confirmDialog({
      message: `Sync attendance logs from ${data.name}?`,
      header: "Sync Fingerprint Scanner",
      icon: "pi pi-refresh",
      defaultFocus: "accept",
      accept: async () => {
        try {
          setSyncLoadingId(data.id);

          const res = await syncFingerprintScannerAttendanceLog(data.id);

          setSyncResult(res.data);
          setSyncResultDialog(true);

          await refreshList();

          dispatch(
            showToast({
              visible: true,
              severity: res.data.scanner_failed > 0 ? "error" : "success",
              summary: "Sync Finished",
              detail: res.data.message || res.message,
            })
          );
        } catch (err: unknown) {
          if (isResponseTypeError(err)) {
            dispatch(
              showToast({
                visible: true,
                severity: "error",
                summary: "error",
                detail: getErrorMessage(err, "message"),
              })
            );
          } else if (err instanceof Error) {
            dispatch(
              showToast({
                visible: true,
                severity: "error",
                summary: "error",
                detail: err.message,
              })
            );
          }
        } finally {
          setSyncLoadingId(null);
        }
      },
      reject: () => { },
    });
  };

  const onClickGetUserList = async (data: FingerprintScanner) => {
    try {
      setUserListLoadingId(data.id);
      setUserListScannerName(data.name);

      const res = await getAllUserListFingerprintScanner(data.id);

      setUserListData(res.data ?? []);
      setUserListDialog(true);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message || "Get user list successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          })
        );
      }
    } finally {
      setUserListLoadingId(null);
    }
  };

  const onSubmit = (data: FingerprintScanner) => {
    if (!isValid) return;

    if (isAddNew) {
      void handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      void handleUpdate(data);
    }
  };

  const onClickDelete = (data: FingerprintScanner) => {
    confirmDialog({
      message: "Do you want to delete this fingerprint scanner?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: () => void handleDelete(data),
    });
  };

  const onClickRestore = (data: FingerprintScanner) => {
    confirmDialog({
      message: "Do you want to restore this fingerprint scanner?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-success",
      accept: () => void handleRestore(data),
    });
  };

  const onClickPurge = (data: FingerprintScanner) => {
    confirmDialog({
      message: "Do you want to permanently delete this fingerprint scanner?",
      header: "Permanent Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => void handlePurge(data),
    });
  };

  const activeBodyTemplate = (rowData: FingerprintScanner) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  const deletedStatusBodyTemplate = (rowData: FingerprintScanner) => {
    return rowData.deleted_at ? (
      <Tag value="Deleted" severity="danger" />
    ) : (
      <Tag value="Normal" severity="info" />
    );
  };

  const syncStatusBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <Tag
        value={getSyncLabel(rowData.last_sync_status)}
        severity={getSyncSeverity(rowData.last_sync_status)}
      />
    );
  };

  const autoSyncBodyTemplate = (rowData: FingerprintScanner) => {
    return rowData.auto_sync_enabled ? (
      <Tag value="ON" severity="success" />
    ) : (
      <Tag value="OFF" severity="secondary" />
    );
  };

  const syncIntervalBodyTemplate = (rowData: FingerprintScanner) => {
    if (!rowData.auto_sync_enabled) {
      return <span className="text-sm text-slate-500">-</span>;
    }

    return (
      <span className="text-sm text-slate-700">
        Every {rowData.sync_interval_minutes ?? 5} min
      </span>
    );
  };

  const lastPullBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <span className="text-sm text-slate-700">
        {formatDateTime(rowData.last_pull_time)}
      </span>
    );
  };

  const lastSyncBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <span className="text-sm text-slate-700">
        {formatDateTime(rowData.last_sync_at)}
      </span>
    );
  };

  const lastSuccessBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <span className="text-sm text-slate-700">
        {formatDateTime(rowData.last_successful_sync_at)}
      </span>
    );
  };

  const timezoneBodyTemplate = (rowData: FingerprintScanner) => {
    return (
      <span className="text-sm text-slate-700">
        UTC{(rowData.timezone_offset_minutes ?? 420) >= 0 ? "+" : ""}
        {(rowData.timezone_offset_minutes ?? 420) / 60}
      </span>
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

  const actionBodyTemplate = (rowData: FingerprintScanner) => {
    if (rowData.deleted_at) {
      return (
        <div className="flex justify-center gap-2">
          <Button
            rounded
            severity="success"
            icon="pi pi-refresh"
            size="small"
            tooltip="Restore"
            tooltipOptions={{ appendTo: getBody, position: "top" }}
            onClick={() => onClickRestore(rowData)}
          />
          <Button
            rounded
            severity="secondary"
            icon="pi pi-times"
            size="small"
            tooltip="Delete Forever"
            tooltipOptions={{ appendTo: getBody, position: "top" }}
            onClick={() => onClickPurge(rowData)}
          />
        </div>
      );
    }

    return (
      <div className="flex justify-center gap-2">
        <Button
          rounded
          severity="info"
          icon="pi pi-wifi"
          size="small"
          loading={checkLoadingId === rowData.id}
          tooltip="Check Connection"
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          onClick={() => onClickCheckConnection(rowData)}
        />
        <Button
          rounded
          severity="success"
          icon="pi pi-sync"
          size="small"
          loading={syncLoadingId === rowData.id}
          tooltip="Sync This Scanner"
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          onClick={() => onClickSyncScanner(rowData)}
        />
        <Button
          rounded
          severity="warning"
          icon="pi pi-users"
          size="small"
          loading={userListLoadingId === rowData.id}
          tooltip="Get User List"
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          onClick={() => onClickGetUserList(rowData)}
        />
        <Button
          rounded
          severity="help"
          icon="pi pi-pencil"
          size="small"
          tooltip="Edit"
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          onClick={() => openEdit(rowData)}
        />
        <Button
          rounded
          severity="danger"
          icon="pi pi-trash"
          size="small"
          tooltip="Delete"
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  const syncDetailTable = () => {
    if (!syncResult) return null;

    return (
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Status</div>
            <div className="font-semibold text-slate-900">{syncResult.status}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Fetched</div>
            <div className="font-semibold text-slate-900">{syncResult.total_fetched}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Inserted</div>
            <div className="font-semibold text-slate-900">{syncResult.total_inserted}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Invalid Mapping</div>
            <div className="font-semibold text-slate-900">{syncResult.total_invalid_mapping}</div>
          </div>
        </div>

        <DataTable
          value={syncResult.details}
          scrollable
          tableStyle={{ minWidth: "80rem" }}
          emptyMessage="No sync detail"
        >
          <Column field="scanner_name" header="Scanner" style={{ minWidth: "14rem" }} />
          <Column field="status" header="Status" style={{ minWidth: "8rem" }} />
          <Column field="fetched" header="Fetched" style={{ minWidth: "8rem" }} />
          <Column field="after_filter" header="After Filter" style={{ minWidth: "8rem" }} />
          <Column field="inserted" header="Inserted" style={{ minWidth: "8rem" }} />
          <Column field="duplicate" header="Duplicate" style={{ minWidth: "8rem" }} />
          <Column field="invalid_mapping" header="Invalid Mapping" style={{ minWidth: "10rem" }} />
          <Column field="error_message" header="Error" style={{ minWidth: "18rem" }} />
          <Column field="suggestion" header="Suggestion" style={{ minWidth: "22rem" }} />
        </DataTable>
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;

  if (error) return <ErrorNotConnectedToApi mutateKey={scannerKey} />;

  return (
    <>
      <ConfirmDialog />

      <Card className="shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="border-b border-slate-200 pb-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold leading-tight text-slate-900">
                Fingerprint Scanner
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Manage fingerprint scanner devices and automatic attendance log sync.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:w-auto">
                  <Checkbox
                    inputId="showDeletedScanner"
                    checked={isShowDeletedDataChecked}
                    onChange={() => setIsShowDeletedDataChecked((prev) => !prev)}
                  />
                  <label
                    htmlFor="showDeletedScanner"
                    className="cursor-pointer text-sm text-slate-700"
                  >
                    Show deleted data
                  </label>
                </div>

                <IconField iconPosition="left" className="w-full sm:w-72">
                  <InputIcon className="pi pi-search" />
                  <InputText
                    className="w-full"
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Search scanner"
                  />
                </IconField>
              </div>

              <div className="flex w-full justify-start xl:w-auto xl:justify-end">
                <Button
                  className="w-full sm:w-auto"
                  label="New Scanner"
                  icon="pi pi-plus"
                  onClick={openNew}
                />
              </div>
            </div>
          </div>

          <DataTable
            value={fingerprintScannerData ?? []}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
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
            emptyMessage="No fingerprint scanner found."
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            scrollable
            stripedRows
            tableStyle={{ minWidth: "120rem" }}
          >
            <Column header="#" body={(_, options) => options.rowIndex + 1} style={{ width: "4rem" }} />
            <Column field="code" header="Code" style={{ minWidth: "9rem" }} />
            <Column field="name" header="Name" style={{ minWidth: "13rem" }} />
            <Column field="ip" header="IP" style={{ minWidth: "10rem" }} />
            <Column field="port" header="Port" style={{ minWidth: "7rem" }} />
            <Column header="Active" body={activeBodyTemplate} style={{ minWidth: "8rem" }} />
            <Column header="Auto Sync" body={autoSyncBodyTemplate} style={{ minWidth: "9rem" }} />
            <Column header="Interval" body={syncIntervalBodyTemplate} style={{ minWidth: "10rem" }} />
            <Column header="Timezone" body={timezoneBodyTemplate} style={{ minWidth: "9rem" }} />
            <Column header="Last Pull Time" body={lastPullBodyTemplate} style={{ minWidth: "14rem" }} />
            <Column header="Last Sync At" body={lastSyncBodyTemplate} style={{ minWidth: "14rem" }} />
            <Column header="Last Success" body={lastSuccessBodyTemplate} style={{ minWidth: "14rem" }} />
            <Column header="Sync Status" body={syncStatusBodyTemplate} style={{ minWidth: "10rem" }} />
            <Column header="Sync Error" body={syncErrorBodyTemplate} style={{ minWidth: "18rem" }} />
            <Column header="Data Status" body={deletedStatusBodyTemplate} style={{ minWidth: "9rem" }} />
            <Column
              header="Action"
              body={actionBodyTemplate}
              frozen
              alignFrozen="right"
              headerClassName="bg-white"
              className="bg-white"
              style={{ width: "18rem", minWidth: "18rem" }}
            />
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: "52rem", maxWidth: "95vw" }}
          onHide={closeDialog}
          onShow={() => setTimeout(() => setFocus("name"), 0)}
          breakpoints={{ "960px": "90vw", "640px": "96vw" }}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                label="Cancel"
                icon="pi pi-times"
                onClick={closeDialog}
                className="p-button-text"
              />
              <Button
                type="submit"
                label={isAddNew ? "Submit" : "Save"}
                icon="pi pi-check"
                disabled={!isValid}
              />
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Code
                  </label>
                  <InputText className="w-full" {...field} />
                </div>
              )}
            />

            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <InputText
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    {...field}
                  />
                  {fieldState.error && (
                    <small className="p-error">{fieldState.error.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="ip"
              control={control}
              rules={{ required: "IP is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    IP Address
                  </label>
                  <InputText
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    {...field}
                  />
                  {fieldState.error && (
                    <small className="p-error">{fieldState.error.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="port"
              control={control}
              rules={{ required: "Port is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Port
                  </label>
                  <InputText
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    {...field}
                  />
                  {fieldState.error && (
                    <small className="p-error">{fieldState.error.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="password"
              control={control}
              rules={{ required: "Com key/password is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Com Key / Password
                  </label>
                  <InputText
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    {...field}
                  />
                  {fieldState.error && (
                    <small className="p-error">{fieldState.error.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="timezone_offset_minutes"
              control={control}
              rules={{
                required: "Timezone offset is required",
                validate: (value) =>
                  Number(value) >= -840 && Number(value) <= 840
                    ? true
                    : "Timezone offset must be between -840 and 840 minutes",
              }}
              render={({ field, fieldState }) => (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Timezone Offset Minutes
                  </label>
                  <InputText
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    value={String(field.value ?? 420)}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                  <small className="text-slate-500">
                    WIB = 420, WITA = 480, WIT = 540.
                  </small>
                  {fieldState.error && (
                    <small className="p-error block">{fieldState.error.message}</small>
                  )}
                </div>
              )}
            />

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Auto Sync Settings
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    The backend worker checks every minute, but this scanner will only sync based on the selected interval.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Controller
                    name="auto_sync_enabled"
                    control={control}
                    render={({ field }) => (
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            Auto Sync Attendance Log
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Automatically pull attendance logs from this scanner.
                          </p>
                        </div>
                        <InputSwitch
                          checked={!!field.value}
                          onChange={(e) => field.onChange(e.value)}
                        />
                      </div>
                    )}
                  />

                  <Controller
                    name="sync_interval_minutes"
                    control={control}
                    rules={{
                      required: "Sync interval is required",
                      validate: (value) =>
                        Number(value) >= 1 && Number(value) <= 1440
                          ? true
                          : "Interval must be between 1 and 1440 minutes",
                    }}
                    render={({ field, fieldState }) => (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Sync Interval
                        </label>

                        <Dropdown
                          value={field.value}
                          options={syncIntervalOptions}
                          optionLabel="label"
                          optionValue="value"
                          placeholder="Select sync interval"
                          className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                          onChange={(e) => field.onChange(e.value)}
                          disabled={!watchedAutoSyncEnabled}
                        />

                        {fieldState.error && (
                          <small className="p-error">{fieldState.error.message}</small>
                        )}
                      </div>
                    )}
                  />
                </div>
              </div>
            </div>

            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Active Scanner
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Inactive scanners will not be used for manual or auto sync.
                      </p>
                    </div>
                    <InputSwitch
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.value)}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        </Dialog>
      </form>

      <Dialog
        header="Sync Result"
        visible={syncResultDialog}
        style={{ width: "72rem", maxWidth: "96vw" }}
        onHide={() => setSyncResultDialog(false)}
      >
        {syncDetailTable()}
      </Dialog>

      <Dialog
        header={`User List - ${userListScannerName}`}
        visible={userListDialog}
        style={{ width: "80rem", maxWidth: "96vw" }}
        onHide={() => setUserListDialog(false)}
      >
        <div className="flex flex-col gap-4">
          <DataTable
            value={userListData}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50, 100]}
            emptyMessage="No user data found"
            scrollable
            tableStyle={{ minWidth: "80rem" }}
          >
            <Column field="pin" header="PIN / PIN1" style={{ minWidth: "8rem" }} />
            <Column field="pin2" header="PIN2 / User ID" style={{ minWidth: "10rem" }} />
            <Column field="name" header="Name" style={{ minWidth: "14rem" }} />
            <Column field="privilege" header="Privilege" style={{ minWidth: "8rem" }} />
            <Column field="group" header="Group" style={{ minWidth: "8rem" }} />
            <Column field="card" header="Card" style={{ minWidth: "10rem" }} />
            <Column field="tz1" header="TZ1" style={{ minWidth: "8rem" }} />
            <Column field="tz2" header="TZ2" style={{ minWidth: "8rem" }} />
            <Column field="tz3" header="TZ3" style={{ minWidth: "8rem" }} />
          </DataTable>

          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Raw JSON
            </div>
            <pre className="max-h-80 overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs text-slate-100">
              {JSON.stringify(userListData, null, 2)}
            </pre>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default FingerprintScannerTableData;