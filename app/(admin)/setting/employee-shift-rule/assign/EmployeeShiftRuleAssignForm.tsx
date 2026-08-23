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
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useDispatch } from "react-redux";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

import {
  applyEmployeeScheduleChange,
  previewEmployeeScheduleChange,
} from "@/app/services/employee-schedule-change-service";

import { Employee } from "@/app/types/employee";
import { ShiftRule } from "@/app/types/shift-rule";
import {
  EmployeeScheduleChangePreviewResponse,
  EmployeeScheduleChangeRequest,
} from "@/app/types/employee-schedule-change";

import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";

import { showToast } from "@/store/ToastSlice";

type AssignmentMode = "smart_insert" | "overwrite";

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

const EMPLOYEE_API_KEY = "/api/employees/list";

const SHIFT_RULE_API_KEY = "/api/shift-rule";

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

const isSchedulePreviewStaleError = (error: unknown) =>
  isResponseTypeError(error) && error.code === "SCHEDULE_PREVIEW_STALE";

const EmployeeShiftRuleAssignForm = () => {
  const { t: i18nT } = useI18n();
  const router = useRouter();
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [shiftRule, setShiftRule] = useState<number | null>(null);

  const [effectiveFrom, setEffectiveFrom] = useState<Date | null>(null);

  const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);

  const [overwrite, setOverwrite] = useState(false);

  const [showAssignmentModeInfo] = useState(false);

  const [isAssigning, setIsAssigning] = useState(false);

  const [preview, setPreview] =
    useState<EmployeeScheduleChangePreviewResponse | null>(null);

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

  const assignmentMode: AssignmentMode = overwrite
    ? "overwrite"
    : "smart_insert";

  const hasInvalidDateRange = Boolean(
    effectiveFrom &&
    effectiveTo &&
    dayjs(effectiveFrom).isAfter(dayjs(effectiveTo), "day"),
  );

  const assignmentSummary = useMemo(() => {
    if (!selectedRule || !effectiveFrom || !effectiveTo) {
      return null;
    }

    return {
      ruleName: selectedRule.name || "-",

      period: `${formatDate(effectiveFrom)} – ${formatDate(effectiveTo)}`,
    };
  }, [selectedRule, effectiveFrom, effectiveTo]);

  const isFormValid =
    selectedIds.size > 0 &&
    Boolean(shiftRule) &&
    Boolean(effectiveFrom) &&
    Boolean(effectiveTo) &&
    !hasInvalidDateRange;

  const isRefreshing = employeesIsValidating || shiftRuleIsValidating;

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
      await Promise.all([refreshEmployeesData(), refreshShiftRuleData()]);
    } catch (err: unknown) {
      showError(err);
    }
  };

  const toggleEmployee = (id: number) => {
    if (isAssigning) {
      return;
    }

    setPreview(null);
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
    setPreview(null);
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const employee of filteredEmployees) {
        nextIds.add(employee.id);
      }

      return nextIds;
    });
  };

  const clearVisibleEmployees = () => {
    setPreview(null);
    setSelectedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const employee of filteredEmployees) {
        nextIds.delete(employee.id);
      }

      return nextIds;
    });
  };

  const clearAllEmployees = () => {
    setPreview(null);
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

    setPreview(null);
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

    setPreview(null);
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
    setPreview(null);
  };

  const validateAssignment = () => {
    if (selectedIds.size === 0) {
      showWarning(i18nT("static.rlgmd1"));

      return false;
    }

    if (!shiftRule) {
      showWarning(i18nT("static.1ewgjwo"));

      return false;
    }

    if (!effectiveFrom) {
      showWarning(i18nT("static.1ryngff"));

      return false;
    }

    if (!effectiveTo) {
      showWarning(i18nT("static.1kajgm9"));

      return false;
    }

    if (hasInvalidDateRange) {
      showWarning(i18nT("static.1el5hxj"));

      return false;
    }

    return true;
  };

  const buildRequest = (
    previewFingerprint?: string | null,
  ): EmployeeScheduleChangeRequest | null => {
    if (!shiftRule || !effectiveFrom || !effectiveTo) {
      return null;
    }

    return {
      employee_ids: Array.from(selectedIds).sort(
        (first, second) => first - second,
      ),
      shift_rule_id: shiftRule,
      effective_from: dayjs(effectiveFrom).format("YYYY-MM-DD"),
      effective_to: dayjs(effectiveTo).format("YYYY-MM-DD"),
      attendance_conflict_policy: overwrite
        ? "OVERWRITE_AND_REPROCESS"
        : "BLOCK",
      generate_through: null,
      preview_fingerprint: previewFingerprint ?? null,
    };
  };

  const previewChanges = async () => {
    if (isAssigning || !validateAssignment()) {
      return;
    }

    const payload = buildRequest();
    if (!payload) {
      return;
    }

    try {
      setIsAssigning(true);
      const response = await previewEmployeeScheduleChange(payload);
      setPreview(response.data);

      if (response.data.conflicts.length > 0) {
        showWarning(i18nT("static.65xp7k"));
      }
    } catch (err: unknown) {
      showError(err);
    } finally {
      setIsAssigning(false);
    }
  };

  const doAssign = async () => {
    if (isAssigning || !preview || !preview.can_apply) {
      return;
    }

    const payload = buildRequest(preview.fingerprint);
    if (!payload) {
      return;
    }

    try {
      setIsAssigning(true);
      const response = await applyEmployeeScheduleChange(payload);
      showSuccess(response.message || i18nT("static.1wnk2rw"));
      resetPage();
      router.push("/setting/employee-shift-assignment");
    } catch (err: unknown) {
      if (isSchedulePreviewStaleError(err)) {
        setPreview(null);
        showWarning(i18nT("static.1t477m1"));
        return;
      }

      showError(err);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAssign = () => {
    if (!validateAssignment()) {
      return;
    }

    if (!preview) {
      void previewChanges();
      return;
    }

    if (!preview.can_apply) {
      showWarning(i18nT("static.449r5f"));
      return;
    }

    requestActionConfirmation({
      header: i18nT("static.14lv1xk"),

      message: (
        <div className="flex flex-col gap-3">
          <span className="text-slate-600">{i18nT("static.emss5")} </span>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <span className="text-slate-500">{i18nT("static.qlsvoz")}</span>

              <span className="font-semibold text-slate-800">
                {selectedRule?.name || "-"}
              </span>

              <span className="text-slate-500">{i18nT("static.f4bo3a")}</span>

              <span className="font-semibold text-slate-800">
                {selectedIds.size}
              </span>

              <span className="text-slate-500">{i18nT("static.11hwh7o")}</span>

              <span className="font-semibold text-slate-800">
                {formatDate(effectiveFrom)} {i18nT("static.hnl64v")}{" "}
                {formatDate(effectiveTo)}
              </span>

              <span className="text-slate-500">{i18nT("static.1evh1st")}</span>

              <span className="font-semibold text-slate-800">
                {preview.totals.assignments_to_insert +
                  preview.totals.assignments_to_update +
                  preview.totals.assignments_to_archive}
              </span>

              <span className="text-slate-500">{i18nT("static.1asxuco")}</span>

              <span className="font-semibold text-slate-800">
                {overwrite ? i18nT("static.60179x") : i18nT("static.1eg1a6j")}
              </span>
            </div>
          </div>

          {overwrite && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              <i className="pi pi-exclamation-triangle mt-0.5" />

              <span>{i18nT("static.1exiif6")} </span>
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
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />

          <Button
            type="button"
            label={i18nT("static.1k6e5zv")}
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
        <IndeterminateCheckbox
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
        <IndeterminateCheckbox
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
                  tooltip={i18nT("static.e6sye1")}
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
                    {i18nT("static.15ge9fu")}{" "}
                  </h1>

                  <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                    {i18nT("static.6x84cg")}{" "}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Tag
                      value={i18nT("static.fywzdp")}
                      severity="info"
                      rounded
                    />

                    <Tag
                      value={i18nT("static.va4xz6")}
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
                loading={isRefreshing}
                disabled={isRefreshing || isAssigning}
                className="w-full sm:w-auto"
                onClick={handleRefresh}
              />
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              <i className="pi pi-info-circle mt-1 shrink-0" />

              <div>
                <p className="m-0 font-semibold">{i18nT("static.19itws9")} </p>

                <p className="m-0 mt-1">{i18nT("static.147kc1o")} </p>
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
                  {i18nT("static.1tfchfx")}{" "}
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
                  {i18nT("static.1tmn1k4")}{" "}
                </h3>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  {i18nT("static.qf0w6u")}{" "}
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
                  {i18nT("static.1ybw07l")}{" "}
                </h3>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  {i18nT("static.xn3bfo")}{" "}
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
                label={i18nT("static.9fc2ug")}
                icon="pi pi-check-square"
                severity="secondary"
                outlined
                size="small"
                disabled={filteredEmployees.length === 0 || isAssigning}
                onClick={selectVisibleEmployees}
              />

              <Button
                type="button"
                label={i18nT("static.1qfq1up")}
                icon="pi pi-minus-circle"
                severity="secondary"
                outlined
                size="small"
                disabled={visibleSelectedCount === 0 || isAssigning}
                onClick={clearVisibleEmployees}
              />

              <Button
                type="button"
                label={i18nT("static.1pqh2hx")}
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

        {/* Shift Configuration */}
        <Card className="border border-slate-200 shadow-sm">
          <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {i18nT("static.6wwes9")}{" "}
                </h2>

                <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                  {i18nT("static.77pz7e")}{" "}
                </p>
              </div>

              <Tag
                value={
                  overwrite ? i18nT("static.j9n4k8") : i18nT("static.2az7sd")
                }
                severity={overwrite ? "warning" : "info"}
                icon={overwrite ? "pi pi-exclamation-triangle" : "pi pi-shield"}
                rounded
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="shift_rule_id"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.qlsvoz")}{" "}
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
                  placeholder={i18nT("static.1tvus0p")}
                  className="w-full"
                  onChange={(event) => {
                    setShiftRule(event.value ?? null);
                    setPreview(null);
                  }}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="effective_from"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.ypbwia")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Calendar
                  id="effective_from"
                  appendTo={getBody}
                  value={effectiveFrom}
                  dateFormat="dd MM yy"
                  showIcon
                  maxDate={effectiveTo ?? undefined}
                  disabled={isAssigning}
                  placeholder={i18nT("static.h39lib")}
                  className="w-full"
                  onChange={(event) => {
                    const newDate = (event.value as Date | null) ?? null;

                    setEffectiveFrom(newDate);
                    setPreview(null);

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
                  {i18nT("static.mtbgcr")}{" "}
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <Calendar
                  id="effective_to"
                  appendTo={getBody}
                  value={effectiveTo}
                  dateFormat="dd MM yy"
                  showIcon
                  minDate={effectiveFrom ?? undefined}
                  disabled={isAssigning}
                  placeholder={i18nT("static.12xc3jc")}
                  className="w-full"
                  onChange={(event) => {
                    setEffectiveTo((event.value as Date | null) ?? null);
                    setPreview(null);
                  }}
                />
              </div>
            </div>

            {hasInvalidDateRange && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <i className="pi pi-exclamation-circle mt-0.5" />

                <span>{i18nT("static.1el5hxj")}</span>
              </div>
            )}

            {assignmentSummary && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="m-0 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                  {i18nT("static.1nnmrf8")}{" "}
                </p>

                <p className="m-0 mt-2 text-sm font-semibold text-indigo-900">
                  {assignmentSummary.ruleName} {i18nT("static.syyan8")}{" "}
                  {assignmentSummary.period}
                </p>

                <p className="m-0 mt-1 text-xs text-indigo-700">
                  {selectedIds.size} {i18nT("static.5gxg69")}{" "}
                  {selectedIds.size === 1 ? "" : i18nT("static.1w9pcoy")}{" "}
                  {i18nT("static.lnii5w")}{" "}
                </p>
              </div>
            )}

            {/* Attendance Conflict Policy */}
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                <IndeterminateCheckbox
                  inputId="overwrite"
                  checked={overwrite}
                  disabled={isAssigning}
                  onChange={(event) => {
                    setOverwrite(Boolean(event.checked));
                    setPreview(null);
                  }}
                />

                <div className="min-w-0 flex-1">
                  <label
                    htmlFor="overwrite"
                    className="cursor-pointer text-sm font-semibold text-slate-800"
                  >
                    {i18nT("static.75jhmu")}{" "}
                  </label>

                  <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                    {i18nT("static.1rdsjzn")}{" "}
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
                          ? i18nT("static.60179x")
                          : i18nT("static.35xp42")}
                      </p>

                      <p
                        className={`m-0 mt-1 text-xs leading-5 ${
                          overwrite ? "text-amber-800" : "text-green-800"
                        }`}
                      >
                        {overwrite
                          ? i18nT("static.8izv3n")
                          : i18nT("static.120ncaz")}
                      </p>
                    </div>
                  </div>
                </div>

                {false &&
                  showAssignmentModeInfo &&
                  assignmentMode === "smart_insert" && (
                    <div className="mt-4 grid gap-3 border-t border-green-200 pt-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-green-100 bg-white p-4 text-xs leading-6 text-slate-700">
                        <p className="m-0 font-semibold text-slate-900">
                          {i18nT("static.17dw5bl")}{" "}
                        </p>

                        <p className="m-0 mt-2">{i18nT("static.1bur2zv")} </p>

                        <p className="m-0">{i18nT("static.lghcnd")} </p>

                        <p className="m-0 mt-2 font-semibold text-slate-900">
                          {i18nT("static.ma0s3o")}{" "}
                        </p>

                        <p className="m-0">{i18nT("static.vot6st")}</p>

                        <p className="m-0">{i18nT("static.g9ogh2")}</p>

                        <p className="m-0">{i18nT("static.u8rv3d")}</p>
                      </div>

                      <div className="rounded-xl border border-green-100 bg-white p-4 text-xs leading-6 text-slate-700">
                        <p className="m-0 font-semibold text-slate-900">
                          {i18nT("static.kudu98")}{" "}
                        </p>

                        <p className="m-0 mt-2">{i18nT("static.vhoevi")} </p>

                        <p className="m-0">{i18nT("static.10pbp34")} </p>

                        <p className="m-0 mt-2 font-semibold text-slate-900">
                          {i18nT("static.ma0s3o")}{" "}
                        </p>

                        <p className="m-0">{i18nT("static.vot6st")}</p>

                        <p className="m-0">{i18nT("static.ts9wpq")}</p>

                        <p className="m-0">{i18nT("static.u8rv3d")}</p>
                      </div>
                    </div>
                  )}

                {false &&
                  showAssignmentModeInfo &&
                  assignmentMode === "overwrite" && (
                    <div className="mt-4 border-t border-amber-200 pt-4">
                      <div className="rounded-xl border border-amber-100 bg-white p-4 text-xs leading-6 text-slate-700">
                        <p className="m-0 font-semibold text-slate-900">
                          {i18nT("static.7442c3")}{" "}
                        </p>

                        <p className="m-0 mt-2">{i18nT("static.1ohlxg6")} </p>

                        <p className="m-0">{i18nT("static.1niw5fm")} </p>

                        <p className="m-0 mt-2 font-medium text-amber-700">
                          {i18nT("static.9tplko")}{" "}
                        </p>
                      </div>
                    </div>
                  )}
              </div>
            </section>
          </div>
        </Card>

        {preview && (
          <Card className="border border-indigo-200 shadow-sm">
            <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-5">
              <div className="flex flex-col gap-3 border-b border-indigo-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="m-0 text-base font-semibold text-slate-800">
                    {i18nT("static.11fdnd6")}{" "}
                  </h2>
                  <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                    {i18nT("static.xuipnj")}{" "}
                  </p>
                </div>
                <Tag
                  value={
                    preview.can_apply
                      ? i18nT("static.ranbcx")
                      : i18nT("static.1r45c2b")
                  }
                  severity={preview.can_apply ? "success" : "danger"}
                  icon={preview.can_apply ? "pi pi-check" : "pi pi-ban"}
                  rounded
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.f4bo3a")}
                  </p>
                  <p className="m-0 mt-1 text-xl font-semibold text-slate-800">
                    {preview.totals.employees}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.1eerko0")}
                  </p>
                  <p className="m-0 mt-1 text-xl font-semibold text-slate-800">
                    {preview.totals.rule_segments_to_create}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.1f41f32")}
                  </p>
                  <p className="m-0 mt-1 text-xl font-semibold text-slate-800">
                    {preview.totals.rule_segments_to_archive}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.12rin9r")}{" "}
                  </p>
                  <p className="m-0 mt-1 text-xl font-semibold text-slate-800">
                    {preview.totals.assignments_to_insert}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.100tidi")}{" "}
                  </p>
                  <p className="m-0 mt-1 text-xl font-semibold text-slate-800">
                    {preview.totals.assignments_to_update}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="m-0 text-xs text-slate-500">
                    {i18nT("static.14tx1bf")}
                  </p>
                  <p className="m-0 mt-1 text-xl font-semibold text-slate-800">
                    {preview.totals.attendance_rows_to_reprocess}
                  </p>
                </div>
              </div>

              {preview.conflicts.length > 0 && (
                <div className="flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="m-0 text-sm font-semibold text-red-900">
                    {i18nT("static.1c5yboc")}
                    {preview.conflicts.length})
                  </p>
                  <div className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                    {preview.conflicts.map((conflict, index) => (
                      <div
                        key={`${conflict.code}-${conflict.employee_id ?? "all"}-${conflict.date ?? "all"}-${index}`}
                        className="text-xs leading-5 text-red-800"
                      >
                        <span className="font-semibold">{conflict.code}</span>
                        {conflict.employee_id
                          ? i18nT("static.ok0grd", { p0: conflict.employee_id })
                          : ""}
                        {conflict.date
                          ? i18nT("static.reumh0", {
                              p0: dayjs(conflict.date).format("DD MMM YYYY"),
                            })
                          : ""}
                        {i18nT("static.1jw9hsr", { p0: conflict.message })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-xs leading-5 text-indigo-900">
                <p className="m-0 font-semibold">{i18nT("static.1jrbf3w")}</p>
                <p className="m-0 mt-1">{i18nT("static.1n391lq")} </p>
              </div>
            </div>
          </Card>
        )}

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

              {assignmentSummary && (
                <p className="m-0 mt-1 text-sm font-medium text-slate-800">
                  {assignmentSummary.ruleName} {i18nT("static.syyan8")}{" "}
                  {assignmentSummary.period}
                </p>
              )}

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.12rbvs2")}{" "}
                <span className="font-semibold text-slate-700">
                  {selectedDepartmentCount} {i18nT("static.1li2jif")}{" "}
                  {selectedDepartmentCount === 1 ? "" : i18nT("static.1w9pcoy")}
                </span>
                {i18nT("static.av53jt")}
                <span className="font-semibold text-slate-700">
                  {selectedPositionCount} {i18nT("static.14vfpje")}{" "}
                  {selectedPositionCount === 1 ? "" : i18nT("static.1w9pcoy")}
                </span>
              </p>

              <p className="m-0 mt-1 text-xs text-slate-500">
                {i18nT("static.q0ipw6")}{" "}
                <span
                  className={`font-semibold ${
                    overwrite ? "text-amber-700" : "text-green-700"
                  }`}
                >
                  {overwrite ? i18nT("static.11c2gjs") : i18nT("static.35xp42")}
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
                disabled={isAssigning}
                className="w-full sm:w-auto"
                onClick={resetPage}
              />

              <Button
                type="button"
                label={
                  preview ? i18nT("static.14lv1xk") : i18nT("static.z7xv16")
                }
                icon={preview ? "pi pi-check" : "pi pi-eye"}
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
