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

    const { data: agencyData, error, isLoading } = useSWR<Agency[]>(`/api/agency?show_all=${isShowDeletedDataChecked}`, fetcher);

    if (isLoading) return <LoadingDataTable />;
    if (error) return <ErrorNotConnectedToApi mutateKey='/api/agency?show_all=true' />

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

    const onIngredientsChange = () => {
        setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
    }

    const handleSubmitNew = async (data: Agency) => {
        const res: ResponseType<ResponseTypeCreateSuccess> = await createAgency(data);
        setVisible(false);
        reset();
        mutate(`/api/agency?show_all=${isShowDeletedDataChecked}`);
        dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    }

    const handleUpdate = async (data: Agency) => {
        if (!selectedData) return;
        const res: ResponseType<ResponseTypeCreateSuccess> = await updateAgency(selectedData.id, selectedData.row_version, data);
        setVisible(false);
        mutate(`/api/agency?show_all=${isShowDeletedDataChecked}`);
        dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
        reset();
    }

    const handleDelete = async (data: Agency) => {
        const res: ResponseType<ResponseTypeCreateSuccess> = await deleteAgency(data.id, data.row_version);
        mutate(`/api/agency?show_all=${isShowDeletedDataChecked}`);
        dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    }

    const onSubmit = (data: Agency) => {
        if (!isValid) return;

        if (isAddNew) {
            handleSubmitNew(data);
            return;
        }

        if (selectedData) {
            handleUpdate(data);
        }
    };

    const activeColumnBody = (rowData: Agency) => {
        return rowData.is_active
            ? <Tag value="Active" severity="success" />
            : <Tag value="Inactive" severity="danger" />;
    };

    const actionColumnBody = (rowData: Agency) => {
        return (
            <div className="flex gap-2">
                <Button rounded severity='danger' icon="pi pi-trash" size="small" onClick={() => handleDelete(rowData)} />
                <Button rounded severity='help' icon="pi pi-pencil" size="small" onClick={() => {
                    setVisible(true);
                    setIsAddNew(false);
                    setPopupHeaderTitle('Update Agency');
                    reset(rowData);
                    setSelectedData(rowData);
                }} />
            </div>
        );
    };

    return (
        <>
            <ConfirmDialog />

            <Card className="shadow-lg rounded-2xl">
                <div className="p-4 flex flex-col gap-4">

                    {/* HEADER */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
                        <div>
                            <div className="text-2xl font-semibold">Agency</div>
                            <div className="text-sm text-gray-500">
                                Manage agency master data
                            </div>
                        </div>
                    </div>

                    {/* TOOLBAR */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button label="New" icon="pi pi-plus" size="small" onClick={() => { onClickNew() }} />

                            <div className="flex align-items-center">
                                <Checkbox inputId="showDeletedData" onChange={onIngredientsChange} checked={isShowDeletedDataChecked} />
                                <label htmlFor="showDeletedData" className="ml-2">Show deleted data</label>
                            </div>
                        </div>

                        <IconField iconPosition="left">
                            <InputIcon className="pi pi-search" />
                            <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
                        </IconField>
                    </div>

                    {/* TABLE */}
                    <DataTable
                        value={agencyData}
                        stripedRows
                        paginator
                        scrollable
                        scrollHeight="500px"
                        rows={10}
                        rowsPerPageOptions={[10, 25, 50]}
                        dataKey="id"
                        globalFilterFields={['name']}
                        filters={filters}
                        loading={isLoading}
                    >
                        <Column header="#" body={(data, options) => options.rowIndex + 1}></Column>
                        <Column field="code" header="Code"></Column>
                        <Column field="name" header="Name"></Column>
                        <Column field="address" header="Address"></Column>
                        <Column field="phone_number1" header="Phone 1"></Column>
                        <Column field="phone_number2" header="Phone 2"></Column>
                        <Column field="is_active" header="Active" body={activeColumnBody}></Column>
                        <Column header="Action" body={(rowData) => actionColumnBody(rowData)}></Column>
                    </DataTable>

                </div>
            </Card>

            {/* DIALOG */}
            <form onSubmit={handleSubmit((data) => onSubmit(data))}>
                <Dialog
                    header={popupHeaderTitle}
                    visible={visible}
                    style={{ width: '50vw' }}
                    onHide={() => { setVisible(false); reset(); }}
                    footer={footerContent}
                    onShow={() => setFocus('name')}
                >
                    <div className="flex flex-col gap-5">

                        <div className="flex flex-col gap-2">
                            <label>Code</label>
                            <Controller
                                name="code"
                                control={control}
                                rules={{ required: "*required" }}
                                render={({ field }) => (
                                    <InputText {...field} />
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label>Name</label>
                            <Controller
                                name="name"
                                control={control}
                                rules={{ required: "*required" }}
                                render={({ field }) => (
                                    <InputText {...field} />
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label>Address</label>
                            <Controller
                                name="address"
                                control={control}
                                render={({ field }) => (
                                    <InputTextarea {...field} rows={4} />
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label>Phone Number 1</label>
                            <Controller
                                name="phone_number1"
                                control={control}
                                render={({ field }) => (
                                    <InputText {...field} />
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label>Phone Number 2</label>
                            <Controller
                                name="phone_number2"
                                control={control}
                                render={({ field }) => (
                                    <InputText {...field} />
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-2">
                            <label>Active</label>
                            <Controller
                                name="is_active"
                                control={control}
                                render={({ field }) => (
                                    <InputSwitch checked={field.value} onChange={(e) => field.onChange(e.value)} />
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