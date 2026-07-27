"use client";

import { ChangeEvent, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from "swr";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  createIdentityType,
  deleteIdentityType,
  purgeIdentityType,
  restoreIdentityType,
  updateIdentityType,
} from "@/app/services/identity-type-service";

import { IdentityType } from "@/app/types/identity-type";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { hasRole } from "@/app/utils/role-utils";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const EMPTY_IDENTITY_TYPE: IdentityType = {
  id: 0,
  code: "",
  name: "",
  is_active: true,
  deleted_at: "",
  row_version: 0,
};

const getBody = () => document.body;

const IdentityTypeTableData = () => {
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<IdentityType | null>(null);

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

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Identity Type");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/identity-type?show_all=${isShowDeletedDataChecked}`;

  const {
    data: identityTypeData,
    error,
    isLoading,
    isValidating,
    mutate: refreshIdentityTypeData,
  } = useSWR<IdentityType[]>(currentKey, fetcher);

  const { control, handleSubmit, setFocus, reset, clearErrors } =
    useForm<IdentityType>({
      defaultValues: EMPTY_IDENTITY_TYPE,
      mode: "onTouched",
    });

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

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Identity Type");
    clearErrors();
    reset(EMPTY_IDENTITY_TYPE);
  };

  const handleRefresh = async () => {
    try {
      await refreshIdentityTypeData();
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

  const onShowDeletedChange = (checked: boolean) => {
    setIsShowDeletedDataChecked(checked);
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setPopupHeaderTitle("New Identity Type");
    reset(EMPTY_IDENTITY_TYPE);
    setVisible(true);
  };

  const onClickUpdate = (data: IdentityType) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Identity Type");
    reset(data);
    setVisible(true);
  };

  const handleSubmitNew = async (data: IdentityType) => {
    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createIdentityType(data);

      await refreshIdentityTypeData();

      handleCloseDialog();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: IdentityType) => {
    if (!selectedData) {
      showError(new Error("Identity type data is not selected."));
      return;
    }

    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updateIdentityType(
          selectedData.id,
          selectedData.row_version,
          data,
        );

      await refreshIdentityTypeData();

      handleCloseDialog();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: IdentityType) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteIdentityType(data.id, data.row_version);

      await refreshIdentityTypeData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: IdentityType) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreIdentityType(data.id, data.row_version);

      await refreshIdentityTypeData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: IdentityType) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgeIdentityType(data.id);

      await refreshIdentityTypeData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: IdentityType) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: IdentityType) => {
    confirmDialog({
      header: "Delete Identity Type",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this identity type?
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => handleDelete(data),
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

  const onClickRestore = (data: IdentityType) => {
    confirmDialog({
      header: "Restore Identity Type",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this identity type?
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>
        </div>
      ),
      icon: "pi pi-refresh",
      defaultFocus: "accept",
      accept: () => handleRestore(data),
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

  const onClickPurge = (data: IdentityType) => {
    confirmDialog({
      header: "Delete Identity Type Permanently",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            This action cannot be undone. Permanently delete:
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => handlePurge(data),
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

  const statusColumnBody = (rowData: IdentityType) => {
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

  const actionColumnBody = (rowData: IdentityType) => {
    const isDeleted = Boolean(rowData.deleted_at);

    const isSuperadmin = hasRole(profileState.role, ["superadmin"]);

    if (isDeleted) {
      if (!isSuperadmin) {
        return <span className="text-sm text-slate-400">No action</span>;
      }

      return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
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
            onClick={() => onClickRestore(rowData)}
          />

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
            onClick={() => onClickPurge(rowData)}
          />
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <Button
          type="button"
          icon="pi pi-pencil"
          rounded
          outlined
          severity="secondary"
          size="small"
          tooltip="Edit"
          tooltipOptions={{
            appendTo: getBody,
            position: "top",
          }}
          onClick={() => onClickUpdate(rowData)}
        />

        <Button
          type="button"
          icon="pi pi-trash"
          rounded
          outlined
          severity="danger"
          size="small"
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
        form="identity-type-form"
        label={isAddNew ? "Create Identity Type" : "Save Changes"}
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
    return <ErrorNotConnectedToApi mutateKey={currentKey} />;
  }

  return (
    <>
      <ConfirmDialog />

      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Page Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-id-card text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Identity Type
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage identity type codes, names, and active status.
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
                disabled={isValidating}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />

              <Button
                type="button"
                label="New Identity Type"
                icon="pi pi-plus"
                size="small"
                className="w-full sm:w-auto"
                onClick={onClickNew}
              />
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                inputId="showDeletedData"
                checked={isShowDeletedDataChecked}
                onChange={(event) =>
                  onShowDeletedChange(Boolean(event.checked))
                }
              />

              <label
                htmlFor="showDeletedData"
                className="cursor-pointer select-none text-sm text-slate-600"
              >
                Show deleted records
              </label>
            </div>

            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />

              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder="Search code or identity type name"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Identity Type Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={identityTypeData ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={["code", "name"]}
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
                minWidth: "48rem",
              }}
              emptyMessage="No identity type data found."
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
                body={(rowData: IdentityType) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {rowData.code}
                  </span>
                )}
              />

              <Column
                field="name"
                header="Identity Type Name"
                sortable
                style={{
                  minWidth: "18rem",
                }}
                body={(rowData: IdentityType) => (
                  <span className="font-medium text-slate-800">
                    {rowData.name}
                  </span>
                )}
              />

              <Column
                field="is_active"
                header="Status"
                sortable
                body={statusColumnBody}
                style={{
                  minWidth: "10rem",
                }}
              />

              <Column
                header="Action"
                body={actionColumnBody}
                frozen
                alignFrozen="right"
                headerClassName="bg-white"
                bodyClassName="bg-white"
                headerStyle={{
                  width: "9rem",
                  minWidth: "9rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "9rem",
                  minWidth: "9rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      {/* Identity Type Form Dialog */}
      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{
          width: "95vw",
          maxWidth: "34rem",
        }}
        breakpoints={{
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
            setFocus("code");
          }, 0);
        }}
      >
        <form
          id="identity-type-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 pt-2"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="code"
              className="text-sm font-medium text-slate-700"
            >
              Identity Type Code
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="code"
              control={control}
              rules={{
                required: "Identity type code is required.",
                validate: {
                  noSpaces: (value) =>
                    !/\s/.test(value) ||
                    "Identity type code must not contain spaces.",
                },
                maxLength: {
                  value: 50,
                  message: "Identity type code cannot exceed 50 characters.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    id="code"
                    autoComplete="off"
                    placeholder="Example: KTP"
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
                      Use a short and unique identity type code.
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
              Identity Type Name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="name"
              control={control}
              rules={{
                required: "Identity type name is required.",
                maxLength: {
                  value: 50,
                  message: "Identity type name cannot exceed 50 characters.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    id="name"
                    autoComplete="off"
                    placeholder="Example: National ID Card"
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
                      Active Status
                    </label>

                    <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                      Inactive identity types remain stored but should not be
                      available for new employee records.
                    </p>
                  </div>

                  <InputSwitch
                    id="is_active"
                    checked={Boolean(field.value)}
                    onChange={(event) => field.onChange(event.value)}
                  />
                </div>
              )}
            />
          </div>
        </form>
      </Dialog>
    </>
  );
};

export default IdentityTypeTableData;
