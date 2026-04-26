"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Controller, useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { useDispatch } from "react-redux";

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { getErrorMessage, isResponseTypeError } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

import { EmployeeFingerprint } from "@/app/types/employee-fingerprint";
import { FingerprintScanner } from "@/app/types/fingerprint-scanner";
import {
  checkPinEmployeeFingerprint,
  createEmployeeFingerprint,
  deleteEmployeeFingerprint,
  purgeEmployeeFingerprint,
  restoreEmployeeFingerprint,
  updateEmployeeFingerprint,
} from "@/app/services/employee-fingerprint-data-service";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

type FormData = EmployeeFingerprint;
type PinCheckState = "idle" | "checking" | "available" | "exists" | "error";

type CheckPinResponse = {
  success?: boolean;
  data?: unknown;
  message?: string;
  row?: unknown[];
};

const getBody = () => document.body;

const emptyForm: EmployeeFingerprint = {
  id: 0,
  employee_id: 0,
  fp_device_id: 0,
  fp_device_name: "",
  fp_pin: "",
  pin_already_exist: false,
  is_primary: false,
  deleted_at: null,
  row_version: 0,
};

const hasPinInScanner = (result: unknown): boolean => {
  if (!result || typeof result !== "object") {
    return false;
  }

  const record = result as CheckPinResponse;

  if (Array.isArray(record.row)) {
    return record.row.length > 0;
  }

  const data = record.data;

  if (data == null) {
    const message = typeof record.message === "string" ? record.message.toLowerCase() : "";

    if (
      message.includes("available") ||
      message.includes("not found") ||
      message.includes("not exist") ||
      message.includes("does not exist")
    ) {
      return false;
    }

    return false;
  }

  if (Array.isArray(data)) {
    return data.length > 0;
  }

  if (typeof data === "object" && data !== null) {
    const nested = data as { row?: unknown[] };

    if (Array.isArray(nested.row)) {
      return nested.row.length > 0;
    }

    return true;
  }

  return true;
};

const EmployeeFingerprintTableData = () => {
  const params = useParams();
  const employeeId = Number(params.id);
  const dispatch = useDispatch();

  const [selectedData, setSelectedData] = useState<EmployeeFingerprint | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [pinCheckState, setPinCheckState] = useState<PinCheckState>("idle");
  const [pinCheckMessage, setPinCheckMessage] = useState("");

  const {
    control,
    handleSubmit,
    formState: { isValid },
    reset,
    clearErrors,
    setFocus,
    watch,
  } = useForm<FormData>({
    defaultValues: emptyForm,
    mode: "onChange",
  });

  const fingerprintKey = `/api/employees/${employeeId}/fingerprint?show_all=${isShowDeletedDataChecked}`;

  const {
    data: employeeFingerprintData,
    error,
    isLoading,
  } = useSWR<EmployeeFingerprint[]>(fingerprintKey, fetcher);

  const {
    data: fpData,
    error: fpError,
    isLoading: fpIsLoading,
  } = useSWR<FingerprintScanner[]>(`/api/fingerprint-scanner`, fetcher);

  const fpActive = useMemo(
    () => fpData?.filter((a) => a.is_active) ?? [],
    [fpData]
  );

  const watchedFpDeviceId = watch("fp_device_id");
  const watchedFpPin = watch("fp_pin");
  const watchedPinAlreadyExist = watch("pin_already_exist");

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const resetPinCheckState = () => {
    setPinCheckState("idle");
    setPinCheckMessage("");
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Fingerprint");
    reset({
      ...emptyForm,
      employee_id: employeeId,
    });
    resetPinCheckState();

    setTimeout(() => {
      setFocus("fp_device_id");
    }, 0);
  };

  const onClickEdit = (data: EmployeeFingerprint) => {
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Edit Fingerprint");
    reset({
      id: data.id,
      employee_id: data.employee_id,
      fp_device_id: data.fp_device_id,
      fp_device_name: data.fp_device_name ?? "",
      fp_pin: data.fp_pin,
      pin_already_exist: data.pin_already_exist,
      is_primary: data.is_primary ?? false,
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });
    resetPinCheckState();
  };

  const onClickCheckPin = async () => {
    if (!watchedFpDeviceId || !watchedFpPin?.trim()) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Warning",
          detail: "Please select fingerprint scanner and fill PIN first",
        })
      );
      return;
    }

    try {
      setPinCheckState("checking");
      setPinCheckMessage("Checking PIN in fingerprint scanner...");

      const result = await checkPinEmployeeFingerprint(
        Number(watchedFpDeviceId),
        watchedFpPin.trim()
      );

      const pinExists = hasPinInScanner(result);

      if (pinExists) {
        setPinCheckState("exists");
        setPinCheckMessage(
          "PIN already exists in device. Enable 'PIN already exists in device' if you want to reuse this PIN."
        );
      } else {
        setPinCheckState("available");
        setPinCheckMessage(
          "PIN is available in device. Keep 'PIN already exists in device' off if you want the system to insert this PIN into the scanner."
        );
      }
    } catch (err: unknown) {
      setPinCheckState("error");
      setPinCheckMessage("Failed to check PIN availability in fingerprint scanner.");

      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const validatePinStateBeforeSubmit = () => {
    if (pinCheckState === "exists" && !watchedPinAlreadyExist) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Warning",
          detail:
            "PIN already exists in the scanner. Enable 'PIN already exists in device' or change the PIN.",
        })
      );
      return false;
    }

    if (pinCheckState === "available" && watchedPinAlreadyExist) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Warning",
          detail:
            "PIN is not found in the scanner. Disable 'PIN already exists in device' if the system should insert the PIN to the device.",
        })
      );
      return false;
    }

    return true;
  };

  const handleSubmitNew = async (data: EmployeeFingerprint) => {
    if (!validatePinStateBeforeSubmit()) return;

    try {
      const res = await createEmployeeFingerprint({
        ...data,
        employee_id: employeeId,
        fp_pin: data.fp_pin.trim(),
      });

      setVisible(false);
      reset(emptyForm);
      resetPinCheckState();
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint created successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handleUpdate = async (data: EmployeeFingerprint) => {
    if (!selectedData) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: "Please select data",
        })
      );
      return;
    }

    if (!validatePinStateBeforeSubmit()) return;

    try {
      const res = await updateEmployeeFingerprint(selectedData.id, selectedData.row_version, {
        ...data,
        employee_id: employeeId,
        fp_pin: data.fp_pin.trim(),
      });

      setVisible(false);
      reset(emptyForm);
      resetPinCheckState();
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint updated successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handleDelete = async (data: EmployeeFingerprint) => {
    try {
      const res = await deleteEmployeeFingerprint(data.id, data);
      setVisible(false);
      reset(emptyForm);
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint deleted successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handlePurge = async (data: EmployeeFingerprint) => {
    try {
      const res = await purgeEmployeeFingerprint(data.id, data);
      setVisible(false);
      reset(emptyForm);
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint permanently deleted",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const handleRestore = async (data: EmployeeFingerprint) => {
    try {
      const res = await restoreEmployeeFingerprint(data.id, data);
      setVisible(false);
      reset(emptyForm);
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint restored successfully",
        })
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          })
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          })
        );
      }
    }
  };

  const onClickDelete = (data: EmployeeFingerprint) => {
    confirmDialog({
      message: "Do you want to delete this fingerprint mapping?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handleDelete(data);
      },
    });
  };

  const onClickRestore = (data: EmployeeFingerprint) => {
    confirmDialog({
      message: "Do you want to restore this fingerprint mapping?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-success",
      accept: () => {
        void handleRestore(data);
      },
    });
  };

  const onClickPurge = (data: EmployeeFingerprint) => {
    confirmDialog({
      message: "Do you want to permanently delete this fingerprint mapping?",
      header: "Permanent Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handlePurge(data);
      },
    });
  };

  const onShowDeletedDataChecked = () => {
    setIsShowDeletedDataChecked((prev) => !prev);
  };

  const primaryBodyTemplate = (rowData: EmployeeFingerprint) => {
    return rowData.is_primary ? (
      <Tag value="Primary" severity="success" />
    ) : (
      <Tag value="Secondary" severity="secondary" />
    );
  };

  const pinSourceBodyTemplate = (rowData: EmployeeFingerprint) => {
    return rowData.pin_already_exist ? (
      <Tag value="Existing in Device" severity="info" />
    ) : (
      <Tag value="Insert to Device" severity="warning" />
    );
  };

  const statusBodyTemplate = (rowData: EmployeeFingerprint) => {
    return rowData.deleted_at ? (
      <Tag value="Deleted" severity="danger" />
    ) : (
      <Tag value="Active" severity="success" />
    );
  };

  const actionColumnBody = (rowData: EmployeeFingerprint) => {
    if (rowData.deleted_at) {
      return (
        <div className="flex gap-2">
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            tooltip="Restore"
            rounded
            severity="success"
            icon="pi pi-refresh"
            size="small"
            onClick={() => onClickRestore(rowData)}
          />
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: "top" }}
            tooltip="Delete Forever"
            rounded
            severity="secondary"
            icon="pi pi-times"
            size="small"
            onClick={() => onClickPurge(rowData)}
          />
        </div>
      );
    }

    return (
      <div className="flex gap-2">
        <Button
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          tooltip="Edit"
          rounded
          severity="help"
          icon="pi pi-pencil"
          size="small"
          onClick={() => onClickEdit(rowData)}
        />
        <Button
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          tooltip="Delete"
          rounded
          severity="danger"
          icon="pi pi-trash"
          size="small"
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  const pinCheckMessageNode = () => {
    if (pinCheckState === "idle") {
      return (
        <small className="text-slate-500">
          Check PIN availability in the fingerprint scanner before saving.
        </small>
      );
    }

    if (pinCheckState === "checking") {
      return <small className="text-slate-500">{pinCheckMessage}</small>;
    }

    if (pinCheckState === "available") {
      return <small className="text-green-600">{pinCheckMessage}</small>;
    }

    if (pinCheckState === "exists") {
      return <small className="text-amber-600">{pinCheckMessage}</small>;
    }

    return <small className="text-red-600">{pinCheckMessage}</small>;
  };

  if (isLoading) return <LoadingDataTable />;

  if (error) {
    return (
      <ErrorNotConnectedToApi
        mutateKey={`/api/employees/${employeeId}/fingerprint?show_all=true`}
      />
    );
  }

  return (
    <>
      <ConfirmDialog />

      <Card className="shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h5 className="text-xl font-semibold text-slate-900">
                Fingerprint Mapping
              </h5>
              <p className="mt-1 text-sm text-slate-500">
                Assign fingerprint scanner PIN to this employee. One employee can have multiple PIN mappings, but only one can be primary.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <Checkbox
                  inputId="showDeletedData"
                  checked={isShowDeletedDataChecked}
                  onChange={onShowDeletedDataChecked}
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
                  placeholder="Search fingerprint mapping"
                />
              </IconField>

              <Button label="New Mapping" icon="pi pi-plus" onClick={onClickNew} />
            </div>
          </div>

          <DataTable
            value={employeeFingerprintData ?? []}
            stripedRows
            paginator
            scrollable
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={["fp_device_name", "fp_pin"]}
            emptyMessage="No fingerprint mapping found."
            filters={filters}
            loading={isLoading}
            tableStyle={{ minWidth: "64rem" }}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(_, options) => options.rowIndex + 1}
            />
            <Column field="fp_device_name" header="Fingerprint Scanner" style={{ minWidth: "16rem" }} />
            <Column field="fp_pin" header="PIN / User ID" style={{ minWidth: "12rem" }} />
            <Column header="Primary" body={primaryBodyTemplate} style={{ minWidth: "10rem" }} />
            <Column header="PIN Source" body={pinSourceBodyTemplate} style={{ minWidth: "12rem" }} />
            <Column header="Status" body={statusBodyTemplate} style={{ minWidth: "8rem" }} />
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
              style={{ minWidth: "10rem" }}
            />
          </DataTable>
        </div>
      </Card>

      <form
        onSubmit={handleSubmit((data) =>
          isAddNew ? handleSubmitNew(data) : handleUpdate(data)
        )}
      >
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: "52rem", maxWidth: "95vw" }}
          onHide={() => {
            setVisible(false);
            resetPinCheckState();
          }}
          breakpoints={{ "960px": "90vw", "640px": "96vw" }}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                label="Cancel"
                icon="pi pi-times"
                onClick={() => {
                  setVisible(false);
                  resetPinCheckState();
                }}
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
              name="fp_device_id"
              control={control}
              rules={{
                required: "Fingerprint scanner is required",
                validate: (value) => Number(value) > 0 || "Fingerprint scanner is required",
              }}
              render={({ field, fieldState }) => (
                <div>
                  <label htmlFor="fp_device_id" className="mb-2 block text-sm font-medium text-slate-700">
                    Fingerprint Scanner
                  </label>
                  <Dropdown
                    id="fp_device_id"
                    appendTo={getBody}
                    value={field.value}
                    options={fpActive}
                    onChange={(e) => {
                      field.onChange(e.value);
                      resetPinCheckState();
                    }}
                    optionLabel="name"
                    optionValue="id"
                    placeholder="Select fingerprint scanner"
                    loading={fpIsLoading}
                    disabled={fpIsLoading || !!fpError}
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  />
                  {fieldState.error && (
                    <small className="p-error">{fieldState.error.message}</small>
                  )}
                </div>
              )}
            />

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Controller
                name="is_primary"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Primary PIN
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Only one primary PIN can be used for this employee.
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

            <div className="md:col-span-2">
              <Controller
                name="fp_pin"
                control={control}
                rules={{
                  required: "PIN is required",
                  maxLength: { value: 50, message: "Maximum 50 characters" },
                }}
                render={({ field, fieldState }) => (
                  <div>
                    <label htmlFor="fp_pin" className="mb-2 block text-sm font-medium text-slate-700">
                      PIN / User ID
                    </label>

                    <div className="flex flex-col gap-3 md:flex-row">
                      <InputText
                        id="fp_pin"
                        placeholder="Example: pin123"
                        {...field}
                        className={`flex-1 ${fieldState.invalid ? "p-invalid" : ""}`}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          resetPinCheckState();
                        }}
                      />
                      <Button
                        type="button"
                        label="Check PIN"
                        icon="pi pi-search"
                        onClick={onClickCheckPin}
                        loading={pinCheckState === "checking"}
                      />
                    </div>

                    <div className="mt-2">{pinCheckMessageNode()}</div>

                    {fieldState.error && (
                      <small className="p-error">{fieldState.error.message}</small>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="md:col-span-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="pin_already_exist"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          PIN already exists in device
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Turn this on if the PIN already exists in the scanner and should not be inserted again.
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

export default EmployeeFingerprintTableData;