'use client'

import { useEffect, useMemo, useState } from 'react';
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
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputTextarea } from 'primereact/inputtextarea';
import { Tag } from 'primereact/tag';

import { fetcher } from '@/app/utils/fetcher';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { RootState } from '@/store/store';
import { hasRole } from '@/app/utils/role-utils';

import { useDispatch, useSelector } from 'react-redux';

import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import { LeaveType } from '@/app/types/leave-type';
import { EmployeeLeaveBalance } from '@/app/types/employee-leave-balance';
import {
  RequestLeave,
  RequestLeaveForm,
  defaultRequestLeaveFormValue,
} from '@/app/types/request-leave';
import {
  approveRequestLeave,
  createRequestLeave,
  deleteRequestLeave,
  getPreviewWorkingDays,
  purgeRequestLeave,
  rejectRequestLeave,
  restoreRequestLeave,
  updateRequestLeave,
} from '@/app/services/request-leave-service';

const RequestLeaveTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<RequestLeave | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('New Request Leave');
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/request-leave?show_all=${isShowDeletedDataChecked}`;

  const {
    control,
    handleSubmit,
    setFocus,
    reset,
    clearErrors,
    watch,
    setValue,
    formState: { isValid },
  } = useForm<RequestLeaveForm>({
    defaultValues: defaultRequestLeaveFormValue,
    mode: 'onTouched',
  });

  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });

  const { data: requestLeaveData, error, isLoading } = useSWR<RequestLeave[]>(currentKey, fetcher);
  const { data: leaveTypeData, error: leaveTypeError, isLoading: leaveTypeIsLoading } =
    useSWR<LeaveType[]>(`/api/leave-type`, fetcher);
  const { data: employeeLeaveBalanceData, error: employeeLeaveBalanceError, isLoading: employeeLeaveBalanceIsLoading } =
    useSWR<EmployeeLeaveBalance[]>(`/api/employees/leave-balance`, fetcher);

  const requestRows = requestLeaveData ?? [];

  const requestSummary = useMemo(() => {
    const pending = requestRows.filter((item) => item.status?.toUpperCase() === 'PENDING' && !item.deleted_at).length;
    const approved = requestRows.filter((item) => item.status?.toUpperCase() === 'APPROVED' && !item.deleted_at).length;
    const rejected = requestRows.filter((item) => item.status?.toUpperCase() === 'REJECTED' && !item.deleted_at).length;

    return { pending, approved, rejected };
  }, [requestRows]);

  const activeLeaveTypes = useMemo(() => {
    return (leaveTypeData ?? []).filter((item) => item.is_active);
  }, [leaveTypeData]);

  const leaveTypeNameMap = useMemo(() => {
    const map = new Map<number, string>();
    (leaveTypeData ?? []).forEach((item) => {
      map.set(item.id, item.name);
    });
    return map;
  }, [leaveTypeData]);

  const selectedLeaveTypeId = watch('leave_type_id');
  const selectedBalanceId = watch('employee_leave_balance_id');
  const startDate = watch('start_date');
  const endDate = watch('end_date');

  const availableLeaveBalances = useMemo(() => {
    const balances = employeeLeaveBalanceData ?? [];

    if (!selectedLeaveTypeId || Number(selectedLeaveTypeId) <= 0) {
      return balances.filter((item) => !item.deleted_at);
    }

    return balances.filter(
      (item) =>
        item.leave_type_id === Number(selectedLeaveTypeId) &&
        !item.deleted_at
    );
  }, [employeeLeaveBalanceData, selectedLeaveTypeId]);

  const selectedBalance = useMemo(() => {
    return (employeeLeaveBalanceData ?? []).find(
      (item) => item.id === Number(selectedBalanceId)
    );
  }, [employeeLeaveBalanceData, selectedBalanceId]);

  useEffect(() => {
    const total = getPreviewWorkingDays(startDate, endDate);
    setValue('total_days', total);
  }, [startDate, endDate, setValue]);

  useEffect(() => {
    if (!selectedBalanceId) {
      return;
    }

    const exists = availableLeaveBalances.some(
      (item) => item.id === Number(selectedBalanceId)
    );

    if (!exists) {
      setValue('employee_leave_balance_id', 0);
    }
  }, [availableLeaveBalances, selectedBalanceId, setValue]);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const refreshData = async () => {
    await mutate(currentKey);
  };

  const handleDialogHide = () => {
    setVisible(false);
    setSelectedData(null);
    setIsAddNew(false);
    reset(defaultRequestLeaveFormValue);
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle('New Request Leave');
    reset(defaultRequestLeaveFormValue);
  };

  const onClickUpdate = (data: RequestLeave) => {
    clearErrors();
    setSelectedData(data);
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle('Update Request Leave');

    reset({
      id: data.id,
      leave_type_id: data.leave_type_id,
      employee_leave_balance_id: data.employee_leave_balance_id,
      start_date: data.start_date ? dayjs(data.start_date).toDate() : null,
      end_date: data.end_date ? dayjs(data.end_date).toDate() : null,
      reason: data.reason,
      total_days: data.total_days,
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });
  };

  const handleSubmitNew = async (data: RequestLeaveForm) => {
    try {
      setIsSaving(true);

      const res: ResponseType<ResponseTypeCreateSuccess> = await createRequestLeave(data);

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request created successfully.',
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

  const handleUpdate = async (data: RequestLeaveForm) => {
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

      const res: ResponseType<ResponseTypeCreateSuccess> = await updateRequestLeave(
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
          detail: res.message || 'Leave request updated successfully.',
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

  const handleDelete = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteRequestLeave(
        data.id,
        data.row_version
      );

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request deleted successfully.',
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

  const handlePurge = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeRequestLeave(data.id);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request deleted permanently.',
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

  const handleRestore = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreRequestLeave(
        data.id,
        data.row_version
      );

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request restored successfully.',
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

  const handleApprove = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await approveRequestLeave(
        data.id,
        data.row_version
      );

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave request approved successfully.',
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

  const handleReject = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await rejectRequestLeave(
        data.id,
        data.row_version
      );

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'warn',
          summary: 'Rejected',
          detail: res.message || 'Leave request rejected successfully.',
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

  const onSubmit = async (data: RequestLeaveForm) => {
    if (!isValid) {
      return;
    }

    const requestedDays = getPreviewWorkingDays(data.start_date, data.end_date);

    if (requestedDays <= 0) {
      dispatch(
        showToast({
          visible: true,
          severity: 'error',
          summary: 'Invalid request',
          detail: 'Selected date range has no working days.',
        })
      );
      return;
    }

    if (selectedBalance && requestedDays > selectedBalance.closing_balance) {
      dispatch(
        showToast({
          visible: true,
          severity: 'error',
          summary: 'Insufficient balance',
          detail: 'Requested days exceed the selected leave balance closing amount.',
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

  const onClickDelete = (data: RequestLeave) => {
    confirmDialog({
      message: 'Do you want to delete this request?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => handleDelete(data),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
        </div>
      ),
    });
  };

  const onClickRestore = (data: RequestLeave) => {
    confirmDialog({
      message: 'Do you want to restore this request?',
      header: 'Restore Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => handleRestore(data),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-success" />
        </div>
      ),
    });
  };

  const onClickPurge = (data: RequestLeave) => {
    confirmDialog({
      message: 'Do you want to delete this request forever?',
      header: 'Delete Forever Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => handlePurge(data),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
        </div>
      ),
    });
  };

  const onClickApprove = (data: RequestLeave) => {
    confirmDialog({
      message: 'Approve this leave request?',
      header: 'Approve Confirmation',
      icon: 'pi pi-check-circle',
      defaultFocus: 'accept',
      accept: () => handleApprove(data),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Approve" icon="pi pi-check" onClick={options.accept} className="p-button-success" />
        </div>
      ),
    });
  };

  const onClickReject = (data: RequestLeave) => {
    confirmDialog({
      message: 'Reject this leave request?',
      header: 'Reject Confirmation',
      icon: 'pi pi-times-circle',
      defaultFocus: 'accept',
      accept: () => handleReject(data),
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Reject" icon="pi pi-times" onClick={options.accept} className="p-button-danger" />
        </div>
      ),
    });
  };

  const leaveTypeBody = (rowData: RequestLeave) => {
    return rowData.leave_name || leaveTypeNameMap.get(rowData.leave_type_id) || '-';
  };

  const dateRangeBody = (rowData: RequestLeave) => {
    return `${dayjs(rowData.start_date).format('DD MMM YYYY')} - ${dayjs(rowData.end_date).format('DD MMM YYYY')}`;
  };

  const processedAtBody = (rowData: RequestLeave) => {
    if (!rowData.approved_at) {
      return '-';
    }

    return dayjs(rowData.approved_at).format('DD MMM YYYY HH:mm');
  };

  const statusBody = (rowData: RequestLeave) => {
    if (rowData.deleted_at) {
      return <Tag value="Deleted" severity="secondary" />;
    }

    const status = (rowData.status || '').toUpperCase();

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

  const actionColumnBody = (rowData: RequestLeave) => {
    const isPending = rowData.status?.toUpperCase() === 'PENDING' && !rowData.deleted_at;
    const canAdminAction = hasRole(profileState.role, ['admin', 'superadmin']);
    const isFinalStatus =
      rowData.status?.toUpperCase() === 'APPROVED' ||
      rowData.status?.toUpperCase() === 'REJECTED' ||
      rowData.status?.toUpperCase() === 'CANCELLED';

    return (
      <div className="flex flex-wrap gap-2">
        {canAdminAction && isPending && (
          <>
            <Button
              tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
              tooltip="approve"
              rounded
              severity="success"
              icon="pi pi-check"
              size="small"
              onClick={() => onClickApprove(rowData)}
            />
            <Button
              tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
              tooltip="reject"
              rounded
              severity="warning"
              icon="pi pi-times"
              size="small"
              onClick={() => onClickReject(rowData)}
            />
          </>
        )}

        {hasRole(profileState.role, ['superadmin']) && rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
            tooltip="restore"
            rounded
            severity="success"
            icon="pi pi-refresh"
            size="small"
            onClick={() => onClickRestore(rowData)}
          />
        )}

        {hasRole(profileState.role, ['superadmin']) && rowData.deleted_at && (
          <Button
            tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
            tooltip="delete forever"
            rounded
            severity="secondary"
            icon="pi pi-times"
            size="small"
            onClick={() => onClickPurge(rowData)}
          />
        )}

        {!rowData.deleted_at && (
          <>
            <Button
              tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
              tooltip="delete"
              rounded
              severity="danger"
              icon="pi pi-trash"
              size="small"
              disabled={!isPending}
              onClick={() => onClickDelete(rowData)}
            />

            <Button
              tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
              tooltip="update"
              rounded
              severity="help"
              icon="pi pi-pencil"
              size="small"
              disabled={isFinalStatus}
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
        label={isSaving ? (isAddNew ? 'Submitting...' : 'Saving...') : (isAddNew ? 'Submit' : 'Save')}
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

      <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-slate-500">Pending Requests</div>
          <div className="mt-2 text-3xl font-semibold text-slate-800">{requestSummary.pending}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Approved Requests</div>
          <div className="mt-2 text-3xl font-semibold text-green-600">{requestSummary.approved}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-500">Rejected Requests</div>
          <div className="mt-2 text-3xl font-semibold text-red-500">{requestSummary.rejected}</div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-5 p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-800">Request Leave</div>
              <div className="mt-1 text-sm text-slate-500">
                Submit, review, and monitor your leave requests in one place.
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
                <label htmlFor="showDeletedData" className="text-sm text-slate-600">
                  Show deleted data
                </label>
              </div>

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText
                  className="w-full sm:w-[18rem]"
                  value={globalFilterValue}
                  onChange={onGlobalFilterChange}
                  placeholder="Search leave type, reason, or status"
                />
              </IconField>

              <Button
                label="New Request Leave"
                icon="pi pi-plus"
                onClick={onClickNew}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              value={requestRows}
              tableStyle={{ minWidth: '106rem' }}
              stripedRows
              paginator
              scrollable
              scrollHeight="500px"
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              dataKey="id"
              globalFilterFields={['leave_name', 'reason', 'status', 'approved_by_name']}
              emptyMessage="No leave request found."
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
              <Column header="Leave Type" body={leaveTypeBody} style={{ minWidth: '14rem' }} />
              <Column header="Date Range" body={dateRangeBody} style={{ minWidth: '18rem' }} />
              <Column field="total_days" header="Days" style={{ minWidth: '6rem' }} />
              <Column field="reason" header="Reason" style={{ minWidth: '20rem' }} />
              <Column
                field="approved_by_name"
                header="Processed By"
                body={(rowData) => rowData.approved_by_name ?? '-'}
                style={{ minWidth: '12rem' }}
              />
              <Column
                header="Processed At"
                body={processedAtBody}
                style={{ minWidth: '12rem' }}
              />
              <Column field="status" header="Status" body={statusBody} style={{ minWidth: '9rem' }} />
              <Column
                header="Action"
                body={actionColumnBody}
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

      <form onSubmit={handleSubmit(onSubmit)}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          style={{ width: '95vw', maxWidth: '920px' }}
          breakpoints={{ '960px': '95vw' }}
          onHide={handleDialogHide}
          footer={footerContent}
          onShow={() => {
            setFocus('leave_type_id');
          }}
          modal
          draggable={false}
          resizable={false}
        >
          <div className="flex flex-col gap-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Leave Information</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Choose the leave type, the balance period to use, and the requested leave date range.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="leave_type_id" className="text-sm font-medium text-slate-700">
                    Leave Type
                  </label>
                  <Controller
                    name="leave_type_id"
                    control={control}
                    rules={{
                      required: 'Leave type is required',
                      validate: (value) => Number(value) > 0 || 'Leave type is required',
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="leave_type_id"
                          appendTo={() => document.body}
                          value={field.value}
                          options={activeLeaveTypes}
                          loading={leaveTypeIsLoading}
                          disabled={leaveTypeIsLoading || !!leaveTypeError || isSaving}
                          onChange={(e) => field.onChange(e.value)}
                          optionLabel="name"
                          optionValue="id"
                          placeholder="Select leave type"
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          filter
                          showClear
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
                  <label htmlFor="employee_leave_balance_id" className="text-sm font-medium text-slate-700">
                    Leave Balance Period
                  </label>
                  <Controller
                    name="employee_leave_balance_id"
                    control={control}
                    rules={{
                      required: 'Leave balance is required',
                      validate: (value) => Number(value) > 0 || 'Leave balance is required',
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="employee_leave_balance_id"
                          appendTo={() => document.body}
                          value={field.value}
                          options={availableLeaveBalances.map((item) => ({
                            label: `${dayjs(item.period_start).format('DD MMM YYYY')} - ${dayjs(item.period_end).format('DD MMM YYYY')} | Closing: ${item.closing_balance}`,
                            value: item.id,
                          }))}
                          loading={employeeLeaveBalanceIsLoading}
                          disabled={
                            employeeLeaveBalanceIsLoading ||
                            !!employeeLeaveBalanceError ||
                            isSaving
                          }
                          onChange={(e) => field.onChange(e.value)}
                          placeholder="Select leave balance"
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          filter
                          showClear
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
                  <label htmlFor="start_date" className="text-sm font-medium text-slate-700">
                    Start Date
                  </label>
                  <Controller
                    name="start_date"
                    control={control}
                    rules={{
                      required: 'Start date is required',
                      validate: (value) => {
                        if (!value || !selectedBalance) return true;

                        const selected = dayjs(value);
                        const min = dayjs(selectedBalance.period_start);
                        const max = dayjs(selectedBalance.period_end);

                        if (selected.isBefore(min, 'day') || selected.isAfter(max, 'day')) {
                          return 'Start date must be within selected leave balance period';
                        }

                        return true;
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Calendar
                          id="start_date"
                          appendTo={() => document.body}
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

                <div className="flex flex-col gap-2">
                  <label htmlFor="end_date" className="text-sm font-medium text-slate-700">
                    End Date
                  </label>
                  <Controller
                    name="end_date"
                    control={control}
                    rules={{
                      required: 'End date is required',
                      validate: (value) => {
                        const start = watch('start_date');
                        if (!value || !start) {
                          return true;
                        }

                        if (dayjs(value).isBefore(start, 'day')) {
                          return 'End date must be after or equal to start date';
                        }

                        if (selectedBalance) {
                          const min = dayjs(selectedBalance.period_start);
                          const max = dayjs(selectedBalance.period_end);
                          const selected = dayjs(value);

                          if (selected.isBefore(min, 'day') || selected.isAfter(max, 'day')) {
                            return 'End date must be within selected leave balance period';
                          }
                        }

                        if (getPreviewWorkingDays(start, value) <= 0) {
                          return 'Selected date range has no working days';
                        }

                        return true;
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Calendar
                          id="end_date"
                          appendTo={() => document.body}
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

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="reason" className="text-sm font-medium text-slate-700">
                    Reason
                  </label>
                  <Controller
                    name="reason"
                    control={control}
                    rules={{
                      required: 'Reason is required',
                      maxLength: { value: 1000, message: 'Maximum 1000 characters' },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputTextarea
                          id="reason"
                          placeholder="Explain your leave reason"
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
                <h3 className="text-sm font-semibold text-slate-800">Request Summary</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Review the selected balance and automatically calculated leave days before submitting.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">Requested Days</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-800">
                    {watch('total_days') || 0}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">Selected Balance Closing</div>
                  <div className="mt-2 text-2xl font-semibold text-slate-800">
                    {selectedBalance?.closing_balance ?? 0}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">Selected Period</div>
                  <div className="mt-2 text-sm font-medium text-slate-800">
                    {selectedBalance
                      ? `${dayjs(selectedBalance.period_start).format('DD MMM YYYY')} - ${dayjs(selectedBalance.period_end).format('DD MMM YYYY')}`
                      : '-'}
                  </div>
                </div>
              </div>

              {selectedBalance && watch('total_days') > selectedBalance.closing_balance && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  Requested days exceed available closing balance for the selected leave balance period.
                </div>
              )}
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default RequestLeaveTableData;