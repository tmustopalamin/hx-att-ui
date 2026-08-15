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
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  createLeaveType,
  deleteLeaveType,
  purgeLeaveType,
  restoreLeaveType,
  updateLeaveType,
} from "@/app/services/leave-type-service";

import { LeaveType } from "@/app/types/leave-type";
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

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const DEFAULT_FORM_VALUE: LeaveType = {
  id: 0,
  code: "",
  name: "",
  description: "",
  is_paid: true,
  is_deductible: true,
  max_days: null,
  carry_forward: false,
  is_active: true,
  deleted_at: null,
  row_version: 0,
  requires_attachment: false,
  requires_reason: true,
  requires_approval: true,
};

const getBody = () => document.body;

const LeaveTypeTableData = () => {
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("master-data");

  const [selectedData, setSelectedData] = useState<LeaveType | null>(null);

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

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Leave Type");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/leave-type?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`;

  const {
    data: leaveTypeData,
    error,
    isLoading,
    isValidating,
    mutate: refreshLeaveTypeData,
  } = useSWR<LeaveType[]>(currentKey, fetcher);

  const { control, handleSubmit, setFocus, reset, clearErrors } =
    useForm<LeaveType>({
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

  const normalizeLeaveTypeForm = (data: LeaveType): LeaveType => {
    return {
      ...data,
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
      max_days:
        data.max_days === null || data.max_days === undefined
          ? null
          : Number(data.max_days),
      is_active: Boolean(data.is_active),
      is_paid: Boolean(data.is_paid),
      is_deductible: Boolean(data.is_deductible),
      carry_forward: Boolean(data.carry_forward),
      requires_attachment: Boolean(data.requires_attachment),
      requires_reason: Boolean(data.requires_reason),
      requires_approval: Boolean(data.requires_approval),
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Leave Type");
    clearErrors();
    reset(DEFAULT_FORM_VALUE);
  };

  const handleRefresh = async () => {
    try {
      await refreshLeaveTypeData();
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
    setPopupHeaderTitle("New Leave Type");
    reset(DEFAULT_FORM_VALUE);
    setVisible(true);
  };

  const onClickUpdate = (data: LeaveType) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Leave Type");

    reset({
      ...data,
      code: data.code ?? "",
      name: data.name ?? "",
      description: data.description ?? "",
      max_days: data.max_days ?? null,
      deleted_at: data.deleted_at ?? null,
      is_active: Boolean(data.is_active),
      is_paid: Boolean(data.is_paid),
      is_deductible: Boolean(data.is_deductible),
      carry_forward: Boolean(data.carry_forward),
      requires_attachment: Boolean(data.requires_attachment),
      requires_reason: data.requires_reason ?? true,
      requires_approval: data.requires_approval ?? true,
    });

    setVisible(true);
  };

  const handleSubmitNew = async (data: LeaveType) => {
    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createLeaveType(normalizeLeaveTypeForm(data));

      await refreshLeaveTypeData();

      handleCloseDialog();

      showSuccess(response.message || "Leave type created successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: LeaveType) => {
    if (!selectedData) {
      showError(new Error("Leave type data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updateLeaveType(
          selectedData.id,
          selectedData.row_version,
          normalizeLeaveTypeForm(data),
        );

      await refreshLeaveTypeData();

      handleCloseDialog();

      showSuccess(response.message || "Leave type updated successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: LeaveType) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteLeaveType(data.id, data.row_version);

      await refreshLeaveTypeData();

      showSuccess(response.message || "Leave type deleted successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: LeaveType) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreLeaveType(data.id, data.row_version);

      await refreshLeaveTypeData();

      showSuccess(response.message || "Leave type restored successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: LeaveType) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgeLeaveType(data.id);

      await refreshLeaveTypeData();

      showSuccess(response.message || "Leave type permanently deleted.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: LeaveType) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: LeaveType) => {
    requestActionConfirmation({
      header: "Delete Leave Type",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this leave type?
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

  const onClickRestore = (data: LeaveType) => {
    requestActionConfirmation({
      header: "Restore Leave Type",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this leave type?
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

  const onClickPurge = (data: LeaveType) => {
    requestActionConfirmation({
      header: "Delete Leave Type Permanently",
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

  const statusColumnBody = (rowData: LeaveType) => {
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

  const booleanColumnBody = (
    value: boolean,
    trueLabel = "Yes",
    falseLabel = "No",
  ) => {
    if (value) {
      return (
        <Tag value={trueLabel} severity="success" icon="pi pi-check" rounded />
      );
    }

    return (
      <Tag value={falseLabel} severity="secondary" icon="pi pi-times" rounded />
    );
  };

  const descriptionColumnBody = (rowData: LeaveType) => {
    if (!rowData.description) {
      return <span className="text-sm text-slate-400">No description</span>;
    }

    return (
      <span
        className="block max-w-md truncate text-sm text-slate-600"
        title={rowData.description}
      >
        {rowData.description}
      </span>
    );
  };

  const maxDaysColumnBody = (rowData: LeaveType) => {
    if (rowData.max_days === null || rowData.max_days === undefined) {
      return <span className="text-sm text-slate-400">No limit</span>;
    }

    return (
      <span className="whitespace-nowrap text-sm font-medium text-slate-700">
        {rowData.max_days} day(s)
      </span>
    );
  };

  const actionColumnBody = (rowData: LeaveType) => {
    const isDeleted = Boolean(rowData.deleted_at);

    const isSuperadmin = archivedAccess.canShowDeleted;

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
        form="leave-type-form"
        label={isAddNew ? "Create Leave Type" : "Save Changes"}
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
                <i className="pi pi-calendar text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Leave Type
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage leave categories, balance rules, payment behavior, and
                  request requirements.
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
                label="New Leave Type"
                icon="pi pi-plus"
                size="small"
                className="w-full sm:w-auto"
                onClick={onClickNew}
              />
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {archivedAccess.canShowDeleted && (
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
            )}

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

          {/* Leave Type Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={leaveTypeData ?? []}
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
                minWidth: "112rem",
              }}
              emptyMessage="No leave type data found."
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
                body={(rowData: LeaveType) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {rowData.code}
                  </span>
                )}
              />

              <Column
                field="name"
                header="Leave Type"
                sortable
                style={{
                  minWidth: "17rem",
                }}
                body={(rowData: LeaveType) => (
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
                  minWidth: "21rem",
                }}
              />

              <Column
                field="is_paid"
                header="Paid"
                sortable
                body={(rowData: LeaveType) =>
                  booleanColumnBody(rowData.is_paid)
                }
                style={{
                  minWidth: "8rem",
                }}
              />

              <Column
                field="is_deductible"
                header="Deduct Balance"
                sortable
                body={(rowData: LeaveType) =>
                  booleanColumnBody(rowData.is_deductible)
                }
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="max_days"
                header="Maximum Days"
                sortable
                body={maxDaysColumnBody}
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="carry_forward"
                header="Carry Forward"
                sortable
                body={(rowData: LeaveType) =>
                  booleanColumnBody(rowData.carry_forward)
                }
                style={{
                  minWidth: "11rem",
                }}
              />

              <Column
                field="requires_attachment"
                header="Attachment"
                sortable
                body={(rowData: LeaveType) =>
                  booleanColumnBody(
                    rowData.requires_attachment,
                    "Required",
                    "Optional",
                  )
                }
                style={{
                  minWidth: "12rem",
                }}
              />

              <Column
                field="requires_reason"
                header="Reason"
                sortable
                body={(rowData: LeaveType) =>
                  booleanColumnBody(
                    rowData.requires_reason,
                    "Required",
                    "Optional",
                  )
                }
                style={{
                  minWidth: "11rem",
                }}
              />

              <Column
                field="requires_approval"
                header="Approval"
                sortable
                body={(rowData: LeaveType) =>
                  booleanColumnBody(
                    rowData.requires_approval,
                    "Required",
                    "Not required",
                  )
                }
                style={{
                  minWidth: "13rem",
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

      {/* Leave Type Form Dialog */}
      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{
          width: "95vw",
          maxWidth: "58rem",
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
          id="leave-type-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 pt-2"
        >
          {/* Basic Information */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Basic Information
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                Define the identity and purpose of this leave type.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="code"
                  className="text-sm font-medium text-slate-700"
                >
                  Leave Type Code
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="code"
                  control={control}
                  rules={{
                    required: "Leave type code is required.",
                    validate: {
                      noSpaces: (value) =>
                        !/\s/.test(value) ||
                        "Leave type code must not contain spaces.",
                    },
                    maxLength: {
                      value: 50,
                      message: "Leave type code cannot exceed 50 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        id="code"
                        autoComplete="off"
                        placeholder="Example: ANNUAL"
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
                          Code cannot be changed after creation.
                        </small>
                      ) : (
                        <small className="text-slate-500">
                          Use a short and unique leave type code.
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
                  Leave Type Name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Controller
                  name="name"
                  control={control}
                  rules={{
                    required: "Leave type name is required.",
                    maxLength: {
                      value: 100,
                      message: "Leave type name cannot exceed 100 characters.",
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputText
                        {...field}
                        id="name"
                        autoComplete="off"
                        placeholder="Example: Annual Leave"
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

              <div className="flex flex-col gap-2 md:col-span-2">
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
                    required: "Description is required.",
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
                        placeholder="Explain the purpose and rules of this leave type"
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
            </div>
          </section>

          {/* Leave Configuration */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Leave Configuration
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                Configure limits, payment behavior, balance deduction, and
                carry-forward rules.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="max_days"
                className="text-sm font-medium text-slate-700"
              >
                Maximum Days
              </label>

              <Controller
                name="max_days"
                control={control}
                rules={{
                  min: {
                    value: 0,
                    message: "Maximum days cannot be negative.",
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputNumber
                      id="max_days"
                      inputRef={field.ref}
                      value={field.value ?? null}
                      min={0}
                      useGrouping={false}
                      suffix=" day(s)"
                      disabled={isSaving}
                      placeholder="Leave empty if there is no limit"
                      className={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
                      }`}
                      onBlur={field.onBlur}
                      onValueChange={(event) =>
                        field.onChange(event.value ?? null)
                      }
                    />

                    {fieldState.error ? (
                      <small className="p-error">
                        {fieldState.error.message}
                      </small>
                    ) : (
                      <small className="text-slate-500">
                        Leave empty when this leave type has no fixed maximum.
                      </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="is_paid"
                  control={control}
                  defaultValue
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="is_paid"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          Paid Leave
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          Employees continue receiving normal pay while using
                          this leave.
                        </p>
                      </div>

                      <InputSwitch
                        id="is_paid"
                        checked={Boolean(field.value)}
                        disabled={isSaving}
                        onChange={(event) => field.onChange(event.value)}
                      />
                    </div>
                  )}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="is_deductible"
                  control={control}
                  defaultValue
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="is_deductible"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          Deduct from Balance
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          Approved leave reduces the employee leave balance.
                        </p>
                      </div>

                      <InputSwitch
                        id="is_deductible"
                        checked={Boolean(field.value)}
                        disabled={isSaving}
                        onChange={(event) => field.onChange(event.value)}
                      />
                    </div>
                  )}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="carry_forward"
                  control={control}
                  defaultValue={false}
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="carry_forward"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          Carry Forward
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          Unused leave balance may be carried into the next
                          period.
                        </p>
                      </div>

                      <InputSwitch
                        id="carry_forward"
                        checked={Boolean(field.value)}
                        disabled={isSaving}
                        onChange={(event) => field.onChange(event.value)}
                      />
                    </div>
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
                          Inactive leave types cannot be selected in new leave
                          requests.
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
            </div>
          </section>

          {/* Request Requirements */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                Request Requirements
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                Define the information and workflow required when employees
                request this leave type.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="requires_attachment"
                  control={control}
                  defaultValue={false}
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="requires_attachment"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          Requires Attachment
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          Supporting documents must be included in the request.
                        </p>
                      </div>

                      <InputSwitch
                        id="requires_attachment"
                        checked={Boolean(field.value)}
                        disabled={isSaving}
                        onChange={(event) => field.onChange(event.value)}
                      />
                    </div>
                  )}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="requires_reason"
                  control={control}
                  defaultValue
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="requires_reason"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          Requires Reason
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          Employees must provide a reason before submitting.
                        </p>
                      </div>

                      <InputSwitch
                        id="requires_reason"
                        checked={Boolean(field.value)}
                        disabled={isSaving}
                        onChange={(event) => field.onChange(event.value)}
                      />
                    </div>
                  )}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="requires_approval"
                  control={control}
                  defaultValue
                  render={({ field }) => (
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="requires_approval"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          Requires Approval
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          The request must complete an approval flow before
                          becoming final.
                        </p>
                      </div>

                      <InputSwitch
                        id="requires_approval"
                        checked={Boolean(field.value)}
                        disabled={isSaving}
                        onChange={(event) => field.onChange(event.value)}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          </section>
        </form>
      </Dialog>
    </>
  );
};

export default LeaveTypeTableData;
