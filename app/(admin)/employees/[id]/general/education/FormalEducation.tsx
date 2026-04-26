"use client";

import {
    createEmployeeEducation,
    deleteEmployeeEducation,
    getEmployeeEducation,
    updateEmployeeEducation,
} from "@/app/services/employee-general-service";
import {
    EmployeeEducationRow,
} from "@/app/types/employee-general";
import { getErrorMessage, isResponseTypeError } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

type FormData = {
    name: string;
    institution_name: string;
    major: string;
    degree: string;
    start_date: Date | null;
    end_date: Date | null;
    score: string;
    held_by: string;
    is_certificate: boolean;
    is_active: boolean;
};

type EmployeeEducationPayload = {
    name: string;
    institution_name: string;
    major: string;
    start_date: string;
    end_date?: string | null;
    score: string;
    is_certificate: boolean;
    held_by: string;
    degree: string;
    is_active: boolean;
};

const getBody = () => document.body;

const emptyFormValues: FormData = {
    name: "",
    institution_name: "",
    major: "",
    degree: "",
    start_date: null,
    end_date: null,
    score: "",
    held_by: "",
    is_certificate: false,
    is_active: true,
};

const fieldLabelClass = "mb-2 block text-sm font-medium text-slate-700";
const helperTextClass = "mt-1 text-xs text-slate-500";

const FormalEducation = () => {
    const dispatch = useDispatch();
    const params = useParams();
    const employeeId = Number(params.id);

    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [isAddMode, setIsAddMode] = useState(true);
    const [rows, setRows] = useState<EmployeeEducationRow[]>([]);
    const [selectedRow, setSelectedRow] = useState<EmployeeEducationRow | null>(null);

    const { control, handleSubmit, reset } = useForm<FormData>({
        defaultValues: emptyFormValues,
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await getEmployeeEducation(employeeId, "formal");
            setRows(result);
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
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadData();
    }, [employeeId]);

    const hideDialog = () => {
        setVisible(false);
        setSelectedRow(null);
        reset(emptyFormValues);
    };

    const openNew = () => {
        setIsAddMode(true);
        setSelectedRow(null);
        reset(emptyFormValues);
        setVisible(true);
    };

    const openEdit = (row: EmployeeEducationRow) => {
        setIsAddMode(false);
        setSelectedRow(row);

        reset({
            name: row.name,
            institution_name: row.institution_name,
            major: row.major,
            degree: row.degree,
            start_date: row.start_date ? dayjs(row.start_date).toDate() : null,
            end_date: row.end_date ? dayjs(row.end_date).toDate() : null,
            score: row.score,
            held_by: row.held_by,
            is_certificate: row.is_certificate,
            is_active: row.is_active,
        });

        setVisible(true);
    };

    const onSubmit = async (data: FormData) => {
        const payload: EmployeeEducationPayload = {
            name: data.name.trim(),
            institution_name: data.institution_name.trim(),
            major: data.major.trim(),
            degree: data.degree.trim(),
            start_date: data.start_date ? dayjs(data.start_date).format("YYYY-MM-DD") : "",
            end_date: data.end_date ? dayjs(data.end_date).format("YYYY-MM-DD") : null,
            score: data.score.trim(),
            held_by: data.held_by.trim(),
            is_certificate: data.is_certificate,
            is_active: data.is_active,
        };

        try {
            if (isAddMode) {
                await createEmployeeEducation(employeeId, "formal", payload);
            } else if (selectedRow) {
                await updateEmployeeEducation(
                    employeeId,
                    "formal",
                    selectedRow.id,
                    selectedRow.row_version,
                    payload
                );
            }

            dispatch(
                showToast({
                    visible: true,
                    severity: "success",
                    summary: "Success",
                    detail: isAddMode
                        ? "Formal education created successfully"
                        : "Formal education updated successfully",
                })
            );

            hideDialog();
            await loadData();
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

    const onDelete = (row: EmployeeEducationRow) => {
        confirmDialog({
            message: "Do you want to delete this formal education record?",
            header: "Delete Confirmation",
            icon: "pi pi-info-circle",
            acceptClassName: "p-button-danger",
            accept: async () => {
                try {
                    await deleteEmployeeEducation(
                        employeeId,
                        "formal",
                        row.id,
                        row.row_version
                    );
                    dispatch(
                        showToast({
                            visible: true,
                            severity: "success",
                            summary: "Success",
                            detail: "Formal education deleted successfully",
                        })
                    );
                    await loadData();
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
                    }
                }
            },
        });
    };

    const periodBodyTemplate = (row: EmployeeEducationRow) => {
        const start = row.start_date
            ? dayjs(row.start_date).format("DD MMM YYYY")
            : "-";
        const end = row.end_date ? dayjs(row.end_date).format("DD MMM YYYY") : "-";

        return `${start} - ${end}`;
    };

    const certificateBodyTemplate = (row: EmployeeEducationRow) => {
        return row.is_certificate ? (
            <Tag value="Yes" severity="info" />
        ) : (
            <Tag value="No" severity="secondary" />
        );
    };

    const activeBodyTemplate = (row: EmployeeEducationRow) => {
        return row.is_active ? (
            <Tag value="Active" severity="success" />
        ) : (
            <Tag value="Inactive" severity="secondary" />
        );
    };

    const actionBodyTemplate = (row: EmployeeEducationRow) => {
        return (
            <div className="flex items-center justify-center gap-2">
                <Button
                    type="button"
                    rounded
                    icon="pi pi-pencil"
                    severity="help"
                    onClick={() => openEdit(row)}
                    tooltip="Edit"
                    tooltipOptions={{ position: "top" }}
                />
                <Button
                    type="button"
                    rounded
                    icon="pi pi-trash"
                    severity="danger"
                    onClick={() => onDelete(row)}
                    tooltip="Delete"
                    tooltipOptions={{ position: "top" }}
                />
            </div>
        );
    };

    const dialogFooter = (
        <div className="flex justify-end gap-2">
            <Button
                type="button"
                label="Cancel"
                className="p-button-text"
                onClick={hideDialog}
            />
            <Button
                type="button"
                label={isAddMode ? "Save" : "Update"}
                icon="pi pi-check"
                onClick={() => void handleSubmit(onSubmit)()}
            />
        </div>
    );

    return (
        <>
            <ConfirmDialog />

            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <h5 className="text-xl font-semibold text-slate-900">
                            Formal Education
                        </h5>
                        <p className="mt-1 text-sm text-slate-500">
                            Manage school, diploma, bachelor, master, and other formal education records.
                        </p>
                    </div>

                    <Button
                        type="button"
                        label="New"
                        icon="pi pi-plus"
                        onClick={openNew}
                    />
                </div>

                <DataTable
                    value={rows}
                    dataKey="id"
                    loading={loading}
                    stripedRows
                    paginator
                    rows={5}
                    rowsPerPageOptions={[5, 10, 25]}
                    emptyMessage="No formal education found."
                    scrollable
                    className="text-sm"
                >
                    <Column
                        header="#"
                        body={(_, options) => options.rowIndex + 1}
                        style={{ width: "60px" }}
                    />
                    <Column field="degree" header="Degree" />
                    <Column field="name" header="Education Name" />
                    <Column field="institution_name" header="Institution" />
                    <Column field="major" header="Major" />
                    <Column
                        header="Period"
                        body={periodBodyTemplate}
                        style={{ minWidth: "180px" }}
                    />
                    <Column field="score" header="Score" />
                    <Column field="held_by" header="Held By" />
                    <Column
                        header="Certificate"
                        body={certificateBodyTemplate}
                        style={{ minWidth: "120px" }}
                    />
                    <Column
                        header="Active"
                        body={activeBodyTemplate}
                        style={{ minWidth: "110px" }}
                    />
                    <Column
                        header="Action"
                        body={actionBodyTemplate}
                        frozen
                        alignFrozen="right"
                        className="bg-white"
                        headerClassName="bg-white"
                        style={{ minWidth: "140px" }}
                    />
                </DataTable>
            </div>

            <Dialog
                header={isAddMode ? "New Formal Education" : "Update Formal Education"}
                visible={visible}
                style={{ width: "56rem", maxWidth: "95vw" }}
                onHide={hideDialog}
                footer={dialogFooter}
                breakpoints={{ "960px": "90vw", "640px": "96vw" }}
            >
                <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
                    <Controller
                        name="degree"
                        control={control}
                        rules={{ required: "Degree is required" }}
                        render={({ field, fieldState }) => (
                            <div>
                                <label htmlFor="formal_degree" className={fieldLabelClass}>
                                    Degree
                                </label>
                                <InputText
                                    id="formal_degree"
                                    {...field}
                                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                                    placeholder="Example: Bachelor, Diploma, Master"
                                />
                                {fieldState.error && (
                                    <small className="p-error">{fieldState.error.message}</small>
                                )}
                            </div>
                        )}
                    />

                    <Controller
                        name="name"
                        control={control}
                        rules={{ required: "Education name is required" }}
                        render={({ field, fieldState }) => (
                            <div>
                                <label htmlFor="formal_name" className={fieldLabelClass}>
                                    Education Name
                                </label>
                                <InputText
                                    id="formal_name"
                                    {...field}
                                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                                    placeholder="Example: Information Systems"
                                />
                                {fieldState.error && (
                                    <small className="p-error">{fieldState.error.message}</small>
                                )}
                            </div>
                        )}
                    />

                    <Controller
                        name="institution_name"
                        control={control}
                        rules={{ required: "Institution is required" }}
                        render={({ field, fieldState }) => (
                            <div>
                                <label htmlFor="formal_institution" className={fieldLabelClass}>
                                    Institution
                                </label>
                                <InputText
                                    id="formal_institution"
                                    {...field}
                                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                                    placeholder="Enter institution name"
                                />
                                {fieldState.error && (
                                    <small className="p-error">{fieldState.error.message}</small>
                                )}
                            </div>
                        )}
                    />

                    <Controller
                        name="major"
                        control={control}
                        rules={{ required: "Major is required" }}
                        render={({ field, fieldState }) => (
                            <div>
                                <label htmlFor="formal_major" className={fieldLabelClass}>
                                    Major
                                </label>
                                <InputText
                                    id="formal_major"
                                    {...field}
                                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                                    placeholder="Enter major"
                                />
                                {fieldState.error && (
                                    <small className="p-error">{fieldState.error.message}</small>
                                )}
                            </div>
                        )}
                    />

                    <Controller
                        name="start_date"
                        control={control}
                        rules={{ required: "Start date is required" }}
                        render={({ field, fieldState }) => (
                            <div>
                                <label htmlFor="formal_start_date" className={fieldLabelClass}>
                                    Start Date
                                </label>
                                <Calendar
                                    id="formal_start_date"
                                    appendTo={getBody}
                                    dateFormat="dd-mm-yy"
                                    showIcon
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.value)}
                                    className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                                />
                                {fieldState.error && (
                                    <small className="p-error">{fieldState.error.message}</small>
                                )}
                            </div>
                        )}
                    />

                    <Controller
                        name="end_date"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <label htmlFor="formal_end_date" className={fieldLabelClass}>
                                    End Date
                                </label>
                                <Calendar
                                    id="formal_end_date"
                                    appendTo={getBody}
                                    dateFormat="dd-mm-yy"
                                    showIcon
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.value)}
                                    className="w-full"
                                />
                            </div>
                        )}
                    />

                    <Controller
                        name="score"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <label htmlFor="formal_score" className={fieldLabelClass}>
                                    Score
                                </label>
                                <InputText
                                    id="formal_score"
                                    {...field}
                                    className="w-full"
                                    placeholder="Example: 3.80 / A / Excellent"
                                />
                            </div>
                        )}
                    />

                    <Controller
                        name="held_by"
                        control={control}
                        render={({ field }) => (
                            <div>
                                <label htmlFor="formal_held_by" className={fieldLabelClass}>
                                    Held By
                                </label>
                                <InputText
                                    id="formal_held_by"
                                    {...field}
                                    className="w-full"
                                    placeholder="Example: University / Institution"
                                />
                            </div>
                        )}
                    />

                    <div className="md:col-span-2">
                        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                            <Controller
                                name="is_certificate"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                Certificate Available
                                            </p>
                                            <p className={helperTextClass}>
                                                Enable this if certificate or supporting document is available.
                                            </p>
                                        </div>
                                        <InputSwitch
                                            checked={!!field.value}
                                            onChange={(e) => field.onChange(e.value)}
                                        />
                                    </div>
                                )}
                            />

                            <Controller
                                name="is_active"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                Active
                                            </p>
                                            <p className={helperTextClass}>
                                                Control whether this education record is still active.
                                            </p>
                                        </div>
                                        <InputSwitch
                                            checked={!!field.value}
                                            onChange={(e) => field.onChange(e.value)}
                                        />
                                    </div>
                                )}
                            />
                        </div>
                    </div>
                </div>
            </Dialog>
        </>
    );
};

export default FormalEducation;