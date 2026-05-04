'use client';

import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import dayjs from 'dayjs';

import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Checkbox } from 'primereact/checkbox';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { Dropdown } from 'primereact/dropdown';

import { useDispatch, useSelector } from 'react-redux';

import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { fetcher } from '@/app/utils/fetcher';
import { getErrorMessage, isResponseTypeError } from '@/app/utils/error-messages';
import { hasRole } from '@/app/utils/role-utils';

import { RootState } from '@/store/store';
import { showToast } from '@/store/ToastSlice';

import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import {
    OvertimeRequest,
    OvertimeRequestForm,
    defaultOvertimeRequestFormValue,
} from '@/app/types/overtime-request';

import {
    createOvertimeRequest,
    deleteOvertimeRequest,
    purgeOvertimeRequest,
    restoreOvertimeRequest,
    updateOvertimeRequest,
} from '@/app/services/overtime-request-service';

type TimeOption = {
    label: string;
    value: string;
};

const getBody = () => document.body;

const buildTimeOptions = (stepMinutes = 15): TimeOption[] => {
    const options: TimeOption[] = [];

    for (let minuteOfDay = 0; minuteOfDay < 24 * 60; minuteOfDay += stepMinutes) {
        const hour = Math.floor(minuteOfDay / 60);
        const minute = minuteOfDay % 60;

        const value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(
            2,
            '0'
        )}`;

        options.push({
            label: value,
            value,
        });
    }

    return options;
};

const toTimeValue = (value?: string | null) => {
    if (!value) {
        return null;
    }

    return dayjs(value).format('HH:mm');
};

const combineDateAndTime = (
    date: Date | null,
    time: string | null
): Date | null => {
    if (!date || !time) {
        return null;
    }

    const [hourText, minuteText] = time.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        return null;
    }

    return dayjs(date)
        .hour(hour)
        .minute(minute)
        .second(0)
        .millisecond(0)
        .toDate();
};

const formatSeconds = (seconds?: number | null) => {
    const totalSeconds = Number(seconds ?? 0);

    if (totalSeconds <= 0) {
        return '0h 0m';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours}h ${minutes}m`;
};

const formatTime = (value?: string | null) => {
    if (!value) {
        return '-';
    }

    return dayjs(value).format('HH:mm');
};

const formatDate = (value?: string | null) => {
    if (!value) {
        return '-';
    }

    return dayjs(value).format('DD MMM YYYY');
};

const formatDateTime = (value?: string | null) => {
    if (!value) {
        return '-';
    }

    return dayjs(value).format('DD MMM YYYY HH:mm');
};

const OvertimeRequestTableData = () => {
    const dispatch = useDispatch();
    const profileState = useSelector((state: RootState) => state.profile);

    const [selectedData, setSelectedData] = useState<OvertimeRequest | null>(null);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [isAddNew, setIsAddNew] = useState(false);
    const [visible, setVisible] = useState(false);
    const [popupHeaderTitle, setPopupHeaderTitle] = useState('New Overtime Request');
    const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const timeOptions = useMemo(() => buildTimeOptions(15), []);
    const currentKey = `/api/overtime-request?show_all=${isShowDeletedDataChecked}`;

    const {
        control,
        handleSubmit,
        setFocus,
        reset,
        clearErrors,
        watch,
        formState: { isValid },
    } = useForm<OvertimeRequestForm>({
        defaultValues: defaultOvertimeRequestFormValue,
        mode: 'onTouched',
    });

    const overtimeDate = watch('overtime_date');
    const requestedStartTime = watch('requested_start_time');
    const requestedEndTime = watch('requested_end_time');

    const previewStartAt = useMemo(() => {
        return combineDateAndTime(overtimeDate, requestedStartTime);
    }, [overtimeDate, requestedStartTime]);

    const previewEndAt = useMemo(() => {
        return combineDateAndTime(overtimeDate, requestedEndTime);
    }, [overtimeDate, requestedEndTime]);

    const previewSeconds = useMemo(() => {
        if (!previewStartAt || !previewEndAt) {
            return 0;
        }

        const diff = dayjs(previewEndAt).diff(previewStartAt, 'second');

        return diff > 0 ? diff : 0;
    }, [previewStartAt, previewEndAt]);

    const [filters, setFilters] = useState({
        global: { value: '', matchMode: FilterMatchMode.CONTAINS },
    });

    const {
        data: overtimeRequestData,
        error,
        isLoading,
    } = useSWR<OvertimeRequest[]>(currentKey, fetcher);

    const rows = overtimeRequestData ?? [];

    const requestSummary = useMemo(() => {
        const activeRows = rows.filter((item) => !item.deleted_at);

        const pending = activeRows.filter(
            (item) => item.status?.toUpperCase() === 'PENDING'
        ).length;

        const approved = activeRows.filter(
            (item) => item.status?.toUpperCase() === 'APPROVED'
        ).length;

        const rejected = activeRows.filter(
            (item) => item.status?.toUpperCase() === 'REJECTED'
        ).length;

        const totalApprovedSeconds = activeRows
            .filter((item) => item.status?.toUpperCase() === 'APPROVED')
            .reduce((total, item) => total + Number(item.requested_seconds ?? 0), 0);

        return {
            pending,
            approved,
            rejected,
            totalApprovedSeconds,
        };
    }, [rows]);

    const refreshData = async () => {
        await mutate(currentKey);
    };

    const handleDialogHide = () => {
        setVisible(false);
        setSelectedData(null);
        setIsAddNew(false);
        reset(defaultOvertimeRequestFormValue);
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        setFilters({
            global: { value, matchMode: FilterMatchMode.CONTAINS },
        });

        setGlobalFilterValue(value);
    };

    const onClickNew = () => {
        clearErrors();
        setSelectedData(null);
        setIsAddNew(true);
        setVisible(true);
        setPopupHeaderTitle('New Overtime Request');
        reset(defaultOvertimeRequestFormValue);

        setTimeout(() => {
            setFocus('overtime_date');
        }, 0);
    };

    const onClickUpdate = (data: OvertimeRequest) => {
        clearErrors();
        setSelectedData(data);
        setIsAddNew(false);
        setVisible(true);
        setPopupHeaderTitle('Update Overtime Request');

        reset({
            id: data.id,
            overtime_date: data.overtime_date ? dayjs(data.overtime_date).toDate() : null,
            requested_start_time: toTimeValue(data.requested_start_at),
            requested_end_time: toTimeValue(data.requested_end_at),
            reason: data.reason ?? '',
            deleted_at: data.deleted_at,
            row_version: data.row_version,
        });

        setTimeout(() => {
            setFocus('overtime_date');
        }, 0);
    };

    const handleSubmitNew = async (data: OvertimeRequestForm) => {
        try {
            setIsSaving(true);

            const res: ResponseType<ResponseTypeCreateSuccess> =
                await createOvertimeRequest(data);

            await refreshData();
            handleDialogHide();

            dispatch(
                showToast({
                    visible: true,
                    severity: 'success',
                    summary: 'Success',
                    detail: res.message || 'Overtime request created successfully.',
                })
            );
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: getErrorMessage(err, 'message'),
                    })
                );
            } else if (err instanceof Error) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: err.message,
                    })
                );
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdate = async (data: OvertimeRequestForm) => {
        if (!selectedData) {
            dispatch(
                showToast({
                    visible: true,
                    severity: 'error',
                    summary: 'Error',
                    detail: 'Please select data first.',
                })
            );
            return;
        }

        try {
            setIsSaving(true);

            const res: ResponseType<ResponseTypeCreateSuccess> =
                await updateOvertimeRequest(
                    selectedData.id,
                    selectedData.row_version,
                    data
                );

            await refreshData();
            handleDialogHide();

            dispatch(
                showToast({
                    visible: true,
                    severity: 'success',
                    summary: 'Success',
                    detail: res.message || 'Overtime request updated successfully.',
                })
            );
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: getErrorMessage(err, 'message'),
                    })
                );
            } else if (err instanceof Error) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: err.message,
                    })
                );
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (data: OvertimeRequest) => {
        try {
            const res: ResponseType<ResponseTypeCreateSuccess> =
                await deleteOvertimeRequest(data.id, data.row_version);

            await refreshData();

            dispatch(
                showToast({
                    visible: true,
                    severity: 'success',
                    summary: 'Success',
                    detail: res.message || 'Overtime request deleted successfully.',
                })
            );
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: getErrorMessage(err, 'message'),
                    })
                );
            } else if (err instanceof Error) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: err.message,
                    })
                );
            }
        }
    };

    const handleRestore = async (data: OvertimeRequest) => {
        try {
            const res: ResponseType<ResponseTypeCreateSuccess> =
                await restoreOvertimeRequest(data.id, data.row_version);

            await refreshData();

            dispatch(
                showToast({
                    visible: true,
                    severity: 'success',
                    summary: 'Success',
                    detail: res.message || 'Overtime request restored successfully.',
                })
            );
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: getErrorMessage(err, 'message'),
                    })
                );
            } else if (err instanceof Error) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: err.message,
                    })
                );
            }
        }
    };

    const handlePurge = async (data: OvertimeRequest) => {
        try {
            const res: ResponseType<ResponseTypeCreateSuccess> =
                await purgeOvertimeRequest(data.id);

            await refreshData();

            dispatch(
                showToast({
                    visible: true,
                    severity: 'success',
                    summary: 'Success',
                    detail: res.message || 'Overtime request deleted permanently.',
                })
            );
        } catch (err: unknown) {
            if (isResponseTypeError(err)) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: getErrorMessage(err, 'message'),
                    })
                );
            } else if (err instanceof Error) {
                dispatch(
                    showToast({
                        visible: true,
                        severity: 'error',
                        summary: 'Error',
                        detail: err.message,
                    })
                );
            }
        }
    };

    const onSubmit = async (data: OvertimeRequestForm) => {
        if (!isValid || isSaving) {
            return;
        }

        const startAt = combineDateAndTime(
            data.overtime_date,
            data.requested_start_time
        );

        const endAt = combineDateAndTime(
            data.overtime_date,
            data.requested_end_time
        );

        if (
            !startAt ||
            !endAt ||
            dayjs(endAt).isSame(startAt) ||
            dayjs(endAt).isBefore(startAt)
        ) {
            dispatch(
                showToast({
                    visible: true,
                    severity: 'error',
                    summary: 'Invalid time',
                    detail: 'Requested end time must be after requested start time.',
                })
            );
            return;
        }

        if (isAddNew) {
            await handleSubmitNew(data);
            return;
        }

        await handleUpdate(data);
    };

    const onClickDelete = (data: OvertimeRequest) => {
        confirmDialog({
            message: 'Do you want to delete this overtime request?',
            header: 'Delete Confirmation',
            icon: 'pi pi-info-circle',
            defaultFocus: 'accept',
            accept: () => handleDelete(data),
            reject: () => { },
            footer: (options) => (
                <div className="flex justify-end gap-3">
                    <Button
                        label="No"
                        icon="pi pi-times"
                        onClick={options.reject}
                        className="p-button-text"
                    />
                    <Button
                        label="Yes"
                        icon="pi pi-check"
                        onClick={options.accept}
                        className="p-button-danger"
                    />
                </div>
            ),
        });
    };

    const onClickRestore = (data: OvertimeRequest) => {
        confirmDialog({
            message: 'Do you want to restore this overtime request?',
            header: 'Restore Confirmation',
            icon: 'pi pi-info-circle',
            defaultFocus: 'accept',
            accept: () => handleRestore(data),
            reject: () => { },
            footer: (options) => (
                <div className="flex justify-end gap-3">
                    <Button
                        label="No"
                        icon="pi pi-times"
                        onClick={options.reject}
                        className="p-button-text"
                    />
                    <Button
                        label="Yes"
                        icon="pi pi-check"
                        onClick={options.accept}
                        className="p-button-success"
                    />
                </div>
            ),
        });
    };

    const onClickPurge = (data: OvertimeRequest) => {
        confirmDialog({
            message: 'Do you want to delete this overtime request forever?',
            header: 'Delete Forever Confirmation',
            icon: 'pi pi-info-circle',
            defaultFocus: 'accept',
            accept: () => handlePurge(data),
            reject: () => { },
            footer: (options) => (
                <div className="flex justify-end gap-3">
                    <Button
                        label="No"
                        icon="pi pi-times"
                        onClick={options.reject}
                        className="p-button-text"
                    />
                    <Button
                        label="Yes"
                        icon="pi pi-check"
                        onClick={options.accept}
                        className="p-button-danger"
                    />
                </div>
            ),
        });
    };

    const statusBody = (rowData: OvertimeRequest) => {
        if (rowData.deleted_at) {
            return <Tag value="Deleted" severity="secondary" />;
        }

        const status = rowData.status?.toUpperCase();

        if (status === 'APPROVED') {
            return <Tag value="Approved" severity="success" />;
        }

        if (status === 'REJECTED') {
            return <Tag value="Rejected" severity="danger" />;
        }

        if (status === 'CANCELLED') {
            return <Tag value="Cancelled" severity="warning" />;
        }

        return <Tag value="Pending" severity="info" />;
    };

    const actionColumnBody = (rowData: OvertimeRequest) => {
        const status = rowData.status?.toUpperCase();
        const isPending = status === 'PENDING' && !rowData.deleted_at;

        return (
            <div className="flex flex-wrap gap-2">
                {hasRole(profileState.role, ['superadmin']) && rowData.deleted_at && (
                    <>
                        <Button
                            tooltipOptions={{ appendTo: getBody, position: 'top' }}
                            tooltip="restore"
                            rounded
                            severity="success"
                            icon="pi pi-refresh"
                            size="small"
                            onClick={() => onClickRestore(rowData)}
                        />

                        <Button
                            tooltipOptions={{ appendTo: getBody, position: 'top' }}
                            tooltip="delete forever"
                            rounded
                            severity="secondary"
                            icon="pi pi-times"
                            size="small"
                            onClick={() => onClickPurge(rowData)}
                        />
                    </>
                )}

                {!rowData.deleted_at && (
                    <>
                        <Button
                            tooltipOptions={{ appendTo: getBody, position: 'top' }}
                            tooltip="delete"
                            rounded
                            severity="danger"
                            icon="pi pi-trash"
                            size="small"
                            disabled={!isPending}
                            onClick={() => onClickDelete(rowData)}
                        />

                        <Button
                            tooltipOptions={{ appendTo: getBody, position: 'top' }}
                            tooltip={isPending ? 'update' : 'only pending request can be updated'}
                            rounded
                            severity="help"
                            icon="pi pi-pencil"
                            size="small"
                            disabled={!isPending}
                            onClick={() => onClickUpdate(rowData)}
                        />
                    </>
                )}
            </div>
        );
    };

    const footerContent = (
        <div className="flex justify-end gap-3">
            <Button
                type="button"
                label="Cancel"
                icon="pi pi-times"
                onClick={handleDialogHide}
                className="p-button-text"
                disabled={isSaving}
            />
            <Button
                type="submit"
                label={
                    isSaving
                        ? isAddNew
                            ? 'Submitting...'
                            : 'Saving...'
                        : isAddNew
                            ? 'Submit'
                            : 'Save'
                }
                icon={isSaving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                disabled={isSaving}
            />
        </div>
    );

    if (isLoading) {
        return <LoadingDataTable />;
    }

    if (error) {
        return <ErrorNotConnectedToApi mutateKey={currentKey} />;
    }

    return (
        <>
            <ConfirmDialog />

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
                <Card>
                    <div className="text-sm text-slate-500">Pending Requests</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-800">
                        {requestSummary.pending}
                    </div>
                </Card>

                <Card>
                    <div className="text-sm text-slate-500">Approved Requests</div>
                    <div className="mt-2 text-3xl font-semibold text-green-600">
                        {requestSummary.approved}
                    </div>
                </Card>

                <Card>
                    <div className="text-sm text-slate-500">Rejected Requests</div>
                    <div className="mt-2 text-3xl font-semibold text-red-500">
                        {requestSummary.rejected}
                    </div>
                </Card>

                <Card>
                    <div className="text-sm text-slate-500">Approved Overtime</div>
                    <div className="mt-2 text-3xl font-semibold text-blue-600">
                        {formatSeconds(requestSummary.totalApprovedSeconds)}
                    </div>
                </Card>
            </div>

            <Card>
                <div className="flex flex-col gap-5 p-4 md:p-5">
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <div className="text-2xl font-semibold text-slate-800">
                                My Overtime Request
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                                Submit and monitor your own overtime requests. Approved overtime
                                will be included in attendance summary.
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    inputId="showDeletedData"
                                    name="showDeletedData"
                                    onChange={() => setIsShowDeletedDataChecked((prev) => !prev)}
                                    checked={isShowDeletedDataChecked}
                                />
                                <label
                                    htmlFor="showDeletedData"
                                    className="text-sm text-slate-600"
                                >
                                    Show deleted data
                                </label>
                            </div>

                            <IconField iconPosition="left">
                                <InputIcon className="pi pi-search" />
                                <InputText
                                    className="w-full sm:w-[18rem]"
                                    value={globalFilterValue}
                                    onChange={onGlobalFilterChange}
                                    placeholder="Search reason or status"
                                />
                            </IconField>

                            <Button
                                label="New Overtime Request"
                                icon="pi pi-plus"
                                onClick={onClickNew}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <DataTable
                            value={rows}
                            tableStyle={{ minWidth: '118rem' }}
                            stripedRows
                            paginator
                            scrollable
                            scrollHeight="500px"
                            rows={10}
                            rowsPerPageOptions={[10, 25, 50]}
                            dataKey="id"
                            globalFilterFields={[
                                'employee_name',
                                'reason',
                                'status',
                                'approved_by_name',
                                'rejected_by_name',
                            ]}
                            emptyMessage="No overtime request found."
                            filters={filters}
                            currentPageReportTemplate="{first} to {last} of {totalRecords}"
                            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
                            loading={isLoading}
                        >
                            <Column
                                header="#"
                                headerStyle={{ width: '4rem', minWidth: '4rem' }}
                                bodyStyle={{ minWidth: '4rem' }}
                                body={(_, options) => options.rowIndex + 1}
                            />

                            <Column
                                field="employee_name"
                                header="Employee"
                                body={(rowData: OvertimeRequest) => rowData.employee_name ?? '-'}
                                style={{ minWidth: '16rem' }}
                            />

                            <Column
                                header="Overtime Date"
                                body={(rowData: OvertimeRequest) =>
                                    formatDate(rowData.overtime_date)
                                }
                                style={{ minWidth: '12rem' }}
                            />

                            <Column
                                header="Start"
                                body={(rowData: OvertimeRequest) =>
                                    formatTime(rowData.requested_start_at)
                                }
                                style={{ minWidth: '8rem' }}
                            />

                            <Column
                                header="End"
                                body={(rowData: OvertimeRequest) =>
                                    formatTime(rowData.requested_end_at)
                                }
                                style={{ minWidth: '8rem' }}
                            />

                            <Column
                                header="Duration"
                                body={(rowData: OvertimeRequest) =>
                                    formatSeconds(rowData.requested_seconds)
                                }
                                style={{ minWidth: '9rem' }}
                            />

                            <Column
                                field="reason"
                                header="Reason"
                                body={(rowData: OvertimeRequest) => rowData.reason ?? '-'}
                                style={{ minWidth: '20rem' }}
                            />

                            <Column
                                header="Status"
                                body={statusBody}
                                style={{ minWidth: '9rem' }}
                            />

                            <Column
                                header="Approved By"
                                body={(rowData: OvertimeRequest) =>
                                    rowData.approved_by_name ?? '-'
                                }
                                style={{ minWidth: '14rem' }}
                            />

                            <Column
                                header="Approved At"
                                body={(rowData: OvertimeRequest) =>
                                    formatDateTime(rowData.approved_at)
                                }
                                style={{ minWidth: '14rem' }}
                            />

                            <Column
                                header="Action"
                                body={actionColumnBody}
                                frozen
                                alignFrozen="right"
                                style={{ minWidth: '10rem' }}
                                headerStyle={{
                                    minWidth: '10rem',
                                    background: '#ffffff',
                                    zIndex: 1,
                                }}
                                bodyStyle={{
                                    minWidth: '10rem',
                                    background: '#ffffff',
                                }}
                            />
                        </DataTable>
                    </div>
                </div>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)}>
                <Dialog
                    header={popupHeaderTitle}
                    visible={visible}
                    style={{ width: '95vw', maxWidth: '860px' }}
                    breakpoints={{ '960px': '95vw' }}
                    onHide={handleDialogHide}
                    footer={footerContent}
                    onShow={() => {
                        setFocus('overtime_date');
                    }}
                    modal
                    draggable={false}
                    resizable={false}
                >
                    <div className="flex flex-col gap-5">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Overtime Information
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Choose the overtime date, requested start time, requested end
                                    time, and reason.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="overtime_date"
                                        className="text-sm font-medium text-slate-700"
                                    >
                                        Overtime Date
                                    </label>

                                    <Controller
                                        name="overtime_date"
                                        control={control}
                                        rules={{
                                            required: 'Overtime date is required',
                                        }}
                                        render={({ field, fieldState }) => (
                                            <>
                                                <Calendar
                                                    id="overtime_date"
                                                    appendTo={getBody}
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(e.value)}
                                                    dateFormat="dd/mm/yy"
                                                    showIcon
                                                    className={fieldState.invalid ? 'p-invalid' : ''}
                                                    disabled={isSaving}
                                                />

                                                {fieldState.error && (
                                                    <small className="font-bold p-error">
                                                        {fieldState.error.message}
                                                    </small>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>

                                <div className="hidden md:block" />

                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="requested_start_time"
                                        className="text-sm font-medium text-slate-700"
                                    >
                                        Requested Start Time
                                    </label>

                                    <Controller
                                        name="requested_start_time"
                                        control={control}
                                        rules={{
                                            required: 'Start time is required',
                                        }}
                                        render={({ field, fieldState }) => (
                                            <>
                                                <Dropdown
                                                    id="requested_start_time"
                                                    appendTo={getBody}
                                                    value={field.value}
                                                    options={timeOptions}
                                                    onChange={(e) => field.onChange(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select start time"
                                                    filter
                                                    showClear
                                                    className={
                                                        fieldState.invalid ? 'p-invalid w-full' : 'w-full'
                                                    }
                                                    disabled={isSaving}
                                                />

                                                {fieldState.error && (
                                                    <small className="font-bold p-error">
                                                        {fieldState.error.message}
                                                    </small>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label
                                        htmlFor="requested_end_time"
                                        className="text-sm font-medium text-slate-700"
                                    >
                                        Requested End Time
                                    </label>

                                    <Controller
                                        name="requested_end_time"
                                        control={control}
                                        rules={{
                                            required: 'End time is required',
                                            validate: (value) => {
                                                const date = watch('overtime_date');
                                                const startTime = watch('requested_start_time');

                                                const startAt = combineDateAndTime(date, startTime);
                                                const endAt = combineDateAndTime(date, value);

                                                if (!startAt || !endAt) {
                                                    return true;
                                                }

                                                if (
                                                    dayjs(endAt).isSame(startAt) ||
                                                    dayjs(endAt).isBefore(startAt)
                                                ) {
                                                    return 'End time must be after start time';
                                                }

                                                return true;
                                            },
                                        }}
                                        render={({ field, fieldState }) => (
                                            <>
                                                <Dropdown
                                                    id="requested_end_time"
                                                    appendTo={getBody}
                                                    value={field.value}
                                                    options={timeOptions}
                                                    onChange={(e) => field.onChange(e.value)}
                                                    optionLabel="label"
                                                    optionValue="value"
                                                    placeholder="Select end time"
                                                    filter
                                                    showClear
                                                    className={
                                                        fieldState.invalid ? 'p-invalid w-full' : 'w-full'
                                                    }
                                                    disabled={isSaving}
                                                />

                                                {fieldState.error && (
                                                    <small className="font-bold p-error">
                                                        {fieldState.error.message}
                                                    </small>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>

                                <div className="flex flex-col gap-2 md:col-span-2">
                                    <label
                                        htmlFor="reason"
                                        className="text-sm font-medium text-slate-700"
                                    >
                                        Reason
                                    </label>

                                    <Controller
                                        name="reason"
                                        control={control}
                                        rules={{
                                            required: 'Reason is required',
                                            maxLength: {
                                                value: 1000,
                                                message: 'Maximum 1000 characters',
                                            },
                                        }}
                                        render={({ field, fieldState }) => (
                                            <>
                                                <InputTextarea
                                                    id="reason"
                                                    placeholder="Explain the overtime reason"
                                                    {...field}
                                                    rows={4}
                                                    className={fieldState.invalid ? 'p-invalid' : ''}
                                                    disabled={isSaving}
                                                />

                                                {fieldState.error && (
                                                    <small className="font-bold p-error">
                                                        {fieldState.error.message}
                                                    </small>
                                                )}
                                            </>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Request Summary
                                </h3>
                                <p className="mt-1 text-sm leading-6 text-slate-500">
                                    Overtime amount is not calculated here. Payroll module will
                                    calculate overtime pay later.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="text-sm text-slate-500">Start</div>
                                    <div className="mt-2 text-xl font-semibold text-slate-800">
                                        {previewStartAt
                                            ? dayjs(previewStartAt).format('HH:mm')
                                            : '-'}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="text-sm text-slate-500">End</div>
                                    <div className="mt-2 text-xl font-semibold text-slate-800">
                                        {previewEndAt ? dayjs(previewEndAt).format('HH:mm') : '-'}
                                    </div>
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-white p-4">
                                    <div className="text-sm text-slate-500">Duration</div>
                                    <div className="mt-2 text-xl font-semibold text-blue-600">
                                        {formatSeconds(previewSeconds)}
                                    </div>
                                </div>
                            </div>

                            {previewStartAt && previewEndAt && previewSeconds <= 0 && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                                    End time must be after start time.
                                </div>
                            )}

                            <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                                Submit this request for approval. Approved overtime will be
                                included in attendance summary.
                            </div>
                        </div>
                    </div>
                </Dialog>
            </form>
        </>
    );
};

export default OvertimeRequestTableData;