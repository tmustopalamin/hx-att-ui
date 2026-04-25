"use client";

import { useState, useMemo } from "react";
import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import useSWR from "swr";
import { fetcher } from "@/app/utils/fetcher";
import { Employee } from "@/app/types/employee";
import dayjs from "dayjs";
import { ResponseType, ResponseTypeCreateSuccess } from "@/app/types/response-type";
import { useDispatch } from "react-redux";
import { getErrorMessage, isResponseTypeError } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { useRouter } from "next/navigation";
import { createEmployeeShiftAssignment } from "@/app/services/employee-shift-assignment-service";

const EmployeeShiftAssignmentGenerateForm = () => {
    const router = useRouter();
    const dispatch = useDispatch();

    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [periodFrom, setPeriodFrom] = useState<Date | null>(null);
    const [periodTo, setPeriodTo] = useState<Date | null>(null);
    const [overwrite, setOverwrite] = useState(false);

    const { data: employeesData } = useSWR<Employee[]>(`/api/employees/list`, fetcher);

    const employees = employeesData ?? [];

    const departments = useMemo(() => {
        return [...new Set(employees.map((e) => e.department_name).filter(Boolean))] as string[];
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter((e: Employee) => {
            const keyword = search.toLowerCase().trim();

            const matchSearch =
                !keyword ||
                (e.full_name ?? "").toLowerCase().includes(keyword) ||
                // (e.code ?? "").toLowerCase().includes(keyword) ||
                (e.department_name ?? "").toLowerCase().includes(keyword) ||
                (e.position_name ?? "").toLowerCase().includes(keyword) ||
                (e.agency_name ?? "").toLowerCase().includes(keyword);

            const matchDepartment =
                selectedDepartments.length === 0 ||
                selectedDepartments.includes(e.department_name ?? "");

            return matchSearch && matchDepartment;
        });
    }, [employees, search, selectedDepartments]);

    const periodPreview = useMemo(() => {
        if (!periodFrom) return null;

        const from = dayjs(periodFrom).format("DD MMM YYYY");
        const actualPeriodTo = periodTo ?? dayjs(periodFrom).endOf("year").toDate();
        const to = dayjs(actualPeriodTo).format("DD MMM YYYY");
        const days = dayjs(actualPeriodTo).diff(dayjs(periodFrom), "day") + 1;

        return `${from} — ${to} (${days} days)`;
    }, [periodFrom, periodTo]);

    const isFormValid = selectedIds.size > 0 && periodFrom !== null;

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

    const handleGenerate = async () => {
        if (!isFormValid || !periodFrom) return;

        const payload = {
            employee_ids: Array.from(selectedIds),
            date_from: dayjs(periodFrom).format("YYYY-MM-DD"),
            date_to: periodTo ? dayjs(periodTo).format("YYYY-MM-DD") : null,
            row_version: 1,
        };

        try {
            const res: ResponseType<ResponseTypeCreateSuccess> =
                await createEmployeeShiftAssignment(payload);

            dispatch(
                showToast({
                    visible: true,
                    severity: "success",
                    summary: "Success",
                    detail: res.message,
                })
            );

            resetPage();
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: "error",
                        summary: "Error",
                        detail: getErrorMessage(err, "message"),
                    })
                );
            } else if (err instanceof Error) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: "error",
                        summary: "Error",
                        detail: err.message,
                    })
                );
            }
        }
    };

    const handleGenerateConfirm = () => {
        if (!isFormValid || !periodFrom) return;

        const fromText = dayjs(periodFrom).format("DD MMM YYYY");
        const toText = periodTo
            ? dayjs(periodTo).format("DD MMM YYYY")
            : dayjs(periodFrom).endOf("year").format("DD MMM YYYY");

        confirmDialog({
            header: "Generate Schedule",
            message: `Generate schedule for ${selectedIds.size} employee${selectedIds.size > 1 ? "s" : ""} for ${fromText} — ${toText}?`,
            icon: "pi pi-info-circle",
            defaultFocus: "accept",
            accept: () => handleGenerate(),
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
                        label="Generate"
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
        setSelectedDepartments([]);
        setPeriodFrom(null);
        setPeriodTo(null);
        setOverwrite(false);
    };

    return (
        <div className="p-4 space-y-6">
            <ConfirmDialog />

            {/* HEADER + FILTER */}
            <div className="bg-white p-5 rounded-xl shadow">
                <div className="pb-5 flex items-start gap-3">
                    <button
                        onClick={() => router.push("/setting/employee-shift-assignment")}
                        className="mt-1 text-gray-500 hover:text-gray-800 transition hover:cursor-pointer"
                        type="button"
                    >
                        <i className="pi pi-arrow-left text-lg" />
                    </button>
                    <div>
                        <div className="text-2xl font-semibold">Generate Schedule</div>
                        <div className="text-sm text-gray-500">
                            Generate shift assignments for employees based on active shift rules
                        </div>
                    </div>
                </div>

                <h2 className="font-semibold mb-4">Filter & Quick Select</h2>

                {/* SEARCH */}
                <div className="mb-4">
                    <div className="relative w-full">
                        <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <InputText
                            autoFocus
                            placeholder="Search employee..."
                            className="w-full pl-10"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                {/* DEPARTMENT FILTER */}
                <div className="mb-4">
                    <div className="flex items-start gap-2 text-xs text-gray-500 mb-2">
                        <i className="pi pi-info-circle mt-[2px]" />
                        <span>
                            Check a department to select all employees in that department.
                            Manual selection is still available.
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
                                    <label htmlFor={inputId} className="cursor-pointer text-sm">
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

            {/* EMPLOYEE TABLE */}
            <div className="bg-white p-4 rounded-xl shadow">
                <DataTable
                    value={filteredEmployees}
                    paginator
                    rows={5}
                    className="text-sm"
                    emptyMessage="No data found"
                    onRowClick={(e) => toggleEmployee(e.data.id)}
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

            {/* GENERATE CONFIG */}
            <div className="bg-white p-4 rounded-xl shadow">
                <h2 className="font-semibold mb-4">Generate Configuration</h2>

                <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Period From</label>
                        <Calendar
                            value={periodFrom}
                            onChange={(e) => {
                                const newFrom = e.value as Date | null;
                                setPeriodFrom(newFrom);

                                if (newFrom && periodTo && dayjs(periodTo).isBefore(dayjs(newFrom), "day")) {
                                    setPeriodTo(null);
                                }
                            }}
                            showIcon
                            placeholder="dd-mm-yyyy"
                            dateFormat="dd-mm-yy"
                            maxDate={periodTo ?? undefined}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Period To</label>
                        <Calendar
                            value={periodTo}
                            onChange={(e) => setPeriodTo(e.value as Date)}
                            showIcon
                            placeholder="Optional"
                            dateFormat="dd-mm-yy"
                            minDate={periodFrom ?? undefined}
                        />
                        <span className="text-[11px] text-gray-500">
                            Leave empty to preview until the end of the year.
                        </span>
                    </div>
                </div>

                {/* PERIOD PREVIEW */}
                {periodPreview && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                        <i className="pi pi-calendar text-gray-400" />
                        <span>
                            Generate schedule for period:{" "}
                            <span className="font-medium text-gray-700">{periodPreview}</span>
                        </span>
                    </div>
                )}

                {/* OVERWRITE OPTION */}
                <div className="mt-4">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            inputId="overwrite"
                            checked={overwrite}
                            onChange={(e) => setOverwrite(e.checked ?? false)}
                        />
                        <label htmlFor="overwrite" className="cursor-pointer font-medium">
                            Overwrite Existing Assignments
                        </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                        If enabled, assignments with source <span className="font-medium">RULE</span> in
                        this period will be replaced. Assignments with source{" "}
                        <span className="font-medium">MANUAL</span> or locked status will not be changed.
                    </p>

                    {overwrite && (
                        <div className="mt-2 ml-6 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <i className="pi pi-exclamation-triangle mt-[1px] text-amber-500" />
                            <span>
                                Overwrite mode is active. Assignments with source RULE in this
                                period will be replaced. MANUAL and locked assignments will not be affected.
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* SUMMARY + ACTION */}
            <div className="bg-white p-4 rounded-xl shadow flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{selectedIds.size}</span> employee
                    {selectedIds.size > 1 ? "s" : ""} selected
                    {periodPreview && (
                        <>
                            {" "}·{" "}
                            <span className="font-semibold text-gray-900">{periodPreview}</span>
                        </>
                    )}
                </div>

                <div className="flex gap-2">
                    <Button label="Cancel" severity="secondary" onClick={resetPage} type="button" />
                    <Button
                        label="Generate Schedule"
                        icon="pi pi-calendar-plus"
                        disabled={!isFormValid}
                        onClick={handleGenerateConfirm}
                        type="button"
                    />
                </div>
            </div>
        </div>
    );
};

export default EmployeeShiftAssignmentGenerateForm;