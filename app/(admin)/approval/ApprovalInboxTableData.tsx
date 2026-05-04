'use client';

import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import dayjs from 'dayjs';

import { Card } from 'primereact/card';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { InputText } from 'primereact/inputtext';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

import { useDispatch } from 'react-redux';

import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { fetcher } from '@/app/utils/fetcher';
import { getErrorMessage, isResponseTypeError } from '@/app/utils/error-messages';

import { showToast } from '@/store/ToastSlice';

import {
    ApprovalActionForm,
    ApprovalPendingItem,
    defaultApprovalActionFormValue,
} from '@/app/types/approval';

import {
    approveApprovalRequest,
    rejectApprovalRequest,
} from '@/app/services/approval-service';

const API_KEY = '/api/approval/pending';

const getBody = () => document.body;

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

const formatTime = (value?: string | null) => {
    if (!value) {
        return '-';
    }

    return dayjs(value).format('HH:mm');
};

const formatDuration = (seconds?: number | null) => {
    const totalSeconds = Number(seconds ?? 0);

    if (totalSeconds <= 0) {
        return '-';
    }

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours <= 0) {
        return `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
};

const getModuleLabel = (moduleCode?: string | null) => {
    const code = (moduleCode ?? '').toUpperCase();

    if (code === 'OVERTIME') {
        return 'Overtime';
    }

    if (code === 'LEAVE') {
        return 'Leave';
    }

    return moduleCode ?? '-';
};

const getModuleSeverity = (moduleCode?: string | null) => {
    const code = (moduleCode ?? '').toUpperCase();

    if (code === 'OVERTIME') {
        return 'info';
    }

    if (code === 'LEAVE') {
        return 'success';
    }

    return 'secondary';
};

const getStatusSeverity = (status?: string | null) => {
    const value = (status ?? '').toUpperCase();

    if (value === 'PENDING') {
        return 'warning';
    }

    if (value === 'APPROVED') {
        return 'success';
    }

    if (value === 'REJECTED') {
        return 'danger';
    }

    if (value === 'CANCELLED') {
        return 'secondary';
    }

    return 'info';
};

const ApprovalInboxTableData = () => {
    const dispatch = useDispatch();

    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [selectedData, setSelectedData] = useState<ApprovalPendingItem | null>(
        null
    );
    const [actionType, setActionType] = useState<'approve' | 'reject' | null>(
        null
    );
    const [detailVisible, setDetailVisible] = useState(false);
    const [actionVisible, setActionVisible] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        setFocus,
        formState: { isValid },
    } = useForm<ApprovalActionForm>({
        defaultValues: defaultApprovalActionFormValue,
        mode: 'onTouched',
    });

    const [filters, setFilters] = useState({
        global: { value: '', matchMode: FilterMatchMode.CONTAINS },
    });

    const {
        data: approvalData,
        error,
        isLoading,
    } = useSWR<ApprovalPendingItem[]>(API_KEY, fetcher);

    const rows = approvalData ?? [];

    const summary = useMemo(() => {
        const overtime = rows.filter(
            (item) => item.module_code?.toUpperCase() === 'OVERTIME'
        ).length;

        const leave = rows.filter(
            (item) => item.module_code?.toUpperCase() === 'LEAVE'
        ).length;

        return {
            total: rows.length,
            overtime,
            leave,
        };
    }, [rows]);

    const refreshData = async () => {
        await mutate(API_KEY);
    };

    const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        setFilters({
            global: { value, matchMode: FilterMatchMode.CONTAINS },
        });

        setGlobalFilterValue(value);
    };

    const openDetail = (data: ApprovalPendingItem) => {
        setSelectedData(data);
        setDetailVisible(true);
    };

    const closeDetail = () => {
        setSelectedData(null);
        setDetailVisible(false);
    };

    const openActionDialog = (
        data: ApprovalPendingItem,
        type: 'approve' | 'reject'
    ) => {
        setSelectedData(data);
        setActionType(type);
        reset(defaultApprovalActionFormValue);
        setActionVisible(true);

        setTimeout(() => {
            setFocus('note');
        }, 0);
    };

    const closeActionDialog = () => {
        setSelectedData(null);
        setActionType(null);
        setActionVisible(false);
        reset(defaultApprovalActionFormValue);
    };

    const handleApprovalAction = async (formData: ApprovalActionForm) => {
        if (!selectedData || !actionType || !isValid || isSaving) {
            return;
        }

        try {
            setIsSaving(true);

            if (actionType === 'approve') {
                await approveApprovalRequest(
                    selectedData.approval_request_id,
                    selectedData.row_version,
                    {
                        note: formData.note,
                    }
                );
            }

            if (actionType === 'reject') {
                await rejectApprovalRequest(
                    selectedData.approval_request_id,
                    selectedData.row_version,
                    {
                        note: formData.note,
                    }
                );
            }

            await refreshData();
            closeActionDialog();

            dispatch(
                showToast({
                    visible: true,
                    severity: 'success',
                    summary: 'Success',
                    detail:
                        actionType === 'approve'
                            ? 'Approval request approved successfully.'
                            : 'Approval request rejected successfully.',
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

    const confirmApprove = (data: ApprovalPendingItem) => {
        confirmDialog({
            message: 'Do you want to approve this request?',
            header: 'Approve Confirmation',
            icon: 'pi pi-check-circle',
            defaultFocus: 'accept',
            accept: () => openActionDialog(data, 'approve'),
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

    const confirmReject = (data: ApprovalPendingItem) => {
        confirmDialog({
            message: 'Do you want to reject this request?',
            header: 'Reject Confirmation',
            icon: 'pi pi-times-circle',
            defaultFocus: 'accept',
            accept: () => openActionDialog(data, 'reject'),
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

    const moduleBody = (rowData: ApprovalPendingItem) => {
        return (
            <Tag
                value={getModuleLabel(rowData.module_code)}
                severity={getModuleSeverity(rowData.module_code)}
            />
        );
    };

    const statusBody = (rowData: ApprovalPendingItem) => {
        return (
            <Tag
                value={rowData.status ?? '-'}
                severity={getStatusSeverity(rowData.status)}
            />
        );
    };

    const requestStatusBody = (rowData: ApprovalPendingItem) => {
        return (
            <Tag
                value={rowData.request_status ?? '-'}
                severity={getStatusSeverity(rowData.request_status)}
            />
        );
    };

    const requestInfoBody = (rowData: ApprovalPendingItem) => {
        const moduleCode = rowData.module_code?.toUpperCase();

        if (moduleCode === 'OVERTIME') {
            return (
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-800">
                        {formatDate(rowData.request_date)}
                    </span>
                    <span className="text-sm text-slate-500">
                        {formatTime(rowData.request_start_at)} -{' '}
                        {formatTime(rowData.request_end_at)}
                    </span>
                    <span className="text-sm text-slate-500">
                        Duration: {formatDuration(rowData.request_seconds)}
                    </span>
                </div>
            );
        }

        if (moduleCode === 'LEAVE') {
            return (
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-800">
                        {formatDate(rowData.request_date)}
                    </span>
                    <span className="text-sm text-slate-500">
                        Total days: {rowData.request_seconds ?? '-'}
                    </span>
                </div>
            );
        }

        return '-';
    };

    const actionBody = (rowData: ApprovalPendingItem) => {
        return (
            <div className="flex flex-wrap gap-2">
                <Button
                    tooltipOptions={{ appendTo: getBody, position: 'top' }}
                    tooltip="View detail"
                    rounded
                    severity="info"
                    icon="pi pi-eye"
                    size="small"
                    onClick={() => openDetail(rowData)}
                />

                <Button
                    tooltipOptions={{ appendTo: getBody, position: 'top' }}
                    tooltip="Approve"
                    rounded
                    severity="success"
                    icon="pi pi-check"
                    size="small"
                    onClick={() => confirmApprove(rowData)}
                />

                <Button
                    tooltipOptions={{ appendTo: getBody, position: 'top' }}
                    tooltip="Reject"
                    rounded
                    severity="danger"
                    icon="pi pi-times"
                    size="small"
                    onClick={() => confirmReject(rowData)}
                />
            </div>
        );
    };

    const actionDialogTitle =
        actionType === 'approve'
            ? 'Approve Request'
            : actionType === 'reject'
                ? 'Reject Request'
                : 'Approval Action';

    const actionDialogFooter = (
        <div className="flex justify-end gap-3">
            <Button
                type="button"
                label="Cancel"
                icon="pi pi-times"
                onClick={closeActionDialog}
                className="p-button-text"
                disabled={isSaving}
            />

            <Button
                type="submit"
                label={
                    isSaving
                        ? actionType === 'approve'
                            ? 'Approving...'
                            : 'Rejecting...'
                        : actionType === 'approve'
                            ? 'Approve'
                            : 'Reject'
                }
                icon={isSaving ? 'pi pi-spin pi-spinner' : 'pi pi-check'}
                severity={actionType === 'approve' ? 'success' : 'danger'}
                disabled={isSaving}
            />
        </div>
    );

    if (isLoading) {
        return <LoadingDataTable />;
    }

    if (error) {
        return <ErrorNotConnectedToApi mutateKey={API_KEY} />;
    }

    return (
        <>
            <ConfirmDialog />

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                    <div className="text-sm text-slate-500">Pending Approval</div>
                    <div className="mt-2 text-3xl font-semibold text-slate-800">
                        {summary.total}
                    </div>
                </Card>

                <Card>
                    <div className="text-sm text-slate-500">Overtime Request</div>
                    <div className="mt-2 text-3xl font-semibold text-blue-600">
                        {summary.overtime}
                    </div>
                </Card>

                <Card>
                    <div className="text-sm text-slate-500">Leave Request</div>
                    <div className="mt-2 text-3xl font-semibold text-green-600">
                        {summary.leave}
                    </div>
                </Card>
            </div>

            <Card>
                <div className="flex flex-col gap-5 p-4 md:p-5">
                    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <div className="text-2xl font-semibold text-slate-800">
                                Approval Inbox
                            </div>
                            <div className="mt-1 text-sm text-slate-500">
                                Review requests that are waiting for your approval.
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                            <IconField iconPosition="left">
                                <InputIcon className="pi pi-search" />
                                <InputText
                                    className="w-full sm:w-[20rem]"
                                    value={globalFilterValue}
                                    onChange={onGlobalFilterChange}
                                    placeholder="Search requester, module, reason"
                                />
                            </IconField>

                            <Button
                                label="Refresh"
                                icon="pi pi-refresh"
                                className="p-button-outlined"
                                onClick={refreshData}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <DataTable
                            value={rows}
                            tableStyle={{ minWidth: '110rem' }}
                            stripedRows
                            paginator
                            scrollable
                            scrollHeight="500px"
                            rows={10}
                            rowsPerPageOptions={[10, 25, 50]}
                            dataKey="approval_request_step_id"
                            globalFilterFields={[
                                'module_code',
                                'requester_name',
                                'request_reason',
                                'request_status',
                                'status',
                            ]}
                            emptyMessage="No pending approval found."
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
                                header="Module"
                                body={moduleBody}
                                style={{ minWidth: '10rem' }}
                            />

                            <Column
                                field="requester_name"
                                header="Requester"
                                body={(rowData: ApprovalPendingItem) =>
                                    rowData.requester_name ?? '-'
                                }
                                style={{ minWidth: '16rem' }}
                            />

                            <Column
                                header="Request Info"
                                body={requestInfoBody}
                                style={{ minWidth: '18rem' }}
                            />

                            <Column
                                field="request_reason"
                                header="Reason"
                                body={(rowData: ApprovalPendingItem) =>
                                    rowData.request_reason ?? '-'
                                }
                                style={{ minWidth: '24rem' }}
                            />

                            <Column
                                header="Request Status"
                                body={requestStatusBody}
                                style={{ minWidth: '12rem' }}
                            />

                            <Column
                                header="Approval Step"
                                body={(rowData: ApprovalPendingItem) =>
                                    `Step ${rowData.step_no}`
                                }
                                style={{ minWidth: '10rem' }}
                            />

                            <Column
                                header="Approval Status"
                                body={statusBody}
                                style={{ minWidth: '12rem' }}
                            />

                            <Column
                                header="Submitted At"
                                body={(rowData: ApprovalPendingItem) =>
                                    formatDateTime(rowData.submitted_at)
                                }
                                style={{ minWidth: '15rem' }}
                            />

                            <Column
                                header="Action"
                                body={actionBody}
                                frozen
                                alignFrozen="right"
                                style={{ minWidth: '12rem' }}
                                headerStyle={{
                                    minWidth: '12rem',
                                    background: '#ffffff',
                                    zIndex: 1,
                                }}
                                bodyStyle={{
                                    minWidth: '12rem',
                                    background: '#ffffff',
                                }}
                            />
                        </DataTable>
                    </div>
                </div>
            </Card>

            <Dialog
                header="Approval Detail"
                visible={detailVisible}
                style={{ width: '95vw', maxWidth: '760px' }}
                breakpoints={{ '960px': '95vw' }}
                onHide={closeDetail}
                modal
                draggable={false}
                resizable={false}
            >
                {selectedData && (
                    <div className="flex flex-col gap-5">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                    <div className="text-sm text-slate-500">Module</div>
                                    <div className="mt-1">
                                        <Tag
                                            value={getModuleLabel(selectedData.module_code)}
                                            severity={getModuleSeverity(selectedData.module_code)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-slate-500">Requester</div>
                                    <div className="mt-1 font-semibold text-slate-800">
                                        {selectedData.requester_name ?? '-'}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-slate-500">Reference ID</div>
                                    <div className="mt-1 font-semibold text-slate-800">
                                        #{selectedData.reference_id}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-slate-500">Step</div>
                                    <div className="mt-1 font-semibold text-slate-800">
                                        Step {selectedData.step_no}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-slate-500">Request Date</div>
                                    <div className="mt-1 font-semibold text-slate-800">
                                        {formatDate(selectedData.request_date)}
                                    </div>
                                </div>

                                <div>
                                    <div className="text-sm text-slate-500">Submitted At</div>
                                    <div className="mt-1 font-semibold text-slate-800">
                                        {formatDateTime(selectedData.submitted_at)}
                                    </div>
                                </div>

                                {selectedData.module_code?.toUpperCase() === 'OVERTIME' && (
                                    <>
                                        <div>
                                            <div className="text-sm text-slate-500">Start</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {formatTime(selectedData.request_start_at)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-slate-500">End</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {formatTime(selectedData.request_end_at)}
                                            </div>
                                        </div>

                                        <div>
                                            <div className="text-sm text-slate-500">Duration</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {formatDuration(selectedData.request_seconds)}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5">
                            <div className="text-sm text-slate-500">Reason</div>
                            <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-800">
                                {selectedData.request_reason ?? '-'}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button
                                label="Reject"
                                icon="pi pi-times"
                                severity="danger"
                                onClick={() => {
                                    const data = selectedData;
                                    closeDetail();
                                    confirmReject(data);
                                }}
                            />

                            <Button
                                label="Approve"
                                icon="pi pi-check"
                                severity="success"
                                onClick={() => {
                                    const data = selectedData;
                                    closeDetail();
                                    confirmApprove(data);
                                }}
                            />
                        </div>
                    </div>
                )}
            </Dialog>

            <form onSubmit={handleSubmit(handleApprovalAction)}>
                <Dialog
                    header={actionDialogTitle}
                    visible={actionVisible}
                    style={{ width: '95vw', maxWidth: '620px' }}
                    breakpoints={{ '960px': '95vw' }}
                    onHide={closeActionDialog}
                    footer={actionDialogFooter}
                    modal
                    draggable={false}
                    resizable={false}
                >
                    <div className="flex flex-col gap-5">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-600">
                            {actionType === 'approve'
                                ? 'Add an optional note before approving this request.'
                                : 'Add a rejection reason before rejecting this request.'}
                        </div>

                        <div className="flex flex-col gap-2">
                            <label htmlFor="note" className="text-sm font-medium text-slate-700">
                                Note
                            </label>

                            <Controller
                                name="note"
                                control={control}
                                rules={{
                                    validate: (value) => {
                                        if (actionType === 'reject' && !value.trim()) {
                                            return 'Rejection reason is required';
                                        }

                                        return true;
                                    },
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputTextarea
                                            id="note"
                                            {...field}
                                            rows={5}
                                            placeholder={
                                                actionType === 'approve'
                                                    ? 'Approval note'
                                                    : 'Rejection reason'
                                            }
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
                </Dialog>
            </form>
        </>
    );
};

export default ApprovalInboxTableData;