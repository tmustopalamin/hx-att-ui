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
  createAgency,
  deleteAgency,
  purgeAgency,
  restoreAgency,
  updateAgency,
} from "@/app/services/agency-service";

import { Agency } from "@/app/types/agency";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { hasRole } from "@/app/utils/role-utils";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const EMPTY_AGENCY: Agency = {
  id: 0,
  code: "",
  name: "",
  address: "",
  phone_number1: "",
  phone_number2: "",
  is_active: true,
  deleted_at: null,
  row_version: 0,
};

const getBody = () => document.body;

const AgencyTableData = () => {
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<Agency | null>(null);

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

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Agency");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/agency?show_all=${isShowDeletedDataChecked}`;

  const {
    data: agencyData,
    error,
    isLoading,
    isValidating,
    mutate: refreshAgencyData,
  } = useSWR<Agency[]>(currentKey, fetcher);

  const { control, handleSubmit, setFocus, reset, clearErrors } =
    useForm<Agency>({
      defaultValues: EMPTY_AGENCY,
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

  const normalizeAgencyForm = (data: Agency): Agency => {
    return {
      ...data,
      code: data.code.trim(),
      name: data.name.trim(),
      address: data.address.trim(),
      phone_number1: data.phone_number1.trim(),
      phone_number2: data.phone_number2?.trim() || null,
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Agency");
    clearErrors();
    reset(EMPTY_AGENCY);
  };

  const handleRefresh = async () => {
    try {
      await refreshAgencyData();
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
    setPopupHeaderTitle("New Agency");
    reset(EMPTY_AGENCY);
    setVisible(true);
  };

  const onClickUpdate = (data: Agency) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Agency");

    reset({
      ...data,
      phone_number2: data.phone_number2 ?? "",
      deleted_at: data.deleted_at ?? null,
    });

    setVisible(true);
  };

  const handleSubmitNew = async (data: Agency) => {
    try {
      setIsSaving(true);

      const response = await createAgency(normalizeAgencyForm(data));

      await refreshAgencyData();

      handleCloseDialog();

      showSuccess(response.message ?? "Agency created successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: Agency) => {
    if (!selectedData) {
      showError(new Error("Agency data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const response = await updateAgency(
        selectedData.id,
        selectedData.row_version,
        normalizeAgencyForm(data),
      );

      await refreshAgencyData();

      handleCloseDialog();

      showSuccess(response.message ?? "Agency updated successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: Agency) => {
    try {
      const response = await deleteAgency(data.id, data.row_version);

      await refreshAgencyData();

      showSuccess(response.message ?? "Agency deleted successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: Agency) => {
    try {
      const response = await restoreAgency(data.id, data.row_version);

      await refreshAgencyData();

      showSuccess(response.message ?? "Agency restored successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: Agency) => {
    try {
      const response = await purgeAgency(data.id);

      await refreshAgencyData();

      showSuccess(response.message ?? "Agency permanently deleted.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: Agency) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: Agency) => {
    confirmDialog({
      header: "Delete Agency",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this agency?
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

  const onClickRestore = (data: Agency) => {
    confirmDialog({
      header: "Restore Agency",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this agency?
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

  const onClickPurge = (data: Agency) => {
    confirmDialog({
      header: "Delete Agency Permanently",
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

  const statusColumnBody = (rowData: Agency) => {
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

  const phoneColumnBody = (value: string | null | undefined) => {
    if (!value) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span className="whitespace-nowrap text-sm text-slate-700">{value}</span>
    );
  };

  const addressColumnBody = (rowData: Agency) => {
    if (!rowData.address) {
      return <span className="text-sm text-slate-400">No address</span>;
    }

    return (
      <span
        className="block max-w-md truncate text-sm text-slate-600"
        title={rowData.address}
      >
        {rowData.address}
      </span>
    );
  };

  const actionColumnBody = (rowData: Agency) => {
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
        form="agency-form"
        label={isAddNew ? "Create Agency" : "Save Changes"}
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
                <i className="pi pi-building text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Agency
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage employing companies, legal entities, and agency contact
                  details.
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
                label="New Agency"
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
                placeholder="Search agency or contact details"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Agency Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={agencyData ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "code",
                "name",
                "address",
                "phone_number1",
                "phone_number2",
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
              emptyMessage="No agency data found."
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
                body={(rowData: Agency) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {rowData.code}
                  </span>
                )}
              />

              <Column
                field="name"
                header="Agency Name"
                sortable
                style={{
                  minWidth: "18rem",
                }}
                body={(rowData: Agency) => (
                  <span className="font-medium text-slate-800">
                    {rowData.name}
                  </span>
                )}
              />

              <Column
                field="phone_number1"
                header="Primary Phone"
                sortable
                body={(rowData: Agency) =>
                  phoneColumnBody(rowData.phone_number1)
                }
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                field="phone_number2"
                header="Secondary Phone"
                sortable
                body={(rowData: Agency) =>
                  phoneColumnBody(rowData.phone_number2)
                }
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                field="address"
                header="Address"
                sortable
                body={addressColumnBody}
                style={{
                  minWidth: "22rem",
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

      {/* Agency Form Dialog */}
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
            setFocus("code");
          }, 0);
        }}
      >
        <form
          id="agency-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="code"
              className="text-sm font-medium text-slate-700"
            >
              Agency Code
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="code"
              control={control}
              rules={{
                required: "Agency code is required.",
                validate: {
                  noSpaces: (value) =>
                    !/\s/.test(value) || "Agency code must not contain spaces.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    id="code"
                    autoComplete="off"
                    placeholder="Example: AMG"
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
                      Use a short and unique agency code.
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
              Agency Name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="name"
              control={control}
              rules={{
                required: "Agency name is required.",
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    id="name"
                    autoComplete="off"
                    placeholder="Example: Asahimas"
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
              htmlFor="phone_number1"
              className="text-sm font-medium text-slate-700"
            >
              Primary Phone
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="phone_number1"
              control={control}
              rules={{
                required: "Primary phone number is required.",
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    id="phone_number1"
                    autoComplete="off"
                    placeholder="Example: +62 21 1234 5678"
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
              htmlFor="phone_number2"
              className="text-sm font-medium text-slate-700"
            >
              Secondary Phone
            </label>

            <Controller
              name="phone_number2"
              control={control}
              render={({ field }) => (
                <>
                  <InputText
                    {...field}
                    value={field.value ?? ""}
                    id="phone_number2"
                    autoComplete="off"
                    placeholder="Optional secondary phone"
                    className="w-full"
                  />

                  <small className="text-slate-500">
                    Optional alternate contact number.
                  </small>
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-2 md:col-span-2">
            <label
              htmlFor="address"
              className="text-sm font-medium text-slate-700"
            >
              Address
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="address"
              control={control}
              rules={{
                required: "Agency address is required.",
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputTextarea
                    {...field}
                    id="address"
                    rows={4}
                    autoResize
                    placeholder="Enter the agency's complete address"
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

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
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
                      Inactive agencies remain stored but should not be
                      available for branch or employee employment records.
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

export default AgencyTableData;
