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
import useSWR from "swr";
import { fetcher } from "@/app/utils/fetcher";
import { Employee } from "@/app/types/employee";
import { ShiftRule } from "@/app/types/shift-rule";
import dayjs from "dayjs";
import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import { createEmployeeShiftRule } from "@/app/services/employee-shift-rule-service";
import { useDispatch } from "react-redux";
import { getErrorMessage, isResponseTypeError } from "@/app/utils/error-messages";
import { showToast } from '@/store/ToastSlice';
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

    const { data: employeesData } = useSWR<Employee[]>(`/api/employees/list`, fetcher);
    const { data: shiftRuleData, isLoading: shiftRuleIsloading } = useSWR<ShiftRule[]>(`/api/shift-rule`, fetcher);

    const employees = employeesData ?? [];
    const shiftRules = shiftRuleData ?? [];

    const departments = useMemo(() => {
        return [...new Set(employees.map((e) => e.department_name).filter(Boolean))] as string[];
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter((e: Employee) =>
            (e.full_name ?? "").toLowerCase().includes(search.toLowerCase())
        );
    }, [employees, search]);

    const assignmentSummary = useMemo(() => {
        if (!shiftRule || !effectiveFrom) return null;

        const selectedRule = shiftRules.find((r) => r.id === shiftRule);

        const fromText = dayjs(effectiveFrom).format("DD-MM-YYYY");
        const toText = effectiveTo
            ? dayjs(effectiveTo).format("DD-MM-YYYY")
            : "∞";

        return `${selectedRule?.name ?? "-"} • ${fromText} → ${toText}`;
    }, [shiftRule, shiftRules, effectiveFrom, effectiveTo]);

    const toggleEmployee = (id: number) => {
        const newSet = new Set(selectedIds);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
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
                        e!.originalEvent!.stopPropagation();
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
                        e!.originalEvent!.stopPropagation();

                        if (allSelected) clearAll();
                        else selectAll();
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
            row_version: 1
        };

        try {
            const res: ResponseType<ResponseTypeCreateSuccess> = await createEmployeeShiftRule(payload);
            dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));

            resetPage();
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
            } else if (err instanceof Error) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
            }
        }
    };

    const handleAssign = () => {
        if (selectedIds.size === 0 || !shiftRule || !effectiveFrom) {
            return;
        }

        const selectedRule = shiftRules.find((r) => r.id === shiftRule);
        const fromText = dayjs(effectiveFrom).format("DD-MM-YYYY");
        const toText = effectiveTo
            ? dayjs(effectiveTo).format("DD-MM-YYYY")
            : "∞";

        confirmDialog({
            header: "Assign Shift Rule",
            message: `Assign "${selectedRule?.name ?? "-"}" for ${selectedIds.size} employee${selectedIds.size > 1 ? "s" : ""} with period ${fromText} - ${toText}?`,
            icon: "pi pi-info-circle",
            defaultFocus: "accept",
            accept: () => doAssign(),
            reject: () => { },
            footer: (options) => (
                <div className="flex gap-3 justify-end">
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
                        type="button"
                    />
                </div>
            ),
        });
    };

    const resetPage = () => {
        setSelectedIds(new Set());
        setShiftRule(null);
        setEffectiveFrom(null);
        setEffectiveTo(null);
    };

    return (
        <div className="p-4 space-y-6">
            <ConfirmDialog />

            <div className="bg-white p-5 rounded-xl shadow">
                <div className="pb-5 flex items-start gap-3">
                    <button
                        onClick={() => router.push("/setting/employee-shift-rule")}
                        className="mt-1 text-gray-500 hover:text-gray-800 transition hover:cursor-pointer"
                        type="button"
                    >
                        <i className="pi pi-arrow-left text-lg" />
                    </button>

                    <div>
                        <div className="text-2xl font-semibold">Shift Assignment</div>
                        <div className="text-sm text-gray-500">
                            Assign shift schedules to employees based on rules and date range
                        </div>
                    </div>
                </div>

                <h2 className="font-semibold mb-4">Filter & Quick Select</h2>

                <div className="mb-4">
                    <div className="relative w-full">
                        <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
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
                    <div className="flex items-start gap-2 text-xs text-gray-500 mb-2">
                        <i className="pi pi-info-circle mt-[2px]" />
                        <span>
                            Check a department to select all employees in that department. You can still adjust selections manually.
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

                <div className="flex gap-2">
                    <Button label="Select All" onClick={selectAll} type="button" />
                    <Button label="Clear All" severity="secondary" onClick={clearAll} type="button" />
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
                <DataTable
                    value={filteredEmployees}
                    paginator
                    rows={5}
                    className="text-sm"
                    emptyMessage="No data found"
                    onRowClick={(e) => toggleEmployee(e.data.id)}
                >
                    <Column header={headerCheckbox} body={checkboxBody} style={{ width: "60px" }} />
                    <Column field="code" header="Employee Code" sortable />
                    <Column field="full_name" header="Employee" sortable />
                    <Column field="department_name" header="Department" sortable />
                    <Column field="position_name" header="Position" sortable />
                    <Column field="agency_name" header="Agency" />
                </DataTable>
            </div>

            <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="font-semibold mb-4">Shift Configuration</h2>

                <div className="grid md:grid-cols-3 gap-4">
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
                        onChange={(e) => setEffectiveFrom(e.value as Date)}
                        showIcon
                        placeholder="Effective From"
                        dateFormat="dd-mm-yy"
                    />

                    <Calendar
                        value={effectiveTo}
                        onChange={(e) => setEffectiveTo(e.value as Date)}
                        showIcon
                        placeholder="Effective To"
                        dateFormat="dd-mm-yy"
                    />
                </div>

                {assignmentSummary && (
                    <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
                        <div className="text-xs font-medium text-indigo-500 uppercase tracking-wide">
                            Assignment Preview
                        </div>
                        <div className="mt-1 text-sm font-semibold text-indigo-900">
                            {assignmentSummary}
                        </div>
                    </div>
                )}

                <div className="mt-4">
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

                    <p className="text-xs text-gray-500 mt-1 ml-6">
                        If enabled, existing shift rules within the selected date range will be replaced.
                        If disabled, the system will adjust existing rules to prevent overlap.
                    </p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
                <div>
                    <span className="font-semibold">{selectedIds.size}</span> employees selected
                </div>

                <div className="flex gap-2">
                    <Button label="Cancel" severity="secondary" onClick={resetPage} type="button" />
                    <Button
                        label="Assign Shift Rule"
                        disabled={selectedIds.size === 0 || !shiftRule || !effectiveFrom}
                        onClick={handleAssign}
                        type="button"
                    />
                </div>
            </div>
        </div>
    );
};

export default EmployeeShiftRuleAssignForm;