"use client";

import { useState } from "react";
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

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { ResponseType, ResponseTypeCreateSuccess } from "@/app/types/response-type";
import { isResponseTypeError, getErrorMessage } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

import {
  createFingerprintScanner,
  updateFingerprintScanner,
  deleteFingerprintScanner,
  purgeFingerprintScanner,
  restoreFingerprintScanner,
  checkConnectionFingerprintScanner,
} from "@/app/services/fingerprintscanner-service";
import { FingerprintScanner } from "@/app/types/fingerprint-scanner";

const getBody = () => document.body;

const emptyForm: FingerprintScanner = {
  id: 0,
  code: "",
  name: "",
  ip: "",
  port: "",
  password: "",
  is_active: true,
  deleted_at: null,
  row_version: 0,
};

const FingerprintScannerTableData = () => {
  const dispatch = useDispatch();

  const [selectedData, setSelectedData] = useState<FingerprintScanner | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [checkLoadingId, setCheckLoadingId] = useState<number | null>(null);

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isValid },
    reset,
    clearErrors,
  } = useForm<FingerprintScanner>({
    defaultValues: emptyForm,
    mode: "onChange",
  });

  const scannerKey = `/api/fingerprint-scanner?show_all=${isShowDeletedDataChecked}`;

  const {
    data: fingerprintScannerData,
    error,
    isLoading,
  } = useSWR<FingerprintScanner[]>(scannerKey, fetcher);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const nextFilters = { ...filters };
    nextFilters.global.value = value;

    setFilters(nextFilters);
    setGlobalFilterValue(value);
  };

  const openNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Fingerprint Scanner");
    reset(emptyForm);

    setTimeout(() => {
      setFocus("name");
    }, 0);
  };

  const openEdit = (data: FingerprintScanner) => {
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Edit Fingerprint Scanner");
    reset({
      ...data,
      deleted_at: data.deleted_at ?? null,
    });
  };

  const closeDialog = () => {
    setVisible(false);
    setSelectedData(null);
    reset(emptyForm);
  };

  const refreshList = async () => {
    await mutate(scannerKey);
  };

  const handleSubmitNew = async (data: FingerprintScanner) => {
    try {
      const payload: FingerprintScanner = {
        ...data,
        port: String(data.port).trim(),
        code: data.code?.trim() ?? "",
        name: data.name.trim(),
        ip: data.ip.trim(),
        password: data.password.trim(),
      };

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createFingerprintScanner(payload);

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message,
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
          detail: "please select data",
        })
      );
      return;
    }

    try {
      const payload: FingerprintScanner = {
        ...data,
        port: String(data.port).trim(),
        code: data.code?.trim() ?? "",
        name: data.name.trim(),
        ip: data.ip.trim(),
        password: data.password.trim(),
      };

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
          detail: res.message,
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
          detail: res.message,
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
          detail: res.message,
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
          detail: res.message,
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
          detail: res.message,
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
      accept: () => {
        void handleDelete(data);
      },
    });
  };

  const onClickRestore = (data: FingerprintScanner) => {
    confirmDialog({
      message: "Do you want to restore this fingerprint scanner?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-success",
      accept: () => {
        void handleRestore(data);
      },
    });
  };

  const onClickPurge = (data: FingerprintScanner) => {
    confirmDialog({
      message: "Do you want to permanently delete this fingerprint scanner?",
      header: "Permanent Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handlePurge(data);
      },
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

  const actionColumnBody = (rowData: FingerprintScanner) => {
    if (rowData.deleted_at) {
      return (
        <div className="flex gap-2">
          <Button
            rounded
            severity="success"
            icon="pi pi-refresh"
            size="small"
            tooltip="Restore"
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            onClick={() => onClickRestore(rowData)}
          />
          <Button
            rounded
            severity="secondary"
            icon="pi pi-times"
            size="small"
            tooltip="Delete Forever"
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            onClick={() => onClickPurge(rowData)}
          />
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Button
          rounded
          severity="danger"
          icon="pi pi-trash"
          size="small"
          tooltip="Delete"
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          onClick={() => onClickDelete(rowData)}
        />

        <Button
          rounded
          severity="help"
          icon="pi pi-pencil"
          size="small"
          tooltip="Edit"
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          onClick={() => openEdit(rowData)}
        />

        <Button
          rounded
          severity="warning"
          icon="pi pi-bolt"
          size="small"
          tooltip="Check Connection"
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          loading={checkLoadingId === rowData.id}
          onClick={() => void onClickCheckConnection(rowData)}
        />
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey="/api/fingerprint-scanner?show_all=true" />;
  }

  return (
    <>
      <ConfirmDialog />

      <Card className="shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Fingerprint Scanner
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage fingerprint scanner device master data and check device connectivity.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Checkbox
                  inputId="showDeletedData"
                  checked={isShowDeletedDataChecked}
                  onChange={() => setIsShowDeletedDataChecked((prev) => !prev)}
                />
                <label
                  htmlFor="showDeletedData"
                  className="cursor-pointer text-sm text-slate-700"
                >
                  Show deleted data
                </label>
              </div>

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="w-full sm:w-64"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search scanner"
                />
              </IconField>

              <Button
                label="New Scanner"
                icon="pi pi-plus"
                onClick={openNew}
              />
            </div>
          </div>

          <DataTable
            value={fingerprintScannerData}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={["code", "name", "ip", "port"]}
            emptyMessage="No fingerprint scanner found."
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
            scrollable
            tableStyle={{ minWidth: "68rem" }}
            stripedRows
          >
            <Column
              style={{ width: "1rem" }}
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(_, options) => options.rowIndex + 1}
            />
            <Column field="code" header="Code" style={{ minWidth: "10rem" }} />
            <Column field="name" header="Name" style={{ minWidth: "14rem" }} />
            <Column field="ip" header="IP Address" style={{ minWidth: "12rem" }} />
            <Column field="port" header="Port" style={{ minWidth: "8rem" }} />
            <Column header="Active" body={activeBodyTemplate} style={{ minWidth: "8rem" }} />
            <Column header="Status" body={deletedStatusBodyTemplate} style={{ minWidth: "8rem" }} />
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
              style={{ minWidth: "12rem" }}
            />
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: "54rem", maxWidth: "95vw" }}
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
          <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
            <Controller
              name="code"
              control={control}
              rules={{ required: "Code is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label htmlFor="code" className="mb-2 block text-sm font-medium text-slate-700">
                    Code
                  </label>
                  <InputText
                    id="code"
                    {...field}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    placeholder="Enter scanner code"
                  />
                  {fieldState.error && (
                    <small className="p-error">{fieldState.error.message}</small>
                  )}
                </div>
              )}
            />

            <Controller
              name="name"
              control={control}
              rules={{ required: "Name is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <InputText
                    id="name"
                    {...field}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    placeholder="Enter scanner name"
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
              rules={{ required: "IP address is required" }}
              render={({ field, fieldState }) => (
                <div>
                  <label htmlFor="ip" className="mb-2 block text-sm font-medium text-slate-700">
                    IP Address
                  </label>
                  <InputText
                    id="ip"
                    {...field}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    placeholder="Example: 192.168.1.10"
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
                  <label htmlFor="port" className="mb-2 block text-sm font-medium text-slate-700">
                    Port
                  </label>
                  <InputText
                    id="port"
                    {...field}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    placeholder="Example: 4370"
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
              rules={{ required: "Password is required" }}
              render={({ field, fieldState }) => (
                <div className="md:col-span-2">
                  <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </label>
                  <InputText
                    id="password"
                    {...field}
                    type="password"
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    placeholder="Enter device password"
                  />
                  {fieldState.error && (
                    <small className="p-error">{fieldState.error.message}</small>
                  )}
                </div>
              )}
            />

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Active
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Enable this if the fingerprint scanner is active and ready to use.
                        </p>
                      </div>
                      <InputSwitch
                        checked={!!field.value}
                        onChange={(e) => field.onChange(e.value)}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default FingerprintScannerTableData;