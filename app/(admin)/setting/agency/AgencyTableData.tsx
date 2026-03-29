'use client'

import { Card } from 'primereact/card'
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Controller, useForm } from 'react-hook-form';
import CardTitle from '@/app/_components/CardTitle';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { InputSwitch } from 'primereact/inputswitch';
import { InputTextarea } from 'primereact/inputtextarea';
import { useState } from 'react';
import { Agency } from '@/app/types/agency';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import { createAgency, deleteAgency, purgeAgency, restoreAgency, updateAgency } from '@/app/services/agency-service';
import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Tag } from 'primereact/tag';
import { Checkbox } from 'primereact/checkbox';
import { RootState } from '@/store/store';
import { hasRole } from '@/app/utils/role-utils';


const AgencyTableData = () => {
    const dispatch = useDispatch();
    const profileState = useSelector((state: RootState) => state.profile);
    const [selectedData, setSelectedData] = useState<Agency | null>(null);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: '', matchMode: FilterMatchMode.CONTAINS },
    });
    const [isAddNew, setIsAddNew] = useState(false);
    const [visible, setVisible] = useState(false);
    const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
    const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors } = useForm<Agency>();
    const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const _filters = { ...filters };

        _filters['global'].value = value;

        setFilters(_filters);
        setGlobalFilterValue(value);
    };

    const onClickNew = () => {
        clearErrors();
        setIsAddNew(true);
        setVisible(true);
        setPopupHeaderTitle("New Agency");
        reset({
            id: 0,
            code: '',
            name: '',
            address: '',
            phone_number1: '',
            phone_number2: '',
            is_active: true,
            deleted_at: '',
            row_version: 0,
        });
    }

    const footerContent = (
        <div className='text-right flex gap-5 justify-end'>
            <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); }} className="p-button-text" />
            <Button type="submit" label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" />
        </div>
    );

    const { data: agencyData, error, isLoading } = useSWR<Agency[]>(`/api/agency?show_all=${isShowDeletedDataChecked}`, fetcher);

    if (isLoading) return <LoadingDataTable />;
    if (error) {
        return <ErrorNotConnectedToApi mutateKey='/api/agency?show_all=true' />
    }

    const onIngredientsChange = () => {
        setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
    }

    const handleSubmitNew = async (data: Agency) => {
        try {
            const res: ResponseType<ResponseTypeCreateSuccess> = await createAgency(data);
            setVisible(false);
            reset();
            mutate(`/api/agency?show_all=${isShowDeletedDataChecked}`);
            dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
            } else if (err instanceof Error) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
            }
        }
    }

    const handleUpdate = async (data: Agency) => {
        if (!selectedData) {
            dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
            return;
        }

        console.log(selectedData, 'woyhajdsaj')

        try {
            const res: ResponseType<ResponseTypeCreateSuccess> = await updateAgency(selectedData.id, selectedData.row_version, data)

            setVisible(false);
            mutate(`/api/agency?show_all=${isShowDeletedDataChecked}`);
            dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
            reset();
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
            } else if (err instanceof Error) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
            }
        }
    }

    const handleDelete = async (data: Agency) => {
        try {
            const res: ResponseType<ResponseTypeCreateSuccess> = await deleteAgency(data.id, data.row_version);
            setVisible(false);
            reset();
            mutate(`/api/agency?show_all=${isShowDeletedDataChecked}`);

            dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
            } else if (err instanceof Error) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
            }
        }
    }

    const handlePurge = async (data: Agency) => {
        try {
            const res: ResponseType<ResponseTypeCreateSuccess> = await purgeAgency(data.id);
            setVisible(false);
            reset();
            mutate(`/api/agency?show_all=${isShowDeletedDataChecked}`);

            dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
            } else if (err instanceof Error) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
            }
        }
    }

    const handleRestore = async (data: Agency) => {
        try {
            const res: ResponseType<ResponseTypeCreateSuccess> = await restoreAgency(data.id, data.row_version);
            setVisible(false);
            reset();
            mutate(`/api/agency?show_all=${isShowDeletedDataChecked}`);

            dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
            } else if (err instanceof Error) {
                dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
            }
        }
    }

    const onSubmit = (data: Agency) => {
        if (!isValid)
            return;

        if (isAddNew) {
            handleSubmitNew(data);
            return;
        }

        if (selectedData) {
            handleUpdate(data);
        }
    };

    const onClickUpdate = (data: Agency) => {
        setVisible(true);
        setIsAddNew(false);
        setPopupHeaderTitle('Update Agency');

        reset(data)
        setSelectedData(data);
    }


    const activeColumnBody = (rowData: Agency) => {
        return rowData.is_active ? (
            <Tag value="Active" severity="success" />
        ) : (
            <Tag value="Inactive" severity="danger" />
        );
    };


    const actionColumnBody = (rowData: Agency) => {
        return <>
            <div className="flex gap-2">
                {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

                {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

                {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

                <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { onClickUpdate(rowData) }} />
            </div>
        </>
    };

    const onClickDelete = (data: Agency) => {
        confirmDialog({
            message: 'Do you want to delete this record?',
            header: 'Delete Confirmation',
            icon: 'pi pi-info-circle',
            defaultFocus: 'accept',
            accept: () => {
                setSelectedData(data);
                handleDelete(data);
            },
            reject: () => { },
            footer: (options) => (
                <div className="flex gap-3 justify-end">
                    <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
                    <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
                </div>
            )
        });
    };

    const onClickRestore = (data: Agency) => {
        confirmDialog({
            message: 'Do you want to restore this record?',
            header: 'Restore Confirmation',
            icon: 'pi pi-info-circle',
            defaultFocus: 'accept',
            accept: () => {
                setSelectedData(data);
                handleRestore(data);
            },
            reject: () => { },
            footer: (options) => (
                <div className="flex gap-3 justify-end">
                    <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
                    <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-success" />
                </div>
            )
        });
    };

    const onClickPurge = (data: Agency) => {
        confirmDialog({
            message: 'Do you want to delete this record forever?',
            header: 'Delete Confirmation',
            icon: 'pi pi-info-circle',
            acceptClassName: "p-button-danger ml-3",
            defaultFocus: 'accept',
            accept: () => {
                handlePurge(data);
            },
            reject: () => { },
            footer: (options) => (
                <div className="flex gap-3 justify-end">
                    <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
                    <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
                </div>
            )
        });
    };

    // const textBodyTemplate = (rowData: Agency, field: keyof Agency) => {
    //     const value = rowData[field];
    //     return (
    //         <span
    //             className="ellipsis-text"
    //             data-pr-tooltip={typeof value === "string" ? value : ""}
    //             data-pr-position="top"
    //         >
    //             {value}
    //         </span>
    //     );
    // };

    return (
        <>
            <ConfirmDialog />

            <Card>
                <div className="p-4 flex flex-col gap-4">

                    {/* HEADER */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
                        <div>
                            <div className="text-2xl font-semibold">Agency</div>
                            <div className="text-sm text-gray-500">
                                Manage outsourcing and recruitment agencies
                            </div>
                        </div>

                        <div className="flex items-center gap-5">

                            <div className="flex align-items-center pl-5">
                                <Checkbox inputId="showDeletedData" name="showDeletedData" value="yes" onChange={onIngredientsChange} checked={isShowDeletedDataChecked} />
                                <label htmlFor="showDeletedData" className="ml-2">show deleted data</label>
                            </div>

                            <IconField iconPosition="left">
                                <InputIcon className="pi pi-search" />
                                <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
                            </IconField>

                            <Button label="New" icon="pi pi-plus" size="small" onClick={() => { onClickNew() }} />
                        </div>
                    </div>

                    {/* TABLE */}
                    <DataTable
                        value={agencyData}
                        tableStyle={{ minWidth: "50rem" }}
                        stripedRows
                        paginator
                        scrollable
                        scrollHeight="500px"
                        rows={10}
                        rowsPerPageOptions={[10, 25, 50]}
                        dataKey="id"
                        globalFilterFields={['name']}
                        emptyMessage="No agency found."
                        header={<></>}
                        filters={filters}
                        currentPageReportTemplate="{first} to {last} of {totalRecords}"
                        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                        loading={isLoading}
                    >
                        <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
                        <Column field="code" header="Code"></Column>
                        <Column field="name" header="Name"></Column>
                        <Column field="address" header="Address"></Column>
                        <Column field="phone_number1" header="Phone 1"></Column>
                        <Column field="phone_number2" header="Phone 2" ></Column>
                        <Column field="is_active" header="Active" body={activeColumnBody}></Column>
                        <Column headerClassName='bg-white' className='bg-white' header="Action" body={(rowData) => actionColumnBody(rowData)} frozen={true} alignFrozen="right"></Column>
                    </DataTable>

                </div>
            </Card>

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
                            <label htmlFor="code">Code</label>
                            <Controller
                                name="code"
                                control={control}
                                rules={{
                                    required: "*required",
                                    validate: (value) => !/\s/.test(value) || "must not contain spaces.",
                                    maxLength: { value: 50, message: 'maximum 50 character' }
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="code"
                                            placeholder='example: agency_abc'
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error"> {fieldState.error.message} </small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="name">Name</label>
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: "*required", maxLength: { value: 50, message: 'maximum 50 character' } }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="name"
                                            placeholder='example: agency abc'
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error"> {fieldState.error.message} </small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="address">Address</label>
                            <Controller
                                name="address"
                                control={control}
                                rules={{ required: "*required", maxLength: { value: 250, message: 'maximum 250 character' } }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputTextarea
                                            id="address" {...field} rows={5} cols={30}
                                            placeholder='example: Jl. Ir. H. Juanda no.105'
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error"> {fieldState.error.message} </small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="phone_number1">Phone Number 1</label>
                            <Controller
                                name="phone_number1"
                                control={control}
                                rules={{ required: "*required", maxLength: { value: 50, message: 'maximum 50 character' } }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="phone_number1"
                                            keyfilter="int"
                                            placeholder='example: 081245896547'
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error"> {fieldState.error.message} </small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="m-0 flex flex-col gap-2">
                            <label htmlFor="phone_number2">Phone Number 2</label>
                            <Controller
                                name="phone_number2"
                                control={control}
                                rules={{ maxLength: { value: 50, message: 'maximum 50 character' } }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="phone_number2"
                                            keyfilter="int"
                                            placeholder='example: 081245896547'
                                            {...field}
                                            className={fieldState.invalid ? "p-invalid" : ""}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold p-error"> {fieldState.error.message} </small>
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
                                        id="is_active" checked={field.value}
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

export default AgencyTableData

