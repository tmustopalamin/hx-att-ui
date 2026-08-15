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
  createCountry,
  deleteCountry,
  purgeCountry,
  restoreCountry,
  updateCountry,
} from "@/app/services/country-service";

import { Country } from "@/app/types/country";
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

const EMPTY_COUNTRY: Country = {
  id: 0,
  code: "",
  name: "",
  is_active: true,
  deleted_at: "",
  row_version: 0,
};

const getBody = () => document.body;

const CountryTableData = () => {
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("master-data");

  const [selectedData, setSelectedData] = useState<Country | null>(null);

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

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Country");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/country?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`;

  const {
    data: countryData,
    error,
    isLoading,
    isValidating,
    mutate: refreshCountryData,
  } = useSWR<Country[]>(currentKey, fetcher);

  const { control, handleSubmit, setFocus, reset, clearErrors } =
    useForm<Country>({
      defaultValues: EMPTY_COUNTRY,
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
    setPopupHeaderTitle("New Country");
    clearErrors();
    reset(EMPTY_COUNTRY);
  };

  const handleRefresh = async () => {
    try {
      await refreshCountryData();
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
    setPopupHeaderTitle("New Country");
    reset(EMPTY_COUNTRY);
    setVisible(true);
  };

  const onClickUpdate = (data: Country) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Country");
    reset(data);
    setVisible(true);
  };

  const handleSubmitNew = async (data: Country) => {
    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createCountry(data);

      await refreshCountryData();

      handleCloseDialog();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: Country) => {
    if (!selectedData) {
      showError(new Error("Country data is not selected."));
      return;
    }

    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updateCountry(selectedData.id, selectedData.row_version, data);

      await refreshCountryData();

      handleCloseDialog();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: Country) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteCountry(data.id, data.row_version);

      await refreshCountryData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: Country) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreCountry(data.id, data.row_version);

      await refreshCountryData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: Country) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgeCountry(data.id);

      await refreshCountryData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: Country) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: Country) => {
    requestActionConfirmation({
      header: "Delete Country",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to delete this country?
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

  const onClickRestore = (data: Country) => {
    requestActionConfirmation({
      header: "Restore Country",
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            Are you sure you want to restore this country?
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

  const onClickPurge = (data: Country) => {
    requestActionConfirmation({
      header: "Delete Country Permanently",
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

  const statusColumnBody = (rowData: Country) => {
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

  const actionColumnBody = (rowData: Country) => {
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
        form="country-form"
        label={isAddNew ? "Create Country" : "Save Changes"}
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
                <i className="pi pi-globe text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Country
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage country codes, names, and active status.
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
                label="New Country"
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
                placeholder="Search code or country name"
                className="w-full"
              />
            </IconField>
          </div>

          {/* Country Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={countryData ?? []}
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
              emptyMessage="No country data found."
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
                body={(rowData: Country) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {rowData.code}
                  </span>
                )}
              />

              <Column
                field="name"
                header="Country Name"
                sortable
                style={{
                  minWidth: "18rem",
                }}
                body={(rowData: Country) => (
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

      {/* Country Form Dialog */}
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
          id="country-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 pt-2"
        >
          <div className="flex flex-col gap-2">
            <label
              htmlFor="code"
              className="text-sm font-medium text-slate-700"
            >
              Country Code
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="code"
              control={control}
              rules={{
                required: "Country code is required.",
                validate: {
                  noSpaces: (value) =>
                    !/\s/.test(value) ||
                    "Country code must not contain spaces.",
                },
                maxLength: {
                  value: 50,
                  message: "Country code cannot exceed 50 characters.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    id="code"
                    autoComplete="off"
                    placeholder="Example: ID"
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
                      Use a short and unique country code.
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
              Country Name
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="name"
              control={control}
              rules={{
                required: "Country name is required.",
                maxLength: {
                  value: 50,
                  message: "Country name cannot exceed 50 characters.",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    id="name"
                    autoComplete="off"
                    placeholder="Example: Indonesia"
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
                      Inactive countries remain stored but should not be
                      available for new records.
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

export default CountryTableData;
