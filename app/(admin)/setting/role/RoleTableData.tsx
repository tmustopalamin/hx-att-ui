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
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  createRole,
  deleteRole,
  purgeRole,
  restoreRole,
  updateRole,
} from "@/app/services/role-service";

import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import { Role } from "@/app/types/role";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const EMPTY_ROLE: Role = {
  id: 0,
  code: "",
  name: "",
  description: "",
  is_active: true,
  deleted_at: "",
  row_version: 0,
};

const getBody = () => document.body;

const RoleTableData = () => {
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const rolePermissions = new Set(profileState.permissions);
  const canCreateRole = rolePermissions.has("role.create");
  const canUpdateRole = rolePermissions.has("role.update");
  const canDeleteRole = rolePermissions.has("role.delete");
  const canRestoreRole = rolePermissions.has("role.restore");
  const canPurgeRole = rolePermissions.has("role.purge");

  const [selectedData, setSelectedData] = useState<Role | null>(null);

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

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Role");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/roles?show_all=${isShowDeletedDataChecked}`;

  const {
    data: roleData,
    error,
    isLoading,
    isValidating,
    mutate: refreshRoleData,
  } = useSWR<Role[]>(currentKey, fetcher);

  const { control, handleSubmit, setFocus, reset, clearErrors } = useForm<Role>(
    {
      defaultValues: EMPTY_ROLE,
      mode: "onTouched",
    },
  );

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

  const normalizeRoleForm = (data: Role): Role => {
    return {
      ...data,
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
      is_active: Boolean(data.is_active),
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Role");
    clearErrors();
    reset(EMPTY_ROLE);
  };

  const handleRefresh = async () => {
    try {
      await refreshRoleData();
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
    setPopupHeaderTitle("New Role");
    reset(EMPTY_ROLE);
    setVisible(true);
  };

  const onClickUpdate = (data: Role) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Role");

    reset({
      ...data,
      code: data.code ?? "",
      name: data.name ?? "",
      description: data.description ?? "",
      is_active: Boolean(data.is_active),
      deleted_at: data.deleted_at ?? "",
      row_version: data.row_version,
    });

    setVisible(true);
  };

  const handleSubmitNew = async (data: Role) => {
    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createRole(normalizeRoleForm(data));

      await refreshRoleData();

      handleCloseDialog();

      showSuccess(response.message || "Role created successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: Role) => {
    if (!selectedData) {
      showError(new Error("Role data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const payload = {
        ...normalizeRoleForm(data),

        /*
         * Role code tidak boleh berubah
         * karena digunakan oleh Casbin.
         */
        code: selectedData.code,
      };

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updateRole(selectedData.id, selectedData.row_version, payload);

      await refreshRoleData();

      handleCloseDialog();

      showSuccess(response.message || "Role updated successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: Role) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteRole(data.id, data.row_version);

      await refreshRoleData();

      showSuccess(response.message || "Role deleted successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: Role) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreRole(data.id, data.row_version);

      await refreshRoleData();

      showSuccess(response.message || "Role restored successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: Role) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> = await purgeRole(
        data.id,
      );

      await refreshRoleData();

      showSuccess(response.message || "Role permanently deleted.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: Role) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: Role) => {
    confirmDialog({
      header: "Delete Role",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this role?
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>
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

  const onClickRestore = (data: Role) => {
    confirmDialog({
      header: "Restore Role",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this role?
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

  const onClickPurge = (data: Role) => {
    confirmDialog({
      header: "Delete Role Permanently",
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">
            This action cannot be undone. Permanently delete:
          </span>

          <span className="font-semibold text-slate-800">{data.name}</span>

          <span className="text-xs text-slate-500">Role code: {data.code}</span>
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

  const statusColumnBody = (rowData: Role) => {
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

  const descriptionColumnBody = (rowData: Role) => {
    if (!rowData.description) {
      return <span className="text-sm text-slate-400">No description</span>;
    }

    return (
      <span
        className="block max-w-lg truncate text-sm text-slate-600"
        title={rowData.description}
      >
        {rowData.description}
      </span>
    );
  };

  const actionColumnBody = (rowData: Role) => {
    const isDeleted = Boolean(rowData.deleted_at);

    if (isDeleted) {
      if (!canRestoreRole && !canPurgeRole) {
        return <span className="text-sm text-slate-400">No action</span>;
      }

      return (
        <div className="flex flex-nowrap items-center justify-end gap-2">
          {canRestoreRole && (
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

          {canPurgeRole && (
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
        {canUpdateRole && (
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

        {canDeleteRole && (
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
        form="role-form"
        label={isAddNew ? "Create Role" : "Save Changes"}
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
                <i className="pi pi-shield text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Role
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage system access roles used by users and Casbin
                  authorization policies.
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

              {canCreateRole && (
                <Button
                  type="button"
                  label="New Role"
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
                placeholder="Search code, name, or description"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Role Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={roleData ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={["code", "name", "description"]}
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
                minWidth: "68rem",
              }}
              emptyMessage="No role data found."
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
                header="Role Code"
                sortable
                style={{
                  minWidth: "12rem",
                }}
                body={(rowData: Role) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {rowData.code}
                  </span>
                )}
              />

              <Column
                field="name"
                header="Role Name"
                sortable
                style={{
                  minWidth: "17rem",
                }}
                body={(rowData: Role) => (
                  <span className="font-medium text-slate-800">
                    {rowData.name}
                  </span>
                )}
              />

              <Column
                field="description"
                header="Description"
                sortable
                body={descriptionColumnBody}
                style={{
                  minWidth: "24rem",
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

      {/* Role Form Dialog */}
      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{
          width: "95vw",
          maxWidth: "42rem",
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
            if (isAddNew) {
              setFocus("code");
              return;
            }

            setFocus("name");
          }, 0);
        }}
      >
        <form
          id="role-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 pt-2"
        >
          {/* Basic Information */}
          <section className="flex flex-col gap-5">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Role Information
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                Define the role identity used for system access and Casbin
                policies.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="code"
                className="text-sm font-medium text-slate-700"
              >
                Role Code
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="code"
                control={control}
                rules={{
                  required: "Role code is required.",
                  validate: {
                    noSpaces: (value) =>
                      !/\s/.test(value) || "Role code must not contain spaces.",
                  },
                  maxLength: {
                    value: 50,
                    message: "Role code cannot exceed 50 characters.",
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      {...field}
                      value={field.value ?? ""}
                      id="code"
                      autoComplete="off"
                      placeholder="Example: admin"
                      disabled={isSaving || !isAddNew}
                      className={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                    />

                    {fieldState.error ? (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    ) : !isAddNew ? (
                      <small className="text-slate-500">
                        Role code is locked because it is used by Casbin
                        policies.
                      </small>
                    ) : (
                      <small className="text-slate-500">
                        Use a unique code without spaces.
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
                Role Name
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="name"
                control={control}
                rules={{
                  required: "Role name is required.",
                  maxLength: {
                    value: 100,
                    message: "Role name cannot exceed 100 characters.",
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      {...field}
                      value={field.value ?? ""}
                      id="name"
                      autoComplete="off"
                      placeholder="Example: Administrator"
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
                htmlFor="description"
                className="text-sm font-medium text-slate-700"
              >
                Description
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="description"
                control={control}
                rules={{
                  required: "Role description is required.",
                  maxLength: {
                    value: 500,
                    message: "Description cannot exceed 500 characters.",
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputTextarea
                      {...field}
                      value={field.value ?? ""}
                      id="description"
                      rows={4}
                      autoResize
                      disabled={isSaving}
                      placeholder="Explain the access and responsibility of this role"
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
                      Inactive roles remain stored but should not be assigned to
                      new users.
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

export default RoleTableData;
