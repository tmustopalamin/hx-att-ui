"use client";

import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { fetcher } from "@/app/utils/fetcher";
import { useDispatch, useSelector } from "react-redux";
import { Tag } from "primereact/tag";
import { Checkbox } from "primereact/checkbox";
import { RootState } from "@/store/store";
import { hasRole } from "@/app/utils/role-utils";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { EmployeeShiftRule } from "@/app/types/employee-shift-rule";
import dayjs from "dayjs";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import {
  deleteEmployeeShiftRule,
  restoreEmployeeShiftRule,
} from "@/app/services/employee-shift-rule-service";
import { showToast } from "@/store/ToastSlice";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";
import { useRouter } from "next/navigation";
import { Calendar } from "primereact/calendar";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

// Quick filter preset type
type QuickFilter =
  "this_week" | "this_month" | "next_month" | "last_month" | null;

const getQuickFilterRange = (type: QuickFilter): [Date, Date] | null => {
  if (!type) return null;
  const now = dayjs();
  switch (type) {
    case "this_week":
      return [now.startOf("week").toDate(), now.endOf("week").toDate()];
    case "this_month":
      return [now.startOf("month").toDate(), now.endOf("month").toDate()];
    case "next_month":
      return [
        now.add(1, "month").startOf("month").toDate(),
        now.add(1, "month").endOf("month").toDate(),
      ];
    case "last_month":
      return [
        now.subtract(1, "month").startOf("month").toDate(),
        now.subtract(1, "month").endOf("month").toDate(),
      ];
    default:
      return null;
  }
};

const QUICK_FILTERS: { label: string; value: QuickFilter }[] = [
  { label: "This Week", value: "this_week" },
  { label: "This Month", value: "this_month" },
  { label: "Last Month", value: "last_month" },
  { label: "Next Month", value: "next_month" },
];

const EmployeeShiftRuleTableData = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const [dateRange, setDateRange] = useState<Date[] | null>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>(null);

  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });

  const { data, error, isLoading } = useSWR<EmployeeShiftRule[]>(
    `/api/shift-employee?show_all=${isShowDeletedDataChecked}`,
    fetcher,
  );

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return (
      <ErrorNotConnectedToApi
        mutateKey={`/api/shift-employee?show_all=${isShowDeletedDataChecked}`}
      />
    );
  }

  // ─── Filtered Data ───────────────────────────────────────────────────────────
  const activeDateRange: Date[] | null = (() => {
    if (activeQuickFilter) {
      const range = getQuickFilterRange(activeQuickFilter);
      return range ? range : null;
    }
    return dateRange;
  })();

  const filteredData = data?.filter((item) => {
    if (!activeDateRange || activeDateRange.length !== 2) return true;
    const [start, end] = activeDateRange;
    if (!start || !end) return true;

    const startDate = dayjs(start).startOf("day");
    const endDate = dayjs(end).endOf("day");
    const effectiveFrom = dayjs(item.effective_from);
    // Handle null effective_to → berlaku selamanya
    const effectiveTo = item.effective_to ? dayjs(item.effective_to) : null;

    return (
      effectiveFrom.isSameOrBefore(endDate) &&
      (effectiveTo === null || effectiveTo.isSameOrAfter(startDate))
    );
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({ ...filters, global: { ...filters.global, value } });
    setGlobalFilterValue(value);
  };

  const handleQuickFilter = (type: QuickFilter) => {
    if (activeQuickFilter === type) {
      // toggle off
      setActiveQuickFilter(null);
    } else {
      setActiveQuickFilter(type);
      setDateRange(null); // clear manual range
    }
  };

  const handleManualDateChange = (value: Date[]) => {
    setDateRange(value);
    setActiveQuickFilter(null); // clear quick filter
  };

  const handleClearFilter = () => {
    setGlobalFilterValue("");
    setDateRange(null);
    setActiveQuickFilter(null);
    setFilters({ global: { value: "", matchMode: FilterMatchMode.CONTAINS } });
  };

  const isFilterActive =
    !!globalFilterValue ||
    !!activeQuickFilter ||
    (dateRange && dateRange.some(Boolean));

  // ─── Column Bodies ────────────────────────────────────────────────────────────
  const activeColumnBody = (rowData: EmployeeShiftRule) =>
    rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );

  const columnFormatDateEffectiveFrom = (rowData: EmployeeShiftRule) =>
    rowData.effective_from
      ? dayjs(rowData.effective_from).format("DD-MM-YYYY")
      : "";

  const columnFormatDateEffectiveTo = (rowData: EmployeeShiftRule) =>
    rowData.effective_to
      ? dayjs(rowData.effective_to).format("DD-MM-YYYY")
      : "∞";

  // ─── Delete / Restore ─────────────────────────────────────────────────────────
  const showConfirmDialog = (
    message: string,
    header: string,
    acceptSeverity: "danger" | "success",
    onAccept: () => void,
  ) => {
    confirmDialog({
      message,
      header,
      icon: "pi pi-info-circle",
      defaultFocus: "accept",
      accept: onAccept,
      reject: () => {},
      footer: (options) => (
        <div className="flex gap-3 justify-end">
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
            className={
              acceptSeverity === "danger"
                ? "p-button-danger"
                : "p-button-success"
            }
          />
        </div>
      ),
    });
  };

  const handleDelete = async (rowData: EmployeeShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteEmployeeShiftRule(rowData.id, rowData.row_version);
      mutate(`/api/shift-employee?show_all=${isShowDeletedDataChecked}`);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      const detail = isResponseTypeError(err)
        ? getErrorMessage(err, "message")
        : err instanceof Error
          ? err.message
          : "Unknown error";
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "error",
          detail,
        }),
      );
    }
  };

  const handleRestore = async (rowData: EmployeeShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreEmployeeShiftRule(rowData.id, rowData.row_version);
      mutate(`/api/shift-employee?show_all=${isShowDeletedDataChecked}`);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message,
        }),
      );
    } catch (err: unknown) {
      const detail = isResponseTypeError(err)
        ? getErrorMessage(err, "message")
        : err instanceof Error
          ? err.message
          : "Unknown error";
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "error",
          detail,
        }),
      );
    }
  };

  const onClickDelete = (rowData: EmployeeShiftRule) =>
    showConfirmDialog(
      "Do you want to delete this record?",
      "Delete Confirmation",
      "danger",
      () => handleDelete(rowData),
    );

  const onClickRestore = (rowData: EmployeeShiftRule) =>
    showConfirmDialog(
      "Do you want to restore this record?",
      "Restore Confirmation",
      "success",
      () => handleRestore(rowData),
    );

  const actionColumnBody = (rowData: EmployeeShiftRule) => (
    <div className="flex gap-2">
      {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && (
        <Button
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          tooltip="restore"
          rounded
          severity="success"
          icon="pi pi-refresh"
          size="small"
          onClick={() => onClickRestore(rowData)}
        />
      )}
      {!rowData.deleted_at && (
        <Button
          tooltipOptions={{ appendTo: () => document.body, position: "top" }}
          tooltip="delete"
          rounded
          severity="danger"
          icon="pi pi-trash"
          size="small"
          onClick={() => onClickDelete(rowData)}
        />
      )}
    </div>
  );

  // ─── Date range label for display ─────────────────────────────────────────────
  const dateRangeLabel = (() => {
    if (activeQuickFilter) {
      const range = getQuickFilterRange(activeQuickFilter);
      if (range) {
        return `${dayjs(range[0]).format("DD MMM YYYY")} – ${dayjs(range[1]).format("DD MMM YYYY")}`;
      }
    }
    if (dateRange && dateRange[0] && dateRange[1]) {
      return `${dayjs(dateRange[0]).format("DD MMM YYYY")} – ${dayjs(dateRange[1]).format("DD MMM YYYY")}`;
    }
    return null;
  })();

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <ConfirmDialog />
      <Card>
        <div className="p-4 flex flex-col gap-4">
          {/* HEADER */}
          <div className="border-b pb-4 space-y-4">
            {/* TOP: TITLE + ACTION */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-2xl font-semibold">
                  Employee Shift Rule
                </div>
                <div className="text-sm text-gray-500">
                  Manage employee shift configurations
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  label="Assign"
                  icon="pi pi-link"
                  size="small"
                  onClick={() =>
                    router.push("/setting/employee-shift-rule/assign")
                  }
                />
              </div>
            </div>

            {/* FILTER SECTION */}
            <div className="flex flex-col gap-3">
              {/* ROW 1: Label + Quick Filters */}
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  Effective Period:
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_FILTERS.map((qf) => (
                    <Button
                      key={qf.value}
                      label={qf.label}
                      size="small"
                      severity={
                        activeQuickFilter === qf.value ? undefined : "secondary"
                      }
                      outlined={activeQuickFilter !== qf.value}
                      onClick={() => handleQuickFilter(qf.value)}
                      className="text-xs"
                    />
                  ))}
                </div>
              </div>

              {/* ROW 2: Manual Date Range + Search + Show Deleted + Clear */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 flex-wrap justify-between">
                {/* LEFT: Manual range + search */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 whitespace-nowrap">
                      Custom range:
                    </span>
                    <Calendar
                      value={dateRange as Date[]}
                      onChange={(e) =>
                        handleManualDateChange(e.value as Date[])
                      }
                      selectionMode="range"
                      readOnlyInput
                      hideOnRangeSelection
                      placeholder="Pick date range"
                      dateFormat="dd-mm-yy"
                      className="p-inputtext-sm w-full md:w-[220px]"
                    />
                  </div>

                  <div className="w-full md:w-[220px]">
                    <IconField iconPosition="left">
                      <InputIcon className="pi pi-search" />
                      <InputText
                        className="p-inputtext-sm w-full"
                        value={globalFilterValue}
                        onChange={onGlobalFilterChange}
                        placeholder="Search employee / shift"
                      />
                    </IconField>
                  </div>
                </div>

                {/* RIGHT: Show deleted + Clear */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Checkbox
                      inputId="showDeletedData"
                      checked={isShowDeletedDataChecked}
                      onChange={() =>
                        setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
                      }
                    />
                    <label htmlFor="showDeletedData" className="text-sm">
                      Show deleted
                    </label>
                  </div>

                  {isFilterActive && (
                    <Button
                      label="Clear"
                      icon="pi pi-times"
                      severity="secondary"
                      size="small"
                      onClick={handleClearFilter}
                    />
                  )}
                </div>
              </div>

              {/* ROW 3: Active filter info badge */}
              {dateRangeLabel && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    Showing shift active during:
                  </span>
                  <span className="text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                    📅 {dateRangeLabel}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({filteredData?.length ?? 0} result
                    {filteredData?.length !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* TABLE */}
          <DataTable
            value={filteredData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={[
              "employee_name",
              "shift_rule_name",
              "effective_from",
              "effective_to",
              "is_active",
            ]}
            emptyMessage="No data found."
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column
              header="#"
              headerStyle={{ width: "3rem" }}
              body={(_data, options) => options.rowIndex + 1}
            />
            <Column field="employee_name" header="Employee Name" />
            <Column field="shift_rule_name" header="Shift Rule Name" />
            <Column
              field="effective_from"
              header="Effective From"
              body={columnFormatDateEffectiveFrom}
            />
            <Column
              field="effective_to"
              header="Effective To"
              body={columnFormatDateEffectiveTo}
            />
            <Column field="is_active" header="Active" body={activeColumnBody} />
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header="Action"
              body={actionColumnBody}
              frozen
              alignFrozen="right"
            />
          </DataTable>
        </div>
      </Card>
    </>
  );
};

export default EmployeeShiftRuleTableData;
