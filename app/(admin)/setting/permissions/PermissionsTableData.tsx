"use client";

import { ChangeEvent, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from "swr";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
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
  createPermissions,
  deletePermissions,
  purgePermissions,
  restorePermissions,
  updatePermissions,
} from "@/app/services/permissions-service";

import { Permissions } from "@/app/types/permissions";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import { fetcher } from "@/app/utils/fetcher";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const DEFAULT_FORM_VALUE: Permissions = {
  id: 0,
  code: "",
  resource: "",
  action: "",
  label: "",
  group_name: "",
  is_active: true,
  deleted_at: "",
  row_version: 0,
};

const getBody = () => document.body;

const buildPermissionCode = (resourceValue: string, actionValue: string) => {
  const resource = resourceValue.trim().toLowerCase();
  const action = actionValue.trim().toLowerCase();

  if (!resource) {
    return "";
  }

  if (!action) {
    return resource;
  }

  return `${resource}.${action}`;
};

const PermissionsTableData = () => {
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("permission");
  const permissionPermissions = new Set(profileState.permissions);
  const canCreatePermission = permissionPermissions.has("permission.create");
  const canUpdatePermission = permissionPermissions.has("permission.update");
  const canDeletePermission = permissionPermissions.has("permission.delete");
  const canRestorePermission = archivedAccess.canRestore;
  const canPurgePermission = archivedAccess.canPurge;

  const [selectedData, setSelectedData] = useState<Permissions | null>(null);

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

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Permission");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/permissions?show_all=${
    archivedAccess.canShowDeleted && isShowDeletedDataChecked
  }`;

  const {
    data: permissionsData,
    error,
    isLoading,
    isValidating,
    mutate: refreshPermissionsData,
  } = useSWR<Permissions[]>(currentKey, fetcher);

  const {
    control,
    handleSubmit,
    setFocus,
    setValue,
    getValues,
    reset,
    clearErrors,
  } = useForm<Permissions>({
    defaultValues: DEFAULT_FORM_VALUE,
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

  const normalizePermissionForm = (data: Permissions): Permissions => {
    const resource = data.resource.trim().toLowerCase();
    const action = data.action.trim().toLowerCase();

    return {
      ...data,
      code: buildPermissionCode(resource, action),
      resource,
      action,
      label: data.label.trim(),
      group_name: data.group_name.trim(),
      is_active: Boolean(data.is_active),
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Permission");
    clearErrors();
    reset(DEFAULT_FORM_VALUE);
  };

  const handleRefresh = async () => {
    try {
      await refreshPermissionsData();
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

  const updateGeneratedCode = (resource?: string, action?: string) => {
    const generatedCode = buildPermissionCode(
      resource ?? getValues("resource") ?? "",
      action ?? getValues("action") ?? "",
    );

    setValue("code", generatedCode, {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setPopupHeaderTitle("New Permission");
    reset(DEFAULT_FORM_VALUE);
    setVisible(true);
  };

  const onClickUpdate = (data: Permissions) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Permission");

    reset({
      id: data.id,
      code: data.code ?? "",
      resource: data.resource ?? "",
      action: data.action ?? "",
      label: data.label ?? "",
      group_name: data.group_name ?? "",
      is_active: Boolean(data.is_active),
      deleted_at: data.deleted_at ?? "",
      row_version: data.row_version,
    });

    setVisible(true);
  };

  const handleSubmitNew = async (data: Permissions) => {
    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createPermissions(normalizePermissionForm(data));

      await refreshPermissionsData();

      handleCloseDialog();

      showSuccess(response.message || "Permission created successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: Permissions) => {
    if (!selectedData) {
      showError(new Error("Permission data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const normalizedData = normalizePermissionForm(data);

      const payload: Permissions = {
        ...normalizedData,

        /*
         * Resource, action, dan code tidak boleh berubah
         * karena digunakan oleh Casbin policies.
         */
        code: selectedData.code,
        resource: selectedData.resource,
        action: selectedData.action,
        row_version: selectedData.row_version,
      };

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updatePermissions(
          selectedData.id,
          selectedData.row_version,
          payload,
        );

      await refreshPermissionsData();

      handleCloseDialog();

      showSuccess(response.message || "Permission updated successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: Permissions) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deletePermissions(data.id, data.row_version);

      await refreshPermissionsData();

      showSuccess(response.message || "Permission deleted successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: Permissions) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restorePermissions(data.id, data.row_version);

      await refreshPermissionsData();

      showSuccess(response.message || "Permission restored successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: Permissions) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgePermissions(data.id);

      await refreshPermissionsData();

      showSuccess(response.message || "Permission permanently deleted.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: Permissions) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: Permissions) => {
    requestActionConfirmation({
      header: "Delete Permission",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this permission?
          </span>

          <span className="font-semibold text-slate-800">{data.label}</span>

          <span className="font-mono text-xs text-slate-500">{data.code}</span>
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

  const onClickRestore = (data: Permissions) => {
    requestActionConfirmation({
      header: "Restore Permission",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this permission?
          </span>

          <span className="font-semibold text-slate-800">{data.label}</span>

          <span className="font-mono text-xs text-slate-500">{data.code}</span>
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

  const onClickPurge = (data: Permissions) => {
    requestActionConfirmation({
      header: "Delete Permission Permanently",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            This action cannot be undone. Permanently delete:
          </span>

          <span className="font-semibold text-slate-800">{data.label}</span>

          <span className="font-mono text-xs text-slate-500">{data.code}</span>
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

  const statusColumnBody = (rowData: Permissions) => {
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

  const codeColumnBody = (rowData: Permissions) => {
    return (
      <span className="font-mono text-sm font-semibold text-slate-700">
        {rowData.code}
      </span>
    );
  };

  const labelColumnBody = (rowData: Permissions) => {
    return <span className="font-medium text-slate-800">{rowData.label}</span>;
  };

  const resourceColumnBody = (rowData: Permissions) => {
    return <Tag value={rowData.resource} severity="info" rounded />;
  };

  const actionPermissionColumnBody = (rowData: Permissions) => {
    return <Tag value={rowData.action} severity="secondary" rounded />;
  };

  const groupColumnBody = (rowData: Permissions) => {
    if (!rowData.group_name) {
      return <span className="text-sm text-slate-400">No group</span>;
    }

    return <span className="text-sm text-slate-700">{rowData.group_name}</span>;
  };

  const actionColumnBody = (rowData: Permissions) => {
    const isDeleted = Boolean(rowData.deleted_at);

    if (isDeleted) {
      if (!canRestorePermission && !canPurgePermission) {
        return <span className="text-sm text-slate-400">No action</span>;
      }

      return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {canRestorePermission && (
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
          )}

          {canPurgePermission && (
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
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        {canUpdatePermission && (
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
        )}

        {canDeletePermission && (
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
        )}
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
        form="permission-form"
        label={isAddNew ? "Create Permission" : "Save Changes"}
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
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          {/* Page Header */}
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-key text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Permissions
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage permission resources, actions, labels, and groups used
                  by Casbin authorization policies.
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

              {canCreatePermission && (
                <Button
                  type="button"
                  label="New Permission"
                  icon="pi pi-plus"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={onClickNew}
                />
              )}
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              {archivedAccess.canShowDeleted && (
                <>
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
                </>
              )}
            </div>

            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />

              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder="Search permission, resource, or group"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Permission Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={permissionsData ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "code",
                "label",
                "resource",
                "action",
                "group_name",
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
              emptyMessage="No permission data found."
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
                header="Permission Code"
                sortable
                body={codeColumnBody}
                style={{
                  minWidth: "18rem",
                }}
              />

              <Column
                field="label"
                header="Label"
                sortable
                body={labelColumnBody}
                style={{
                  minWidth: "18rem",
                }}
              />

              <Column
                field="resource"
                header="Resource"
                sortable
                body={resourceColumnBody}
                style={{
                  minWidth: "14rem",
                }}
              />

              <Column
                field="action"
                header="Action"
                sortable
                body={actionPermissionColumnBody}
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="group_name"
                header="Permission Group"
                sortable
                body={groupColumnBody}
                style={{
                  minWidth: "18rem",
                }}
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
                className="bg-white"
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

      {/* Permission Form Dialog */}
      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{
          width: "95vw",
          maxWidth: "48rem",
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
            if (isAddNew) {
              setFocus("resource");
              return;
            }

            setFocus("label");
          }, 0);
        }}
      >
        <form
          id="permission-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 pt-2"
        >
          {/* Permission Identity */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Permission Identity
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                Define the resource and action. The permission code is generated
                automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="resource"
                  className="text-sm font-medium text-slate-700"
                >
                  Resource
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="resource"
                  control={control}
                  rules={{
                    required: "Resource is required.",
                    validate: {
                      noSpaces: (value) =>
                        !/\s/.test(value.trim()) ||
                        "Resource must not contain spaces.",
                    },
                    maxLength: {
                      value: 100,
                      message: "Resource cannot exceed 100 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="resource"
                        autoComplete="off"
                        placeholder="Example: user"
                        disabled={isSaving || !isAddNew}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        onChange={(event) => {
                          const value = event.target.value.toLowerCase();

                          field.onChange(value);

                          if (isAddNew) {
                            updateGeneratedCode(value, undefined);
                          }
                        }}
                      />

                      {fieldState.error ? (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      ) : !isAddNew ? (
                        <small className="text-slate-500">
                          Resource is locked because it is used by Casbin
                          policies.
                        </small>
                      ) : (
                        <small className="text-slate-500">
                          Name of the protected resource, such as user,
                          employee, or attendance.
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="action"
                  className="text-sm font-medium text-slate-700"
                >
                  Action
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="action"
                  control={control}
                  rules={{
                    required: "Action is required.",
                    validate: {
                      noSpaces: (value) =>
                        !/\s/.test(value.trim()) ||
                        "Action must not contain spaces.",
                    },
                    maxLength: {
                      value: 100,
                      message: "Action cannot exceed 100 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="action"
                        autoComplete="off"
                        placeholder="Example: read"
                        disabled={isSaving || !isAddNew}
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
                        onChange={(event) => {
                          const value = event.target.value.toLowerCase();

                          field.onChange(value);

                          if (isAddNew) {
                            updateGeneratedCode(undefined, value);
                          }
                        }}
                      />

                      {fieldState.error ? (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      ) : !isAddNew ? (
                        <small className="text-slate-500">
                          Action is locked because it is used by Casbin
                          policies.
                        </small>
                      ) : (
                        <small className="text-slate-500">
                          Operation permitted on the resource, such as read,
                          create, update, or delete.
                        </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="code"
                  className="text-sm font-medium text-slate-700"
                >
                  Permission Code
                </label>

                <Controller
                  name="code"
                  control={control}
                  rules={{
                    required: "Permission code is required.",
                    maxLength: {
                      value: 201,
                      message: "Permission code is too long.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <IconField iconPosition="left" className="w-full">
                        <InputIcon className="pi pi-lock" />

                        <InputText
                          {...field}
                          value={field.value ?? ""}
                          id="code"
                          readOnly
                          placeholder="Generated from resource.action"
                          className={`w-full bg-slate-50 font-mono ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
                        />
                      </IconField>

                      {fieldState.error ? (
                        <small className="p-error">
                          {fieldState.error.message}
                        </small>
                      ) : (
                        <small className="text-slate-500">
                          Generated format: resource.action. Example: user.read.
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Display Information */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Display Information
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                Define the human-readable label and grouping used in permission
                management.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="label"
                  className="text-sm font-medium text-slate-700"
                >
                  Permission Label
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="label"
                  control={control}
                  rules={{
                    required: "Permission label is required.",
                    maxLength: {
                      value: 150,
                      message: "Permission label cannot exceed 150 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="label"
                        autoComplete="off"
                        placeholder="Example: View Users"
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
                  htmlFor="group_name"
                  className="text-sm font-medium text-slate-700"
                >
                  Permission Group
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="group_name"
                  control={control}
                  rules={{
                    required: "Permission group is required.",
                    maxLength: {
                      value: 150,
                      message: "Permission group cannot exceed 150 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        value={field.value ?? ""}
                        id="group_name"
                        autoComplete="off"
                        placeholder="Example: User Management"
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
                          Groups related permissions together in the
                          role-permission interface.
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </div>
          </section>

          {/* Active Status */}
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
                      Inactive permissions remain stored but should not be
                      assigned to roles or used for new access policies.
                    </p>
                  </div>

                  <InputSwitch
                    id="is_active"
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
    </>
  );
};

export default PermissionsTableData;
