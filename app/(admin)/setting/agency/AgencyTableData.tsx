"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

import { Agency } from "@/app/types/agency";
import {
    createAgency,
    deleteAgency,
    purgeAgency,
    restoreAgency,
    updateAgency,
} from "@/app/services/agency-service";
import { fetcher } from "@/app/utils/fetcher";
import { getErrorMessage, isResponseTypeError } from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";

import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

const emptyForm: Agency = {
    id: 0,
    code: "",
    name: "",
    address: "",
    phone_number1: "",
    phone_number2: "",
    is_active: true,
    deleted_at: null,
    row_version: 0,
};

const AgencyTableData = () => {
    const dispatch = useDispatch();

    const [selectedData, setSelectedData] = useState<Agency | null>(null);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: "", matchMode: FilterMatchMode.CONTAINS },
    });
    const [visible, setVisible] = useState(false);
    const [isAddNew, setIsAddNew] = useState(false);
    const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
    const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);

    const {
        control,
        handleSubmit,
        formState: { isValid },
        reset,
        clearErrors,
        setFocus,
    } = useForm<Agency>({
        defaultValues: emptyForm,
        mode: "onChange",
    });

    const agencyKey = `/api/agency?show_all=${isShowDeletedDataChecked}`;

    const { data, error, isLoading } = useSWR<Agency[]>(agencyKey, fetcher);

    const summary = useMemo(() => {
        const rows = data ?? [];
        return {
            total: rows.length,
            active: rows.filter((v) => !v.deleted_at && v.is_active).length,
            inactive: rows.filter((v) => !v.deleted_at && !v.is_active).length,
            deleted: rows.filter((v) => !!v.deleted_at).length,
        };
    }, [data]);

    const refreshList = async () => {
        await mutate(agencyKey);
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setGlobalFilterValue(value);
        setFilters({
            global: { value, matchMode: FilterMatchMode.CONTAINS },
        });
    };

    const onClickNew = () => {
        clearErrors();
        setSelectedData(null);
        setIsAddNew(true);
        setVisible(true);
        setPopupHeaderTitle("New Agency");
        reset(emptyForm);

        setTimeout(() => {
            setFocus("code");
        }, 0);
    };

    const onClickEdit = (data: Agency) => {
        setSelectedData(data);
        setIsAddNew(false);
        setVisible(true);
        setPopupHeaderTitle("Edit Agency");
        reset({
            ...data,
            deleted_at: data.deleted_at ?? null,
            phone_number2: data.phone_number2 ?? "",
        });
    };

    const closeDialog = () => {
        setVisible(false);
        setSelectedData(null);
        reset(emptyForm);
    };

    const handleSubmitNew = async (form: Agency) => {
        try {
            const res = await createAgency({
                ...form,
                code: form.code.trim(),
                name: form.name.trim(),
                address: form.address.trim(),
                phone_number1: form.phone_number1.trim(),
                phone_number2: form.phone_number2?.trim() || null,
            });

            closeDialog();
            await refreshList();

            dispatch(
                showToast({
                    visible: true,
                    severity: "success",
                    summary: "Success",
                    detail: res.message ?? "Agency created successfully",
                })
            );
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

    const handleUpdate = async (form: Agency) => {
        if (!selectedData) return;

        try {
            const res = await updateAgency(selectedData.id, selectedData.row_version, {
                ...form,
                code: form.code.trim(),
                name: form.name.trim(),
                address: form.address.trim(),
                phone_number1: form.phone_number1.trim(),
                phone_number2: form.phone_number2?.trim() || null,
            });

            closeDialog();
            await refreshList();

            dispatch(
                showToast({
                    visible: true,
                    severity: "success",
                    summary: "Success",
                    detail: res.message ?? "Agency updated successfully",
                })
            );
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

    const handleDelete = async (data: Agency) => {
        try {
            const res = await deleteAgency(data.id, data.row_version);
            await refreshList();

            dispatch(
                showToast({
                    visible: true,
                    severity: "success",
                    summary: "Success",
                    detail: res.message ?? "Agency deleted successfully",
                })
            );
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

    const handleRestore = async (data: Agency) => {
        try {
            const res = await restoreAgency(data.id, data.row_version);
            await refreshList();

            dispatch(
                showToast({
                    visible: true,
                    severity: "success",
                    summary: "Success",
                    detail: res.message ?? "Agency restored successfully",
                })
            );
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

    const handlePurge = async (data: Agency) => {
        try {
            const res = await purgeAgency(data.id);
            await refreshList();

            dispatch(
                showToast({
                    visible: true,
                    severity: "success",
                    summary: "Success",
                    detail: res.message ?? "Agency permanently deleted",
                })
            );
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

    const onSubmit = (form: Agency) => {
        if (!isValid) return;
        if (isAddNew) {
            void handleSubmitNew(form);
            return;
        }
        void handleUpdate(form);
    };

    const onClickDelete = (data: Agency) => {
        confirmDialog({
            message: "Do you want to delete this agency?",
            header: "Delete Confirmation",
            icon: "pi pi-info-circle",
            acceptClassName: "p-button-danger",
            accept: () => {
                void handleDelete(data);
            },
        });
    };

    const onClickRestore = (data: Agency) => {
        confirmDialog({
            message: "Do you want to restore this agency?",
            header: "Restore Confirmation",
            icon: "pi pi-info-circle",
            acceptClassName: "p-button-success",
            accept: () => {
                void handleRestore(data);
            },
        });
    };

    const onClickPurge = (data: Agency) => {
        confirmDialog({
            message: "Do you want to permanently delete this agency?",
            header: "Permanent Delete Confirmation",
            icon: "pi pi-exclamation-triangle",
            acceptClassName: "p-button-danger",
            accept: () => {
                void handlePurge(data);
            },
        });
    };

    const activeBodyTemplate = (rowData: Agency) => {
        return rowData.is_active ? (
            <Tag value="Active" severity="success" />
        ) : (
            <Tag value="Inactive" severity="warning" />
        );
    };

    const statusBodyTemplate = (rowData: Agency) => {
        return rowData.deleted_at ? (
            <Tag value="Deleted" severity="danger" />
        ) : (
            <Tag value="Normal" severity="info" />
        );
    };

    const actionColumnBody = (rowData: Agency) => {
        if (rowData.deleted_at) {
            return (
                <div className="flex gap-2">
                    <Button rounded severity="success" icon="pi pi-refresh" size="small" onClick={() => onClickRestore(rowData)} />
                    <Button rounded severity="secondary" icon="pi pi-times" size="small" onClick={() => onClickPurge(rowData)} />
                </div>
            );
        }

        return (
            <div className="flex gap-2">
                <Button rounded severity="help" icon="pi pi-pencil" size="small" onClick={() => onClickEdit(rowData)} />
                <Button rounded severity="danger" icon="pi pi-trash" size="small" onClick={() => onClickDelete(rowData)} />
            </div>
        );
    };

    if (isLoading) return <LoadingDataTable />;
    if (error) return <ErrorNotConnectedToApi mutateKey="/api/agency?show_all=true" />;

    return (
        <>
            <ConfirmDialog />

            <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Card className="shadow-sm"><div><p className="text-sm text-slate-500">Total</p><h3 className="text-2xl font-semibold">{summary.total}</h3></div></Card>
                    <Card className="shadow-sm"><div><p className="text-sm text-slate-500">Active</p><h3 className="text-2xl font-semibold">{summary.active}</h3></div></Card>
                    <Card className="shadow-sm"><div><p className="text-sm text-slate-500">Inactive</p><h3 className="text-2xl font-semibold">{summary.inactive}</h3></div></Card>
                    <Card className="shadow-sm"><div><p className="text-sm text-slate-500">Deleted</p><h3 className="text-2xl font-semibold">{summary.deleted}</h3></div></Card>
                </div>

                <Card className="shadow-sm">
                    <div className="flex flex-col gap-5">
                        <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                                <h1 className="text-2xl font-semibold">Agency</h1>
                                <p className="text-sm text-slate-500">Manage legal entity / vendor / employing company master.</p>
                            </div>

                            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                                    <Checkbox
                                        inputId="showDeletedAgency"
                                        checked={isShowDeletedDataChecked}
                                        onChange={() => setIsShowDeletedDataChecked((prev) => !prev)}
                                    />
                                    <label htmlFor="showDeletedAgency" className="text-sm">Show deleted data</label>
                                </div>

                                <IconField iconPosition="left">
                                    <InputIcon className="pi pi-search" />
                                    <InputText
                                        value={globalFilterValue}
                                        onChange={onGlobalFilterChange}
                                        placeholder="Search agency"
                                        className="w-full sm:w-72"
                                    />
                                </IconField>

                                <Button label="New Agency" icon="pi pi-plus" onClick={onClickNew} />
                            </div>
                        </div>

                        <DataTable
                            value={data ?? []}
                            stripedRows
                            paginator
                            rows={10}
                            rowsPerPageOptions={[10, 25, 50]}
                            dataKey="id"
                            filters={filters}
                            globalFilterFields={["code", "name", "address", "phone_number1", "phone_number2"]}
                            emptyMessage="No agency found."
                            loading={isLoading}
                            scrollable
                            tableStyle={{ minWidth: "72rem" }}
                        >
                            <Column header="#" body={(_, options) => options.rowIndex + 1} style={{ width: "4rem" }} />
                            <Column field="code" header="Code" style={{ minWidth: "10rem" }} />
                            <Column field="name" header="Name" style={{ minWidth: "14rem" }} />
                            <Column field="phone_number1" header="Primary Phone" style={{ minWidth: "12rem" }} />
                            <Column field="phone_number2" header="Secondary Phone" style={{ minWidth: "12rem" }} />
                            <Column field="address" header="Address" style={{ minWidth: "20rem" }} />
                            <Column header="Active" body={activeBodyTemplate} style={{ minWidth: "8rem" }} />
                            <Column header="Status" body={statusBodyTemplate} style={{ minWidth: "8rem" }} />
                            <Column
                                header="Action"
                                body={actionColumnBody}
                                frozen
                                alignFrozen="right"
                                style={{ minWidth: "10rem" }}
                            />
                        </DataTable>
                    </div>
                </Card>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Dialog
                    header={popupHeaderTitle}
                    visible={visible}
                    style={{ width: "56rem", maxWidth: "95vw" }}
                    onHide={closeDialog}
                    onShow={() => setTimeout(() => setFocus("code"), 0)}
                    breakpoints={{ "960px": "90vw", "640px": "96vw" }}
                    footer={
                        <div className="flex justify-end gap-2">
                            <Button type="button" label="Cancel" icon="pi pi-times" className="p-button-text" onClick={closeDialog} />
                            <Button type="submit" label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" disabled={!isValid} />
                        </div>
                    }
                >
                    <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
                        <Controller
                            name="code"
                            control={control}
                            rules={{ required: "Code is required" }}
                            render={({ field, fieldState }) => (
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Code</label>
                                    <InputText {...field} className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`} />
                                    {fieldState.error && <small className="p-error">{fieldState.error.message}</small>}
                                </div>
                            )}
                        />

                        <Controller
                            name="name"
                            control={control}
                            rules={{ required: "Name is required" }}
                            render={({ field, fieldState }) => (
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Name</label>
                                    <InputText {...field} className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`} />
                                    {fieldState.error && <small className="p-error">{fieldState.error.message}</small>}
                                </div>
                            )}
                        />

                        <Controller
                            name="phone_number1"
                            control={control}
                            rules={{ required: "Primary phone is required" }}
                            render={({ field, fieldState }) => (
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Primary Phone</label>
                                    <InputText {...field} className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`} />
                                    {fieldState.error && <small className="p-error">{fieldState.error.message}</small>}
                                </div>
                            )}
                        />

                        <Controller
                            name="phone_number2"
                            control={control}
                            render={({ field }) => (
                                <div>
                                    <label className="mb-2 block text-sm font-medium">Secondary Phone</label>
                                    <InputText {...field} className="w-full" />
                                </div>
                            )}
                        />

                        <Controller
                            name="address"
                            control={control}
                            rules={{ required: "Address is required" }}
                            render={({ field, fieldState }) => (
                                <div className="md:col-span-2">
                                    <label className="mb-2 block text-sm font-medium">Address</label>
                                    <InputTextarea {...field} rows={4} className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`} />
                                    {fieldState.error && <small className="p-error">{fieldState.error.message}</small>}
                                </div>
                            )}
                        />

                        <div className="md:col-span-2">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <Controller
                                    name="is_active"
                                    control={control}
                                    render={({ field }) => (
                                        <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                                            <div>
                                                <p className="text-sm font-semibold">Active</p>
                                                <p className="text-xs text-slate-500">Enable if this agency can be used by branch and employee employment.</p>
                                            </div>
                                            <InputSwitch checked={!!field.value} onChange={(e) => field.onChange(e.value)} />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </Dialog>
            </form>
        </>
    );
};

export default AgencyTableData;