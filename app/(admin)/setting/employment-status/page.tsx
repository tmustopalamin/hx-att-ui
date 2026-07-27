"use client";

import { ChangeEvent, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import useSWR from "swr";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import { showToast } from "@/store/ToastSlice";

interface EmploymentStatus {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EmploymentStatusFormData {
  name: string;
  is_active: boolean;
}

interface ApiResponse {
  message?: string;
}

const API_URL = "/api/employment-status";

const EMPTY_EMPLOYMENT_STATUS: EmploymentStatusFormData = {
  name: "",
  is_active: true,
};

const getBody = () => document.body;

const parseApiResponse = async <T,>(response: Response): Promise<T> => {
  const contentType = response.headers.get("content-type") ?? "";

  let payload: unknown = null;

  if (response.status !== 204) {
    if (contentType.includes("application/json")) {
      payload = await response.json();
    } else {
      payload = await response.text();
    }
  }

  if (!response.ok) {
    if (
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof (payload as { message?: unknown }).message === "string"
    ) {
      throw new Error((payload as { message: string }).message);
    }

    if (typeof payload === "string" && payload.trim()) {
      throw new Error(payload);
    }

    throw new Error(`Request failed with status ${response.status}.`);
  }

  return payload as T;
};

const employmentStatusFetcher = async (
  url: string,
): Promise<EmploymentStatus[]> => {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  return parseApiResponse<EmploymentStatus[]>(response);
};

const submitEmploymentStatusRequest = async (
  method: "POST" | "PUT" | "DELETE",
  body: object,
): Promise<ApiResponse> => {
  const response = await fetch(API_URL, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseApiResponse<ApiResponse>(response);
};

const EmploymentStatusSettingPage = () => {
  const dispatch = useDispatch();

  const [selectedData, setSelectedData] = useState<EmploymentStatus | null>(
    null,
  );

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [filters, setFilters] = useState({
    global: {
      value: "",
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);

  const [popupHeaderTitle, setPopupHeaderTitle] = useState(
    "New Employment Status",
  );

  const [isSaving, setIsSaving] = useState(false);

  const {
    data: employmentStatusData,
    error,
    isLoading,
    isValidating,
    mutate: refreshEmploymentStatusData,
  } = useSWR<EmploymentStatus[]>(API_URL, employmentStatusFetcher);

  const { control, handleSubmit, setFocus, reset, clearErrors } =
    useForm<EmploymentStatusFormData>({
      defaultValues: EMPTY_EMPLOYMENT_STATUS,
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
    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: "Error",
        detail:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      }),
    );
  };

  const getResponseMessage = (
    response: ApiResponse,
    fallbackMessage: string,
  ) => {
    return response?.message || fallbackMessage;
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Employment Status");
    clearErrors();
    reset(EMPTY_EMPLOYMENT_STATUS);
  };

  const handleRefresh = async () => {
    try {
      await refreshEmploymentStatusData();
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

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setPopupHeaderTitle("New Employment Status");
    reset(EMPTY_EMPLOYMENT_STATUS);
    setVisible(true);
  };

  const onClickUpdate = (data: EmploymentStatus) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Employment Status");

    reset({
      name: data.name,
      is_active: data.is_active,
    });

    setVisible(true);
  };

  const handleSubmitNew = async (data: EmploymentStatusFormData) => {
    try {
      setIsSaving(true);

      const response = await submitEmploymentStatusRequest("POST", {
        name: data.name,
        is_active: data.is_active,
      });

      await refreshEmploymentStatusData();

      handleCloseDialog();

      showSuccess(
        getResponseMessage(response, "Employment status created successfully."),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: EmploymentStatusFormData) => {
    if (!selectedData) {
      showError(new Error("Employment status data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const response = await submitEmploymentStatusRequest("PUT", {
        id: selectedData.id,
        name: data.name,
        is_active: data.is_active,
      });

      await refreshEmploymentStatusData();

      handleCloseDialog();

      showSuccess(
        getResponseMessage(response, "Employment status updated successfully."),
      );
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: EmploymentStatus) => {
    try {
      const response = await submitEmploymentStatusRequest("DELETE", {
        id: data.id,
      });

      await refreshEmploymentStatusData();

      showSuccess(
        getResponseMessage(response, "Employment status deleted successfully."),
      );
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: EmploymentStatusFormData) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: EmploymentStatus) => {
    confirmDialog({
      header: "Delete Employment Status",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this employment status?
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

  const statusColumnBody = (rowData: EmploymentStatus) => {
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

  const actionColumnBody = (rowData: EmploymentStatus) => {
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
        form="employment-status-form"
        label={isAddNew ? "Create Employment Status" : "Save Changes"}
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
    return <ErrorNotConnectedToApi mutateKey={API_URL} />;
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
                <i className="pi pi-briefcase text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Employment Status
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage employment status names and active availability.
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
                label="New Employment Status"
                icon="pi pi-plus"
                size="small"
                className="w-full sm:w-auto"
                onClick={onClickNew}
              />
            </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />

              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder="Search employment status"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Employment Status Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={employmentStatusData ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={["name"]}
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
                minWidth: "42rem",
              }}
              emptyMessage="No employment status data found."
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
                field="name"
                header="Employment Status Name"
                sortable
                style={{
                  minWidth: "22rem",
                }}
                body={(rowData: EmploymentStatus) => (
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

      {/* Employment Status Form Dialog */}
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
            setFocus("name");
          }, 0);
        }}
      >
        <form
          id="employment-status-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 pt-2"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-slate-700"
            >
              Employment Status Name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="name"
              control={control}
              rules={{
                required: "Employment status name is required.",
                maxLength: {
                  value: 50,
                  message:
                    "Employment status name cannot exceed 50 characters.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    id="name"
                    autoComplete="off"
                    placeholder="Example: Permanent"
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
                      Enter the employment status shown in employee records.
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
                      Inactive employment statuses remain stored but should not
                      be available for new employee records.
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

export default EmploymentStatusSettingPage;
