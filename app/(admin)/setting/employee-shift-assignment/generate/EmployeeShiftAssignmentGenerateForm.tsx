"use client";
import { useI18n } from "@/app/i18n";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import IndeterminateCheckbox from "@/app/_components/IndeterminateCheckbox";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import { createEmployeeShiftAssignment } from "@/app/services/employee-shift-assignment-service";

import { Employee } from "@/app/types/employee";
import { NewEmployeeShiftAssignment } from "@/app/types/employee-shift-assignment";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";

type EmployeeListRow = Employee & {
  deleted_at?: string | null;
  is_active?: boolean;

  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;

  department_name?: string | null;
  position_name?: string | null;
  agency_name?: string | null;
  branch_name?: string | null;
};

type GenerationMode = "missing_only" | "overwrite";

const EMPLOYEE_API_KEY = "/api/employees/list";

const getBody = () => document.body;

const formatDate = (value: Date | null) => {
  return formatDisplayDate(value);
};

const getEmployeeName = (employee: EmployeeListRow) => {
  return (
    employee.full_name ||
    [employee.first_name, employee.middle_name, employee.last_name]
      .filter(Boolean)
      .join(" ") ||
    `Employee #${employee.id}`
  );
};

const getEmployeeCode = (employee: EmployeeListRow) => {
  return employee.code || "-";
};

const EmployeeShiftAssignmentGenerateForm = () => {
  const { t: i18nT } = useI18n();
  const router = useRouter();
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [periodFrom, setPeriodFrom] = useState<Date | null>(null);

  const [periodTo, setPeriodTo] = useState<Date | null>(null);

  const [overwrite, setOverwrite] = useState(false);

  const [showOverwriteInfo, setShowOverwriteInfo] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);

  const {
    data: employeesData,
    error: employeesError,
    isLoading: employeesIsLoading,
    isValidating: employeesIsValidating,
    mutate: refreshEmployeesData,
  } = useSWR<EmployeeListRow[]>(EMPLOYEE_API_KEY, fetcher, {
    revalidateOnFocus: false,
  });

  const employees = useMemo(() => {
    return (employeesData ?? [])
      .filter(
        (employee) => !employee.deleted_at && employee.is_active !== false,
      )
      .sort((first, second) =>
        getEmployeeName(first).localeCompare(getEmployeeName(second), "id"),
      );
  }, [employeesData]);

  const departments = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map((employee) => employee.department_name?.trim())
          .filter((department): department is string => Boolean(department)),
      ),
    ).sort((first, second) => first.localeCompare(second, "id"));
  }, [employees]);

  const positions = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map((employee) => employee.position_name?.trim())
          .filter((position): position is string => Boolean(position)),
      ),
    ).sort((first, second) => first.localeCompare(second, "id"));
  }, [employees]);

  const departmentEmployeeMap = useMemo(() => {
    const employeeMap = new Map<string, number[]>();

    for (const department of departments) {
      employeeMap.set(
        department,
        employees
          .filter((employee) => employee.department_name?.trim() === department)
          .map((employee) => employee.id),
      );
    }

    return employeeMap;
  }, [departments, employees]);

  const positionEmployeeMap = useMemo(() => {
    const employeeMap = new Map<string, number[]>();

    for (const position of positions) {
      employeeMap.set(
        position,
        employees
          .filter((employee) => employee.position_name?.trim() === position)
          .map((employee) => employee.id),
      );
    }

    return employeeMap;
  }, [positions, employees]);

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return employees;
    }

    return employees.filter((employee) => {
      const searchableValues = [
        getEmployeeName(employee),
        employee.code,
        employee.department_name,
        employee.position_name,
        employee.agency_name,
        employee.branch_name,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [employees, search]);

  const selectedDepartmentCount = useMemo(() => {
    return departments.filter((department) => {
      const employeeIds = departmentEmployeeMap.get(department) ?? [];

      return (
        employeeIds.length > 0 && employeeIds.every((id) => selectedIds.has(id))
      );
    }).length;
  }, [departments, departmentEmployeeMap, selectedIds]);

  const selectedPositionCount = useMemo(() => {
    return positions.filter((position) => {
      const employeeIds = positionEmployeeMap.get(position) ?? [];

      return (
        employeeIds.length > 0 && employeeIds.every((id) => selectedIds.has(id))
      );
    }).length;
  }, [positions, positionEmployeeMap, selectedIds]);

  const visibleSelectedCount = useMemo(() => {
    return filteredEmployees.filter((employee) => selectedIds.has(employee.id))
      .length;
  }, [filteredEmployees, selectedIds]);

  const allVisibleSelected =
    filteredEmployees.length > 0 &&
    visibleSelectedCount === filteredEmployees.length;

  const someVisibleSelected = visibleSelectedCount > 0 && !allVisibleSelected;

  const hasInvalidDateRange = Boolean(
    periodFrom && periodTo && dayjs(periodFrom).isAfter(dayjs(periodTo), "day"),
  );

  const generationMode: GenerationMode = overwrite
    ? "overwrite"
    : "missing_only";

  const periodPreview = useMemo(() => {
    if (!periodFrom) {
      return null;
    }

    const actualPeriodTo = periodTo ?? dayjs(periodFrom).endOf("year").toDate();

    const numberOfDays =
      dayjs(actualPeriodTo).diff(dayjs(periodFrom), "day") + 1;

    return {
      from: formatDate(periodFrom),
      to: formatDate(actualPeriodTo),
      days: numberOfDays,
      text: i18nT("static.c2j5a2", {
        p0: formatDate(periodFrom),
        p1: formatDate(actualPeriodTo),
        p2: numberOfDays,
      }),
      usesDefaultEndDate: periodTo === null,
    };
  }, [periodFrom, periodTo]);

  const isFormValid =
    selectedIds.size > 0 && Boolean(periodFrom) && !hasInvalidDateRange;

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

  const showWarning = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "warn",
        summary: i18nT("static.gy1qqi"),
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
      await refreshEmployeesData();
    } catch (err: unknown) {
      showError(err);
    }
  };

  const toggleEmployee = (id: number) => {
    if (isGenerating) {
      return;
    }

    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(id)) {
        nextIds.delete(id);
      } else {
        nextIds.add(id);
      }

      return nextIds;
    });
  };

  const selectVisibleEmployees = () => {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const employee of filteredEmployees) {
        nextIds.add(employee.id);
      }

      return nextIds;
    });
  };

  const clearVisibleEmployees = () => {
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const employee of filteredEmployees) {
        nextIds.delete(employee.id);
      }

      return nextIds;
    });
  };

  const clearAllEmployees = () => {
    setSelectedIds(new Set());
  };

  const toggleDepartment = (department: string) => {
    const departmentEmployeeIds = departmentEmployeeMap.get(department) ?? [];

    if (departmentEmployeeIds.length === 0) {
      return;
    }

    const allDepartmentSelected = departmentEmployeeIds.every((id) =>
      selectedIds.has(id),
    );

    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const id of departmentEmployeeIds) {
        if (allDepartmentSelected) {
          nextIds.delete(id);
        } else {
          nextIds.add(id);
        }
      }

      return nextIds;
    });
  };

  const togglePosition = (position: string) => {
    const positionEmployeeIds = positionEmployeeMap.get(position) ?? [];

    if (positionEmployeeIds.length === 0) {
      return;
    }

    const allPositionSelected = positionEmployeeIds.every((id) =>
      selectedIds.has(id),
    );

    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const id of positionEmployeeIds) {
        if (allPositionSelected) {
          nextIds.delete(id);
        } else {
          nextIds.add(id);
        }
      }

      return nextIds;
    });
  };

  const resetPage = () => {
    setSearch("");
    setSelectedIds(new Set());

    setPeriodFrom(null);
    setPeriodTo(null);

    setOverwrite(false);
    setShowOverwriteInfo(false);
  };

  const validateGeneration = () => {
    if (selectedIds.size === 0) {
      showWarning(i18nT("static.rlgmd1"));

      return false;
    }

    if (!periodFrom) {
      showWarning(i18nT("static.1aqzawx"));

      return false;
    }

    if (hasInvalidDateRange) {
      showWarning(i18nT("static.oeewdr"));

      return false;
    }

    return true;
  };

  const handleGenerate = async () => {
    if (isGenerating || !validateGeneration() || !periodFrom) {
      return;
    }

    const payload: NewEmployeeShiftAssignment = {
      employee_ids: Array.from(selectedIds),

      date_from: dayjs(periodFrom).format("YYYY-MM-DD"),

      /*
       * Null dipertahankan agar
       * backend menggunakan
       * default sampai akhir
       * tahun.
       */
      date_to: periodTo ? dayjs(periodTo).format("YYYY-MM-DD") : null,

      overwrite,

      row_version: 1,
    };

    try {
      setIsGenerating(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createEmployeeShiftAssignment(payload);

      showSuccess(response.message || i18nT("static.1fw4b2w"));

      resetPage();
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateConfirm = () => {
    if (!validateGeneration() || !periodFrom || !periodPreview) {
      return;
    }

    requestActionConfirmation({
      header: i18nT("static.qnqnib"),

      message: (
        <div className="flex flex-col gap-3">
          <span className="text-slate-600">{i18nT("static.ckd1lf")} </span>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <span className="text-slate-500">{i18nT("static.f4bo3a")}</span>

              <span className="font-semibold text-slate-800">
                {selectedIds.size}
              </span>

              <span className="text-slate-500">{i18nT("static.11hwh7o")}</span>

              <span className="font-semibold text-slate-800">
                {periodPreview.from}
                {i18nT("static.hnl64v")}
                {periodPreview.to}
              </span>

              <span className="text-slate-500">{i18nT("static.141yy28")}</span>

              <span className="font-semibold text-slate-800">
                {periodPreview.days}
              </span>

              <span className="text-slate-500">{i18nT("static.n44ilu")}</span>

              <span
                className={`font-semibold ${
                  overwrite ? "text-amber-700" : "text-green-700"
                }`}
              >
                {overwrite ? i18nT("static.rywwgw") : i18nT("static.1wavinv")}
              </span>
            </div>
          </div>

          {periodPreview.usesDefaultEndDate && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs leading-5 text-blue-800">
              <i className="pi pi-info-circle mt-0.5" />

              <span>
                {i18nT("static.16f0ick")} {dayjs(periodFrom).format("YYYY")}.
              </span>
            </div>
          )}

          {overwrite && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <i className="pi pi-exclamation-triangle mt-0.5" />

              <span>{i18nT("static.14n9ty6")} </span>
            </div>
          )}
        </div>
      ),

      icon: overwrite ? "pi pi-exclamation-triangle" : "pi pi-calendar-plus",

      defaultFocus: "reject",

      accept: () => {
        void handleGenerate();
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
            label={i18nT("static.1jb34xe")}
            icon="pi pi-calendar-plus"
            severity={overwrite ? "warning" : "success"}
            onClick={options.accept}
          />
        </div>
      ),
    });
  };

  const checkboxBody = (row: EmployeeListRow) => {
    const inputId = `employee_${row.id}`;

    return (
      <div className="flex items-center justify-center">
        <IndeterminateCheckbox
          inputId={inputId}
          checked={selectedIds.has(row.id)}
          disabled={isGenerating}
          onChange={(event) => {
            event.originalEvent?.stopPropagation();

            toggleEmployee(row.id);
          }}
        />
      </div>
    );
  };

  const headerCheckbox = () => {
    return (
      <div className="flex items-center justify-center">
        <IndeterminateCheckbox
          inputId="select_visible_employees"
          checked={allVisibleSelected}
          indeterminate={someVisibleSelected}
          disabled={filteredEmployees.length === 0 || isGenerating}
          onChange={(event) => {
            event.originalEvent?.stopPropagation();

            if (allVisibleSelected || someVisibleSelected) {
              clearVisibleEmployees();
            } else {
              selectVisibleEmployees();
            }
          }}
        />
      </div>
    );
  };

  const employeeBody = (row: EmployeeListRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-800">
          {getEmployeeName(row)}
        </span>

        <span className="font-mono text-xs text-slate-500">
          {getEmployeeCode(row)}
        </span>
      </div>
    );
  };

  const organizationBody = (row: EmployeeListRow) => {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-sm font-medium text-slate-700">
          {row.department_name || i18nT("static.1nlh2ss")}
        </span>

        <span className="truncate text-xs text-slate-500">
          {row.position_name || i18nT("static.1hijdjd")}
        </span>
      </div>
    );
  };

  const locationBody = (row: EmployeeListRow) => {
    const locations = [row.branch_name, row.agency_name].filter(Boolean);

    return (
      <span className="text-sm text-slate-700">
        {locations.join(" • ") || "-"}
      </span>
    );
  };

  const selectedBody = (row: EmployeeListRow) => {
    return selectedIds.has(row.id) ? (
      <Tag
        value={i18nT("static.1ucoec4")}
        severity="success"
        icon="pi pi-check"
        rounded
      />
    ) : (
      <span className="text-sm text-slate-400">{i18nT("static.8frm9z")}</span>
    );
  };

  const rowClassName = (row: EmployeeListRow) => {
    return selectedIds.has(row.id) ? "bg-blue-50/50" : "";
  };

  if (employeesIsLoading) {
    return <LoadingDataTable />;
  }

  if (employeesError) {
    return <ErrorNotConnectedToApi mutateKey={EMPLOYEE_API_KEY} />;
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <Card className="border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Button
                  type="button"
                  icon="pi pi-arrow-left"
                  rounded
                  text
                  severity="secondary"
                  aria-label={i18nT("static.1hzmxtu")}
                  tooltip={i18nT("static.1jxuf26")}
                  tooltipOptions={{
                    appendTo: getBody,
                    position: "top",
                  }}
                  onClick={() =>
                    router.push("/setting/employee-shift-assignment")
                  }
                />

                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                  <i className="pi pi-calendar-plus text-xl" />
                </div>

                <div className="min-w-0">
                  <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                    {i18nT("static.a0nkg3")}{" "}
                  </h1>

                  <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                    {i18nT("static.1ac34xy")}{" "}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag
                      value={i18nT("static.c53qx7")}
                      severity="info"
                      rounded
                    />

                    <Tag
                      value={i18nT("static.imihkv")}
                      severity="secondary"
                      rounded
                    />

                    <Tag
                      value={i18nT("static.1g5ja9b")}
                      severity="success"
                      rounded
                    />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                label={i18nT("static.28r6qc")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={employeesIsValidating}
                disabled={employeesIsValidating || isGenerating}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              <i className="pi pi-info-circle mt-1 shrink-0" />

              <div>
                <p className="m-0 font-semibold">{i18nT("static.lbs1r8")} </p>

                <p className="m-0 mt-1">{i18nT("static.1fdehkf")} </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="m-0 text-xs text-slate-500">
              {i18nT("static.1bufc81")}
            </p>

            <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
              {employees.length}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="m-0 text-xs text-blue-700">
              {i18nT("static.tzr2gd")}
            </p>

            <p className="m-0 mt-1 text-2xl font-semibold text-blue-800">
              {selectedIds.size}
            </p>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <p className="m-0 text-xs text-green-700">
              {i18nT("static.i9hyff")}
            </p>

            <p className="m-0 mt-1 text-2xl font-semibold text-green-800">
              {selectedDepartmentCount}
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
            <p className="m-0 text-xs text-indigo-700">
              {i18nT("static.tv5ef8")}
            </p>

            <p className="m-0 mt-1 text-2xl font-semibold text-indigo-800">
              {selectedPositionCount}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-1">
            <p className="m-0 text-xs text-slate-500">
              {i18nT("static.z2jt2v")}
            </p>

            <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
              {filteredEmployees.length}
            </p>
          </div>
        </div>

        {/* Employee Selection */}
        <Card className="border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {i18nT("static.sadvsn")}{" "}
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  {i18nT("static.1ujugvi")}{" "}
                </p>
              </div>

              <Tag
                value={i18nT("static.fkvuu6", { p0: selectedIds.size })}
                severity={selectedIds.size > 0 ? "success" : "secondary"}
                rounded
              />
            </div>

            <IconField iconPosition="left" className="w-full">
              <InputIcon className="pi pi-search" />

              <InputText
                value={search}
                autoFocus
                placeholder={i18nT("static.1wi6rlh")}
                className="w-full"
                disabled={isGenerating}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearch(event.target.value)
                }
              />
            </IconField>

            {/* Select by Department */}
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.1tmn1k4")}{" "}
                </h3>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  {i18nT("static.7qazp4")}{" "}
                </p>
              </div>

              {departments.length === 0 ? (
                <p className="m-0 text-sm text-slate-500">
                  {i18nT("static.cr7i5n")}{" "}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {departments.map((department) => {
                    const inputId = `department_${department}`;

                    const employeeIds =
                      departmentEmployeeMap.get(department) ?? [];

                    const selectedCount = employeeIds.filter((id) =>
                      selectedIds.has(id),
                    ).length;

                    const allSelected =
                      employeeIds.length > 0 &&
                      selectedCount === employeeIds.length;

                    const partiallySelected = selectedCount > 0 && !allSelected;

                    return (
                      <label
                        key={department}
                        htmlFor={inputId}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                          allSelected
                            ? "border-blue-300 bg-blue-50 text-blue-800"
                            : partiallySelected
                              ? "border-amber-300 bg-amber-50 text-amber-800"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <IndeterminateCheckbox
                          inputId={inputId}
                          checked={allSelected}
                          indeterminate={partiallySelected}
                          disabled={isGenerating}
                          onChange={() => toggleDepartment(department)}
                        />

                        <span>{department}</span>

                        <span className="text-xs opacity-70">
                          {selectedCount}/{employeeIds.length}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Select by Position */}
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.1ybw07l")}{" "}
                </h3>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  {i18nT("static.9v8att")}{" "}
                </p>
              </div>

              {positions.length === 0 ? (
                <p className="m-0 text-sm text-slate-500">
                  {i18nT("static.i3hc9w")}{" "}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {positions.map((position) => {
                    const inputId = `position_${position}`;

                    const employeeIds = positionEmployeeMap.get(position) ?? [];

                    const selectedCount = employeeIds.filter((id) =>
                      selectedIds.has(id),
                    ).length;

                    const allSelected =
                      employeeIds.length > 0 &&
                      selectedCount === employeeIds.length;

                    const partiallySelected = selectedCount > 0 && !allSelected;

                    return (
                      <label
                        key={position}
                        htmlFor={inputId}
                        className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition ${
                          allSelected
                            ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                            : partiallySelected
                              ? "border-amber-300 bg-amber-50 text-amber-800"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <IndeterminateCheckbox
                          inputId={inputId}
                          checked={allSelected}
                          indeterminate={partiallySelected}
                          disabled={isGenerating}
                          onChange={() => togglePosition(position)}
                        />

                        <span>{position}</span>

                        <span className="text-xs opacity-70">
                          {selectedCount}/{employeeIds.length}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                label={i18nT("static.9fc2ug")}
                icon="pi pi-check-square"
                severity="secondary"
                outlined
                size="small"
                disabled={filteredEmployees.length === 0 || isGenerating}
                onClick={selectVisibleEmployees}
              />

              <Button
                type="button"
                label={i18nT("static.1qfq1up")}
                icon="pi pi-minus-circle"
                severity="secondary"
                outlined
                size="small"
                disabled={visibleSelectedCount === 0 || isGenerating}
                onClick={clearVisibleEmployees}
              />

              <Button
                type="button"
                label={i18nT("static.1pqh2hx")}
                icon="pi pi-filter-slash"
                severity="danger"
                text
                size="small"
                disabled={selectedIds.size === 0 || isGenerating}
                onClick={clearAllEmployees}
              />
            </div>

            <div className="w-full overflow-hidden">
              <DataTable
                value={filteredEmployees}
                dataKey="id"
                paginator
                rows={10}
                rowsPerPageOptions={[10, 25, 50, 100]}
                stripedRows
                rowHover
                scrollable
                removableSort
                responsiveLayout="scroll"
                size="small"
                rowClassName={rowClassName}
                tableStyle={{
                  minWidth: "76rem",
                }}
                emptyMessage={i18nT("static.1l60s88")}
                currentPageReportTemplate={i18nT("static.1kqh8lr")}
                paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                onRowClick={(event) =>
                  toggleEmployee((event.data as EmployeeListRow).id)
                }
              >
                <Column
                  header={headerCheckbox()}
                  body={checkboxBody}
                  headerStyle={{
                    width: "4rem",
                  }}
                  bodyStyle={{
                    width: "4rem",
                  }}
                />

                <Column
                  field="full_name"
                  header={i18nT("static.1fak8xt")}
                  sortable
                  body={employeeBody}
                  style={{
                    minWidth: "20rem",
                  }}
                />

                <Column
                  field="department_name"
                  header={i18nT("static.725tl6")}
                  sortable
                  body={organizationBody}
                  style={{
                    minWidth: "20rem",
                  }}
                />

                <Column
                  field="agency_name"
                  header={i18nT("static.v94987")}
                  sortable
                  body={locationBody}
                  style={{
                    minWidth: "18rem",
                  }}
                />

                <Column
                  header={i18nT("static.1gp08mt")}
                  body={selectedBody}
                  style={{
                    minWidth: "12rem",
                  }}
                />
              </DataTable>
            </div>
          </div>
        </Card>

        {/* Generate Configuration */}
        <Card className="border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {i18nT("static.1iwxp24")}{" "}
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  {i18nT("static.5ip8l8")}{" "}
                </p>
              </div>

              <Tag
                value={
                  overwrite ? i18nT("static.mdw3vh") : i18nT("static.lk89j")
                }
                severity={overwrite ? "warning" : "success"}
                icon={
                  overwrite
                    ? "pi pi-exclamation-triangle"
                    : "pi pi-check-circle"
                }
                rounded
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="period_from"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.ihiofo")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Calendar
                  id="period_from"
                  appendTo={getBody}
                  value={periodFrom}
                  dateFormat="dd MM yy"
                  showIcon
                  maxDate={periodTo ?? undefined}
                  disabled={isGenerating}
                  placeholder={i18nT("static.h39lib")}
                  className="w-full"
                  onChange={(event) => {
                    const newDate = (event.value as Date | null) ?? null;

                    setPeriodFrom(newDate);

                    if (
                      newDate &&
                      periodTo &&
                      dayjs(periodTo).isBefore(dayjs(newDate), "day")
                    ) {
                      setPeriodTo(null);
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="period_to"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1oihrl1")}{" "}
                </label>

                <Calendar
                  id="period_to"
                  appendTo={getBody}
                  value={periodTo}
                  dateFormat="dd MM yy"
                  showIcon
                  minDate={periodFrom ?? undefined}
                  disabled={isGenerating}
                  placeholder={i18nT("static.1q7tkxg")}
                  className="w-full"
                  onChange={(event) =>
                    setPeriodTo((event.value as Date | null) ?? null)
                  }
                />

                <small className="text-slate-500">
                  {i18nT("static.1lahcpe")}{" "}
                </small>
              </div>
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>{i18nT("static.oeewdr")}</span>
              </div>
            )}

            {periodPreview && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {i18nT("static.11qmfzb")}{" "}
                </p>

                <p className="m-0 mt-2 text-sm font-semibold text-indigo-900">
                  {periodPreview.text}
                </p>

                <p className="m-0 mt-1 text-xs text-indigo-700">
                  {selectedIds.size} {i18nT("static.5gxg69")}{" "}
                  {selectedIds.size === 1 ? "" : i18nT("static.1w9pcoy")}{" "}
                  {i18nT("static.lnii5w")}{" "}
                  {periodPreview.usesDefaultEndDate
                    ? i18nT("static.4jp1tg")
                    : ""}
                </p>
              </div>
            )}

            {/* Generate Mode */}
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <IndeterminateCheckbox
                  inputId="overwrite"
                  checked={overwrite}
                  disabled={isGenerating}
                  onChange={(event) => setOverwrite(Boolean(event.checked))}
                />

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="overwrite"
                    className="cursor-pointer text-sm font-semibold text-slate-800"
                  >
                    {i18nT("static.3iik9l")}{" "}
                  </label>

                  <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                    {i18nT("static.19ovegu")}{" "}
                  </p>
                </div>
              </div>

              <div
                className={`mt-4 rounded-xl border p-4 ${
                  overwrite
                    ? "border-amber-200 bg-amber-50"
                    : "border-green-200 bg-green-50"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <i
                      className={`pi mt-1 ${
                        overwrite
                          ? "pi-exclamation-triangle text-amber-600"
                          : "pi-check-circle text-green-600"
                      }`}
                    />

                    <div>
                      <p
                        className={`m-0 text-sm font-semibold ${
                          overwrite ? "text-amber-900" : "text-green-900"
                        }`}
                      >
                        {overwrite
                          ? i18nT("static.rywwgw")
                          : i18nT("static.1wavinv")}
                      </p>

                      <p
                        className={`m-0 mt-1 text-xs leading-5 ${
                          overwrite ? "text-amber-800" : "text-green-800"
                        }`}
                      >
                        {overwrite
                          ? i18nT("static.ban6zr")
                          : i18nT("static.1yfr730")}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    label={
                      showOverwriteInfo
                        ? i18nT("static.1fuqufn")
                        : i18nT("static.1x2sh5o")
                    }
                    icon={
                      showOverwriteInfo
                        ? "pi pi-chevron-up"
                        : "pi pi-chevron-down"
                    }
                    text
                    severity="secondary"
                    size="small"
                    disabled={isGenerating}
                    className="self-start"
                    onClick={() =>
                      setShowOverwriteInfo((currentValue) => !currentValue)
                    }
                  />
                </div>

                {showOverwriteInfo && generationMode === "missing_only" && (
                  <div className="mt-4 border-t border-green-200 pt-4">
                    <div className="rounded-xl border border-green-100 bg-white p-4 text-xs leading-6 text-slate-700">
                      <p className="m-0 font-semibold text-slate-900">
                        {i18nT("static.10n7mma")}{" "}
                      </p>

                      <p className="m-0 mt-2">{i18nT("static.w2h98n")} </p>

                      <p className="m-0">{i18nT("static.1xz4tyn")} </p>
                    </div>
                  </div>
                )}

                {showOverwriteInfo && generationMode === "overwrite" && (
                  <div className="mt-4 border-t border-amber-200 pt-4">
                    <div className="rounded-xl border border-amber-100 bg-white p-4 text-xs leading-6 text-slate-700">
                      <p className="m-0 font-semibold text-slate-900">
                        {i18nT("static.mdw3vh")}{" "}
                      </p>

                      <p className="m-0 mt-2">{i18nT("static.1yhlwzl")} </p>

                      <p className="m-0">{i18nT("static.1ut89wf")} </p>

                      <p className="m-0">{i18nT("static.193tx")} </p>

                      <p className="m-0 mt-2 font-medium text-amber-700">
                        {i18nT("static.y533gr")}{" "}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </Card>

        {/* Final Action */}
        <Card className="border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-4 p-3 sm:p-4 md:flex-row md:items-center md:justify-between md:p-5">
            <div className="min-w-0">
              <p className="m-0 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">
                  {selectedIds.size}
                </span>{" "}
                {i18nT("static.5gxg69")}{" "}
                {selectedIds.size === 1 ? "" : i18nT("static.1w9pcoy")}{" "}
                {i18nT("static.lnii5w")}{" "}
              </p>

              {periodPreview && (
                <p className="m-0 mt-1 text-sm font-medium text-slate-800">
                  {periodPreview.text}
                </p>
              )}

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.12rbvs2")}{" "}
                <span className="font-semibold text-slate-700">
                  {selectedDepartmentCount} {i18nT("static.1li2jif")}{" "}
                  {selectedDepartmentCount === 1 ? "" : i18nT("static.1w9pcoy")}
                </span>
                {i18nT("static.syyan8")}
                <span className="font-semibold text-slate-700">
                  {selectedPositionCount} {i18nT("static.14vfpje")}{" "}
                  {selectedPositionCount === 1 ? "" : i18nT("static.1w9pcoy")}
                </span>
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.ccphnc")}{" "}
                <span
                  className={`font-semibold ${
                    overwrite ? "text-amber-700" : "text-green-700"
                  }`}
                >
                  {overwrite ? i18nT("static.rywwgw") : i18nT("static.1wavinv")}
                </span>
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                label={i18nT("static.2zps2o")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                disabled={isGenerating}
                className="w-full sm:w-auto"
                onClick={resetPage}
              />

              <Button
                type="button"
                label={i18nT("static.a0nkg3")}
                icon="pi pi-calendar-plus"
                severity={overwrite ? "warning" : "success"}
                loading={isGenerating}
                disabled={!isFormValid || isGenerating}
                className="w-full sm:w-auto"
                onClick={handleGenerateConfirm}
              />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default EmployeeShiftAssignmentGenerateForm;
