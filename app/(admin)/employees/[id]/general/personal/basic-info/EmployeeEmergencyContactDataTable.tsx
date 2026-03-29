"use client";

import { useParams } from "next/navigation";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import React, { useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";

type EmployeeFamily = {
    id: number;
    employee_id: number;
    name: string;
    relationship_id: number;
    relationship_name?: string;
    phone: string;
};

type FormData = {
    employee_id: number;
    name: string;
    relationship: number;
    phone: string;
};

const EmployeeEmergencyContactDataTable = () => {
    const params = useParams();
    const id = params.id;

    const toast = useRef<Toast>(null!);
    const [data, setData] = useState<EmployeeFamily[]>([]);
    const [dataRelationship, setDataRelationship] = useState([]);
    const [isAddNew, setIsAddNew] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState({
        global: { value: "", matchMode: FilterMatchMode.CONTAINS },
    });
    const [visible, setVisible] = useState(false);
    const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
    const { handleSubmit, setFocus, control, reset, setValue } = useForm<FormData>();
    const [selectedId, setSelectedId] = useState(0);

    useEffect(() => {
        document.title = "Employee Emergency Contact";
        getDataRelationship();
        getData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const _filters = { ...filters };
        _filters["global"].value = value;
        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const getData = () => {
        setTableLoading(true);
        fetch(`http://localhost:3050/api/employees/${id}/emergency-contact-data`, { credentials: 'include' })
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setTableLoading(false);
            });
    };

    const getDataRelationship = () => {
        fetch("http://localhost:3050/relationship")
            .then((res) => res.json())
            .then((data) => setDataRelationship(data));
    };

    const onClickNew = () => {
        setIsAddNew(true);
        setVisible(true);
        setPopupHeaderTitle("New Data");
        reset();
    };

    const onClickUpdate = (rowData: EmployeeFamily) => {
        setVisible(true);
        setIsAddNew(false);
        setPopupHeaderTitle("Update Data");
        setSelectedId(rowData.id);
        setValue("name", rowData.name);
        setValue("relationship", rowData.relationship_id);
        setValue("phone", rowData.phone);
    };

    const actionColumnBody = (rowData: EmployeeFamily) => (
        <div className="flex justify-center gap-2">
            <Button
                rounded
                size="small"
                tooltip="Delete"
                tooltipOptions={{ appendTo: () => document.body, position: "top" }}
                severity="danger"
                icon="pi pi-trash"
                onClick={() => onClickDelete(rowData)}
            />
            <Button
                rounded
                size="small"
                tooltip="Update"
                tooltipOptions={{ appendTo: () => document.body, position: "top" }}
                severity="help"
                icon="pi pi-pencil"
                onClick={() => onClickUpdate(rowData)}
            />
        </div>
    );

    const handleSubmitDelete = async (id: number) => {
        try {
            const res = await fetch(`http://localhost:3050/api/employees/${id}/emergency-contact-data`, {
                credentials: 'include',
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
            getData();

            toast.current?.show({
                severity: "success",
                summary: "Success",
                detail: "Delete success",
                life: 3000,
            });
        } catch (err) {
            toast.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to delete data. " + err,
                life: 3000,
            });
        }
    };

    const handleSubmitNew = async (data: FormData) => {
        const newData: EmployeeFamily = {
            id: 0,
            employee_id: Number(id),
            name: data.name,
            relationship_id: data.relationship,
            phone: data.phone,
        };
        try {
            const res = await fetch(`http://localhost:3050/api/employees/${id}/emergency-contact-data`, {
                credentials: 'include',
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newData),
            });
            if (!res.ok) throw new Error();
            getData();
            toast.current?.show({ severity: "success", summary: "Success", detail: "Add success", life: 3000 });
            setVisible(false);
        } catch {
            toast.current?.show({ severity: "error", summary: "Error", detail: "Add failed", life: 3000 });
        }
    };

    const handleSubmitUpdate = async (data: FormData) => {
        const updatedData: EmployeeFamily = {
            id: selectedId,
            employee_id: Number(id),
            name: data.name,
            relationship_id: data.relationship,
            phone: data.phone,
        };
        try {
            const res = await fetch(`http://localhost:3050/api/employees/${id}/emergency-contact-data`, {
                credentials: 'include',
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData),
            });
            if (!res.ok) throw new Error();
            getData();
            toast.current?.show({ severity: "success", summary: "Success", detail: "update success", life: 3000 });
            setVisible(false);
        } catch {
            toast.current?.show({ severity: "error", summary: "Error", detail: "Update failed", life: 3000 });
        }
    };

    const onSubmit = (data: FormData) => (isAddNew ? handleSubmitNew(data) : handleSubmitUpdate(data));

    const onClickDelete = (data: EmployeeFamily) => {
        confirmDialog({
            message: "Do you want to delete this record?",
            header: "Delete Confirmation",
            icon: "pi pi-info-circle",
            defaultFocus: "reject",
            acceptLabel: "Yes, Delete",
            rejectLabel: "Cancel",
            rejectClassName: "p-button-text",
            acceptClassName: "p-button-danger ml-3",
            accept: () => handleSubmitDelete(data.id),
        });
    };

    const footerContent = (
        <div>
            <Button label="Cancel" icon="pi pi-times" onClick={() => setVisible(false)} className="p-button-text" />
            <Button label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" type="submit" />
        </div>
    );

    const getBody = () => document.body;

    return (
        <>
            <Toast ref={toast} position="top-center" />
            <ConfirmDialog />

            <div className="flex flex-col gap-5 p-3">
                <div className="flex items-center justify-between">
                    <Button label="New" icon="pi pi-plus" size="small" onClick={onClickNew} />
                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search" />
                        <InputText
                            className="p-inputtext-sm"
                            value={globalFilterValue}
                            onChange={onGlobalFilterChange}
                            placeholder="Keyword Search"
                        />
                    </IconField>
                </div>

                {/* ✅ Table now scrollable and frozen column works */}
                <DataTable
                    value={data}
                    stripedRows
                    paginator
                    rows={5}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="id"
                    globalFilterFields={["name"]}
                    emptyMessage="No data found."
                    filters={filters}
                    loading={tableLoading}
                    scrollable
                    scrollHeight="400px"
                    tableStyle={{ minWidth: "70rem" }}
                >
                    <Column
                        header="#"
                        body={(data, options) => options.rowIndex + 1}
                        frozen
                        alignFrozen="left"
                        style={{ width: "3rem" }}
                    />
                    <Column field="name" header="Name" />
                    <Column field="relationship_name" header="Relationship" />
                    <Column field="phone" header="Phone Number" />
                    <Column
                        header="Action"
                        body={actionColumnBody}
                        frozen
                        alignFrozen="right"
                        style={{ width: "120px", textAlign: "center", backgroundColor: "white" }}
                    />
                </DataTable>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Dialog
                    header={popupHeaderTitle}
                    visible={visible}
                    style={{ width: "40vw" }}
                    onHide={() => {
                        if (!visible) return;
                        setVisible(false);
                        reset();
                    }}
                    footer={footerContent}
                    onShow={() => setFocus("name")}
                >
                    <div className="flex flex-col gap-5">
                        {/* Name */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="name">Name</label>
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: "Name is required" }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText id="name" {...field} className={fieldState.invalid ? "p-invalid" : ""} />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        {/* Relationship */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="relationship">Relationship</label>
                            <Controller
                                name="relationship"
                                control={control}
                                rules={{ required: "Relationship is required" }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Dropdown
                                            id="relationship"
                                            appendTo={getBody}
                                            value={field.value}
                                            options={dataRelationship}
                                            onChange={(e) => field.onChange(e.value)}
                                            optionLabel="name"
                                            optionValue="id"
                                            placeholder="Select a relationship"
                                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        {/* Phone */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="phone">Phone Number</label>
                            <Controller
                                name="phone"
                                control={control}
                                rules={{ required: "Phone is required" }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText id="phone" {...field} className={fieldState.invalid ? "p-invalid" : ""} />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>
                    </div>
                </Dialog>
            </form>
        </>
    );
};

export default EmployeeEmergencyContactDataTable;
