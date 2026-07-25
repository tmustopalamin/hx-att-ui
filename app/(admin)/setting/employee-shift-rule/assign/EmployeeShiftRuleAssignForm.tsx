"use client";

import { useState, useMemo } from "react";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Tag } from "primereact/tag";
import useSWR from "swr";
import { fetcher } from "@/app/utils/fetcher";
import { Employee } from "@/app/types/employee";
import { ShiftRule } from "@/app/types/shift-rule";
import dayjs from "dayjs";
import {
  ResponseType,
  ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import { createEmployeeShiftRule } from "@/app/services/employee-shift-rule-service";
import { useDispatch } from "react-redux";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { useRouter } from "next/navigation";

const EmployeeShiftRuleAssignForm = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [shiftRule, setShiftRule] = useState<number | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState<Date | null>(null);
  const [effectiveTo, setEffectiveTo] = useState<Date | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const [showAssignmentModeInfo, setShowAssignmentModeInfo] = useState(false);

  const { data: employeesData } = useSWR<Employee[]>(
    `/api/employees/list`,
    fetcher,
  );

  const { data: shiftRuleData, isLoading: shiftRuleIsloading } = useSWR<
    ShiftRule[]
  >(`/api/shift-rule`, fetcher);

  const employees = employeesData ?? [];
  const shiftRules = shiftRuleData ?? [];

  const departments = useMemo(() => {
    return [
      ...new Set(employees.map((e) => e.department_name).filter(Boolean)),
    ] as string[];
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    return employees.filter((e: Employee) => {
      const keyword = search.toLowerCase().trim();

      return (
        !keyword ||
        (e.full_name ?? "").toLowerCase().includes(keyword) ||
        (e.code ?? "").toLowerCase().includes(keyword) ||
        (e.department_name ?? "").toLowerCase().includes(keyword) ||
        (e.position_name ?? "").toLowerCase().includes(keyword) ||
        (e.agency_name ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [employees, search]);

  const assignmentSummary = useMemo(() => {
    if (!shiftRule || !effectiveFrom) return null;

    const selectedRule = shiftRules.find((r) => r.id === shiftRule);

    const fromText = dayjs(effectiveFrom).format("DD-MM-YYYY");
    const toText = effectiveTo
      ? dayjs(effectiveTo).format("DD-MM-YYYY")
      : "No end date";

    return `${selectedRule?.name ?? "-"} • ${fromText} → ${toText}`;
  }, [shiftRule, shiftRules, effectiveFrom, effectiveTo]);

  const selectedRuleName = useMemo(() => {
    if (!shiftRule) return "-";

    return shiftRules.find((r) => r.id === shiftRule)?.name ?? "-";
  }, [shiftRule, shiftRules]);

  const isFormValid =
    selectedIds.size > 0 && Boolean(shiftRule) && Boolean(effectiveFrom);

  const toggleEmployee = (id: number) => {
    const newSet = new Set(selectedIds);

    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }

    setSelectedIds(newSet);
  };

  const selectAll = () => {
    setSelectedIds(new Set(filteredEmployees.map((e) => e.id)));
  };

  const clearAll = () => {
    setSelectedIds(new Set());
    setSelectedDepartments([]);
  };

  const toggleDepartment = (dept: string) => {
    let newDepartments = [...selectedDepartments];

    if (newDepartments.includes(dept)) {
      newDepartments = newDepartments.filter((d) => d !== dept);
    } else {
      newDepartments.push(dept);
    }

    setSelectedDepartments(newDepartments);

    const newSet = new Set(selectedIds);

    employees
      .filter((e) => e.department_name === dept)
      .forEach((e) => {
        if (newDepartments.includes(dept)) {
          newSet.add(e.id);
        } else {
          newSet.delete(e.id);
        }
      });

    setSelectedIds(newSet);
  };

  const checkboxBody = (row: Employee) => {
    const inputId = `emp_${row.id}`;

    return (
      <div className="flex items-center gap-2">
        <Checkbox
          inputId={inputId}
          checked={selectedIds.has(row.id)}
          onChange={(e) => {
            e.originalEvent?.stopPropagation();
            toggleEmployee(row.id);
          }}
        />
        <label htmlFor={inputId} className="cursor-pointer select-none" />
      </div>
    );
  };

  const headerCheckbox = () => {
    const inputId = "select_all";

    const allSelected =
      filteredEmployees.length > 0 &&
      filteredEmployees.every((e) => selectedIds.has(e.id));

    return (
      <div className="flex items-center justify-center">
        <Checkbox
          inputId={inputId}
          checked={allSelected}
          onChange={(e) => {
            e.originalEvent?.stopPropagation();

            if (allSelected) {
              clearAll();
            } else {
              selectAll();
            }
          }}
        />
      </div>
    );
  };

  const doAssign = async () => {
    if (selectedIds.size === 0) {
      console.warn("No employee selected");
      return;
    }

    if (!shiftRule || !effectiveFrom) {
      console.warn("Shift rule and effective date are required");
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
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createEmployeeShiftRule(payload);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: res.message,
        }),
      );

      resetPage();
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const handleAssign = () => {
    if (!isFormValid || !effectiveFrom) {
      return;
    }

    const fromText = dayjs(effectiveFrom).format("DD-MM-YYYY");
    const toText = effectiveTo
      ? dayjs(effectiveTo).format("DD-MM-YYYY")
      : "No end date";

    const modeText = overwrite
      ? "Replace overlapping rules"
      : "Smart insert: fill empty gaps and keep existing rules";

    confirmDialog({
      header: "Assign Shift Rule",
      message: `Assign "${selectedRuleName}" for ${selectedIds.size} employee${
        selectedIds.size > 1 ? "s" : ""
      } with period ${fromText} - ${toText}? Mode: ${modeText}.`,
      icon: overwrite ? "pi pi-exclamation-triangle" : "pi pi-info-circle",
      defaultFocus: "accept",
      accept: () => doAssign(),
      reject: () => {},
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button
            label="Cancel"
            icon="pi pi-times"
            onClick={options.reject}
            className="p-button-text"
            type="button"
          />
          <Button
            label="Assign"
            icon="pi pi-check"
            onClick={options.accept}
            severity={overwrite ? "warning" : undefined}
            type="button"
          />
        </div>
      ),
    });
  };

  const resetPage = () => {
    setSelectedIds(new Set());
    setSelectedDepartments([]);
    setShiftRule(null);
    setEffectiveFrom(null);
    setEffectiveTo(null);
    setOverwrite(false);
    setShowAssignmentModeInfo(false);
  };

  return (
    <div className="space-y-6 p-4">
      <ConfirmDialog />

      <div className="rounded-xl bg-white p-5 shadow">
        <div className="flex items-start gap-3 pb-5">
          <button
            onClick={() => router.push("/setting/employee-shift-rule")}
            className="mt-1 text-gray-500 transition hover:cursor-pointer hover:text-gray-800"
            type="button"
          >
            <i className="pi pi-arrow-left text-lg" />
          </button>

          <div className="min-w-0">
            <div className="text-2xl font-semibold">Shift Rule Assignment</div>
            <div className="text-sm text-gray-500">
              Assign employee shift rules based on date range. These rules will
              be used later when generating employee shift assignments.
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Tag value="Employee Shift Rule" severity="info" />
              <Tag value="No overlap after assignment" severity="success" />
            </div>
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <span className="pi pi-info-circle mt-1 text-blue-600" />
            <div className="text-sm leading-6 text-blue-800">
              <p className="font-semibold">How this assignment works</p>
              <p>
                This page assigns{" "}
                <span className="font-semibold">Employee Shift Rule</span>, not
                daily schedules. After this setup, use{" "}
                <span className="font-semibold">Employee Shift Assignment</span>{" "}
                generation to create daily schedules for attendance processing.
              </p>
            </div>
          </div>
        </div>

        <h2 className="mb-4 font-semibold">Filter & Quick Select</h2>

        <div className="mb-4">
          <div className="relative w-full">
            <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
            <InputText
              autoFocus
              placeholder="Search employee"
              className="w-full pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-2 flex items-start gap-2 text-xs text-gray-500">
            <i className="pi pi-info-circle mt-[2px]" />
            <span>
              Check a department to select all employees in that department. You
              can still adjust selections manually.
            </span>
          </div>

          <div className="flex flex-wrap gap-4">
            {departments.map((dept) => {
              const inputId = `dept_${dept}`;

              return (
                <div key={dept} className="flex items-center gap-2">
                  <Checkbox
                    inputId={inputId}
                    checked={selectedDepartments.includes(dept)}
                    onChange={() => toggleDepartment(dept)}
                  />
                  <label htmlFor={inputId} className="cursor-pointer">
                    {dept}
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button label="Select All" onClick={selectAll} type="button" />
          <Button
            label="Clear All"
            severity="secondary"
            onClick={clearAll}
            type="button"
          />
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <DataTable
          value={filteredEmployees}
          paginator
          rows={5}
          rowsPerPageOptions={[5, 10, 25, 50]}
          className="text-sm"
          emptyMessage="No data found"
          onRowClick={(e) => toggleEmployee(e.data.id)}
          scrollable
          tableStyle={{ minWidth: "64rem" }}
        >
          <Column
            header={headerCheckbox}
            body={checkboxBody}
            style={{ width: "60px" }}
          />
          <Column field="code" header="Employee Code" sortable />
          <Column field="full_name" header="Employee" sortable />
          <Column field="department_name" header="Department" sortable />
          <Column field="position_name" header="Position" sortable />
          <Column field="agency_name" header="Agency" />
        </DataTable>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">Shift Configuration</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select shift rule, effective period, and assignment mode.
            </p>
          </div>

          <Tag
            value={overwrite ? "Replace Overlap" : "Smart Insert"}
            severity={overwrite ? "warning" : "success"}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Dropdown
            value={shiftRule}
            options={shiftRules}
            onChange={(e) => setShiftRule(e.value)}
            className="w-full"
            optionValue="id"
            optionLabel="name"
            loading={shiftRuleIsloading}
            showClear={true}
            placeholder={
              shiftRuleIsloading ? "Loading Shift Rule..." : "Select Shift Rule"
            }
          />

          <Calendar
            value={effectiveFrom}
            onChange={(e) => {
              const newFrom = e.value as Date | null;
              setEffectiveFrom(newFrom);

              if (
                newFrom &&
                effectiveTo &&
                dayjs(effectiveTo).isBefore(dayjs(newFrom), "day")
              ) {
                setEffectiveTo(null);
              }
            }}
            showIcon
            placeholder="Effective From"
            dateFormat="dd-mm-yy"
            maxDate={effectiveTo ?? undefined}
          />

          <Calendar
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.value as Date | null)}
            showIcon
            placeholder="Effective To"
            dateFormat="dd-mm-yy"
            minDate={effectiveFrom ?? undefined}
          />
        </div>

        {assignmentSummary && (
          <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
            <div className="text-xs font-medium uppercase tracking-wide text-indigo-500">
              Assignment Preview
            </div>
            <div className="mt-1 text-sm font-semibold text-indigo-900">
              {assignmentSummary}
            </div>
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-center gap-2">
            <Checkbox
              inputId="overwrite"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.checked ?? false)}
            />
            <label htmlFor="overwrite" className="cursor-pointer font-medium">
              Overwrite Existing Rule
            </label>
          </div>

          <p className="ml-6 mt-1 text-xs text-gray-500">
            Enable this only when you want the new rule to replace existing
            rules in the selected period.
          </p>

          <div className="ml-6 mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span
                  className={`pi ${
                    overwrite
                      ? "pi-exclamation-triangle text-amber-600"
                      : "pi-check-circle text-emerald-600"
                  } mt-1`}
                />

                <div className="text-sm leading-6">
                  <p className="font-semibold text-slate-900">
                    {overwrite
                      ? "Replace overlapping rules"
                      : "Smart insert mode"}
                  </p>

                  <p className="text-slate-600">
                    {overwrite
                      ? "Existing rules that overlap with the selected period will be replaced."
                      : "Existing rules will be kept. The new rule will only fill empty gaps or become a specific exception."}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                label={showAssignmentModeInfo ? "Hide info" : "More info"}
                icon={
                  showAssignmentModeInfo
                    ? "pi pi-chevron-up"
                    : "pi pi-chevron-down"
                }
                className="p-button-text p-button-sm self-start"
                onClick={() => setShowAssignmentModeInfo((prev) => !prev)}
              />
            </div>

            {showAssignmentModeInfo && !overwrite && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl bg-white p-3 text-xs leading-6 text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Example 1: fill empty gaps
                    </p>
                    <p>Existing: 01 Apr 2026 - 31 May 2026 = Night Shift</p>
                    <p>New: 01 Jan 2026 - 31 Dec 2026 = Morning Shift</p>
                    <p className="mt-2 font-semibold text-slate-900">Result:</p>
                    <p>01 Jan 2026 - 31 Mar 2026 = Morning Shift</p>
                    <p>01 Apr 2026 - 31 May 2026 = Night Shift</p>
                    <p>01 Jun 2026 - 31 Dec 2026 = Morning Shift</p>
                  </div>

                  <div className="rounded-xl bg-white p-3 text-xs leading-6 text-slate-700">
                    <p className="font-semibold text-slate-900">
                      Example 2: create exception
                    </p>
                    <p>Existing: 01 Jan 2026 - 31 Dec 2026 = Morning Shift</p>
                    <p>New: 01 Apr 2026 - 31 May 2026 = Rotation Shift</p>
                    <p className="mt-2 font-semibold text-slate-900">Result:</p>
                    <p>01 Jan 2026 - 31 Mar 2026 = Morning Shift</p>
                    <p>01 Apr 2026 - 31 May 2026 = Rotation Shift</p>
                    <p>01 Jun 2026 - 31 Dec 2026 = Morning Shift</p>
                  </div>
                </div>
              </div>
            )}

            {showAssignmentModeInfo && overwrite && (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="rounded-xl bg-white p-3 text-xs leading-6 text-slate-700">
                  <p className="font-semibold text-slate-900">
                    What overwrite does
                  </p>
                  <p>
                    Existing employee shift rules that overlap with the selected
                    period will be soft-deleted.
                  </p>
                  <p>
                    Then the new rule will be inserted for the full selected
                    period.
                  </p>
                  <p className="mt-2 text-amber-700">
                    Use this mode only when you really want to replace existing
                    employee shift rules.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl bg-white p-4 shadow md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">
            {selectedIds.size}
          </span>{" "}
          employee{selectedIds.size > 1 ? "s" : ""} selected
          {assignmentSummary && (
            <>
              {" "}
              ·{" "}
              <span className="font-semibold text-gray-900">
                {assignmentSummary}
              </span>
            </>
          )}
          <div className="mt-1 text-xs text-gray-500">
            Mode:{" "}
            <span className="font-semibold">
              {overwrite
                ? "Replace overlapping rules"
                : "Smart insert / fill gaps"}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            label="Cancel"
            severity="secondary"
            onClick={resetPage}
            type="button"
          />
          <Button
            label="Assign Shift Rule"
            icon="pi pi-check"
            disabled={!isFormValid}
            severity={overwrite ? "warning" : undefined}
            onClick={handleAssign}
            type="button"
          />
        </div>
      </div>
    </div>
  );
};

export default EmployeeShiftRuleAssignForm;
