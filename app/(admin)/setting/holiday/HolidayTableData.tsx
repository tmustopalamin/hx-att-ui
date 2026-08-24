"use client";
import { useI18n } from "@/app/i18n";

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
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
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
    labelKey: "National Holiday",
    value: "NATIONAL_HOLIDAY",
  },
  {
    labelKey: "Company Holiday",
    value: "COMPANY_HOLIDAY",
  },
  {
    labelKey: "Joint Leave",
    value: "JOINT_LEAVE",
  },
  {
    labelKey: "Special Day",
    value: "SPECIAL_DAY",
  },
];

const getBody = () => document.body;

const getHolidayTypeLabel = (
  value: string | null | undefined,
  translate: (source: string) => string = (source) => source,
) => {
  if (!value) {
    return "-";
  }

  const option = HOLIDAY_TYPE_OPTIONS.find((item) => item.value === value);

  return option
    ? translate(option.labelKey)
    : translate(value.replaceAll("_", " "));
};

const HolidayTableData = () => {
  const { t: i18nT } = useI18n();
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
        summary: i18nT("static.udvru8"),
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
          summary: i18nT("static.1vks92p"),
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
          summary: i18nT("static.1vks92p"),
          detail: err.message,
        }),
      );

      return;
    }

    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: i18nT("static.1vks92p"),
        detail: i18nT("static.37lwsc"),
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

      showSuccess(response.message ?? i18nT("static.hoyqx2"));
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

      showSuccess(response.message ?? i18nT("static.81g11h"));
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

      showSuccess(response.message ?? i18nT("static.1fk1js3"));
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: Holiday) => {
    try {
      const response = await restoreHoliday(data.id, data);

      await refreshHolidayData();

      showSuccess(response.message ?? i18nT("static.6lt1e"));
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: Holiday) => {
    try {
      const response = await purgeHoliday(data.id);

      await refreshHolidayData();

      showSuccess(response.message ?? i18nT("static.td2gk3"));
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
      header: i18nT("static.lhczpe"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.owb5an")} </span>

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
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.oay2cq")}
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
      header: i18nT("static.1ea5hd5"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.1hjk4k4")} </span>

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
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.4fiyr5")}
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
      header: i18nT("static.1pevlwr"),
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.1g8j1g8")} </span>

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
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.1wopxwj")}
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
        value={getHolidayTypeLabel(rowData.holiday_type, i18nT)}
        severity="info"
        rounded
      />
    );
  };

  const descriptionColumnBody = (rowData: Holiday) => {
    if (!rowData.description) {
      return (
        <span className="text-sm text-slate-400">
          {i18nT("static.17eujsg")}
        </span>
      );
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
        <Tag
          value={i18nT("static.1v6qcju")}
          severity="secondary"
          icon="pi pi-trash"
          rounded
        />
      );
    }

    if (rowData.is_active) {
      return (
        <Tag
          value={i18nT("static.8qzyhb")}
          severity="success"
          icon="pi pi-check-circle"
          rounded
        />
      );
    }

    return (
      <Tag
        value={i18nT("static.13zf5vc")}
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
        return (
          <span className="text-sm text-slate-400">
            {i18nT("static.yaeuo4")}
          </span>
        );
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
              tooltip={i18nT("static.4fiyr5")}
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
              tooltip={i18nT("static.1ny6sg3")}
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
          tooltip={i18nT("static.1i1lcq9")}
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
          tooltip={i18nT("static.oay2cq")}
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
        label={i18nT("static.ew9em3")}
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
        label={isAddNew ? i18nT("static.xjxyfx") : i18nT("static.6gmm1l")}
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
                  {i18nT("static.ih7a2j")}{" "}
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.pln1bx")}{" "}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <Button
                type="button"
                label={i18nT("static.28r6qc")}
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
                label={i18nT("static.1teke09")}
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
                  {i18nT("static.1kk3in7")}{" "}
                </label>
              </div>
            )}

            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />

              <InputText
                value={globalFilterValue}
                onChange={onGlobalFilterChange}
                placeholder={i18nT("static.1mbcbdg")}
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
              emptyMessage={i18nT("static.unryn4")}
              currentPageReportTemplate={i18nT("static.1kqh8lr")}
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
                header={i18nT("static.xoaiok")}
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
                header={i18nT("static.1au2s9m")}
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
                header={i18nT("static.1eqo6cd")}
                sortable
                body={dateColumnBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                field="holiday_type"
                header={i18nT("static.qd0acp")}
                sortable
                body={typeColumnBody}
                style={{
                  minWidth: "15rem",
                }}
              />

              <Column
                field="description"
                header={i18nT("static.sjj37t")}
                sortable
                body={descriptionColumnBody}
                style={{
                  minWidth: "21rem",
                }}
              />

              <Column
                field="is_active"
                header={i18nT("static.3pd73")}
                sortable
                body={statusColumnBody}
                style={{
                  minWidth: "10rem",
                }}
              />

              <Column
                header={i18nT("static.2wk0tb")}
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
              {i18nT("static.1bn5wa0")}{" "}
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="code"
              control={control}
              rules={{
                required: i18nT("static.60qm8l"),
                validate: {
                  noSpaces: (value) =>
                    isWhitespaceFreeIdentifier(value) ||
                    "Holiday code must not contain spaces.",
                },
                maxLength: {
                  value: 50,
                  message: i18nT("static.mjc2g8"),
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    value={field.value ?? ""}
                    id="code"
                    autoComplete="off"
                    placeholder={i18nT("static.1tu8zp")}
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
                      {i18nT("static.ovnj2y")}{" "}
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
              {i18nT("static.qd0acp")}{" "}
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="holiday_type"
              control={control}
              rules={{
                required: i18nT("static.14m7osy"),
              }}
              render={({ field, fieldState }) => (
                <>
                  <Dropdown
                    id="holiday_type"
                    appendTo={getBody}
                    value={field.value}
                    options={HOLIDAY_TYPE_OPTIONS.map((option) => ({
                      label: i18nT(option.labelKey),
                      value: option.value,
                    }))}
                    optionLabel="label"
                    optionValue="value"
                    placeholder={i18nT("static.qmsrhr")}
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
              {i18nT("static.1au2s9m")}{" "}
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="name"
              control={control}
              rules={{
                required: i18nT("static.1u2x8sz"),
                maxLength: {
                  value: 100,
                  message: i18nT("static.1hewgdy"),
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <InputText
                    {...field}
                    value={field.value ?? ""}
                    id="name"
                    autoComplete="off"
                    placeholder={i18nT("static.lv4bjg")}
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
              {i18nT("static.1eqo6cd")}{" "}
              <span className="ml-1 text-red-500">*</span>
            </label>

            <Controller
              name="holiday_date"
              control={control}
              rules={{
                required: i18nT("static.1ippwhi"),
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
                    placeholder={i18nT("static.1a24dgz")}
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
              {i18nT("static.sjj37t")}{" "}
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
                    placeholder={i18nT("static.1uo8wsn")}
                    className="w-full"
                    onChange={(event) => field.onChange(event.target.value)}
                  />

                  <small className="text-slate-500">
                    {i18nT("static.o9vnfk")}{" "}
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
                      {i18nT("static.almk4n")}{" "}
                    </label>

                    <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                      {i18nT("static.q9rrck")}{" "}
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
