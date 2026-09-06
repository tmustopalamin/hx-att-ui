"use client";
import { useI18n } from "@/app/i18n";

import { ChangeEvent, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
import {
  formatCompactDate,
  formatDate as formatDisplayDate,
  formatWeekday,
  formatWeekdayDate,
} from "@/app/utils/date-format";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Dialog } from "primereact/dialog";
import { Menu } from "primereact/menu";
import { MenuItem as PrimeMenuItem } from "primereact/menuitem";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch, useSelector } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  deleteEmployeeShiftAssignment,
  purgeEmployeeShiftAssignment,
  restoreEmployeeShiftAssignment,
} from "@/app/services/employee-shift-assignment-service";

import { EmployeeShiftAssignment } from "@/app/types/employee-shift-assignment";
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
import { hasRole } from "@/app/utils/role-utils";
import { RootState } from "@/store/store";
import EmployeeScheduleHelpDialog from "../employee-schedule/_components/EmployeeScheduleHelpDialog";

import { showToast } from "@/store/ToastSlice";

type EmployeeShiftAssignmentRow = EmployeeShiftAssignment & {
  employee_name?: string | null;
  shift_name?: string | null;
};

type QuickRange = "today" | "this_week" | "this_month" | "three_months" | null;

type SelectedCell = {
  employeeId: number;
  employeeName: string | null;
  dateKey: string;
} | null;

type EmployeeMatrixRow = {
  employeeId: number;
  employeeName: string | null;
};

type ProcessingAction = "delete" | "restore" | "purge" | null;

const MASS_SCHEDULE_CHANGE_PERMISSIONS = [
  "employee-shift-rule.read",
  "employee-shift-rule.create",
  "employee-shift-rule.update",
  "employee-shift-assignment.read",
  "employee-shift-assignment.generate",
  "employee-shift-assignment.update",
];

const getBody = () => document.body;

const getDefaultWeekRange = (): [Date, Date] => {
  const today = dayjs();

  return [today.startOf("week").toDate(), today.endOf("week").toDate()];
};

const parseQueryDate = (value: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = dayjs(value);
  return parsed.isValid() && parsed.format("YYYY-MM-DD") === value
    ? parsed.toDate()
    : null;
};

const EmployeeShiftAssignmentListPage = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const profileState = useSelector((state: RootState) => state.profile);
  const moreMenuRef = useRef<Menu>(null);
  const [showHelp, setShowHelp] = useState(false);

  const archivedAccess = useArchivedDataAccess("employee-shift-rule");

  const [defaultWeekFrom, defaultWeekTo] = getDefaultWeekRange();
  const queryFrom = parseQueryDate(searchParams.get("from"));
  const queryTo = parseQueryDate(searchParams.get("to"));

  const [search, setSearch] = useState("");

  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);

  const [dateFrom, setDateFrom] = useState<Date | null>(
    queryFrom ?? defaultWeekFrom,
  );

  const [dateTo, setDateTo] = useState<Date | null>(queryTo ?? defaultWeekTo);

  const [quickRange, setQuickRange] = useState<QuickRange>(
    queryFrom || queryTo ? null : "this_week",
  );

  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);

  const [processingRowId, setProcessingRowId] = useState<number | null>(null);

  const [processingAction, setProcessingAction] =
    useState<ProcessingAction>(null);

  const canReadAssignments = hasPermission(
    profileState.permissions,
    "employee-shift-assignment.read",
  );

  const currentKey = `/api/employee-shift-assignment?show_all=${archivedAccess.canShowDeleted && isShowDeletedDataChecked}`;

  const {
    data: assignmentData,
    error,
    isLoading,
    isValidating,
    mutate: refreshEmployeeShiftAssignmentData,
  } = useSWR<EmployeeShiftAssignmentRow[]>(
    canReadAssignments ? currentKey : null,
    fetcher,
  );

  const moreItems = useMemo<PrimeMenuItem[]>(() => {
    const items: Array<PrimeMenuItem | false> = [
      hasPermission(
        profileState.permissions,
        "employee-shift-assignment.generate",
      ) && {
        label: i18nT("static.a0nkg3"),
        icon: "pi pi-calendar-plus",
        command: () => router.push("/setting/employee-schedule/generate"),
      },
      hasPermission(profileState.permissions, "employee-shift-rule.read") && {
        label: i18nT("static.employeeScheduleMapping"),
        icon: "pi pi-list",
        command: () => router.push("/setting/employee-schedule/rules"),
      },
      hasRole(profileState.role, ["superadmin"]) &&
        hasPermission(
          profileState.permissions,
          "employee-schedule-change-log.read",
        ) && {
          label: i18nT("Mass Shift Change Log"),
          icon: "pi pi-history",
          command: () => router.push("/setting/employee-schedule/change-log"),
        },
    ];
    return items.filter((item): item is PrimeMenuItem => item !== false);
  }, [i18nT, profileState.permissions, profileState.role, router]);

  const isProcessing = processingRowId !== null;

  const hasInvalidDateRange = Boolean(
    dateFrom &&
    dateTo &&
    dayjs(dateFrom).startOf("day").isAfter(dayjs(dateTo).endOf("day")),
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

  const applyQuickRange = (range: Exclude<QuickRange, null>) => {
    const today = dayjs();

    setQuickRange(range);
    setSelectedCell(null);

    if (range === "today") {
      setDateFrom(today.startOf("day").toDate());

      setDateTo(today.endOf("day").toDate());

      return;
    }

    if (range === "this_week") {
      setDateFrom(today.startOf("week").toDate());

      setDateTo(today.endOf("week").toDate());

      return;
    }

    if (range === "three_months") {
      setDateFrom(today.startOf("month").toDate());
      setDateTo(today.add(2, "month").endOf("month").toDate());

      return;
    }

    setDateFrom(today.startOf("month").toDate());

    setDateTo(today.endOf("month").toDate());
  };

  const onDateFromChange = (value: Date | null) => {
    setDateFrom(value);
    setQuickRange(null);
    setSelectedCell(null);
  };

  const onDateToChange = (value: Date | null) => {
    setDateTo(value);
    setQuickRange(null);
    setSelectedCell(null);
  };

  const filteredData = useMemo(() => {
    if (hasInvalidDateRange) {
      return [];
    }

    const keyword = search.trim().toLowerCase();

    return (assignmentData ?? []).filter((item) => {
      const shiftDate = item.shift_date ? dayjs(item.shift_date) : null;

      if (shiftDate && !shiftDate.isValid()) {
        return false;
      }

      const employeeName = item.employee_name ?? "";

      const shiftName = item.shift_name ?? "";

      const formattedDate = shiftDate?.format("DD-MM-YYYY") ?? "";

      const matchSearch =
        !keyword ||
        employeeName.toLowerCase().includes(keyword) ||
        shiftName.toLowerCase().includes(keyword) ||
        formattedDate.includes(keyword) ||
        (item.is_day_off && "day off".includes(keyword)) ||
        (item.is_holiday && "holiday".includes(keyword)) ||
        (item.deleted_at && "deleted".includes(keyword));

      const matchDateFrom =
        !dateFrom ||
        Boolean(
          shiftDate &&
          shiftDate.startOf("day").valueOf() >=
            dayjs(dateFrom).startOf("day").valueOf(),
        );

      const matchDateTo =
        !dateTo ||
        Boolean(
          shiftDate &&
          shiftDate.endOf("day").valueOf() <=
            dayjs(dateTo).endOf("day").valueOf(),
        );

      return matchSearch && matchDateFrom && matchDateTo;
    });
  }, [assignmentData, search, dateFrom, dateTo, hasInvalidDateRange]);

  const visibleDates = useMemo(() => {
    if (!dateFrom || !dateTo || hasInvalidDateRange) {
      return [];
    }

    const startDate = dayjs(dateFrom).startOf("day");

    const endDate = dayjs(dateTo).startOf("day");

    const dates: string[] = [];

    let currentDate = startDate;

    while (currentDate.valueOf() <= endDate.valueOf()) {
      dates.push(currentDate.format("YYYY-MM-DD"));

      currentDate = currentDate.add(1, "day");
    }

    return dates;
  }, [dateFrom, dateTo, hasInvalidDateRange]);

  const employeeRows = useMemo<EmployeeMatrixRow[]>(() => {
    const employeeMap = new Map<number, EmployeeMatrixRow>();

    for (const item of filteredData) {
      if (item.employee_id === null || item.employee_id === undefined) {
        continue;
      }

      const employeeId = Number(item.employee_id);

      if (!Number.isFinite(employeeId) || employeeId <= 0) {
        continue;
      }

      if (employeeMap.has(employeeId)) {
        continue;
      }

      employeeMap.set(employeeId, {
        employeeId,
        employeeName: item.employee_name ?? null,
      });
    }

    return Array.from(employeeMap.values()).sort((first, second) =>
      (first.employeeName ?? "").localeCompare(second.employeeName ?? ""),
    );
  }, [filteredData]);

  const scheduleMap = useMemo(() => {
    const result = new Map<string, EmployeeShiftAssignmentRow[]>();

    for (const item of filteredData) {
      if (
        item.employee_id === null ||
        item.employee_id === undefined ||
        !item.shift_date
      ) {
        continue;
      }

      const employeeId = Number(item.employee_id);

      const shiftDate = dayjs(item.shift_date);

      if (!Number.isFinite(employeeId) || !shiftDate.isValid()) {
        continue;
      }

      const dateKey = shiftDate.format("YYYY-MM-DD");

      const mapKey = `${employeeId}__${dateKey}`;

      const currentEntries = result.get(mapKey) ?? [];

      result.set(mapKey, [...currentEntries, item]);
    }

    for (const entries of result.values()) {
      entries.sort((first, second) => first.id - second.id);
    }

    return result;
  }, [filteredData]);

  const selectedCellEntries = useMemo(() => {
    if (!selectedCell) {
      return [];
    }

    const key = `${selectedCell.employeeId}__${selectedCell.dateKey}`;

    return scheduleMap.get(key) ?? [];
  }, [selectedCell, scheduleMap]);

  const dateRangeLabel = useMemo(() => {
    if (!dateFrom || !dateTo || hasInvalidDateRange) {
      return null;
    }

    return `${formatDisplayDate(dateFrom)} – ${formatDisplayDate(dateTo)}`;
  }, [dateFrom, dateTo, hasInvalidDateRange]);

  const hasActiveFilter = useMemo(() => {
    const defaultFrom = dayjs().startOf("week").startOf("day");

    const defaultTo = dayjs().endOf("week").startOf("day");

    const currentFrom = dateFrom ? dayjs(dateFrom).startOf("day") : null;

    const currentTo = dateTo ? dayjs(dateTo).startOf("day") : null;

    const isDefaultPeriod = Boolean(
      currentFrom &&
      currentTo &&
      currentFrom.isSame(defaultFrom, "day") &&
      currentTo.isSame(defaultTo, "day"),
    );

    return (
      Boolean(search.trim()) || quickRange !== "this_week" || !isDefaultPeriod
    );
  }, [search, quickRange, dateFrom, dateTo]);

  const clearFilters = () => {
    const [weekStart, weekEnd] = getDefaultWeekRange();

    setSearch("");
    setDateFrom(weekStart);
    setDateTo(weekEnd);
    setQuickRange("this_week");
    setSelectedCell(null);
  };

  const handleRefresh = async () => {
    try {
      await refreshEmployeeShiftAssignmentData();
    } catch (err: unknown) {
      showError(err);
    }
  };

  const handleDelete = async (row: EmployeeShiftAssignmentRow) => {
    try {
      setProcessingRowId(row.id);
      setProcessingAction("delete");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await deleteEmployeeShiftAssignment(row.id, row.row_version);

      await refreshEmployeeShiftAssignmentData();

      showSuccess(response.message || i18nT("static.mw4wpo"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handleRestore = async (row: EmployeeShiftAssignmentRow) => {
    try {
      setProcessingRowId(row.id);
      setProcessingAction("restore");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await restoreEmployeeShiftAssignment(row.id, row.row_version);

      await refreshEmployeeShiftAssignmentData();

      showSuccess(response.message || i18nT("static.l805sb"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const handlePurge = async (row: EmployeeShiftAssignmentRow) => {
    try {
      setProcessingRowId(row.id);
      setProcessingAction("purge");

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await purgeEmployeeShiftAssignment(row.id);

      await refreshEmployeeShiftAssignmentData();

      showSuccess(response.message || i18nT("static.1n4pzva"));
    } catch (err: unknown) {
      showError(err);
    } finally {
      setProcessingRowId(null);
      setProcessingAction(null);
    }
  };

  const onClickDelete = (row: EmployeeShiftAssignmentRow) => {
    requestActionConfirmation({
      header: i18nT("static.ltdhu3"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.hkeit")} </span>

          <span className="font-semibold text-slate-800">
            {row.employee_name || i18nT("static.1drwniz")}
          </span>

          <span className="text-sm text-slate-500">
            {row.shift_name || i18nT("static.jp1eqx")} {i18nT("static.19xoda3")}{" "}
            {row.shift_date
              ? formatDisplayDate(row.shift_date)
              : i18nT("static.z5wi6y")}
          </span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => {
        void handleDelete(row);
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

  const onClickRestore = (row: EmployeeShiftAssignmentRow) => {
    requestActionConfirmation({
      header: i18nT("static.1lmr4cq"),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{i18nT("static.1x63uk8")} </span>

          <span className="font-semibold text-slate-800">
            {row.employee_name || i18nT("static.1drwniz")}
          </span>

          <span className="text-sm text-slate-500">
            {row.shift_name || i18nT("static.jp1eqx")} {i18nT("static.19xoda3")}{" "}
            {row.shift_date
              ? formatDisplayDate(row.shift_date)
              : i18nT("static.z5wi6y")}
          </span>
        </div>
      ),
      icon: "pi pi-refresh",
      defaultFocus: "accept",
      accept: () => {
        void handleRestore(row);
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

  const onClickPurge = (row: EmployeeShiftAssignmentRow) => {
    requestActionConfirmation({
      header: i18nT("static.1ookh6q"),
      message: (
        <div className="flex flex-col gap-2">
          <span className="text-slate-600">{i18nT("static.1g8j1g8")} </span>

          <span className="font-semibold text-slate-800">
            {row.employee_name || i18nT("static.1drwniz")}
          </span>

          <span className="text-sm text-slate-500">
            {row.shift_name || i18nT("static.jp1eqx")} {i18nT("static.19xoda3")}{" "}
            {row.shift_date
              ? formatDisplayDate(row.shift_date)
              : i18nT("static.z5wi6y")}
          </span>
        </div>
      ),
      icon: "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () => {
        void handlePurge(row);
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
            label={i18nT("static.1wopxwj")}
            icon="pi pi-trash"
            severity="danger"
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const renderStatusTag = (row: EmployeeShiftAssignmentRow) => {
    if (row.deleted_at) {
      return (
        <Tag
          value={i18nT("static.1v6qcju")}
          severity="secondary"
          icon="pi pi-trash"
          rounded
        />
      );
    }

    return (
      <Tag
        value={i18nT("static.8qzyhb")}
        severity="success"
        icon="pi pi-check-circle"
        rounded
      />
    );
  };

  const getEntryClass = (row: EmployeeShiftAssignmentRow) => {
    if (row.deleted_at) {
      return "border-rose-200 bg-rose-50 text-rose-700";
    }

    if (row.is_holiday && row.is_day_off) {
      return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (row.is_holiday) {
      return "border-yellow-200 bg-yellow-50 text-yellow-700";
    }

    if (row.is_day_off) {
      return "border-sky-200 bg-sky-50 text-sky-700";
    }

    return "border-blue-200 bg-blue-50 text-blue-700";
  };

  const renderActionButtons = (row: EmployeeShiftAssignmentRow) => {
    const isCurrentRowProcessing = processingRowId === row.id;

    if (row.deleted_at) {
      if (!archivedAccess.canRestore && !archivedAccess.canPurge) {
        return (
          <span className="text-sm text-slate-400">
            {i18nT("static.yaeuo4")}
          </span>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
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
              onClick={() => onClickRestore(row)}
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
              loading={isCurrentRowProcessing && processingAction === "purge"}
              disabled={isProcessing}
              onClick={() => onClickPurge(row)}
            />
          )}
        </div>
      );
    }

    return (
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
        onClick={() => onClickDelete(row)}
      />
    );
  };

  if (isLoading) {
    return <LoadingDataTable />;
  }

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={currentKey} />;
  }

  if (!canReadAssignments) {
    return (
      <Card className="border border-amber-200 shadow-sm">
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-3">
            <i className="pi pi-lock mt-1 text-amber-600" />
            <div>
              <h1 className="m-0 text-xl font-semibold text-slate-800">
                {i18nT("nav.employeeSchedule")}
              </h1>
              <p className="m-0 mt-1 text-sm text-slate-600">
                {i18nT("static.employeeScheduleNoAccess")}
              </p>
            </div>
          </div>
          {hasPermission(
            profileState.permissions,
            "employee-shift-rule.read",
          ) && (
            <Button
              type="button"
              label={i18nT("static.employeeScheduleMapping")}
              icon="pi pi-list"
              outlined
              className="w-full sm:w-fit"
              onClick={() => router.push("/setting/employee-schedule/rules")}
            />
          )}
        </div>
      </Card>
    );
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
                  {i18nT("nav.employeeSchedule")}{" "}
                </h1>

                <div className="mt-1 flex items-center gap-2">
                  <p className="m-0 text-sm leading-6 text-slate-500">
                    {i18nT("static.xzgpeh")}{" "}
                  </p>
                  <Button
                    type="button"
                    icon="pi pi-info-circle"
                    rounded
                    text
                    severity="secondary"
                    aria-label={i18nT("static.1x2sh5o")}
                    tooltip={i18nT("static.1x2sh5o")}
                    tooltipOptions={{ appendTo: getBody, position: "top" }}
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

              {MASS_SCHEDULE_CHANGE_PERMISSIONS.every((permission) =>
                hasPermission(profileState.permissions, permission),
              ) && (
                <Button
                  type="button"
                  label={i18nT("static.15ge9fu")}
                  icon="pi pi-sliders-h"
                  severity="success"
                  size="small"
                  disabled={isProcessing}
                  className="w-full sm:w-auto"
                  onClick={() =>
                    router.push("/setting/employee-schedule/change")
                  }
                />
              )}

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

          {/* Filter Section */}
          <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h2 className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.lm70ue")}{" "}
              </h2>

              <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                {i18nT("static.10pe6ec")}{" "}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                label={i18nT("static.1sawk0u")}
                size="small"
                severity={quickRange === "today" ? "info" : "secondary"}
                outlined={quickRange !== "today"}
                onClick={() => applyQuickRange("today")}
              />

              <Button
                type="button"
                label={i18nT("static.he9t3n")}
                size="small"
                severity={quickRange === "this_week" ? "info" : "secondary"}
                outlined={quickRange !== "this_week"}
                onClick={() => applyQuickRange("this_week")}
              />

              <Button
                type="button"
                label={i18nT("static.usin9z")}
                size="small"
                severity={quickRange === "this_month" ? "info" : "secondary"}
                outlined={quickRange !== "this_month"}
                onClick={() => applyQuickRange("this_month")}
              />

              <Button
                type="button"
                label={i18nT("static.employeeScheduleThreeMonths")}
                size="small"
                severity={quickRange === "three_months" ? "info" : "secondary"}
                outlined={quickRange !== "three_months"}
                onClick={() => applyQuickRange("three_months")}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(12rem,16rem)_minmax(12rem,16rem)_minmax(16rem,1fr)_auto] lg:items-end">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="date_from"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.pkgk6v")}{" "}
                </label>

                <Calendar
                  id="date_from"
                  appendTo={getBody}
                  value={dateFrom}
                  dateFormat="dd MM yy"
                  showIcon
                  placeholder={i18nT("static.h39lib")}
                  className="w-full"
                  onChange={(event) =>
                    onDateFromChange((event.value as Date | null) ?? null)
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="date_to"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1iqht4m")}{" "}
                </label>

                <Calendar
                  id="date_to"
                  appendTo={getBody}
                  value={dateTo}
                  dateFormat="dd MM yy"
                  showIcon
                  placeholder={i18nT("static.12xc3jc")}
                  className="w-full"
                  onChange={(event) =>
                    onDateToChange((event.value as Date | null) ?? null)
                  }
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="schedule_search"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1j0itop")}{" "}
                </label>

                <IconField iconPosition="left" className="w-full">
                  <InputIcon className="pi pi-search" />

                  <InputText
                    id="schedule_search"
                    value={search}
                    placeholder={i18nT("static.1ij9t")}
                    className="w-full"
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setSearch(event.target.value)
                    }
                  />
                </IconField>
              </div>

              <Button
                type="button"
                label={i18nT("static.1ljj5w3")}
                icon="pi pi-filter-slash"
                severity="secondary"
                outlined
                disabled={!hasActiveFilter}
                className="w-full lg:w-auto"
                onClick={clearFilters}
              />
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>{i18nT("static.1k8q7ax")}</span>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              {archivedAccess.canShowDeleted && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    inputId="showDeletedData"
                    checked={isShowDeletedDataChecked}
                    onChange={(event) => {
                      setIsShowDeletedDataChecked(Boolean(event.checked));

                      setSelectedCell(null);
                    }}
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
                    icon="pi pi-calendar"
                    severity="info"
                    rounded
                  />

                  <span className="text-xs text-slate-500">
                    {i18nT("static.employeeScheduleFilterSummary", {
                      p0: filteredData.length,
                      p1: employeeRows.length,
                    })}
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Legend */}
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {i18nT("static.k0ttac")}{" "}
            </span>

            <div className="flex flex-wrap gap-2">
              <Tag value={i18nT("static.1bsrn9m")} severity="info" rounded />

              <Tag value={i18nT("static.ih7a2j")} severity="warning" rounded />

              <Tag
                value={i18nT("static.776hx0")}
                severity="secondary"
                rounded
              />

              <Tag value={i18nT("static.1v6qcju")} severity="danger" rounded />
            </div>
          </div>

          {/* Schedule Matrix */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {employeeRows.length === 0 || visibleDates.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <i className="pi pi-calendar-times mb-3 text-3xl text-slate-400" />

                <p className="m-0 text-sm font-semibold text-slate-700">
                  {i18nT("static.t3al4s")}{" "}
                </p>

                <p className="m-0 mt-1 text-xs text-slate-500">
                  {i18nT("static.s6qfyi")}{" "}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[70rem] border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-30 min-w-[16rem] border-b border-r border-slate-200 bg-slate-50 px-4 py-4 text-left">
                        <span className="text-sm font-semibold text-slate-800">
                          {i18nT("static.1fak8xt")}{" "}
                        </span>
                      </th>

                      {visibleDates.map((dateKey) => {
                        const date = dayjs(dateKey);

                        const isToday = date.isSame(dayjs(), "day");

                        const isWeekend = date.day() === 0 || date.day() === 6;

                        return (
                          <th
                            key={dateKey}
                            className={`min-w-[7.5rem] border-b border-r border-slate-200 px-3 py-3 text-center ${
                              isToday
                                ? "bg-blue-50"
                                : isWeekend
                                  ? "bg-slate-100"
                                  : "bg-slate-50"
                            }`}
                          >
                            <div className="text-xs uppercase text-slate-500">
                              {formatWeekday(date)}
                            </div>

                            <div
                              className={`mt-1 text-sm font-semibold ${
                                isToday ? "text-blue-700" : "text-slate-800"
                              }`}
                            >
                              {formatCompactDate(date)}
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody>
                    {employeeRows.map((employee) => (
                      <tr key={employee.employeeId}>
                        <td className="sticky left-0 z-10 min-w-[16rem] border-b border-r border-slate-200 bg-white px-4 py-4 align-top shadow-[6px_0_10px_-10px_rgba(0,0,0,0.2)]">
                          <div className="truncate text-sm font-semibold text-slate-800">
                            {employee.employeeName || i18nT("static.1drwniz")}
                          </div>

                          <div className="mt-1 font-mono text-xs text-slate-500">
                            {i18nT("static.bu6fn2")} {employee.employeeId}
                          </div>
                        </td>

                        {visibleDates.map((dateKey) => {
                          const mapKey = `${employee.employeeId}__${dateKey}`;

                          const entries = scheduleMap.get(mapKey) ?? [];

                          const isSelected =
                            selectedCell?.employeeId === employee.employeeId &&
                            selectedCell?.dateKey === dateKey;

                          const isToday = dayjs(dateKey).isSame(dayjs(), "day");

                          return (
                            <td
                              key={dateKey}
                              className={`min-w-[7.5rem] border-b border-r border-slate-100 p-2 align-top ${
                                isSelected
                                  ? "bg-blue-50"
                                  : isToday
                                    ? "bg-blue-50/30"
                                    : "bg-white"
                              }`}
                            >
                              <button
                                type="button"
                                className="min-h-[6rem] w-full border-0 bg-transparent p-0 text-left"
                                onClick={() =>
                                  setSelectedCell({
                                    employeeId: employee.employeeId,
                                    employeeName: employee.employeeName,
                                    dateKey,
                                  })
                                }
                              >
                                {entries.length === 0 ? (
                                  <div className="flex min-h-[6rem] items-center justify-center text-xs text-slate-300">
                                    {i18nT("static.112tcox")}{" "}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5">
                                    {entries.slice(0, 2).map((entry) => (
                                      <div
                                        key={entry.id}
                                        title={
                                          entry.shift_name ||
                                          i18nT("static.jp1eqx")
                                        }
                                        className={`truncate rounded-lg border px-2 py-1.5 text-xs font-medium ${getEntryClass(
                                          entry,
                                        )}`}
                                      >
                                        {entry.shift_name ||
                                          i18nT("static.jp1eqx")}
                                      </div>
                                    ))}

                                    {entries.some(
                                      (entry) => entry.is_holiday,
                                    ) && (
                                      <span className="text-[11px] font-medium text-amber-700">
                                        {i18nT("static.ih7a2j")}{" "}
                                      </span>
                                    )}

                                    {entries.some(
                                      (entry) => entry.is_day_off,
                                    ) && (
                                      <span className="text-[11px] font-medium text-sky-700">
                                        {i18nT("static.776hx0")}{" "}
                                      </span>
                                    )}

                                    {entries.length > 2 && (
                                      <span className="text-[11px] text-slate-500">
                                        +{entries.length - 2}{" "}
                                        {i18nT("static.1sgpk2o")}{" "}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Selected Schedule Detail */}
          <Dialog
            visible={Boolean(selectedCell)}
            onHide={() => setSelectedCell(null)}
            modal
            draggable={false}
            resizable={false}
            header={i18nT("static.1h1hbdh")}
            style={{ width: "min(46rem, calc(100vw - 2rem))" }}
          >
            {selectedCell && (
              <div>
                <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div>
                    <h2 className="m-0 text-sm font-semibold text-slate-800">
                      {i18nT("static.1h1hbdh")}{" "}
                    </h2>

                    <p className="m-0 mt-1 text-xs text-slate-500">
                      {selectedCell.employeeName || i18nT("static.1drwniz")}{" "}
                      {i18nT("static.19xoda3")}{" "}
                      {formatWeekdayDate(selectedCell.dateKey)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    icon="pi pi-times"
                    text
                    rounded
                    severity="secondary"
                    tooltip={i18nT("static.1w9iyg8")}
                    tooltipOptions={{
                      appendTo: getBody,
                      position: "top",
                    }}
                    onClick={() => setSelectedCell(null)}
                  />
                </div>

                <div className="p-4 sm:p-5">
                  {selectedCellEntries.length === 0 ? (
                    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      <i className="pi pi-info-circle mt-0.5 text-slate-400" />

                      <span>{i18nT("static.1bckc26")}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {selectedCellEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex flex-col gap-4 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <h3 className="m-0 truncate text-sm font-semibold text-slate-800">
                              {entry.shift_name || i18nT("static.jp1eqx")}
                            </h3>

                            <p className="m-0 mt-1 font-mono text-xs text-slate-500">
                              {i18nT("static.1w91hwp")} {entry.id}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {renderStatusTag(entry)}

                              {entry.is_holiday && (
                                <Tag
                                  value={i18nT("static.ih7a2j")}
                                  severity="warning"
                                  rounded
                                />
                              )}

                              {entry.is_day_off && (
                                <Tag
                                  value={i18nT("static.776hx0")}
                                  severity="info"
                                  rounded
                                />
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {renderActionButtons(entry)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Dialog>
        </div>
      </Card>

      <EmployeeScheduleHelpDialog
        visible={showHelp}
        onHide={() => setShowHelp(false)}
      />
    </>
  );
};

export default EmployeeShiftAssignmentListPage;
