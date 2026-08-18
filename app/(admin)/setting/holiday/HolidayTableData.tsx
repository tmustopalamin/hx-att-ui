"use client";

import { ChangeEvent, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from "swr";
import dayjs from "dayjs";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
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
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  createHoliday,
  deleteHoliday,
  purgeHoliday,
  restoreHoliday,
  updateHoliday,
} from "@/app/services/holiday-service";

import { Holiday, HolidayForm } from "@/app/types/holiday";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const EMPTY_HOLIDAY: HolidayForm = {
  id: 0,
  code: "",
  name: "",
  holiday_date: null,
  holiday_type: "NATIONAL_HOLIDAY",
  description: "",
  is_active: true,
  deleted_at: null,
  row_version: 0,
};

const HOLIDAY_TYPE_OPTIONS = [
  {
    label: "National Holiday",
    value: "NATIONAL_HOLIDAY",
  },
  {
    label: "Company Holiday",
    value: "COMPANY_HOLIDAY",
  },
  {
    label: "Joint Leave",
    value: "JOINT_LEAVE",
  },
  {
    label: "Special Day",
    value: "SPECIAL_DAY",
  },
];

const getBody = () => document.body;

const getHolidayTypeLabel = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  const option = HOLIDAY_TYPE_OPTIONS.find((item) => item.value === value);

  return option?.label ?? value.replaceAll("_", " ");
};

const HolidayTableData = () => {
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("master-data");

  const [selectedData, setSelectedData] = useState<Holiday | null>(null);

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

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Holiday");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/holiday?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`;

  const {
    data: holidayData,
    error,
    isLoading,
    isValidating,
    mutate: refreshHolidayData,
  } = useSWR<Holiday[]>(currentKey, fetcher);

  const { control, handleSubmit, setFocus, reset, clearErrors } =
    useForm<HolidayForm>({
      defaultValues: EMPTY_HOLIDAY,
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

  const normalizeHolidayForm = (data: HolidayForm): HolidayForm => {
    return {
      ...data,
      code: data.code.trim(),
      name: data.name.trim(),
      description: data.description?.trim() ?? "",
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Holiday");
    clearErrors();
    reset(EMPTY_HOLIDAY);
  };

  const handleRefresh = async () => {
    try {
      await refreshHolidayData();
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
    setPopupHeaderTitle("New Holiday");
    reset(EMPTY_HOLIDAY);
    setVisible(true);
  };

  const onClickUpdate = (data: Holiday) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Holiday");

    reset({
      id: data.id,
      code: data.code,
      name: data.name,
      holiday_date: data.holiday_date
        ? dayjs(data.holiday_date).toDate()
        : null,
      holiday_type: data.holiday_type,
      description: data.description ?? "",
      is_active: data.is_active,
      deleted_at: data.deleted_at ?? null,
      row_version: data.row_version,
    });

    setVisible(true);
  };

  const handleSubmitNew = async (data: HolidayForm) => {
    try {
      setIsSaving(true);

      const response = await createHoliday(normalizeHolidayForm(data));

      await refreshHolidayData();

      handleCloseDialog();

      showSuccess(response.message ?? "Holiday created successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: HolidayForm) => {
    if (!selectedData) {
      showError(new Error("Holiday data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const response = await updateHoliday(
        selectedData.id,
        selectedData.row_version,
        normalizeHolidayForm(data),
      );

      await refreshHolidayData();

      handleCloseDialog();

      showSuccess(response.message ?? "Holiday updated successfully.");
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: Holiday) => {
    try {
      const response = await deleteHoliday(data.id, data);

      await refreshHolidayData();

      showSuccess(response.message ?? "Holiday deleted successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: Holiday) => {
    try {
      const response = await restoreHoliday(data.id, data);

      await refreshHolidayData();

      showSuccess(response.message ?? "Holiday restored successfully.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: Holiday) => {
    try {
      const response = await purgeHoliday(data.id);

      await refreshHolidayData();

      showSuccess(response.message ?? "Holiday permanently deleted.");
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: HolidayForm) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: Holiday) => {
    requestActionConfirmation({
      header: "Delete Holiday",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this holiday?
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

  const onClickRestore = (data: Holiday) => {
    requestActionConfirmation({
      header: "Restore Holiday",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this holiday?
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

  const onClickPurge = (data: Holiday) => {
    requestActionConfirmation({
      header: "Delete Holiday Permanently",
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

  const dateColumnBody = (rowData: Holiday) => {
    if (!rowData.holiday_date) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <div className="flex items-center gap-2">
        <i className="pi pi-calendar text-xs text-slate-400" />

        <span className="whitespace-nowrap text-sm font-medium text-slate-700">
          {formatDisplayDate(rowData.holiday_date)}
        </span>
      </div>
    );
  };

  const typeColumnBody = (rowData: Holiday) => {
    return (
      <Tag
        value={getHolidayTypeLabel(rowData.holiday_type)}
        severity="info"
        rounded
      />
    );
  };

  const descriptionColumnBody = (rowData: Holiday) => {
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

  const statusColumnBody = (rowData: Holiday) => {
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

  const actionColumnBody = (rowData: Holiday) => {
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
        form="holiday-form"
        label={isAddNew ? "Create Holiday" : "Save Changes"}
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
                  Holiday
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage national holidays, company holidays, joint leave, and
                  special days.
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
                label="New Holiday"
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
                placeholder="Search holiday, type, or date"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Holiday Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={holidayData ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "code",
                "name",
                "holiday_type",
                "description",
                "holiday_date",
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
                minWidth: "78rem",
              }}
              emptyMessage="No holiday data found."
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
                  minWidth: "11rem",
                }}
                body={(rowData: Holiday) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {rowData.code}
                  </span>
                )}
              />

              <Column
                field="name"
                header="Holiday Name"
                sortable
                style={{
                  minWidth: "18rem",
                }}
                body={(rowData: Holiday) => (
                  <span className="font-medium text-slate-800">
                    {rowData.name}
                  </span>
                )}
              />

              <Column
                field="holiday_date"
                header="Holiday Date"
                sortable
                body={dateColumnBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                field="holiday_type"
                header="Holiday Type"
                sortable
                body={typeColumnBody}
                style={{
                  minWidth: "15rem",
                }}
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

      {/* Holiday Form Dialog */}
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
          id="holiday-form"
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="code"
              className="text-sm font-medium text-slate-700"
            >
              Holiday Code
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="code"
              control={control}
              rules={{
                required: "Holiday code is required.",
                validate: {
                  noSpaces: (value) =>
                    !/\s/.test(value) ||
                    "Holiday code must not contain spaces.",
                },
                maxLength: {
                  value: 50,
                  message: "Holiday code cannot exceed 50 characters.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    value={field.value ?? ""}
                    id="code"
                    autoComplete="off"
                    placeholder="Example: NEW_YEAR"
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
                      Use a short and unique holiday code.
                    </small>
                  )}
                </>
              )}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="holiday_type"
              className="text-sm font-medium text-slate-700"
            >
              Holiday Type
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="holiday_type"
              control={control}
              rules={{
                required: "Holiday type is required.",
              }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    id="holiday_type"
                    appendTo={getBody}
                    value={field.value}
                    options={HOLIDAY_TYPE_OPTIONS}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select holiday type"
                    className={`w-full ${
                      fieldState.invalid ? "p-invalid" : ""
                    }`}
                    onChange={(event) => field.onChange(event.value)}
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
              htmlFor="name"
              className="text-sm font-medium text-slate-700"
            >
              Holiday Name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="name"
              control={control}
              rules={{
                required: "Holiday name is required.",
                maxLength: {
                  value: 100,
                  message: "Holiday name cannot exceed 100 characters.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    value={field.value ?? ""}
                    id="name"
                    autoComplete="off"
                    placeholder="Example: New Year Holiday"
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
              htmlFor="holiday_date"
              className="text-sm font-medium text-slate-700"
            >
              Holiday Date
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="holiday_date"
              control={control}
              rules={{
                required: "Holiday date is required.",
              }}
              render={({ field, fieldState }) => (
                <>
                  <Calendar
                    id="holiday_date"
                    appendTo={getBody}
                    value={field.value ?? null}
                    dateFormat="dd MM yy"
                    showIcon
                    readOnlyInput
                    placeholder="Select holiday date"
                    className={`w-full ${
                      fieldState.invalid ? "p-invalid" : ""
                    }`}
                    onChange={(event) =>
                      field.onChange((event.value as Date | null) ?? null)
                    }
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
            </label>

            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <>
                  <InputTextarea
                    id="description"
                    value={field.value ?? ""}
                    rows={4}
                    autoResize
                    placeholder="Optional holiday description"
                    className="w-full"
                    onChange={(event) => field.onChange(event.target.value)}
                  />

                  <small className="text-slate-500">
                    Optional information about this holiday or special day.
                  </small>
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
                      Inactive holidays remain stored but should not affect
                      attendance, leave, or work schedule processing.
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

export default HolidayTableData;
