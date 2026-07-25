"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import dayjs from "dayjs";

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

import {
  createHoliday,
  deleteHoliday,
  purgeHoliday,
  restoreHoliday,
  updateHoliday,
} from "@/app/services/holiday-service";

import { Holiday, HolidayForm } from "@/app/types/holiday";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

const emptyForm: HolidayForm = {
  id: 0,
  code: "",
  name: "",
  holiday_date: null,
  holiday_type: "PUBLIC_HOLIDAY",
  description: "",
  is_active: true,
  deleted_at: null,
  row_version: 0,
};

const holidayTypeOptions = [
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

const holidayTypeLabel = (value?: string | null) => {
  if (!value) return "-";

  const found = holidayTypeOptions.find((item) => item.value === value);
  return found?.label ?? value.replaceAll("_", " ");
};

const HolidayTableData = () => {
  const dispatch = useDispatch();

  const [selectedData, setSelectedData] = useState<Holiday | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const {
    control,
    handleSubmit,
    setFocus,
    formState: { isValid, errors },
    reset,
    clearErrors,
  } = useForm<HolidayForm>({
    defaultValues: emptyForm,
    mode: "onChange",
  });

  const holidayKey = `/api/holiday?show_all=${isShowDeletedDataChecked}`;

  const {
    data: holidayData,
    error,
    isLoading,
  } = useSWR<Holiday[]>(holidayKey, fetcher);

  const refreshList = async () => {
    await mutate(holidayKey);
  };

  const yearSummary = useMemo(() => {
    const activeRows = (holidayData ?? []).filter((item) => !item.deleted_at);
    const years = new Set(
      activeRows
        .map((item) => dayjs(item.holiday_date).format("YYYY"))
        .filter(Boolean),
    );

    return {
      total: activeRows.length,
      years: years.size,
    };
  }, [holidayData]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const openNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Holiday");
    reset(emptyForm);

    setTimeout(() => {
      setFocus("code");
    }, 0);
  };

  const openEdit = (data: Holiday) => {
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
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
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });

    setTimeout(() => {
      setFocus("code");
    }, 0);
  };

  const closeDialog = () => {
    setVisible(false);
    setSelectedData(null);
    reset(emptyForm);
  };

  const handleSubmitNew = async (data: HolidayForm) => {
    try {
      const res = await createHoliday(data);

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Holiday created successfully",
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

  const handleUpdate = async (data: HolidayForm) => {
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

    try {
      const res = await updateHoliday(
        selectedData.id,
        selectedData.row_version,
        data,
      );

      closeDialog();
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Holiday updated successfully",
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

  const handleDelete = async (data: Holiday) => {
    try {
      const res = await deleteHoliday(data.id, data);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Holiday deleted successfully",
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

  const handleRestore = async (data: Holiday) => {
    try {
      const res = await restoreHoliday(data.id, data);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Holiday restored successfully",
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

  const handlePurge = async (data: Holiday) => {
    try {
      const res = await purgeHoliday(data.id);
      await refreshList();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: res.message ?? "Holiday permanently deleted",
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

  const onSubmit = (data: HolidayForm) => {
    if (!isValid) return;

    if (isAddNew) {
      void handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      void handleUpdate(data);
    }
  };

  const onClickDelete = (data: Holiday) => {
    confirmDialog({
      message: "Do you want to delete this holiday?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handleDelete(data);
      },
    });
  };

  const onClickRestore = (data: Holiday) => {
    confirmDialog({
      message: "Do you want to restore this holiday?",
      header: "Restore Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-success",
      accept: () => {
        void handleRestore(data);
      },
    });
  };

  const onClickPurge = (data: Holiday) => {
    confirmDialog({
      message: "Do you want to permanently delete this holiday?",
      header: "Permanent Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: () => {
        void handlePurge(data);
      },
    });
  };

  const dateBodyTemplate = (rowData: Holiday) => {
    return rowData.holiday_date
      ? dayjs(rowData.holiday_date).format("DD MMM YYYY")
      : "-";
  };

  const typeBodyTemplate = (rowData: Holiday) => {
    return (
      <Tag value={holidayTypeLabel(rowData.holiday_type)} severity="info" />
    );
  };

  const statusBodyTemplate = (rowData: Holiday) => {
    if (rowData.deleted_at) {
      return <Tag value="Deleted" severity="danger" />;
    }

    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="secondary" />
    );
  };

  const actionColumnBody = (rowData: Holiday) => {
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
          severity="help"
          icon="pi pi-pencil"
          size="small"
          tooltip="Edit"
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          onClick={() => openEdit(rowData)}
        />
        <Button
          rounded
          severity="danger"
          icon="pi pi-trash"
          size="small"
          tooltip="Delete"
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={holidayKey} />;
  }

  return (
    <>
      <ConfirmDialog />

      <Card className="shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h5 className="text-xl font-semibold text-slate-900">Holiday</h5>
              <p className="mt-1 text-sm text-slate-500">
                Manage public holiday, company holiday, joint leave, and special
                day data used by attendance and leave processing.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Tag
                  value={`${yearSummary.total} active holiday(s)`}
                  severity="info"
                />
                <Tag
                  value={`${yearSummary.years} year(s)`}
                  severity="secondary"
                />
              </div>
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
                <input
                  className="p-inputtext p-component w-full sm:w-64"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search holiday"
                />
              </IconField>

              <Button label="New Holiday" icon="pi pi-plus" onClick={openNew} />
            </div>
          </div>

          <DataTable
            value={holidayData ?? []}
            stripedRows
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            filters={filters}
            globalFilterFields={[
              "code",
              "name",
              "holiday_type",
              "description",
              "holiday_date",
            ]}
            emptyMessage="No holiday found."
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
            scrollable
            tableStyle={{ minWidth: "72rem" }}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(_, options) => options.rowIndex + 1}
            />
            <Column field="code" header="Code" style={{ minWidth: "10rem" }} />
            <Column field="name" header="Name" style={{ minWidth: "14rem" }} />
            <Column
              header="Holiday Date"
              body={dateBodyTemplate}
              style={{ minWidth: "11rem" }}
            />
            <Column
              header="Type"
              body={typeBodyTemplate}
              style={{ minWidth: "12rem" }}
            />
            <Column
              field="description"
              header="Description"
              style={{ minWidth: "18rem" }}
            />
            <Column
              header="Status"
              body={statusBodyTemplate}
              style={{ minWidth: "9rem" }}
            />
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

      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: "48rem", maxWidth: "95vw" }}
          onHide={closeDialog}
          onShow={() => setTimeout(() => setFocus("code"), 0)}
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
                label={isAddNew ? "Save" : "Update"}
                icon="pi pi-check"
                disabled={!isValid}
              />
            </div>
          }
        >
          <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2">
            <div className="field">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Code <span className="text-red-500">*</span>
              </label>
              <Controller
                name="code"
                control={control}
                rules={{ required: "Code is required" }}
                render={({ field }) => (
                  <InputText
                    {...field}
                    value={field.value ?? ""}
                    className="w-full"
                    placeholder="Example: NEW_YEAR"
                  />
                )}
              />
              {errors.code && (
                <small className="p-error">{errors.code.message}</small>
              )}
            </div>

            <div className="field">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Holiday Type <span className="text-red-500">*</span>
              </label>
              <Controller
                name="holiday_type"
                control={control}
                rules={{ required: "Holiday type is required" }}
                render={({ field }) => (
                  <Dropdown
                    value={field.value}
                    options={holidayTypeOptions}
                    onChange={(e) => field.onChange(e.value)}
                    className="w-full"
                    placeholder="Select type"
                  />
                )}
              />
              {errors.holiday_type && (
                <small className="p-error">{errors.holiday_type.message}</small>
              )}
            </div>

            <div className="field md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <Controller
                name="name"
                control={control}
                rules={{ required: "Name is required" }}
                render={({ field }) => (
                  <InputText
                    {...field}
                    value={field.value ?? ""}
                    className="w-full"
                    placeholder="Example: New Year Holiday"
                  />
                )}
              />
              {errors.name && (
                <small className="p-error">{errors.name.message}</small>
              )}
            </div>

            <div className="field">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Holiday Date <span className="text-red-500">*</span>
              </label>
              <Controller
                name="holiday_date"
                control={control}
                rules={{ required: "Holiday date is required" }}
                render={({ field }) => (
                  <Calendar
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    dateFormat="dd M yy"
                    showIcon
                    className="w-full"
                    placeholder="Select date"
                  />
                )}
              />
              {errors.holiday_date && (
                <small className="p-error">{errors.holiday_date.message}</small>
              )}
            </div>

            <div className="field">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Active
              </label>
              <div className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      inputId="is_active"
                      checked={field.value}
                      onChange={(e) => field.onChange(Boolean(e.checked))}
                    />
                  )}
                />
                <label
                  htmlFor="is_active"
                  className="cursor-pointer text-sm text-slate-700"
                >
                  Active holiday
                </label>
              </div>
            </div>

            <div className="field md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Description
              </label>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <InputTextarea
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                    rows={4}
                    className="w-full"
                    placeholder="Optional description"
                  />
                )}
              />
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default HolidayTableData;
