"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import dayjs from "dayjs";

import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import { createEmployeeShiftRule } from "@/app/services/employee-shift-rule-service";

import { Employee } from "@/app/types/employee";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import { ShiftRule } from "@/app/types/shift-rule";

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

type ShiftRuleListRow = ShiftRule & {
  deleted_at?: string | null;
  is_active?: boolean;
};

type AssignmentMode = "smart_insert" | "overwrite";

const EMPLOYEE_API_KEY = "/api/employees/list";

const SHIFT_RULE_API_KEY = "/api/shift-rule";

const getBody = () => document.body;

const formatDate = (value: Date | null) => {
  if (!value) {
    return "-";
  }

  return dayjs(value).format("DD MMM YYYY");
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

const EmployeeShiftRuleAssignForm = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [shiftRule, setShiftRule] = useState<number | null>(null);

  const [effectiveFrom, setEffectiveFrom] = useState<Date | null>(null);

  const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);

  const [overwrite, setOverwrite] = useState(false);

  const [showAssignmentModeInfo, setShowAssignmentModeInfo] = useState(false);

  const [isAssigning, setIsAssigning] = useState(false);

  const {
    data: employeesData,
    error: employeesError,
    isLoading: employeesIsLoading,
    isValidating: employeesIsValidating,
    mutate: refreshEmployeesData,
  } = useSWR<EmployeeListRow[]>(EMPLOYEE_API_KEY, fetcher, {
    revalidateOnFocus: false,
  });

  const {
    data: shiftRuleData,
    error: shiftRuleError,
    isLoading: shiftRuleIsLoading,
    isValidating: shiftRuleIsValidating,
    mutate: refreshShiftRuleData,
  } = useSWR<ShiftRuleListRow[]>(SHIFT_RULE_API_KEY, fetcher, {
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

  const shiftRules = useMemo(() => {
    return (shiftRuleData ?? [])
      .filter((rule) => !rule.deleted_at && rule.is_active !== false)
      .sort((first, second) =>
        String(first.name ?? "").localeCompare(String(second.name ?? "")),
      );
  }, [shiftRuleData]);

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

  const selectedRule = useMemo(() => {
    if (!shiftRule) {
      return null;
    }

    return shiftRules.find((rule) => rule.id === shiftRule) ?? null;
  }, [shiftRule, shiftRules]);

  const selectedEmployees = useMemo(() => {
    return employees.filter((employee) => selectedIds.has(employee.id));
  }, [employees, selectedIds]);

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
    effectiveFrom &&
    effectiveTo &&
    dayjs(effectiveFrom).isAfter(dayjs(effectiveTo), "day"),
  );

  const assignmentMode: AssignmentMode = overwrite
    ? "overwrite"
    : "smart_insert";

  const assignmentSummary = useMemo(() => {
    if (!selectedRule || !effectiveFrom) {
      return null;
    }

    return {
      ruleName: selectedRule.name || "-",

      period: `${formatDate(effectiveFrom)} – ${
        effectiveTo ? formatDate(effectiveTo) : "No end date"
      }`,
    };
  }, [selectedRule, effectiveFrom, effectiveTo]);

  const isFormValid =
    selectedIds.size > 0 &&
    Boolean(shiftRule) &&
    Boolean(effectiveFrom) &&
    !hasInvalidDateRange;

  const isRefreshing = employeesIsValidating || shiftRuleIsValidating;

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

  const showWarning = (message: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "warn",
        summary: "Validation",
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

  const handleRefresh = async () => {
    try {
      await Promise.all([refreshEmployeesData(), refreshShiftRuleData()]);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const toggleEmployee = (id: number) => {
    if (isAssigning) {
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

    setShiftRule(null);
    setEffectiveFrom(null);
    setEffectiveTo(null);

    setOverwrite(false);

    setShowAssignmentModeInfo(false);
  };

  const validateAssignment = () => {
    if (selectedIds.size === 0) {
      showWarning("Select at least one employee.");

      return false;
    }

    if (!shiftRule) {
      showWarning("Shift rule is required.");

      return false;
    }

    if (!effectiveFrom) {
      showWarning("Effective From is required.");

      return false;
    }

    if (hasInvalidDateRange) {
      showWarning("Effective From cannot be later than Effective To.");

      return false;
    }

    return true;
  };

  const doAssign = async () => {
    if (isAssigning || !validateAssignment() || !shiftRule || !effectiveFrom) {
      return;
    }

    const payload = {
      employee_id: Array.from(selectedIds),

      shift_rule_id: shiftRule,

      effective_from: dayjs(effectiveFrom).format("YYYY-MM-DD"),

      effective_to: effectiveTo
        ? dayjs(effectiveTo).format("YYYY-MM-DD")
        : null,

      overwrite,

      is_active: true,
      row_version: 1,
    };

    try {
      setIsAssigning(true);

      const response: ResponseType<ResponseTypeCreateSuccess> =
        await createEmployeeShiftRule(payload);

      showSuccess(
        response.message || "Employee shift rule assigned successfully.",
      );

      resetPage();
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssign = () => {
    if (!validateAssignment() || !effectiveFrom) {
      return;
    }

    confirmDialog({
      header: "Assign Shift Rule",

      message: (
        <div className="flex flex-col gap-3">
          <span className="text-slate-600">
            Assign this shift rule configuration?
          </span>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <span className="text-slate-500">Shift Rule</span>

              <span className="font-semibold text-slate-800">
                {selectedRule?.name || "-"}
              </span>

              <span className="text-slate-500">Employees</span>

              <span className="font-semibold text-slate-800">
                {selectedIds.size}
              </span>

              <span className="text-slate-500">Period</span>

              <span className="font-semibold text-slate-800">
                {formatDate(effectiveFrom)} –{" "}
                {effectiveTo ? formatDate(effectiveTo) : "No end date"}
              </span>

              <span className="text-slate-500">Mode</span>

              <span
                className={`font-semibold ${
                  overwrite ? "text-amber-700" : "text-green-700"
                }`}
              >
                {overwrite
                  ? "Replace overlapping rules"
                  : "Smart insert / fill gaps"}
              </span>
            </div>
          </div>

          {overwrite && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <i className="pi pi-exclamation-triangle mt-0.5" />

              <span>
                Existing employee shift rules that overlap this period will be
                replaced.
              </span>
            </div>
          )}
        </div>
      ),

      icon: overwrite ? "pi pi-exclamation-triangle" : "pi pi-check-circle",

      defaultFocus: "reject",

      accept: () => {
        void doAssign();
      },

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
            label="Assign"
            icon="pi pi-check"
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
        <Checkbox
          inputId={inputId}
          checked={selectedIds.has(row.id)}
          disabled={isAssigning}
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
        <Checkbox
          inputId="select_visible_employees"
          checked={allVisibleSelected}
          indeterminate={someVisibleSelected}
          disabled={filteredEmployees.length === 0 || isAssigning}
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
          {row.department_name || "No department"}
        </span>

        <span className="truncate text-xs text-slate-500">
          {row.position_name || "No position"}
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
      <Tag value="Selected" severity="success" icon="pi pi-check" rounded />
    ) : (
      <span className="text-sm text-slate-400">Not selected</span>
    );
  };

  const rowClassName = (row: EmployeeListRow) => {
    return selectedIds.has(row.id) ? "bg-blue-50/50" : "";
  };

  if (employeesIsLoading || shiftRuleIsLoading) {
    return <LoadingDataTable />;
  }

  if (employeesError) {
    return <ErrorNotConnectedToApi mutateKey={EMPLOYEE_API_KEY} />;
  }

  if (shiftRuleError) {
    return <ErrorNotConnectedToApi mutateKey={SHIFT_RULE_API_KEY} />;
  }

  return (
    <>
      <ConfirmDialog />

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
                  aria-label="Back"
                  tooltip="Back to Employee Shift Rule"
                  tooltipOptions={{
                    appendTo: getBody,
                    position: "top",
                  }}
                  onClick={() => router.push("/setting/employee-shift-rule")}
                />

                <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                  <i className="pi pi-users text-xl" />
                </div>

                <div className="min-w-0">
                  <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                    Shift Rule Assignment
                  </h1>

                  <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                    Assign employee shift rules for a specific effective period
                    before generating daily shift assignments.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag value="Employee Shift Rule" severity="info" rounded />

                    <Tag
                      value="No overlapping result"
                      severity="success"
                      rounded
                    />
                  </div>
                </div>
              </div>

              <Button
                type="button"
                label="Refresh"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isRefreshing}
                disabled={isRefreshing || isAssigning}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              <i className="pi pi-info-circle mt-1 shrink-0" />

              <div>
                <p className="m-0 font-semibold">
                  Employee Shift Rule, not daily schedule
                </p>

                <p className="m-0 mt-1">
                  This page defines which shift rule applies to each employee
                  during a date range. Generate daily schedules afterward from
                  Employee Shift Assignment.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="m-0 text-xs text-slate-500">Available Employees</p>

            <p className="m-0 mt-1 text-2xl font-semibold text-slate-800">
              {employees.length}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <p className="m-0 text-xs text-blue-700">Selected Employees</p>

            <p className="m-0 mt-1 text-2xl font-semibold text-blue-800">
              {selectedIds.size}
            </p>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
            <p className="m-0 text-xs text-green-700">Selected Departments</p>

            <p className="m-0 mt-1 text-2xl font-semibold text-green-800">
              {selectedDepartmentCount}
            </p>
          </div>

          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
            <p className="m-0 text-xs text-indigo-700">Selected Positions</p>

            <p className="m-0 mt-1 text-2xl font-semibold text-indigo-800">
              {selectedPositionCount}
            </p>
          </div>

          <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:col-span-1">
            <p className="m-0 text-xs text-slate-500">Filtered Employees</p>

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
                  Employee Selection
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  Search employees, select employees by department or position,
                  then adjust individual selections manually.
                </p>
              </div>

              <Tag
                value={`${selectedIds.size} selected`}
                severity={selectedIds.size > 0 ? "success" : "secondary"}
                rounded
              />
            </div>

            <IconField iconPosition="left" className="w-full">
              <InputIcon className="pi pi-search" />

              <InputText
                value={search}
                autoFocus
                placeholder="Search employee, code, department, position, branch, or agency"
                className="w-full"
                disabled={isAssigning}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearch(event.target.value)
                }
              />
            </IconField>

            {/* Select by Department */}
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  Select by Department
                </h3>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  Selecting a department selects all employees in that
                  department. Manual and position selections remain
                  synchronized.
                </p>
              </div>

              {departments.length === 0 ? (
                <p className="m-0 text-sm text-slate-500">
                  No department data is available.
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
                        <Checkbox
                          inputId={inputId}
                          checked={allSelected}
                          indeterminate={partiallySelected}
                          disabled={isAssigning}
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
                  Select by Position
                </h3>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  Selecting a position selects all employees assigned to that
                  position across all departments.
                </p>
              </div>

              {positions.length === 0 ? (
                <p className="m-0 text-sm text-slate-500">
                  No position data is available.
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
                        <Checkbox
                          inputId={inputId}
                          checked={allSelected}
                          indeterminate={partiallySelected}
                          disabled={isAssigning}
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
                label="Select Filtered"
                icon="pi pi-check-square"
                severity="secondary"
                outlined
                size="small"
                disabled={filteredEmployees.length === 0 || isAssigning}
                onClick={selectVisibleEmployees}
              />

              <Button
                type="button"
                label="Clear Filtered"
                icon="pi pi-minus-circle"
                severity="secondary"
                outlined
                size="small"
                disabled={visibleSelectedCount === 0 || isAssigning}
                onClick={clearVisibleEmployees}
              />

              <Button
                type="button"
                label="Clear All"
                icon="pi pi-filter-slash"
                severity="danger"
                text
                size="small"
                disabled={selectedIds.size === 0 || isAssigning}
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
                emptyMessage="No employee data found."
                currentPageReportTemplate="{first} to {last} of {totalRecords}"
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
                  header="Employee"
                  sortable
                  body={employeeBody}
                  style={{
                    minWidth: "20rem",
                  }}
                />

                <Column
                  field="department_name"
                  header="Organization"
                  sortable
                  body={organizationBody}
                  style={{
                    minWidth: "20rem",
                  }}
                />

                <Column
                  field="agency_name"
                  header="Branch / Agency"
                  sortable
                  body={locationBody}
                  style={{
                    minWidth: "18rem",
                  }}
                />

                <Column
                  header="Selection"
                  body={selectedBody}
                  style={{
                    minWidth: "12rem",
                  }}
                />
              </DataTable>
            </div>
          </div>
        </Card>

        {/* Shift Configuration */}
        <Card className="border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  Shift Configuration
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  Select the shift rule, effective period, and how overlapping
                  rules should be handled.
                </p>
              </div>

              <Tag
                value={overwrite ? "Replace Overlap" : "Smart Insert"}
                severity={overwrite ? "warning" : "success"}
                icon={
                  overwrite
                    ? "pi pi-exclamation-triangle"
                    : "pi pi-check-circle"
                }
                rounded
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="shift_rule_id"
                  className="text-sm font-medium text-slate-700"
                >
                  Shift Rule
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Dropdown
                  id="shift_rule_id"
                  appendTo={getBody}
                  value={shiftRule}
                  options={shiftRules}
                  optionValue="id"
                  optionLabel="name"
                  filter
                  showClear
                  loading={shiftRuleIsLoading}
                  disabled={shiftRuleIsLoading || isAssigning}
                  placeholder="Select shift rule"
                  className="w-full"
                  onChange={(event) => setShiftRule(event.value ?? null)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="effective_from"
                  className="text-sm font-medium text-slate-700"
                >
                  Effective From
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Calendar
                  id="effective_from"
                  appendTo={getBody}
                  value={effectiveFrom}
                  dateFormat="dd M yy"
                  showIcon
                  maxDate={effectiveTo ?? undefined}
                  disabled={isAssigning}
                  placeholder="Select start date"
                  className="w-full"
                  onChange={(event) => {
                    const newDate = (event.value as Date | null) ?? null;

                    setEffectiveFrom(newDate);

                    if (
                      newDate &&
                      effectiveTo &&
                      dayjs(effectiveTo).isBefore(dayjs(newDate), "day")
                    ) {
                      setEffectiveTo(null);
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="effective_to"
                  className="text-sm font-medium text-slate-700"
                >
                  Effective To
                </label>

                <Calendar
                  id="effective_to"
                  appendTo={getBody}
                  value={effectiveTo}
                  dateFormat="dd M yy"
                  showIcon
                  minDate={effectiveFrom ?? undefined}
                  disabled={isAssigning}
                  placeholder="No end date"
                  className="w-full"
                  onChange={(event) =>
                    setEffectiveTo((event.value as Date | null) ?? null)
                  }
                />
              </div>
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>Effective From cannot be later than Effective To.</span>
              </div>
            )}

            {assignmentSummary && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  Assignment Preview
                </p>

                <p className="m-0 mt-2 text-sm font-semibold text-indigo-900">
                  {assignmentSummary.ruleName} • {assignmentSummary.period}
                </p>

                <p className="m-0 mt-1 text-xs text-indigo-700">
                  {selectedIds.size} employee
                  {selectedIds.size === 1 ? "" : "s"} selected
                </p>
              </div>
            )}

            {/* Assignment Mode */}
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  inputId="overwrite"
                  checked={overwrite}
                  disabled={isAssigning}
                  onChange={(event) => setOverwrite(Boolean(event.checked))}
                />

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="overwrite"
                    className="cursor-pointer text-sm font-semibold text-slate-800"
                  >
                    Overwrite Existing Rule
                  </label>

                  <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                    Enable this only when the new rule must replace existing
                    rules during the selected period.
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
                          ? "Replace overlapping rules"
                          : "Smart insert mode"}
                      </p>

                      <p
                        className={`m-0 mt-1 text-xs leading-5 ${
                          overwrite ? "text-amber-800" : "text-green-800"
                        }`}
                      >
                        {overwrite
                          ? "Existing rules overlapping the selected period will be replaced by the new rule."
                          : "Existing rules remain intact. The new rule fills empty gaps or creates a specific exception."}
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    label={showAssignmentModeInfo ? "Hide Info" : "More Info"}
                    icon={
                      showAssignmentModeInfo
                        ? "pi pi-chevron-up"
                        : "pi pi-chevron-down"
                    }
                    text
                    severity="secondary"
                    size="small"
                    disabled={isAssigning}
                    className="self-start"
                    onClick={() =>
                      setShowAssignmentModeInfo((currentValue) => !currentValue)
                    }
                  />
                </div>

                {showAssignmentModeInfo &&
                  assignmentMode === "smart_insert" && (
                    <div className="mt-4 grid gap-3 border-t border-green-200 pt-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-green-100 bg-white p-4 text-xs leading-6 text-slate-700">
                        <p className="m-0 font-semibold text-slate-900">
                          Example 1: Fill Empty Gaps
                        </p>

                        <p className="m-0 mt-2">
                          Existing: 01 Apr 2026 – 31 May 2026 = Night Shift
                        </p>

                        <p className="m-0">
                          New: 01 Jan 2026 – 31 Dec 2026 = Morning Shift
                        </p>

                        <p className="m-0 mt-2 font-semibold text-slate-900">
                          Result
                        </p>

                        <p className="m-0">01 Jan – 31 Mar = Morning Shift</p>

                        <p className="m-0">01 Apr – 31 May = Night Shift</p>

                        <p className="m-0">01 Jun – 31 Dec = Morning Shift</p>
                      </div>

                      <div className="rounded-xl border border-green-100 bg-white p-4 text-xs leading-6 text-slate-700">
                        <p className="m-0 font-semibold text-slate-900">
                          Example 2: Create Exception
                        </p>

                        <p className="m-0 mt-2">
                          Existing: 01 Jan 2026 – 31 Dec 2026 = Morning Shift
                        </p>

                        <p className="m-0">
                          New: 01 Apr 2026 – 31 May 2026 = Rotation Shift
                        </p>

                        <p className="m-0 mt-2 font-semibold text-slate-900">
                          Result
                        </p>

                        <p className="m-0">01 Jan – 31 Mar = Morning Shift</p>

                        <p className="m-0">01 Apr – 31 May = Rotation Shift</p>

                        <p className="m-0">01 Jun – 31 Dec = Morning Shift</p>
                      </div>
                    </div>
                  )}

                {showAssignmentModeInfo && assignmentMode === "overwrite" && (
                  <div className="mt-4 border-t border-amber-200 pt-4">
                    <div className="rounded-xl border border-amber-100 bg-white p-4 text-xs leading-6 text-slate-700">
                      <p className="m-0 font-semibold text-slate-900">
                        What Overwrite Does
                      </p>

                      <p className="m-0 mt-2">
                        Existing employee shift rules that overlap the selected
                        period are soft-deleted.
                      </p>

                      <p className="m-0">
                        The new rule is then inserted for the full selected
                        period.
                      </p>

                      <p className="m-0 mt-2 font-medium text-amber-700">
                        Use overwrite only when the existing rules must
                        genuinely be replaced.
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
                employee
                {selectedIds.size === 1 ? "" : "s"} selected
              </p>

              {assignmentSummary && (
                <p className="m-0 mt-1 text-sm font-medium text-slate-800">
                  {assignmentSummary.ruleName} • {assignmentSummary.period}
                </p>
              )}

              <p className="m-0 mt-1 text-xs text-slate-500">
                Fully selected groups:{" "}
                <span className="font-semibold text-slate-700">
                  {selectedDepartmentCount} department
                  {selectedDepartmentCount === 1 ? "" : "s"}
                </span>
                {" • "}
                <span className="font-semibold text-slate-700">
                  {selectedPositionCount} position
                  {selectedPositionCount === 1 ? "" : "s"}
                </span>
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                Mode:{" "}
                <span
                  className={`font-semibold ${
                    overwrite ? "text-amber-700" : "text-green-700"
                  }`}
                >
                  {overwrite
                    ? "Replace overlapping rules"
                    : "Smart insert / fill gaps"}
                </span>
              </p>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                label="Reset"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                disabled={isAssigning}
                className="w-full sm:w-auto"
                onClick={resetPage}
              />

              <Button
                type="button"
                label="Assign Shift Rule"
                icon="pi pi-check"
                severity={overwrite ? "warning" : "success"}
                loading={isAssigning}
                disabled={!isFormValid || isAssigning}
                className="w-full sm:w-auto"
                onClick={handleAssign}
              />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};

export default EmployeeShiftRuleAssignForm;
