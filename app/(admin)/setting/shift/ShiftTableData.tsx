"use client";
import { useI18n } from "@/app/i18n";

import { ChangeEvent, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import useSWR from "swr";
import dayjs from "dayjs";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
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
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  createShift,
  deleteShift,
  purgeShift,
  restoreShift,
  updateShift,
} from "@/app/services/shift-service";

import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import { Shift } from "@/app/types/shift";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const EMPTY_SHIFT = {
  id: 0,
  name: "",
  work_start: null,
  work_end: null,
  break_start: null,
  break_end: null,
  grace_period_minutes: 0,
  checkin_start: null,
  checkin_end: null,
  checkout_start: null,
  checkout_end: null,
  is_night_shift: false,
  is_day_off: false,
  is_active: true,
  deleted_at: "",
  row_version: 0,
  timezone_offset_minutes: 420,
  duplicate_punch_tolerance_seconds: 60,
  finalization_delay_minutes: 30,
} as Shift;

const getBody = () => document.body;

const toTimeDate = (value?: string | Date | null): Date | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const normalizedValue = value.includes("T") ? value : `1970-01-01T${value}`;

  const parsedDate = new Date(normalizedValue);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatTimeValue = (value?: string | Date | null) => {
  const parsedDate = toTimeDate(value);

  if (!parsedDate) {
    return "-";
  }

  return dayjs(parsedDate).format("HH:mm");
};

const formatTimeRange = (
  start?: string | Date | null,
  end?: string | Date | null,
) => {
  if (!start && !end) {
    return "-";
  }

  return `${formatTimeValue(start)} - ${formatTimeValue(end)}`;
};

const ShiftTableData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();

  const profileState = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("master-data");

  const [selectedData, setSelectedData] = useState<Shift | null>(null);

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

  const [popupHeaderTitle, setPopupHeaderTitle] = useState("New Shift");

  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/shift?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`;

  const {
    data: shiftData,
    error,
    isLoading,
    isValidating,
    mutate: refreshShiftData,
  } = useSWR<Shift[]>(currentKey, fetcher);

  const { control, handleSubmit, setFocus, setValue, reset, clearErrors } =
    useForm<Shift>({
      defaultValues: EMPTY_SHIFT,
      mode: "onTouched",
    });

  const watchedIsDayOff = Boolean(
    useWatch({
      control,
      name: "is_day_off",
    }),
  );

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

  const clearShiftSchedule = () => {
    const options = {
      shouldDirty: true,
      shouldValidate: true,
    };

    setValue("work_start", null as Shift["work_start"], options);

    setValue("work_end", null as Shift["work_end"], options);

    setValue("break_start", null as Shift["break_start"], options);

    setValue("break_end", null as Shift["break_end"], options);

    setValue("checkin_start", null as Shift["checkin_start"], options);

    setValue("checkin_end", null as Shift["checkin_end"], options);

    setValue("checkout_start", null as Shift["checkout_start"], options);

    setValue("checkout_end", null as Shift["checkout_end"], options);

    setValue("grace_period_minutes", 0, options);

    setValue("is_night_shift", false, options);
  };

  const normalizeShiftForm = (data: Shift): Shift => {
    if (data.is_day_off) {
      return {
        ...data,
        name: data.name.trim(),
        work_start: null,
        work_end: null,
        break_start: null,
        break_end: null,
        checkin_start: null,
        checkin_end: null,
        checkout_start: null,
        checkout_end: null,
        grace_period_minutes: 0,
        timezone_offset_minutes: 420,
        duplicate_punch_tolerance_seconds: 60,
        finalization_delay_minutes: 30,
        is_night_shift: false,
      } as Shift;
    }

    return {
      ...data,
      name: data.name.trim(),
      grace_period_minutes: Number(data.grace_period_minutes ?? 0),
      timezone_offset_minutes: Number(data.timezone_offset_minutes ?? 420),
      duplicate_punch_tolerance_seconds: Number(
        data.duplicate_punch_tolerance_seconds ?? 60,
      ),
      finalization_delay_minutes: Number(data.finalization_delay_minutes ?? 30),
    };
  };

  const handleCloseDialog = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    setPopupHeaderTitle("New Shift");
    clearErrors();
    reset(EMPTY_SHIFT);
  };

  const handleRefresh = async () => {
    try {
      await refreshShiftData();
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
    setPopupHeaderTitle("New Shift");
    reset(EMPTY_SHIFT);
    setVisible(true);
  };

  const onClickUpdate = (data: Shift) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setPopupHeaderTitle("Edit Shift");

    reset({
      ...data,
      work_start: toTimeDate(data.work_start),
      work_end: toTimeDate(data.work_end),
      break_start: toTimeDate(data.break_start),
      break_end: toTimeDate(data.break_end),
      checkin_start: toTimeDate(data.checkin_start),
      checkin_end: toTimeDate(data.checkin_end),
      checkout_start: toTimeDate(data.checkout_start),
      checkout_end: toTimeDate(data.checkout_end),
      grace_period_minutes: Number(data.grace_period_minutes ?? 0),
      timezone_offset_minutes: Number(data.timezone_offset_minutes ?? 420),
      duplicate_punch_tolerance_seconds: Number(
        data.duplicate_punch_tolerance_seconds ?? 60,
      ),
      finalization_delay_minutes: Number(data.finalization_delay_minutes ?? 30),
      deleted_at: data.deleted_at ?? "",
    } as Shift);

    setVisible(true);
  };

  const handleSubmitNew = async (data: Shift) => {
    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createShift(normalizeShiftForm(data));

      await refreshShiftData();

      handleCloseDialog();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: Shift) => {
    if (!selectedData) {
      showError(new Error("Shift data is not selected."));

      return;
    }

    try {
      setIsSaving(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await updateShift(
          selectedData.id,
          selectedData.row_version,
          normalizeShiftForm(data),
        );

      await refreshShiftData();

      handleCloseDialog();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (data: Shift) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteShift(data.id, data.row_version);

      await refreshShiftData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleRestore = async (data: Shift) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreShift(data.id, data.row_version);

      await refreshShiftData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handlePurge = async (data: Shift) => {
    try {
      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgeShift(data.id);

      await refreshShiftData();
      showSuccess(response.message);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const onSubmit = async (data: Shift) => {
    if (isSaving) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: Shift) => {
    requestActionConfirmation({
      header: i18nT("static.1uupmvy"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.1f2z57")} </span>

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

  const onClickRestore = (data: Shift) => {
    requestActionConfirmation({
      header: i18nT("static.1qad1nl"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.v3b39c")} </span>

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

  const onClickPurge = (data: Shift) => {
    requestActionConfirmation({
      header: i18nT("static.1hgebz3"),
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

  const shiftTypeColumnBody = (rowData: Shift) => {
    if (rowData.is_day_off) {
      return (
        <Tag
          value={i18nT("static.776hx0")}
          severity="warning"
          icon="pi pi-calendar-times"
          rounded
        />
      );
    }

    if (rowData.is_night_shift) {
      return (
        <Tag
          value={i18nT("static.1mbhmep")}
          severity="info"
          icon="pi pi-moon"
          rounded
        />
      );
    }

    return (
      <Tag
        value={i18nT("static.jjdwfr")}
        severity="secondary"
        icon="pi pi-sun"
        rounded
      />
    );
  };

  const statusColumnBody = (rowData: Shift) => {
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

  const timeRangeBody = (
    start?: string | Date | null,
    end?: string | Date | null,
    isDayOff?: boolean,
  ) => {
    if (isDayOff) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    const formattedValue = formatTimeRange(start, end);

    if (formattedValue === "-") {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span className="whitespace-nowrap font-mono text-sm text-slate-700">
        {formattedValue}
      </span>
    );
  };

  const workTimeColumnBody = (rowData: Shift) => {
    return timeRangeBody(
      rowData.work_start,
      rowData.work_end,
      rowData.is_day_off,
    );
  };

  const breakTimeColumnBody = (rowData: Shift) => {
    return timeRangeBody(
      rowData.break_start,
      rowData.break_end,
      rowData.is_day_off,
    );
  };

  const checkinWindowColumnBody = (rowData: Shift) => {
    return timeRangeBody(
      rowData.checkin_start,
      rowData.checkin_end,
      rowData.is_day_off,
    );
  };

  const checkoutWindowColumnBody = (rowData: Shift) => {
    return timeRangeBody(
      rowData.checkout_start,
      rowData.checkout_end,
      rowData.is_day_off,
    );
  };

  const gracePeriodColumnBody = (rowData: Shift) => {
    if (rowData.is_day_off) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <span className="whitespace-nowrap text-sm text-slate-700">
        {Number(rowData.grace_period_minutes ?? 0)}{" "}
        {i18nT("static.1jxbmtz")}{" "}
      </span>
    );
  };

  const actionColumnBody = (rowData: Shift) => {
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
        form="shift-form"
        label={isAddNew ? i18nT("static.10q24r1") : i18nT("static.6gmm1l")}
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
                <i className="pi pi-clock text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.1xakelj")}{" "}
                </h1>

                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.11hu17m")}{" "}
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
                label={i18nT("static.s51mxt")}
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
                placeholder={i18nT("static.1iyt8ps")}
                className="w-full"
              />
            </IconField>
          </div>

          {/* Shift Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={shiftData ?? []}
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
                minWidth: "96rem",
              }}
              emptyMessage={i18nT("static.fliz4c")}
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
                field="name"
                header={i18nT("static.1vjd9xi")}
                sortable
                style={{
                  minWidth: "17rem",
                }}
                body={(rowData: Shift) => (
                  <span className="font-medium text-slate-800">
                    {rowData.name}
                  </span>
                )}
              />

              <Column
                header={i18nT("static.1e6nppp")}
                body={shiftTypeColumnBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                header={i18nT("static.q52jcp")}
                body={workTimeColumnBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                header={i18nT("static.1jrsz41")}
                body={breakTimeColumnBody}
                style={{
                  minWidth: "13rem",
                }}
              />

              <Column
                header={i18nT("static.z8wtwr")}
                body={checkinWindowColumnBody}
                style={{
                  minWidth: "15rem",
                }}
              />

              <Column
                header={i18nT("static.1fg3fay")}
                body={checkoutWindowColumnBody}
                style={{
                  minWidth: "15rem",
                }}
              />

              <Column
                field="grace_period_minutes"
                header={i18nT("static.fzlj6w")}
                sortable
                body={gracePeriodColumnBody}
                style={{
                  minWidth: "11rem",
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

      {/* Shift Form Dialog */}
      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{
          width: "95vw",
          maxWidth: "62rem",
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
            setFocus("name");
          }, 0);
        }}
      >
        <form
          id="shift-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-6 pt-2"
        >
          {/* General Information */}
          <section className="flex flex-col gap-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.1ywaoj5")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.1xl1mv")}{" "}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label
                htmlFor="name"
                className="text-sm font-medium text-slate-700"
              >
                {i18nT("static.1vjd9xi")}{" "}
                <span className="ml-1 text-red-500">*</span>
              </label>

              <Controller
                name="name"
                control={control}
                rules={{
                  required: i18nT("static.9jgttb"),
                  maxLength: {
                    value: 50,
                    message: i18nT("static.1kbqnzq"),
                  },
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      {...field}
                      id="name"
                      autoComplete="off"
                      placeholder={i18nT("static.1106r19")}
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <Controller
                  name="is_day_off"
                  control={control}
                  defaultValue={false}
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="is_day_off"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          {i18nT("static.aa1ntx")}{" "}
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          {i18nT("static.nxxn6v")}{" "}
                        </p>
                      </div>

                      <InputSwitch
                        id="is_day_off"
                        checked={Boolean(field.value)}
                        onChange={(event) => {
                          const checked = Boolean(event.value);

                          field.onChange(checked);

                          if (checked) {
                            clearShiftSchedule();
                          }
                        }}
                      />
                    </div>
                  )}
                />
              </div>

              <div
                className={`rounded-xl border border-slate-200 bg-slate-50 p-4 ${
                  watchedIsDayOff ? "opacity-60" : ""
                }`}
              >
                <Controller
                  name="is_night_shift"
                  control={control}
                  defaultValue={false}
                  render={({ field }) => (
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <label
                          htmlFor="is_night_shift"
                          className="cursor-pointer text-sm font-medium text-slate-700"
                        >
                          {i18nT("static.1mbhmep")}{" "}
                        </label>

                        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                          {i18nT("static.2ofcij")}{" "}
                        </p>
                      </div>

                      <InputSwitch
                        id="is_night_shift"
                        checked={Boolean(field.value)}
                        disabled={watchedIsDayOff}
                        onChange={(event) => field.onChange(event.value)}
                      />
                    </div>
                  )}
                />
              </div>
            </div>

            {watchedIsDayOff && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <i className="pi pi-info-circle mt-0.5" />

                <span>{i18nT("static.czv5y")} </span>
              </div>
            )}
          </section>

          {!watchedIsDayOff && (
            <>
              {/* Work Schedule */}
              <section className="flex flex-col gap-4">
                <div className="border-b border-slate-200 pb-2">
                  <h2 className="m-0 text-sm font-semibold text-slate-800">
                    {i18nT("static.ge9dm5")}{" "}
                  </h2>

                  <p className="m-0 mt-1 text-xs text-slate-500">
                    {i18nT("static.lqkxfw")}{" "}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="work_start"
                      className="text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.14ba43g")}{" "}
                    </label>

                    <Controller
                      name="work_start"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="work_start"
                            appendTo={getBody}
                            value={toTimeDate(field.value)}
                            timeOnly
                            showTime
                            showSeconds
                            hourFormat="24"
                            readOnlyInput
                            placeholder={i18nT("static.1upncpi")}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(
                                (event.value as Date | null) ?? null,
                              )
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

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="work_end"
                      className="text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.1ucn5et")}{" "}
                    </label>

                    <Controller
                      name="work_end"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="work_end"
                            appendTo={getBody}
                            value={toTimeDate(field.value)}
                            timeOnly
                            showTime
                            showSeconds
                            hourFormat="24"
                            readOnlyInput
                            placeholder={i18nT("static.om6tn1")}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(
                                (event.value as Date | null) ?? null,
                              )
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

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="break_start"
                      className="text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.149t0qc")}{" "}
                    </label>

                    <Controller
                      name="break_start"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="break_start"
                            appendTo={getBody}
                            value={toTimeDate(field.value)}
                            timeOnly
                            showTime
                            showSeconds
                            hourFormat="24"
                            readOnlyInput
                            placeholder={i18nT("static.l1a9se")}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(
                                (event.value as Date | null) ?? null,
                              )
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

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="break_end"
                      className="text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.sviki5")}{" "}
                    </label>

                    <Controller
                      name="break_end"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="break_end"
                            appendTo={getBody}
                            value={toTimeDate(field.value)}
                            timeOnly
                            showTime
                            showSeconds
                            hourFormat="24"
                            readOnlyInput
                            placeholder={i18nT("static.j5fnrv")}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(
                                (event.value as Date | null) ?? null,
                              )
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
                </div>
              </section>

              {/* Attendance Windows */}
              <section className="flex flex-col gap-4">
                <div className="border-b border-slate-200 pb-2">
                  <h2 className="m-0 text-sm font-semibold text-slate-800">
                    {i18nT("static.728zhn")}{" "}
                  </h2>

                  <p className="m-0 mt-1 text-xs text-slate-500">
                    {i18nT("static.p6kg6a")}{" "}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="checkin_start"
                      className="text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.1umycld")}{" "}
                    </label>

                    <Controller
                      name="checkin_start"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="checkin_start"
                            appendTo={getBody}
                            value={toTimeDate(field.value)}
                            timeOnly
                            showTime
                            showSeconds
                            hourFormat="24"
                            readOnlyInput
                            placeholder={i18nT("static.p76yq3")}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(
                                (event.value as Date | null) ?? null,
                              )
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

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="checkin_end"
                      className="text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.5anwg")}{" "}
                    </label>

                    <Controller
                      name="checkin_end"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="checkin_end"
                            appendTo={getBody}
                            value={toTimeDate(field.value)}
                            timeOnly
                            showTime
                            showSeconds
                            hourFormat="24"
                            readOnlyInput
                            placeholder={i18nT("static.12koi6m")}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(
                                (event.value as Date | null) ?? null,
                              )
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

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="checkout_start"
                      className="text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.ed0bk6")}{" "}
                    </label>

                    <Controller
                      name="checkout_start"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="checkout_start"
                            appendTo={getBody}
                            value={toTimeDate(field.value)}
                            timeOnly
                            showTime
                            showSeconds
                            hourFormat="24"
                            readOnlyInput
                            placeholder={i18nT("static.21p7to")}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(
                                (event.value as Date | null) ?? null,
                              )
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

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="checkout_end"
                      className="text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.1wr8e03")}{" "}
                    </label>

                    <Controller
                      name="checkout_end"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="checkout_end"
                            appendTo={getBody}
                            value={toTimeDate(field.value)}
                            timeOnly
                            showTime
                            showSeconds
                            hourFormat="24"
                            readOnlyInput
                            placeholder={i18nT("static.3ke405")}
                            className={`w-full ${
                              fieldState.invalid ? "p-invalid" : ""
                            }`}
                            onChange={(event) =>
                              field.onChange(
                                (event.value as Date | null) ?? null,
                              )
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
                </div>
              </section>

              {/* Grace Period */}
              <section className="flex flex-col gap-4">
                <div className="border-b border-slate-200 pb-2">
                  <h2 className="m-0 text-sm font-semibold text-slate-800">
                    {i18nT("static.fzlj6w")}{" "}
                  </h2>

                  <p className="m-0 mt-1 text-xs text-slate-500">
                    {i18nT("static.a2q49a")}{" "}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="grace_period_minutes"
                    className="text-sm font-medium text-slate-700"
                  >
                    {i18nT("static.1lbusmw")}{" "}
                  </label>

                  <Controller
                    name="grace_period_minutes"
                    control={control}
                    defaultValue={0}
                    rules={{
                      min: {
                        value: 0,
                        message: i18nT("static.1umvldv"),
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="grace_period_minutes"
                          inputRef={field.ref}
                          value={Number(field.value ?? 0)}
                          min={0}
                          useGrouping={false}
                          suffix={i18nT("static.1jxbmtz")}
                          placeholder={i18nT("static.1hjxadl")}
                          className={`w-full ${
                            fieldState.invalid ? "p-invalid" : ""
                          }`}
                          onBlur={field.onBlur}
                          onValueChange={(event) =>
                            field.onChange(event.value ?? 0)
                          }
                        />

                        {fieldState.error ? (
                          <small className="p-error">
                            {fieldState.error.message}
                          </small>
                        ) : (
                          <small className="text-slate-500">
                            {i18nT("static.1faj37u")}{" "}
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>
              </section>

              {/* Attendance processing parameters */}
              <section className="flex flex-col gap-4">
                <div className="border-b border-slate-200 pb-2">
                  <h2 className="m-0 text-sm font-semibold text-slate-800">
                    Attendance Processing Parameters
                  </h2>
                  <p className="m-0 mt-1 text-xs text-slate-500">
                    Parameter ini digunakan oleh Attendance Summary dan tidak
                    digantikan nilai hardcoded.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="timezone_offset_minutes"
                      className="text-sm font-medium text-slate-700"
                    >
                      Timezone offset (menit)
                    </label>
                    <Controller
                      name="timezone_offset_minutes"
                      control={control}
                      rules={{
                        min: { value: -720, message: "Minimum -720 menit." },
                        max: { value: 840, message: "Maksimum 840 menit." },
                        validate: (value) =>
                          Number.isInteger(value) ||
                          "Harus berupa bilangan bulat.",
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputNumber
                            id="timezone_offset_minutes"
                            inputRef={field.ref}
                            value={Number(field.value ?? 420)}
                            min={-720}
                            max={840}
                            minFractionDigits={0}
                            maxFractionDigits={0}
                            step={1}
                            useGrouping={false}
                            suffix=" menit"
                            className={fieldState.invalid ? "p-invalid" : ""}
                            onBlur={field.onBlur}
                            onValueChange={(event) =>
                              field.onChange(event.value ?? 420)
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

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="duplicate_punch_tolerance_seconds"
                      className="text-sm font-medium text-slate-700"
                    >
                      Toleransi duplicate scan
                    </label>
                    <Controller
                      name="duplicate_punch_tolerance_seconds"
                      control={control}
                      rules={{
                        min: { value: 0, message: "Tidak boleh negatif." },
                        validate: (value) =>
                          Number.isInteger(value) ||
                          "Harus berupa bilangan bulat.",
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputNumber
                            id="duplicate_punch_tolerance_seconds"
                            inputRef={field.ref}
                            value={Number(field.value ?? 60)}
                            min={0}
                            minFractionDigits={0}
                            maxFractionDigits={0}
                            step={1}
                            useGrouping={false}
                            suffix=" detik"
                            className={fieldState.invalid ? "p-invalid" : ""}
                            onBlur={field.onBlur}
                            onValueChange={(event) =>
                              field.onChange(event.value ?? 60)
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

                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="finalization_delay_minutes"
                      className="text-sm font-medium text-slate-700"
                    >
                      Delay finalisasi summary
                    </label>
                    <Controller
                      name="finalization_delay_minutes"
                      control={control}
                      rules={{
                        min: { value: 0, message: "Tidak boleh negatif." },
                        validate: (value) =>
                          Number.isInteger(value) ||
                          "Harus berupa bilangan bulat.",
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputNumber
                            id="finalization_delay_minutes"
                            inputRef={field.ref}
                            value={Number(field.value ?? 30)}
                            min={0}
                            minFractionDigits={0}
                            maxFractionDigits={0}
                            step={1}
                            useGrouping={false}
                            suffix=" menit"
                            className={fieldState.invalid ? "p-invalid" : ""}
                            onBlur={field.onBlur}
                            onValueChange={(event) =>
                              field.onChange(event.value ?? 30)
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
                </div>
              </section>
            </>
          )}

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
                      {i18nT("static.almk4n")}{" "}
                    </label>

                    <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                      {i18nT("static.switng")}{" "}
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

export default ShiftTableData;
