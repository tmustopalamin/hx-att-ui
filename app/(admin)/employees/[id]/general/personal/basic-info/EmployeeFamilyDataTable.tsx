"use client";

import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
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
    dob: string;
    marital_status: string;
    gender_id: number;
    job: string;
    phone1: string;
    phone2: string;
    relationship_name?: string;
    marital_name?: string;
    gender_name?: string;
};

type FormData = {
    employee_id: number;
    name: string;
    relationship: number;
    dob: string;
    marital_status: string;
    gender: number;
    job: string;
    phone1: string;
    phone2: string;
};

const EmployeeFamilyDataTable = () => {
    const params = useParams();
    const id = params.id;

    const toast = useRef<Toast>(null!);
    const [data, setData] = useState<EmployeeFamily[]>([]);
    const [dataRelationship, setDataRelationship] = useState([]);
    const [dataGender, setDataGender] = useState([]);
    const [dataMarital, setDataMarital] = useState([]);
    const [isAddNew, setIsAddNew] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filter, setFilter] = useState({
        global: { value: "", matchMode: FilterMatchMode.CONTAINS },
    });
    const [visible, setVisible] = useState(false);
    const [popupHeaderTitle, setPopupHeaderTitle] = useState("");
    const { handleSubmit, setFocus, control, reset, setValue } = useForm<FormData>();
    const [selectedId, setSelectedId] = useState(0);

    useEffect(() => {
        document.title = "Family Data";
        getDataRelationship();
        getDataGender();
        getDataMarital();
        getData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const _filters = { ...filter };
        _filters["global"].value = value;
        setFilter(_filters);
        setGlobalFilterValue(value);
    };

    const getData = () => {
        setTableLoading(true);
        fetch(`http://localhost:3050/employees/${id}/family-data`)
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

    const getDataGender = () => {
        fetch("http://localhost:3050/gender")
            .then((res) => res.json())
            .then((data) => setDataGender(data));
    };

    const getDataMarital = () => {
        fetch("http://localhost:3050/marital")
            .then((res) => res.json())
            .then((data) => setDataMarital(data));
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
        setValue("dob", dayjs(rowData.dob).format("DD-MM-YYYY"));
        setValue("marital_status", rowData.marital_status);
        setValue("gender", rowData.gender_id);
        setValue("job", rowData.job);
        setValue("phone1", rowData.phone1);
        setValue("phone2", rowData.phone2);
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

    const onClickDelete = (data: EmployeeFamily) => {
        confirmDialog({
            message: "Do you want to delete this record?",
            header: "Delete Confirmation",
            icon: "pi pi-info-circle",
            defaultFocus: "reject",
            acceptClassName: "p-button-danger ml-3",
            accept: () => handleSubmitDelete(data.id),
        });
    };

    const handleSubmitDelete = async (id: number) => {
        try {
            const res = await fetch(`http://localhost:3050/employees/${id}/family-data`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
            getData();
            toast.current?.show({ severity: "success", summary: "Success", detail: "delete success", life: 3000 });
        } catch (err) {
            toast.current?.show({
                severity: "error",
                summary: "Error",
                detail: "Failed to delete the record.",
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
            dob: dayjs(data.dob).format("YYYY-MM-DD"),
            marital_status: data.marital_status,
            gender_id: data.gender,
            job: data.job,
            phone1: data.phone1,
            phone2: data.phone2,
        };
        try {
            const res = await fetch(`http://localhost:3050/employees/${id}/family-data`, {
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
        const updatedData = {
            id: selectedId,
            employee_id: Number(id),
            name: data.name,
            relationship_id: data.relationship,
            dob: dayjs(data.dob).format("YYYY-MM-DD"),
            marital_status: data.marital_status,
            gender_id: data.gender,
            job: data.job,
            phone1: data.phone1,
            phone2: data.phone2,
        };
        try {
            const res = await fetch(`http://localhost:3050/employees/${id}/family-data`, {
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

    const footerContent = (
        <div>
            <Button label="Cancel" icon="pi pi-times" onClick={() => setVisible(false)} className="p-button-text" />
            <Button label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" type="submit" />
        </div>
    );

    const getBody = () => document.body;

    const renderTableHeader = () => {
        return (
            <></>
        );
    };
    const header = renderTableHeader();

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

                {/* ✅ DataTable Section */}
                <DataTable
                    value={data}
                    stripedRows
                    paginator
                    rows={5}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="id"
                    globalFilterFields={["name"]}
                    emptyMessage="No data found."
                    filters={filter}
                    loading={tableLoading}
                    scrollable
                    header={header}
                    scrollHeight="400px"
                    tableStyle={{ minWidth: "80rem" }}
                    currentPageReportTemplate="{first} to {last} of {totalRecords}"
                    paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
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
                    <Column field="dob" header="Birthday" />
                    <Column field="marital_name" header="Marital Status" />
                    <Column field="gender_name" header="Gender" />
                    <Column field="job" header="Job" />
                    <Column field="phone1" header="Phone Number 1" />
                    <Column field="phone2" header="Phone Number 2" />
                    <Column
                        header="Action"
                        body={actionColumnBody}
                        frozen
                        alignFrozen="right"
                        style={{ width: "120px", textAlign: "center", backgroundColor: "white" }}
                    />
                </DataTable>
            </div>

            {/* ✅ Dialog Form Section */}
            <form onSubmit={handleSubmit(onSubmit)}>
                <Dialog
                    header={popupHeaderTitle}
                    visible={visible}
                    style={{ width: "50vw" }}
                    onHide={() => {
                        if (!visible) return;
                        setVisible(false);
                        reset();
                    }}
                    footer={footerContent}
                    onShow={() => setFocus("name")}
                >
                    <div className="flex flex-col gap-5">
                        {/* --- Name --- */}
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

                        {/* --- Relationship --- */}
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

                        {/* --- DOB --- */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="dob">Date Of Birth</label>
                            <Controller
                                name="dob"
                                control={control}
                                rules={{ required: "Birth Date is required" }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Calendar
                                            id="dob"
                                            dateFormat="dd-mm-yy"
                                            showIcon
                                            appendTo={() => document.body}
                                            {...field}
                                            value={field.value ? dayjs(field.value, "DD-MM-YYYY").toDate() : null}
                                            onChange={(e) => field.onChange(e.value)}
                                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        {/* --- Marital --- */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="marital_status">Marital Status</label>
                            <Controller
                                name="marital_status"
                                control={control}
                                rules={{ required: "Marital Status is required" }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Dropdown
                                            id="marital_status"
                                            appendTo={getBody}
                                            value={field.value}
                                            options={dataMarital}
                                            onChange={(e) => field.onChange(e.value)}
                                            optionLabel="name"
                                            optionValue="id"
                                            placeholder="Select marital status"
                                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        {/* --- Gender --- */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="gender">Gender</label>
                            <Controller
                                name="gender"
                                control={control}
                                rules={{ required: "Gender is required" }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Dropdown
                                            id="gender"
                                            appendTo={getBody}
                                            value={field.value}
                                            options={dataGender}
                                            onChange={(e) => field.onChange(e.value)}
                                            optionLabel="name"
                                            optionValue="id"
                                            placeholder="Select gender"
                                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        {/* --- Job --- */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="job">Job</label>
                            <Controller
                                name="job"
                                control={control}
                                render={({ field }) => (
                                    <InputText id="job" {...field} placeholder="Enter job" className="w-full" />
                                )}
                            />
                        </div>

                        {/* --- Phone --- */}
                        <div className="flex flex-col gap-2">
                            <label htmlFor="phone1">Phone 1</label>
                            <Controller
                                name="phone1"
                                control={control}
                                render={({ field }) => (
                                    <InputText id="phone1" {...field} placeholder="Enter phone 1" className="w-full" />
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="phone2">Phone 2</label>
                            <Controller
                                name="phone2"
                                control={control}
                                render={({ field }) => (
                                    <InputText id="phone2" {...field} placeholder="Enter phone 2" className="w-full" />
                                )}
                            />
                        </div>
                    </div>
                </Dialog>
            </form>
        </>
    );
};

export default EmployeeFamilyDataTable;
