"use client"

import dayjs from 'dayjs'
import { useParams } from 'next/navigation'
import { FilterMatchMode } from 'primereact/api'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { Checkbox } from 'primereact/checkbox'
import { Column } from 'primereact/column'
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog'
import { DataTable } from 'primereact/datatable'
import { Dialog } from 'primereact/dialog'
import { IconField } from 'primereact/iconfield'
import { InputIcon } from 'primereact/inputicon'
import { InputNumber } from 'primereact/inputnumber'
import { InputSwitch } from 'primereact/inputswitch'
import { InputText } from 'primereact/inputtext'
import { Toast } from 'primereact/toast'
import React, { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'

export type InformalEducationType = {
    id: number;
    employee_id: number;
    name: string;
    institution_name: string;
    major: string
    start_date: string
    end_date: string;
    score: string;
    is_formal: boolean;
    is_certificate: boolean;
    held_by: string;
    is_active: boolean;
    degree: string;
}

type FormData = {
    employee_id: string;
    name: string;
    institution_name: string;
    major: string
    start_date: string
    end_date: string;
    score: string;
    is_formal: boolean;
    is_certificate: boolean;
    held_by: string;
    is_active: boolean;
    degree: string;
};

const EmployeeInformalEducationDataTable = () => {
    const params = useParams();
    const id = params.id;

    const toast = useRef<Toast>(null!);
    const [data, setData] = useState([]);
    const [isAddNew, setIsAddNew] = useState(false);
    const [tableLoading, setTableLoading] = useState(false);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: '', matchMode: FilterMatchMode.CONTAINS },
    });
    const [visible, setVisible] = useState(false);
    const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
    const { handleSubmit, setFocus, control, reset, setValue } = useForm<FormData>()
    const [selectedId, setSelectedId] = useState(0);

    useEffect(() => {
        document.title = 'Employee Informal Education';

        getData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const _filters = { ...filters };

        _filters['global'].value = value;

        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const getData = () => {
        setTableLoading(true);
        setData([])

        fetch(`http://localhost:3050/api/employees/${id}/education-data/informal`, {
            method: "GET",
            credentials: 'include',
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setData(data);
                setTableLoading(false);
            });
    };

    const renderTableHeader = () => {
        return (
            <></>
        );
    };
    const header = renderTableHeader();

    const onClickNew = () => {
        setIsAddNew(true);
        setVisible(true);
        setPopupHeaderTitle("New Data");
    }

    const footerContent = (
        <div>
            <Button label="Cancel" icon="pi pi-times" onClick={() => setVisible(false)} className="p-button-text" />
            <Button label={isAddNew ? 'Submit' : 'Save'} icon="pi pi-check" type='submit' />
        </div>
    );

    const onClickUpdate = (rowData: InformalEducationType) => {
        setVisible(true);
        setIsAddNew(false);
        setPopupHeaderTitle('Update Data');

        setSelectedId(rowData.id);
        setValue('name', rowData.name)
        setValue('institution_name', rowData.institution_name)
        setValue('major', rowData.major)
        setValue('start_date', rowData.start_date)
        setValue('end_date', rowData.end_date)
        setValue('score', rowData.score)
        setValue('is_formal', rowData.is_formal)
        setValue('is_certificate', rowData.is_certificate)
        setValue('held_by', rowData.held_by)
        setValue('degree', rowData.degree)
        setValue('is_active', rowData.is_active)
    }

    const actionColumnBody = (rowData: InformalEducationType) => (
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
        setSelectedId(id);

        try {
            const res = await fetch(`http://localhost:3050/api/employees/${id}/education-data/informal`, {
                method: "DELETE",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: id }),
            });

            if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
            const data_res = await res.json();
            console.log('Deleted:', data_res);

            setVisible(false);
            reset();
            getData();

            toast.current?.show({ severity: 'success', summary: 'success', detail: 'delete success', life: 3000 });

        } catch (err: unknown) {

            toast.current?.show({ severity: 'error', summary: 'error', detail: 'Failed to delete the form. Please try again later' + err, life: 3000 });

        }
    }

    const handleSubmitNew = async (data: FormData) => {
        const newData: InformalEducationType = {
            id: 0,
            employee_id: Number(id),
            name: data.name,
            institution_name: data.institution_name,
            major: data.major,
            start_date: dayjs(data.start_date).format("YYYY-MM-DD"),
            end_date: dayjs(data.end_date).format("YYYY-MM-DD"),
            score: String(data.score),
            is_formal: false,
            is_certificate: data.is_certificate,
            held_by: data.held_by,
            is_active: data.is_active,
            degree: data.degree
        }

        try {

            const res = await fetch(`http://localhost:3050/api/employees/${id}/education-data/informal`, {
                method: "POST",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newData),
            });

            if (!res.ok) {
                throw new Error(`HTTP error! Status: ${res.status}`);
            }

            setVisible(false);
            reset();
            getData();

            toast.current?.show({ severity: 'success', summary: 'success', detail: 'add success', life: 3000 });

        } catch (err: unknown) {

            toast.current?.show({ severity: 'error', summary: 'error', detail: 'Failed to submit the form. Please try again later' + err, life: 3000 });

        }
    }

    const handleSubmitUpdate = async (data: FormData) => {

        const updatedData: InformalEducationType = {
            id: selectedId,
            employee_id: Number(id),
            name: data.name,
            institution_name: data.institution_name,
            major: data.major,
            start_date: dayjs(data.start_date).format("YYYY-MM-DD"),
            end_date: dayjs(data.end_date).format("YYYY-MM-DD"),
            score: String(data.score),
            is_formal: data.is_formal,
            is_certificate: data.is_certificate,
            held_by: data.held_by,
            is_active: data.is_active,
            degree: data.degree
        }

        try {

            const res = await fetch(`http://localhost:3050/api/employees/${id}/education-data/informal`, {
                method: "PUT",
                credentials: 'include',
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedData),
            });

            if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
            const data_res = await res.json();
            console.log('Updated:', data_res);

            setVisible(false);
            reset();
            getData();

            toast.current?.show({ severity: 'success', summary: 'success', detail: 'update success', life: 3000 });

        } catch (err: unknown) {

            toast.current?.show({ severity: 'error', summary: 'error', detail: 'Failed to update the form. Please try again later' + err, life: 3000 });

        }
    }

    const onSubmit = (data: FormData) => {
        console.log(data, 'hjasda');

        if (isAddNew) {
            handleSubmitNew(data);
            return;
        }

        handleSubmitUpdate(data);
    };

    const onClickDelete = (data: InformalEducationType) => {
        confirmDialog({
            message: 'Do you want to delete this record?',
            header: 'Delete Confirmation',
            icon: 'pi pi-info-circle',
            defaultFocus: 'reject',
            acceptClassName: "p-button-danger ml-3",
            accept: () => {
                handleSubmitDelete(data.id);
            },
            reject: () => { },
        });
    };

    return (
        <>
            <Toast ref={toast} position="top-center" />
            <ConfirmDialog />
            <div className="flex flex-col gap-5 p-3">
                <div className="flex items-center justify-between">
                    <Button label="New" icon="pi pi-plus" size="small" onClick={() => { onClickNew() }} />

                    <IconField iconPosition="left">
                        <InputIcon className="pi pi-search" />
                        <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
                    </IconField>
                </div>

                <DataTable
                    value={data}
                    tableStyle={{ minWidth: "50rem" }}
                    stripedRows
                    paginator
                    rows={5}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    dataKey="id"
                    globalFilterFields={['name']}
                    emptyMessage="No data found."
                    header={header}
                    filters={filters}
                    scrollable
                    currentPageReportTemplate="{first} to {last} of {totalRecords}"
                    paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                    loading={tableLoading}
                >
                    <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
                    <Column field="name" header="Name"></Column>
                    <Column field="institution_name" header="Institution Name"></Column>
                    <Column field="major" header="Major"></Column>
                    <Column field="start_date" header="Start Date"></Column>
                    <Column field="end_date" header="End Date"></Column>
                    <Column field="score" header="Score"></Column>
                    <Column field="is_certificate" header="Certificate"></Column>
                    <Column field="held_by" header="Held By"></Column>
                    <Column header="Action" body={(rowData) => actionColumnBody(rowData)} frozen={true} alignFrozen='right' style={{ width: "120px", textAlign: "center", backgroundColor: "white" }}></Column>
                </DataTable>
            </div>

            <form onSubmit={handleSubmit((data) => onSubmit(data))}>
                <Dialog
                    header={popupHeaderTitle}
                    visible={visible}
                    style={{ width: '50vw' }}
                    onHide={() => { if (!visible) return; setVisible(false); reset(); }}
                    footer={footerContent}
                    onShow={() => {
                        setFocus('name');
                    }}
                >
                    <div className="flex flex-col gap-5">
                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="name">Name</label>
                            <Controller
                                name="name"
                                defaultValue=''
                                control={control}
                                rules={{
                                    required: "name is required",
                                    maxLength: { value: 50, message: "maximum 50 character" }
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="name"
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="institution_name">Institution Name</label>
                            <Controller
                                name="institution_name"
                                defaultValue=''
                                control={control}
                                rules={{
                                    required: "institution name is required",
                                    maxLength: { value: 50, message: "maximum 50 character" }
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="institution_name"
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="major">Major</label>
                            <Controller
                                name="major"
                                defaultValue=''
                                control={control}
                                rules={{
                                    required: "major is required",
                                    maxLength: { value: 50, message: "maximum 50 character" }
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="major"
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="major">Degree</label>
                            <Controller
                                name="degree"
                                defaultValue=''
                                control={control}
                                rules={{
                                    required: "degree is required",
                                    maxLength: { value: 50, message: "maximum 50 character" }
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="degree"
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="score">Score</label>
                            <Controller
                                name="score"
                                control={control}
                                rules={{ required: "score is required" }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputNumber id="score" inputId="minmaxfraction" value={Number(field.value ? field.value : 0)} onValueChange={(e) => field.onChange(e.value)} maxFractionDigits={2} />
                                        {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="start_date">Period</label>
                            <div className="w-full flex flex-row gap-5">
                                <Controller
                                    name="start_date"
                                    defaultValue=""
                                    control={control}
                                    rules={{
                                        required: "start date is required",
                                    }}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Calendar
                                                id="exp_date"
                                                dateFormat='dd-mm-yy'
                                                showIcon
                                                appendTo={() => document.body}
                                                {...field}
                                                value={field.value ? dayjs(field.value, "DD-MM-YYYY").toDate() : null}
                                                onChange={(e) => field.onChange(e.value)}
                                                className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                                            />
                                            {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                                        </>
                                    )}
                                />

                                <Controller
                                    name="end_date"
                                    defaultValue=""
                                    control={control}
                                    rules={{
                                        required: "end date is required",
                                    }}
                                    render={({ field, fieldState }) => (
                                        <>
                                            <Calendar
                                                id="end_date"
                                                dateFormat='dd-mm-yy'
                                                showIcon
                                                appendTo={() => document.body}
                                                {...field}
                                                value={field.value ? dayjs(field.value, "DD-MM-YYYY").toDate() : null}
                                                onChange={(e) => field.onChange(e.value)}
                                                className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                                            />
                                            {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                                        </>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="m-0 flex flex-row gap-2 items-center">
                            <Controller
                                name="is_certificate"
                                control={control}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Checkbox
                                            inputId="is_certificate"
                                            onChange={(e) => field.onChange(e.checked)}
                                            checked={field.value}
                                        />
                                        {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                                    </>
                                )}
                            />
                            <label htmlFor="is_certificate">Have Certificate</label>
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="held_by">Held By</label>
                            <Controller
                                name="held_by"
                                defaultValue=''
                                control={control}
                                rules={{
                                    required: "held by is required",
                                    maxLength: { value: 50, message: "maximum 50 character" }
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="held_by"
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error">{fieldState.error.message}</small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="is_active">Active</label>
                            <Controller
                                name="is_active"
                                control={control}
                                defaultValue={true}
                                render={({ field }) => (
                                    <InputSwitch
                                        id="is_active"
                                        checked={field.value}
                                        onChange={(e) => field.onChange(e.value)}
                                    />
                                )}
                            />
                        </div>

                    </div>
                </Dialog>
            </form>
        </>
    )
}

export default EmployeeInformalEducationDataTable