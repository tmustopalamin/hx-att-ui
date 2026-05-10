"use client";

import { useMemo, useState } from "react";
import dayjs from "dayjs";
import useSWR from "swr";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";

import { InputText } from "primereact/inputtext";
import { Checkbox } from "primereact/checkbox";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Tag } from "primereact/tag";

import { fetcher } from "@/app/utils/fetcher";
import { Employee } from "@/app/types/employee";
import {
    ResponseType,
    ResponseTypeCreateSuccess,
} from "@/app/types/response-type";
import { NewEmployeeShiftAssignment } from "@/app/types/employee-shift-assignment";
import { createEmployeeShiftAssignment } from "@/app/services/employee-shift-assignment-service";
import {
    getErrorMessage,
    isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";

const EmployeeShiftAssignmentGenerateForm = () => {
    const router = useRouter();
    const dispatch = useDispatch();

    const [search, setSearch] = useState("");
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [periodFrom, setPeriodFrom] = useState<Date | null>(null);
    const [periodTo, setPeriodTo] = useState<Date | null>(null);
    const [overwrite, setOverwrite] = useState(false);
    const [showOverwriteInfo, setShowOverwriteInfo] = useState(false);

    const { data: employeesData } = useSWR<Employee[]>(
        "/api/employees/list",
        fetcher
    );

    const employees = employeesData ?? [];

    const departments = useMemo(() => {
        return [
            ...new Set(employees.map((e) => e.department_name).filter(Boolean)),
        ] as string[];
    }, [employees]);

    const filteredEmployees = useMemo(() => {
        return employees.filter((e: Employee) => {
            const keyword = search.toLowerCase().trim();

            const matchSearch =
                !keyword ||
                (e.full_name ?? "").toLowerCase().includes(keyword) ||
                (e.code ?? "").toLowerCase().includes(keyword) ||
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
        const actualPeriodTo =
            periodTo ?? dayjs(periodFrom).endOf("year").toDate();
        const to = dayjs(actualPeriodTo).format("DD MMM YYYY");
        const days = dayjs(actualPeriodTo).diff(dayjs(periodFrom), "day") + 1;

        return `${from} — ${to} (${days} days)`;
    }, [periodFrom, periodTo]);

    const isFormValid = selectedIds.size > 0 && periodFrom !== null;

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
                <label
                    htmlFor={inputId}
                    className="cursor-pointer select-none"
                />
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

    const handleGenerate = async () => {
        if (!isFormValid || !periodFrom) return;

        const payload: NewEmployeeShiftAssignment = {
            employee_ids: Array.from(selectedIds),
            date_from: dayjs(periodFrom).format("YYYY-MM-DD"),
            date_to: periodTo ? dayjs(periodTo).format("YYYY-MM-DD") : null,
            overwrite,
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
                    detail: res.message || "Schedule generated successfully",
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

        const modeText = overwrite
            ? "Overwrite unlocked RULE assignments"
            : "Generate missing dates only";

        confirmDialog({
            header: "Generate Schedule",
            message: `Generate schedule for ${selectedIds.size} employee${selectedIds.size > 1 ? "s" : ""
                } for ${fromText} — ${toText}? Mode: ${modeText}.`,
            icon: overwrite
                ? "pi pi-exclamation-triangle"
                : "pi pi-info-circle",
            defaultFocus: "accept",
            accept: () => handleGenerate(),
            reject: () => { },
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
                        label="Generate"
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
        setPeriodFrom(null);
        setPeriodTo(null);
        setOverwrite(false);
        setShowOverwriteInfo(false);
    };

    return (
        <div className="space-y-6 p-4">
            <ConfirmDialog />

            <div className="rounded-xl bg-white p-5 shadow">
                <div className="flex items-start gap-3 pb-5">
                    <button
                        onClick={() =>
                            router.push("/setting/employee-shift-assignment")
                        }
                        className="mt-1 text-gray-500 transition hover:cursor-pointer hover:text-gray-800"
                        type="button"
                    >
                        <i className="pi pi-arrow-left text-lg" />
                    </button>

                    <div className="min-w-0">
                        <div className="text-2xl font-semibold">
                            Generate Schedule
                        </div>
                        <div className="text-sm text-gray-500">
                            Generate shift assignments for employees based on
                            active employee shift rules.
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <Tag
                                value="Uses Employee Shift Rule"
                                severity="info"
                            />
                            <Tag
                                value="Manual and locked assignments are protected"
                                severity="secondary"
                            />
                        </div>
                    </div>
                </div>

                <h2 className="mb-4 font-semibold">Filter & Quick Select</h2>

                <div className="mb-4">
                    <div className="relative w-full">
                        <i className="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400" />
                        <InputText
                            autoFocus
                            placeholder="Search employee..."
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
                            Check a department to select all employees in that
                            department. Manual selection is still available.
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-4">
                        {departments.map((dept) => {
                            const inputId = `dept_${dept}`;

                            return (
                                <div
                                    key={dept}
                                    className="flex items-center gap-2"
                                >
                                    <Checkbox
                                        inputId={inputId}
                                        checked={selectedDepartments.includes(
                                            dept
                                        )}
                                        onChange={() => toggleDepartment(dept)}
                                    />
                                    <label
                                        htmlFor={inputId}
                                        className="cursor-pointer text-sm"
                                    >
                                        {dept}
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        label="Select All"
                        onClick={selectAll}
                        type="button"
                    />
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
                    <Column
                        field="department_name"
                        header="Department"
                        sortable
                    />
                    <Column field="position_name" header="Position" sortable />
                    <Column field="agency_name" header="Agency" />
                </DataTable>
            </div>

            <div className="rounded-xl bg-white p-4 shadow">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="font-semibold">Generate Configuration</h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Choose the schedule period and how existing
                            assignments should be handled.
                        </p>
                    </div>

                    <Tag
                        value={
                            overwrite
                                ? "Overwrite Mode"
                                : "Missing Only Mode"
                        }
                        severity={overwrite ? "warning" : "success"}
                    />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">
                            Period From
                        </label>
                        <Calendar
                            value={periodFrom}
                            onChange={(e) => {
                                const newFrom = e.value as Date | null;
                                setPeriodFrom(newFrom);

                                if (
                                    newFrom &&
                                    periodTo &&
                                    dayjs(periodTo).isBefore(
                                        dayjs(newFrom),
                                        "day"
                                    )
                                ) {
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
                        <label className="text-xs text-gray-500">
                            Period To
                        </label>
                        <Calendar
                            value={periodTo}
                            onChange={(e) =>
                                setPeriodTo(e.value as Date | null)
                            }
                            showIcon
                            placeholder="Optional"
                            dateFormat="dd-mm-yy"
                            minDate={periodFrom ?? undefined}
                        />
                        <span className="text-[11px] text-gray-500">
                            Leave empty to generate until the end of the year.
                        </span>
                    </div>
                </div>

                {periodPreview && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-500">
                        <i className="pi pi-calendar text-gray-400" />
                        <span>
                            Generate schedule for period:{" "}
                            <span className="font-medium text-gray-700">
                                {periodPreview}
                            </span>
                        </span>
                    </div>
                )}

                <div className="mt-5">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            inputId="overwrite"
                            checked={overwrite}
                            onChange={(e) => setOverwrite(Boolean(e.checked))}
                        />
                        <label
                            htmlFor="overwrite"
                            className="cursor-pointer font-medium"
                        >
                            Overwrite Existing Assignments
                        </label>
                    </div>

                    <div className="ml-6 mt-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                                <span
                                    className={`pi ${overwrite
                                            ? "pi-exclamation-triangle text-amber-600"
                                            : "pi-check-circle text-emerald-600"
                                        } mt-1`}
                                />

                                <div className="text-sm leading-6">
                                    <p className="font-semibold text-slate-900">
                                        {overwrite
                                            ? "Regenerate unlocked RULE assignments"
                                            : "Generate missing dates only"}
                                    </p>

                                    <p className="text-slate-600">
                                        {overwrite
                                            ? "Existing unlocked assignments with source RULE will be updated using the latest employee shift rule."
                                            : "Existing assignments will be kept. The system will only create schedules for dates that do not have assignments yet."}
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="button"
                                label={
                                    showOverwriteInfo
                                        ? "Hide info"
                                        : "More info"
                                }
                                icon={
                                    showOverwriteInfo
                                        ? "pi pi-chevron-up"
                                        : "pi pi-chevron-down"
                                }
                                className="p-button-text p-button-sm self-start"
                                onClick={() =>
                                    setShowOverwriteInfo((prev) => !prev)
                                }
                            />
                        </div>

                        {showOverwriteInfo && (
                            <div className="mt-4 border-t border-slate-200 pt-4">
                                {!overwrite && (
                                    <div className="rounded-xl bg-white p-3 text-xs leading-6 text-slate-700">
                                        <p className="font-semibold text-slate-900">
                                            Missing only mode
                                        </p>
                                        <p>
                                            If a date already has an assignment,
                                            the system will skip that date.
                                        </p>
                                        <p>
                                            Use this for first-time generation
                                            or filling gaps.
                                        </p>
                                    </div>
                                )}

                                {overwrite && (
                                    <div className="rounded-xl bg-white p-3 text-xs leading-6 text-slate-700">
                                        <p className="font-semibold text-slate-900">
                                            Overwrite mode
                                        </p>
                                        <p>
                                            If a date already has assignment
                                            source RULE and is not locked, the
                                            system will update it based on the
                                            latest employee shift rule.
                                        </p>
                                        <p>
                                            Assignments with source MANUAL or
                                            locked status will stay unchanged.
                                        </p>
                                    </div>
                                )}
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
                    {periodPreview && (
                        <>
                            {" "}
                            ·{" "}
                            <span className="font-semibold text-gray-900">
                                {periodPreview}
                            </span>
                        </>
                    )}
                    <div className="mt-1 text-xs text-gray-500">
                        Mode:{" "}
                        <span className="font-semibold">
                            {overwrite
                                ? "Regenerate unlocked RULE assignments"
                                : "Generate missing dates only"}
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
                        label="Generate Schedule"
                        icon="pi pi-calendar-plus"
                        disabled={!isFormValid}
                        severity={overwrite ? "warning" : undefined}
                        onClick={handleGenerateConfirm}
                        type="button"
                    />
                </div>
            </div>
        </div>
    );
};

export default EmployeeShiftAssignmentGenerateForm;