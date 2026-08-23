"use client";
import { useI18n } from "@/app/i18n";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { Menu } from "primereact/menu";
import { MenuItem as PrimeMenuItem } from "primereact/menuitem";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  deleteEmployeeShiftRule,
  restoreEmployeeShiftRule,
} from "@/app/services/employee-shift-rule-service";

import { EmployeeShiftRule } from "@/app/types/employee-shift-rule";
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
import { hasPermission } from "@/app/utils/permission-utils";

import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import EmployeeScheduleHelpDialog from "../employee-schedule/_components/EmployeeScheduleHelpDialog";

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

type QuickFilter =
  "this_week" | "this_month" | "last_month" | "next_month" | null;

type DateRangeValue = (Date | null)[] | null;

type ProcessingAction = "delete" | "restore" | null;

const QUICK_FILTERS: {
  labelKey: string;
  value: Exclude<QuickFilter, null>;
}[] = [
  {
    labelKey: "This Week",
    value: "this_week",
  },
  {
    labelKey: "This Month",
    value: "this_month",
  },
  {
    labelKey: "Last Month",
    value: "last_month",
  },
  {
    labelKey: "Next Month",
    value: "next_month",
  },
];

const getBody = () => document.body;

const getQuickFilterRange = (type: QuickFilter): [Date, Date] | null => {
  if (!type) {
    return null;
  }

  const now = dayjs();

  switch (type) {
    case "this_week":
      return [now.startOf("week").toDate(), now.endOf("week").toDate()];

    case "this_month":
      return [now.startOf("month").toDate(), now.endOf("month").toDate()];

    case "last_month": {
      const previousMonth = now.subtract(1, "month");

      return [
        previousMonth.startOf("month").toDate(),
        previousMonth.endOf("month").toDate(),
      ];
    }

    case "next_month": {
      const followingMonth = now.add(1, "month");

      return [
        followingMonth.startOf("month").toDate(),
        followingMonth.endOf("month").toDate(),
      ];
    }

    default:
      return null;
  }
};

const EmployeeShiftRuleTableData = () => {
  const { t: i18nT } = useI18n();
  const router = useRouter();
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const moreMenuRef = useRef<Menu>(null);

  const archivedAccess = useArchivedDataAccess("employee-shift-rule");

  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [dateRange, setDateRange] = useState<DateRangeValue>(null);

  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>(null);

  const [processingRowId, setProcessingRowId] = useState<number | null>(null);

  const [processingAction, setProcessingAction] =
    useState<ProcessingAction>(null);

  const moreItems = useMemo<PrimeMenuItem[]>(() => {
    const items: Array<PrimeMenuItem | false> = [
      hasPermission(profileState.permissions, "shift-rule.read") && {
        label: i18nT("nav.shiftRule"),
        icon: "pi pi-calendar",
        command: () => router.push("/setting/shift-rule"),
      },
      hasPermission(profileState.permissions, "master-data.read") && {
        label: i18nT("nav.shift"),
        icon: "pi pi-calendar",
        command: () => router.push("/setting/shift"),
      },
    ];

    return items.filter((item): item is PrimeMenuItem => item !== false);
  }, [i18nT, profileState.permissions, router]);

  const [filters, setFilters] = useState({
    global: {
      value: "",
      matchMode: FilterMatchMode.CONTAINS,
    },
  });

  const currentKey = `/api/shift-employee?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`;

  const {
    data: employeeShiftRuleData,
    error,
    isLoading,
    isValidating,
    mutate: refreshEmployeeShiftRuleData,
  } = useSWR<EmployeeShiftRule[]>(currentKey, fetcher);

  const activeDateRange = useMemo<[Date, Date] | null>(() => {
    if (activeQuickFilter) {
      return getQuickFilterRange(activeQuickFilter);
    }

    const start = dateRange?.[0];
    const end = dateRange?.[1];

    if (start instanceof Date && end instanceof Date) {
      return [start, end];
    }

    return null;
  }, [activeQuickFilter, dateRange]);

  const filteredData = useMemo(() => {
    const data = employeeShiftRuleData ?? [];

    if (!activeDateRange) {
      return data;
    }

    const [rangeStart, rangeEnd] = activeDateRange;

    const startDate = dayjs(rangeStart).startOf("day");

    const endDate = dayjs(rangeEnd).endOf("day");

    return data.filter((item) => {
      if (!item.effective_from) {
        return false;
      }

      const effectiveFrom = dayjs(item.effective_from);

      const effectiveTo = item.effective_to ? dayjs(item.effective_to) : null;

      if (!effectiveFrom.isValid()) {
        return false;
      }

      if (effectiveTo && !effectiveTo.isValid()) {
        return false;
      }

      /*
       * Menampilkan assignment yang
       * periodenya beririsan dengan
       * periode filter.
       */
      return (
        effectiveFrom.isSameOrBefore(endDate) &&
        (effectiveTo === null || effectiveTo.isSameOrAfter(startDate))
      );
    });
  }, [employeeShiftRuleData, activeDateRange]);

  const dateRangeLabel = useMemo(() => {
    if (!activeDateRange) {
      return null;
    }

    const [start, end] = activeDateRange;

    return `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`;
  }, [activeDateRange]);

  const isFilterActive =
    Boolean(globalFilterValue) ||
    Boolean(activeQuickFilter) ||
    Boolean(dateRange?.some((value) => value instanceof Date));

  const isProcessing = processingRowId !== null;

  const isSuperadmin = archivedAccess.canShowDeleted;

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

  const handleRefresh = async () => {
    try {
      await refreshEmployeeShiftRuleData();
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

  const handleQuickFilter = (type: Exclude<QuickFilter, null>) => {
    setActiveQuickFilter((currentValue) =>
      currentValue === type ? null : type,
    );

    setDateRange(null);
  };

  const handleManualDateChange = (value: DateRangeValue) => {
    setDateRange(value);
    setActiveQuickFilter(null);
  };

  const handleClearFilter = () => {
    setGlobalFilterValue("");
    setDateRange(null);
    setActiveQuickFilter(null);

    setFilters({
      global: {
        value: "",
        matchMode: FilterMatchMode.CONTAINS,
      },
    });
  };

  const handleDelete = async (rowData: EmployeeShiftRule) => {
    try {
      setProcessingRowId(rowData.id);
      setProcessingAction("delete");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteEmployeeShiftRule(rowData.id, rowData.row_version);

      await refreshEmployeeShiftRuleData();

      showSuccess(response.message || i18nT("static.15zf11t"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleRestore = async (rowData: EmployeeShiftRule) => {
    try {
      setProcessingRowId(rowData.id);
      setProcessingAction("restore");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreEmployeeShiftRule(rowData.id, rowData.row_version);

      await refreshEmployeeShiftRuleData();

      showSuccess(response.message || i18nT("static.u8on6k"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const onClickDelete = (rowData: EmployeeShiftRule) => {
    requestActionConfirmation({
      header: i18nT("static.7hz54s"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.8smc34")} </span>

          <span className="font-semibold text-slate-800">
            {rowData.employee_name}
          </span>

          <span className="text-sm text-slate-500">
            {rowData.shift_rule_name}
          </span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => {
        void handleDelete(rowData);
      },
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

  const onClickRestore = (rowData: EmployeeShiftRule) => {
    requestActionConfirmation({
      header: i18nT("static.fd10a7"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.1vhl2jb")} </span>

          <span className="font-semibold text-slate-800">
            {rowData.employee_name}
          </span>

          <span className="text-sm text-slate-500">
            {rowData.shift_rule_name}
          </span>
        </div>
      ),
      icon: "pi pi-refresh",
      defaultFocus: "accept",
      accept: () => {
        void handleRestore(rowData);
      },
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

  const employeeColumnBody = (rowData: EmployeeShiftRule) => {
    if (!rowData.employee_name) {
      return (
        <span className="text-sm text-slate-400">
          {i18nT("static.1drwniz")}
        </span>
      );
    }

    return (
      <span className="font-medium text-slate-800">
        {rowData.employee_name}
      </span>
    );
  };

  const shiftRuleColumnBody = (rowData: EmployeeShiftRule) => {
    if (!rowData.shift_rule_name) {
      return (
        <span className="text-sm text-slate-400">
          {i18nT("static.1ohua0l")}
        </span>
      );
    }

    return (
      <span className="text-sm text-slate-700">{rowData.shift_rule_name}</span>
    );
  };

  const periodColumnBody = (rowData: EmployeeShiftRule) => {
    const effectiveFrom = rowData.effective_from
      ? dayjs(rowData.effective_from)
      : null;

    const effectiveTo = rowData.effective_to
      ? dayjs(rowData.effective_to)
      : null;

    if (!effectiveFrom || !effectiveFrom.isValid()) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    if (!effectiveTo || !effectiveTo.isValid()) {
      return (
        <span className="whitespace-nowrap text-sm text-slate-700">
          {formatDisplayDate(effectiveFrom)} {i18nT("static.ax1ize")}{" "}
        </span>
      );
    }

    return (
      <span className="whitespace-nowrap text-sm text-slate-700">
        {formatDisplayDate(effectiveFrom)} {i18nT("static.hnl64v")}{" "}
        {formatDisplayDate(effectiveTo)}
      </span>
    );
  };

  const statusColumnBody = (rowData: EmployeeShiftRule) => {
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

  const actionColumnBody = (rowData: EmployeeShiftRule) => {
    const isDeleted = Boolean(rowData.deleted_at);

    const isCurrentRowProcessing = processingRowId === rowData.id;

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
              loading={isCurrentRowProcessing && processingAction === "restore"}
              disabled={isProcessing}
              onClick={() => onClickRestore(rowData)}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
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
          loading={isCurrentRowProcessing && processingAction === "delete"}
          disabled={isProcessing}
          onClick={() => onClickDelete(rowData)}
        />
      </div>
    );
  };

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
                <i className="pi pi-calendar-clock text-xl" />
              </div>

              <div className="min-w-0">
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.employeeScheduleMapping")}{" "}
                </h1>

                <div className="mt-1 flex items-center gap-2">
                  <p className="m-0 text-sm leading-6 text-slate-500">
                    {i18nT("static.11bj3wg")}{" "}
                  </p>
                  <Button
                    type="button"
                    icon="pi pi-info-circle"
                    rounded
                    text
                    severity="secondary"
                    aria-label={i18nT("static.1x2sh5o")}
                    tooltip={i18nT("static.1x2sh5o")}
                    tooltipOptions={{ position: "top" }}
                    onClick={() => setShowHelp(true)}
                  />
                </div>
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
                disabled={isValidating || isProcessing}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />

              <Button
                type="button"
                label={i18nT("static.15ge9fu")}
                icon="pi pi-sliders-h"
                size="small"
                disabled={isProcessing}
                className="w-full sm:w-auto"
                onClick={() => router.push("/setting/employee-schedule/change")}
              />

              {moreItems.length > 0 && (
                <>
                  <Button
                    type="button"
                    label={i18nT("static.employeeScheduleMoreActions")}
                    icon="pi pi-ellipsis-h"
                    severity="secondary"
                    outlined
                    size="small"
                    disabled={isProcessing}
                    className="w-full sm:w-auto"
                    onClick={(event) => moreMenuRef.current?.toggle(event)}
                  />
                  <Menu model={moreItems} popup ref={moreMenuRef} />
                </>
              )}
            </div>
          </div>

          {/* Period Filter */}
          <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.1jziwxb")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {i18nT("static.1ccz5ib")}{" "}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((quickFilter) => {
                const isActive = activeQuickFilter === quickFilter.value;

                return (
                  <Button
                    key={quickFilter.value}
                    type="button"
                    label={i18nT(quickFilter.labelKey)}
                    size="small"
                    severity={isActive ? undefined : "secondary"}
                    outlined={!isActive}
                    onClick={() => handleQuickFilter(quickFilter.value)}
                  />
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(16rem,22rem)_minmax(16rem,1fr)_auto] lg:items-end">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="effective_period"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.h92mjb")}{" "}
                </label>

                <Calendar
                  id="effective_period"
                  appendTo={getBody}
                  value={dateRange}
                  selectionMode="range"
                  readOnlyInput
                  hideOnRangeSelection
                  showIcon
                  dateFormat="dd MM yy"
                  placeholder={i18nT("static.bx9hhy")}
                  className="w-full"
                  onChange={(event) =>
                    handleManualDateChange(
                      (event.value as DateRangeValue) ?? null,
                    )
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="employee_shift_search"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1j0itop")}{" "}
                </label>

                <IconField iconPosition="left" className="w-full">
                  <InputIcon className="pi pi-search" />

                  <InputText
                    id="employee_shift_search"
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder={i18nT("static.1dabne2")}
                    className="w-full"
                  />
                </IconField>
              </div>

              <Button
                type="button"
                label={i18nT("static.1bcvlux")}
                icon="pi pi-filter-slash"
                severity="secondary"
                outlined
                disabled={!isFilterActive}
                className="w-full lg:w-auto"
                onClick={handleClearFilter}
              />
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              {archivedAccess.canShowDeleted && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    inputId="showDeletedData"
                    checked={isShowDeletedDataChecked}
                    onChange={(event) =>
                      setIsShowDeletedDataChecked(Boolean(event.checked))
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

              {dateRangeLabel && (
                <div className="flex flex-wrap items-center gap-2">
                  <Tag
                    value={dateRangeLabel}
                    severity="info"
                    icon="pi pi-calendar"
                    rounded
                  />

                  <span className="text-xs text-slate-500">
                    {filteredData.length} {i18nT("static.2u1uec")}{" "}
                    {filteredData.length === 1 ? "" : i18nT("static.1w9pcoy")}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Employee Shift Rule Table */}
          <div className="w-full overflow-hidden">
            <DataTable
              value={filteredData}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "employee_name",
                "shift_rule_name",
                "effective_from",
                "effective_to",
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
                minWidth: "74rem",
              }}
              emptyMessage={i18nT("static.tl9b1u")}
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
                field="employee_name"
                header={i18nT("static.1fak8xt")}
                sortable
                body={employeeColumnBody}
                style={{
                  minWidth: "20rem",
                }}
              />

              <Column
                field="shift_rule_name"
                header={i18nT("static.qlsvoz")}
                sortable
                body={shiftRuleColumnBody}
                style={{
                  minWidth: "19rem",
                }}
              />

              <Column
                header={i18nT("static.1bwcvhr")}
                body={periodColumnBody}
                style={{
                  minWidth: "20rem",
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
                className="bg-white"
                headerStyle={{
                  width: "8rem",
                  minWidth: "8rem",
                  textAlign: "right",
                }}
                bodyStyle={{
                  width: "8rem",
                  minWidth: "8rem",
                }}
              />
            </DataTable>
          </div>
        </div>
      </Card>

      <EmployeeScheduleHelpDialog
        visible={showHelp}
        onHide={() => setShowHelp(false)}
      />
    </>
  );
};

export default EmployeeShiftRuleTableData;
