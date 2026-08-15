"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Controller, useForm } from "react-hook-form";
import { useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";

import { EmployeeFingerprint } from "@/app/types/employee-fingerprint";
import { FingerprintScanner } from "@/app/types/fingerprint-scanner";
import {
  CheckFingerprintPin2Result,
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
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { RadioButton } from "primereact/radiobutton";
import { Tag } from "primereact/tag";

type FormData = EmployeeFingerprint;
type PinCheckState = "idle" | "checking" | "valid" | "invalid" | "error";
type MappingMode = "LINK_EXISTING" | "CREATE_NEW";

const emptyForm: EmployeeFingerprint = {
  id: 0,
  employee_id: 0,
  fp_device_id: 0,
  fp_device_name: "",
  fp_pin: "",
  fp_machine_pin: null,
  fp_device_user_name: null,
  pin_already_exist: true,
  is_primary: false,
  deleted_at: null,
  row_version: 0,
};

const getBody = () => document.body;

const EmployeeFingerprintTableData = () => {
  const params = useParams();
  const employeeId = Number(params.id);
  const dispatch = useDispatch();
  const archivedAccess = useArchivedDataAccess("employee");
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canCreate = permissions.includes("employee.create");
  const canUpdate = permissions.includes("employee.update");
  const canDelete = permissions.includes("employee.delete");
  const canRestore = archivedAccess.canRestore;
  const canPurge = archivedAccess.canPurge;

  const [selectedData, setSelectedData] = useState<EmployeeFingerprint | null>(
    null,
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

  const [pinCheckState, setPinCheckState] = useState<PinCheckState>("idle");
  const [pinCheckMessage, setPinCheckMessage] = useState("");
  const [pinCheckResult, setPinCheckResult] =
    useState<CheckFingerprintPin2Result | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isValid },
    reset,
    clearErrors,
    setFocus,
    watch,
    setValue,
  } = useForm<FormData>({
    defaultValues: emptyForm,
    mode: "onChange",
  });

  const fingerprintKey = `/api/employees/${employeeId}/fingerprint?show_all=${
    archivedAccess.canShowDeleted && isShowDeletedDataChecked
  }`;

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
    [fpData],
  );

  const watchedFpDeviceId = watch("fp_device_id");
  const watchedFpPin = watch("fp_pin");
  const watchedPinAlreadyExist = watch("pin_already_exist");

  const mappingMode: MappingMode = watchedPinAlreadyExist
    ? "LINK_EXISTING"
    : "CREATE_NEW";

  const resetPinCheckState = () => {
    setPinCheckState("idle");
    setPinCheckMessage("");
    setPinCheckResult(null);
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
    setPopupHeaderTitle("New Fingerprint Mapping");

    reset({
      ...emptyForm,
      employee_id: employeeId,
      pin_already_exist: true,
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
    setPopupHeaderTitle("Edit Fingerprint Mapping");

    reset({
      id: data.id,
      employee_id: data.employee_id,
      fp_device_id: data.fp_device_id,
      fp_device_name: data.fp_device_name ?? "",
      fp_pin: data.fp_pin,
      fp_machine_pin: data.fp_machine_pin ?? null,
      fp_device_user_name: data.fp_device_user_name ?? null,
      pin_already_exist: data.pin_already_exist,
      is_primary: data.is_primary ?? false,
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });

    setPinCheckState("valid");
    setPinCheckResult({
      exists: data.pin_already_exist,
      pin: data.fp_machine_pin ?? null,
      pin2: data.fp_pin,
      name: data.fp_device_user_name ?? null,
    });
    setPinCheckMessage(
      "Existing mapping loaded. Re-check if you change scanner or PIN2.",
    );
  };

  const closeDialog = () => {
    setVisible(false);
    setSelectedData(null);
    reset(emptyForm);
    resetPinCheckState();
  };

  const setMappingMode = (mode: MappingMode) => {
    setValue("pin_already_exist", mode === "LINK_EXISTING", {
      shouldValidate: true,
      shouldDirty: true,
    });
    resetPinCheckState();
  };

  const onClickCheckPin = async () => {
    if (!watchedFpDeviceId || Number(watchedFpDeviceId) <= 0) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Warning",
          detail: "Please select fingerprint scanner first",
        }),
      );
      return;
    }

    if (!watchedFpPin?.trim()) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Warning",
          detail: "Please fill Fingerprint User ID / PIN2 first",
        }),
      );
      return;
    }

    try {
      setPinCheckState("checking");
      setPinCheckMessage("Checking Fingerprint User ID / PIN2 in device...");
      setPinCheckResult(null);

      const response = await checkPinEmployeeFingerprint(
        Number(watchedFpDeviceId),
        watchedFpPin.trim(),
      );

      const result = response.data;
      setPinCheckResult(result);

      if (watchedPinAlreadyExist) {
        if (result.exists) {
          setPinCheckState("valid");
          setPinCheckMessage(
            `User found in device. Machine PIN / PIN1: ${result.pin ?? "-"}`,
          );
        } else {
          setPinCheckState("invalid");
          setPinCheckMessage(
            "Fingerprint User ID / PIN2 was not found in this device. Use Create New User mode if you want to create it.",
          );
        }
      } else {
        if (result.exists) {
          setPinCheckState("invalid");
          setPinCheckMessage(
            "Fingerprint User ID / PIN2 already exists in this device. Use Link Existing User mode if you want to map it.",
          );
        } else {
          setPinCheckState("valid");
          setPinCheckMessage(
            "Fingerprint User ID / PIN2 is available. The system will create a new user in the device.",
          );
        }
      }
    } catch (err: unknown) {
      setPinCheckState("error");
      setPinCheckMessage(
        "Failed to check Fingerprint User ID / PIN2 in device.",
      );
      setPinCheckResult(null);

      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const validatePinStateBeforeSubmit = () => {
    if (pinCheckState !== "valid") {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Warning",
          detail: "Please check Fingerprint User ID / PIN2 before saving.",
        }),
      );
      return false;
    }

    if (watchedPinAlreadyExist && !pinCheckResult?.exists) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Warning",
          detail:
            "This mode links existing user, but the Fingerprint User ID / PIN2 was not found in device.",
        }),
      );
      return false;
    }

    if (!watchedPinAlreadyExist && pinCheckResult?.exists) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Warning",
          detail:
            "This mode creates new user, but the Fingerprint User ID / PIN2 already exists in device.",
        }),
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

      closeDialog();
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint mapping created successfully",
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
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
        }),
      );
      return;
    }

    if (!validatePinStateBeforeSubmit()) return;

    try {
      const res = await updateEmployeeFingerprint(
        selectedData.id,
        selectedData.row_version,
        {
          ...data,
          employee_id: employeeId,
          fp_pin: data.fp_pin.trim(),
        },
      );

      closeDialog();
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint mapping updated successfully",
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const handleDelete = async (data: EmployeeFingerprint) => {
    try {
      const res = await deleteEmployeeFingerprint(data.id, data);

      closeDialog();
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint mapping deleted successfully",
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const handlePurge = async (data: EmployeeFingerprint) => {
    try {
      const res = await purgeEmployeeFingerprint(data.id, data);

      closeDialog();
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint mapping permanently deleted",
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const handleRestore = async (data: EmployeeFingerprint) => {
    try {
      const res = await restoreEmployeeFingerprint(data.id, data);

      closeDialog();
      await mutate(fingerprintKey);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Fingerprint mapping restored successfully",
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const onClickDelete = (data: EmployeeFingerprint) => {
    requestActionConfirmation({
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
    requestActionConfirmation({
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
    requestActionConfirmation({
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
      <Tag value="Linked Existing" severity="info" />
    ) : (
      <Tag value="Created by HRIS" severity="warning" />
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
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {canRestore && (
            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip="Restore"
              rounded
              outlined
              severity="success"
              icon="pi pi-refresh"
              size="small"
              onClick={() => onClickRestore(rowData)}
            />
          )}
          {canPurge && (
            <Button
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              tooltip="Delete Forever"
              rounded
              outlined
              severity="danger"
              icon="pi pi-trash"
              size="small"
              onClick={() => onClickPurge(rowData)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        {canUpdate && (
          <Button
            tooltipOptions={{ appendTo: getBody, position: "top" }}
            tooltip="Edit"
            rounded
            outlined
            severity="secondary"
            icon="pi pi-pencil"
            size="small"
            onClick={() => onClickEdit(rowData)}
          />
        )}
        {canDelete && (
          <Button
            tooltipOptions={{ appendTo: getBody, position: "top" }}
            tooltip="Delete"
            rounded
            outlined
            severity="danger"
            icon="pi pi-trash"
            size="small"
            onClick={() => onClickDelete(rowData)}
          />
        )}
      </div>
    );
  };

  const pinCheckMessageNode = () => {
    if (pinCheckState === "idle") {
      return (
        <small className="text-slate-500">
          Check Fingerprint User ID / PIN2 in the fingerprint scanner before
          saving.
        </small>
      );
    }

    if (pinCheckState === "checking") {
      return <small className="text-blue-600">{pinCheckMessage}</small>;
    }

    if (pinCheckState === "valid") {
      return <small className="text-green-600">{pinCheckMessage}</small>;
    }

    if (pinCheckState === "invalid") {
      return <small className="text-orange-600">{pinCheckMessage}</small>;
    }

    return <small className="text-red-600">{pinCheckMessage}</small>;
  };

  const checkResultCard = () => {
    if (!pinCheckResult) return null;

    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="mb-2 font-semibold text-slate-800">
          Device Check Result
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Exists in Device</div>
            <div className="font-medium text-slate-800">
              {pinCheckResult.exists ? "Yes" : "No"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Machine PIN / PIN1</div>
            <div className="font-medium text-slate-800">
              {pinCheckResult.pin ?? "-"}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">
              Fingerprint User ID / PIN2
            </div>
            <div className="font-medium text-slate-800">
              {pinCheckResult.pin2 ?? watchedFpPin ?? "-"}
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="text-xs text-slate-500">Device User Name</div>
            <div className="font-medium text-slate-800">
              {pinCheckResult.name ?? "-"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const onSubmit = (data: FormData) => {
    if (!isValid) return;

    if (isAddNew) {
      void handleSubmitNew(data);
      return;
    }

    void handleUpdate(data);
  };

  if (isLoading) return <LoadingDataTable />;

  if (error || fpError) {
    return <ErrorNotConnectedToApi mutateKey={fingerprintKey} />;
  }

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="border-b border-slate-200 pb-4">
            <div className="mb-4">
              <h2 className="text-xl font-semibold leading-tight text-slate-900">
                Employee Fingerprint
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500">
                Map this employee to fingerprint device user using Fingerprint
                User ID / PIN2.
              </p>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {archivedAccess.canShowDeleted && (
                  <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:w-auto">
                    <Checkbox
                      inputId="showDeletedFingerprint"
                      checked={isShowDeletedDataChecked}
                      onChange={onShowDeletedDataChecked}
                    />
                    <label
                      htmlFor="showDeletedFingerprint"
                      className="cursor-pointer text-sm text-slate-700"
                    >
                      Show deleted data
                    </label>
                  </div>
                )}

                <IconField iconPosition="left" className="w-full sm:w-72">
                  <InputIcon className="pi pi-search" />
                  <InputText
                    className="w-full"
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Search fingerprint"
                  />
                </IconField>
              </div>

              <div className="flex w-full justify-start xl:w-auto xl:justify-end">
                {canCreate && (
                  <Button
                    className="w-full sm:w-auto"
                    label="New Fingerprint"
                    icon="pi pi-plus"
                    size="small"
                    onClick={onClickNew}
                  />
                )}
              </div>
            </div>
          </div>

          <DataTable
            value={employeeFingerprintData ?? []}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={[
              "fp_device_name",
              "fp_pin",
              "fp_machine_pin",
              "fp_device_user_name",
            ]}
            emptyMessage="No fingerprint mapping found."
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
            scrollable
            stripedRows
            rowHover
            removableSort
            responsiveLayout="scroll"
            size="small"
            tableStyle={{ minWidth: "68rem" }}
          >
            <Column
              header="#"
              body={(_, options) => options.rowIndex + 1}
              style={{ width: "4rem", minWidth: "4rem" }}
            />

            <Column
              field="fp_device_name"
              header="Scanner"
              sortable
              style={{ minWidth: "13rem" }}
            />

            <Column
              field="fp_pin"
              header="User ID / PIN2"
              sortable
              style={{ minWidth: "12rem" }}
            />

            <Column
              field="fp_machine_pin"
              header="Machine PIN / PIN1"
              sortable
              style={{ minWidth: "12rem" }}
              body={(rowData: EmployeeFingerprint) =>
                rowData.fp_machine_pin ?? "-"
              }
            />

            <Column
              field="fp_device_user_name"
              header="Device User Name"
              sortable
              style={{ minWidth: "14rem" }}
              body={(rowData: EmployeeFingerprint) =>
                rowData.fp_device_user_name ?? "-"
              }
            />

            <Column
              header="Source"
              body={pinSourceBodyTemplate}
              style={{ minWidth: "12rem" }}
            />

            <Column
              header="Primary"
              body={primaryBodyTemplate}
              style={{ minWidth: "10rem" }}
            />

            <Column
              header="Status"
              body={statusBodyTemplate}
              style={{ minWidth: "10rem" }}
            />

            <Column
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
              headerClassName="bg-white"
              className="bg-white"
              headerStyle={{
                width: "9rem",
                minWidth: "9rem",
                textAlign: "right",
              }}
              bodyStyle={{ width: "9rem", minWidth: "9rem" }}
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
          onShow={() => setTimeout(() => setFocus("fp_device_id"), 0)}
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
                disabled={!isValid || pinCheckState !== "valid"}
              />
            </div>
          }
        >
          <div className="flex flex-col gap-5 pt-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 text-sm font-semibold text-slate-900">
                Mapping Mode
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div
                  className={`cursor-pointer rounded-xl border bg-white p-4 ${
                    mappingMode === "LINK_EXISTING"
                      ? "border-blue-400 ring-1 ring-blue-300"
                      : "border-slate-200"
                  }`}
                  onClick={() => setMappingMode("LINK_EXISTING")}
                >
                  <div className="flex items-start gap-3">
                    <RadioButton
                      inputId="mode_link_existing"
                      name="mappingMode"
                      value="LINK_EXISTING"
                      checked={mappingMode === "LINK_EXISTING"}
                      onChange={() => setMappingMode("LINK_EXISTING")}
                    />
                    <div>
                      <label
                        htmlFor="mode_link_existing"
                        className="cursor-pointer text-sm font-semibold text-slate-900"
                      >
                        Link Existing User in Device
                      </label>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Use this if the fingerprint user already exists in the
                        device. The system will search by PIN2 and save the
                        Machine PIN / PIN1.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`cursor-pointer rounded-xl border bg-white p-4 ${
                    mappingMode === "CREATE_NEW"
                      ? "border-blue-400 ring-1 ring-blue-300"
                      : "border-slate-200"
                  }`}
                  onClick={() => setMappingMode("CREATE_NEW")}
                >
                  <div className="flex items-start gap-3">
                    <RadioButton
                      inputId="mode_create_new"
                      name="mappingMode"
                      value="CREATE_NEW"
                      checked={mappingMode === "CREATE_NEW"}
                      onChange={() => setMappingMode("CREATE_NEW")}
                    />
                    <div>
                      <label
                        htmlFor="mode_create_new"
                        className="cursor-pointer text-sm font-semibold text-slate-900"
                      >
                        Create New User in Device
                      </label>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Use this if the fingerprint user does not exist yet. The
                        backend will generate Machine PIN / PIN1 and insert PIN2
                        to the device.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Controller
              name="fp_device_id"
              control={control}
              rules={{
                required: "Fingerprint scanner is required",
                validate: (value) =>
                  Number(value) > 0 || "Fingerprint scanner is required",
              }}
              render={({ field, fieldState }) => (
                <div>
                  <label
                    htmlFor="fp_device_id"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Fingerprint Scanner
                  </label>
                  <Dropdown
                    id="fp_device_id"
                    value={field.value}
                    options={fpActive}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={
                      fpIsLoading ? "Loading scanner..." : "Select scanner"
                    }
                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                    onChange={(e) => {
                      field.onChange(e.value);
                      resetPinCheckState();
                    }}
                    disabled={fpIsLoading}
                    filter
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="fp_pin"
              control={control}
              rules={{
                required: "Fingerprint User ID / PIN2 is required",
                validate: (value) =>
                  String(value ?? "").trim().length > 0 ||
                  "Fingerprint User ID / PIN2 is required",
              }}
              render={({ field, fieldState }) => (
                <div>
                  <label
                    htmlFor="fp_pin"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Fingerprint User ID / PIN2
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <InputText
                      id="fp_pin"
                      value={field.value ?? ""}
                      className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                      placeholder="Example: EMP001"
                      onChange={(e) => {
                        field.onChange(e.target.value);
                        resetPinCheckState();
                      }}
                    />
                    <Button
                      type="button"
                      label="Check User"
                      icon="pi pi-search"
                      loading={pinCheckState === "checking"}
                      onClick={onClickCheckPin}
                    />
                  </div>
                  {fieldState.error ? (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  ) : (
                    pinCheckMessageNode()
                  )}
                </div>
              )}
            />

            {checkResultCard()}

            <Controller
              name="is_primary"
              control={control}
              render={({ field }) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Primary Fingerprint Mapping
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Mark this scanner user as the primary fingerprint
                        mapping for this employee.
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
    </>
  );
};

export default EmployeeFingerprintTableData;
