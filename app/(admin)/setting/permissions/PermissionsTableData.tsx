"use client";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";
import { Controller, useForm } from "react-hook-form";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { InputSwitch } from "primereact/inputswitch";
import { useRef, useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/app/utils/fetcher";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { useDispatch, useSelector } from "react-redux";
import { Tag } from "primereact/tag";
import { Checkbox } from "primereact/checkbox";
import { RootState } from "@/store/store";
import { hasRole } from "@/app/utils/role-utils";
import { Permissions } from "@/app/types/permissions";
import {
  createPermissions,
  updatePermissions,
  deletePermissions,
  purgePermissions,
  restorePermissions,
} from "@/app/services/permissions-service";

const defaultFormValue: Permissions = {
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

const PermissionsTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<Permissions | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });

  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/permissions?show_all=${isShowDeletedDataChecked}`;

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { isValid },
    reset,
    clearErrors,
  } = useForm<Permissions>({
    defaultValues: defaultFormValue,
    mode: "onTouched",
  });

  const debounce = (func: any, delay: number) => {
    let timeout: any;

    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const debounceUpdateCode = useRef(
    debounce((resource: string, action: string) => {
      const normalizedResource = (resource ?? "").trim().toLowerCase();
      const normalizedAction = (action ?? "").trim().toLowerCase();

      if (!normalizedResource) {
        setValue("code", "");
        return;
      }

      if (!normalizedAction) {
        setValue("code", normalizedResource);
        return;
      }

      setValue("code", `${normalizedResource}.${normalizedAction}`);
    }, 300),
  ).current;

  const {
    data: permissionsData,
    error,
    isLoading,
  } = useSWR<Permissions[]>(currentKey, fetcher);

  const refreshData = async () => {
    await mutate(currentKey);
  };

  if (isLoading) return <LoadingDataTable />;
  if (error)
    return (
      <ErrorNotConnectedToApi mutateKey="/api/permissions?show_all=true" />
    );

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });

    setGlobalFilterValue(value);
  };

  const onShowDeletedChange = () => {
    setIsShowDeletedDataChecked((prev) => !prev);
  };

  const handleDialogHide = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    reset(defaultFormValue);
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Permissions");
    reset(defaultFormValue);
  };

  const onClickUpdate = (data: Permissions) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle("Update Permissions");

    reset({
      id: data.id,
      code: data.code,
      resource: data.resource,
      action: data.action,
      label: data.label,
      group_name: data.group_name,
      is_active: data.is_active,
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });
  };

  const handleSubmitNew = async (data: Permissions) => {
    try {
      setIsSaving(true);

      const payload: Permissions = {
        ...data,
        code: data.code.trim().toLowerCase(),
        resource: data.resource.trim().toLowerCase(),
        action: data.action.trim().toLowerCase(),
        label: data.label.trim(),
        group_name: data.group_name.trim(),
      };

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createPermissions(payload);

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message || "Permission created successfully.",
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: Permissions) => {
    if (!selectedData) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: "Please select data first.",
        }),
      );
      return;
    }

    try {
      setIsSaving(true);

      const payload: Permissions = {
        ...data,

        // Saat update, code/resource/action tetap ambil dari selectedData
        // supaya tidak berubah walaupun field disabled.
        code: selectedData.code,
        resource: selectedData.resource,
        action: selectedData.action,

        label: data.label.trim(),
        group_name: data.group_name.trim(),
      };

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await updatePermissions(
          selectedData.id,
          selectedData.row_version,
          payload,
        );

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message || "Permission updated successfully.",
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
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: Permissions) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deletePermissions(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message || "Permission deleted successfully.",
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

  const handleRestore = async (data: Permissions) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restorePermissions(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message || "Permission restored successfully.",
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

  const handlePurge = async (data: Permissions) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgePermissions(data.id);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message || "Permission deleted permanently.",
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

  const onSubmit = async (data: Permissions) => {
    if (!isValid || isSaving) return;

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: Permissions) => {
    confirmDialog({
      message: "Do you want to delete this permission?",
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
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const onClickRestore = (data: Permissions) => {
    confirmDialog({
      message: "Do you want to restore this permission?",
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
            className="p-button-success"
          />
        </div>
      ),
    });
  };

  const onClickPurge = (data: Permissions) => {
    confirmDialog({
      message: "Do you want to delete this permission forever?",
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
            className="p-button-danger"
          />
        </div>
      ),
    });
  };

  const activeColumnBody = (rowData: Permissions) => {
    if (rowData.deleted_at) {
      return <Tag value="Deleted" severity="secondary" />;
    }

    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  const actionColumnBody = (rowData: Permissions) => {
    return (
      <div className="flex flex-wrap gap-2">
        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && (
          <Button
            tooltip="restore"
            rounded
            severity="success"
            icon="pi pi-refresh"
            size="small"
            onClick={() => onClickRestore(rowData)}
          />
        )}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && (
          <Button
            tooltip="delete forever"
            rounded
            severity="secondary"
            icon="pi pi-times"
            size="small"
            onClick={() => onClickPurge(rowData)}
          />
        )}

        {!rowData.deleted_at && (
          <>
            <Button
              tooltip="delete"
              rounded
              severity="danger"
              icon="pi pi-trash"
              size="small"
              onClick={() => onClickDelete(rowData)}
            />

            <Button
              tooltip="update"
              rounded
              severity="help"
              icon="pi pi-pencil"
              size="small"
              onClick={() => onClickUpdate(rowData)}
            />
          </>
        )}
      </div>
    );
  };

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        onClick={handleDialogHide}
        className="p-button-text"
        disabled={isSaving}
      />
      <Button
        type="submit"
        label={isSaving ? "Saving..." : isAddNew ? "Submit" : "Save"}
        icon={isSaving ? "pi pi-spin pi-spinner" : "pi pi-check"}
        disabled={isSaving}
      />
    </div>
  );

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-3 border-b pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-2xl font-semibold">Permissions</div>
              <div className="text-sm text-gray-500">
                Manage permissions master data
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              {hasRole(profileState.role, ["superadmin"]) && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    inputId="showDeletedData"
                    name="showDeletedData"
                    checked={isShowDeletedDataChecked}
                    onChange={onShowDeletedChange}
                  />
                  <label htmlFor="showDeletedData">show deleted data</label>
                </div>
              )}

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="p-inputtext-sm"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Keyword Search"
                />
              </IconField>

              <Button
                label="New"
                icon="pi pi-plus"
                size="small"
                onClick={onClickNew}
              />
            </div>
          </div>

          <DataTable
            value={permissionsData}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={[
              "code",
              "label",
              "resource",
              "action",
              "group_name",
            ]}
            loading={isLoading}
            emptyMessage="No permissions found."
          >
            <Column
              header="#"
              body={(_, options) => options.rowIndex + 1}
              style={{ width: "4rem" }}
            />
            <Column field="code" header="Code" sortable />
            <Column field="label" header="Label" sortable />
            <Column field="resource" header="Resource" sortable />
            <Column field="action" header="Action" sortable />
            <Column field="group_name" header="Group" sortable />
            <Column field="is_active" header="Active" body={activeColumnBody} />
            <Column
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
              style={{ minWidth: "10rem" }}
              headerStyle={{ background: "#ffffff", zIndex: 1 }}
              bodyStyle={{ background: "#ffffff" }}
            />
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: "95vw", maxWidth: "720px" }}
          onHide={handleDialogHide}
          footer={footerContent}
          modal
          draggable={false}
          resizable={false}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Controller
              name="resource"
              control={control}
              rules={{ required: "*required" }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="resource">Resource</label>
                  <InputText
                    id="resource"
                    {...field}
                    disabled={!isAddNew}
                    placeholder="example: user"
                    className={fieldState.invalid ? "p-invalid" : ""}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().trim();
                      field.onChange(value);

                      if (isAddNew) {
                        debounceUpdateCode(value, getValues("action"));
                      }
                    }}
                  />
                  {fieldState.error && (
                    <small className="font-bold p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                  {!isAddNew && (
                    <small className="text-slate-500">
                      Resource is locked because it is used by Casbin policies.
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="action"
              control={control}
              rules={{ required: "*required" }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="action">Action</label>
                  <InputText
                    id="action"
                    {...field}
                    disabled={!isAddNew}
                    placeholder="example: read"
                    className={fieldState.invalid ? "p-invalid" : ""}
                    onChange={(e) => {
                      const value = e.target.value.toLowerCase().trim();
                      field.onChange(value);

                      if (isAddNew) {
                        debounceUpdateCode(getValues("resource"), value);
                      }
                    }}
                  />
                  {fieldState.error && (
                    <small className="font-bold p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                  {!isAddNew && (
                    <small className="text-slate-500">
                      Action is locked because it is used by Casbin policies.
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="code"
              control={control}
              rules={{ required: "*required" }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="code">Code</label>
                  <InputText
                    id="code"
                    {...field}
                    disabled
                    placeholder="auto generated from resource.action"
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="font-bold p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                  <small className="text-slate-500">
                    Code is generated from resource and action. Example:
                    user.read
                  </small>
                </div>
              )}
            />

            <Controller
              name="label"
              control={control}
              rules={{ required: "*required" }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="label">Label</label>
                  <InputText
                    id="label"
                    {...field}
                    placeholder="example: View Users"
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="font-bold p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="group_name"
              control={control}
              rules={{ required: "*required" }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="group_name">Group Name</label>
                  <InputText
                    id="group_name"
                    {...field}
                    placeholder="example: User Management"
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="font-bold p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="is_active">Active</label>
                  <div className="flex items-center gap-3">
                    <InputSwitch
                      inputId="is_active"
                      checked={field.value}
                      onChange={(e) => field.onChange(e.value)}
                    />
                    <span className="text-sm text-slate-600">
                      {field.value ? "Active" : "Inactive"}
                    </span>
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

export default PermissionsTableData;
