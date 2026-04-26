'use client'

import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import useSWR, { mutate } from 'swr';
import dayjs from 'dayjs';

import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { Tag } from 'primereact/tag';

import { fetcher } from '@/app/utils/fetcher';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { RootState } from '@/store/store';
import { hasRole } from '@/app/utils/role-utils';

import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';

import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import { Employee } from '@/app/types/employee';
import { LeaveType } from '@/app/types/leave-type';
import {
  EmployeeLeaveBalance,
  EmployeeLeaveBalanceForm,
} from '@/app/types/employee-leave-balance';
import {
  createEmployeeLeaveBalance,
  updateEmployeeLeaveBalance,
  deleteEmployeeLeaveBalance,
  purgeEmployeeLeaveBalance,
  restoreEmployeeLeaveBalance,
} from '@/app/services/employee-leave-balance-service';

const buildDefaultFormValue = (employeeId: number): EmployeeLeaveBalanceForm => ({
  id: 0,
  employee_id: employeeId,
  leave_type_id: 0,
  period_start: null,
  period_end: null,
  opening_balance: 0,
  entitlement: 0,
  taken: 0,
  adjustment: 0,
  closing_balance: 0,
  expired_balance: 0,
  deleted_at: null,
  row_version: 0,
});

const EmployeeTimeLeaveTableData = () => {
  const params = useParams();
  const employeeId = Number(params.id);

  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<EmployeeLeaveBalance | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('New Leave Balance');
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/employees/${employeeId}/leave-balance?show_all=${isShowDeletedDataChecked}`;

  const {
    control,
    handleSubmit,
    setFocus,
    reset,
    watch,
    setValue,
    clearErrors,
    formState: { isValid },
  } = useForm<EmployeeLeaveBalanceForm>({
    defaultValues: buildDefaultFormValue(employeeId),
    mode: 'onTouched',
  });

  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });

  const {
    data: employeeLeaveBalanceData,
    error,
    isLoading,
  } = useSWR<EmployeeLeaveBalance[]>(currentKey, fetcher);

  const { data: employeeData } = useSWR<Employee[]>(`/api/employees`, fetcher);
  const { data: leaveTypeData, error: leaveTypeError, isLoading: leaveTypeIsLoading } =
    useSWR<LeaveType[]>(`/api/leave-type`, fetcher);

  const selectedEmployee = useMemo(() => {
    return employeeData?.find((item) => item.id === employeeId);
  }, [employeeData, employeeId]);

  const activeLeaveTypes = useMemo(() => {
    return (leaveTypeData ?? []).filter((item) => item.is_active);
  }, [leaveTypeData]);

  const openingBalance = watch('opening_balance') ?? 0;
  const entitlement = watch('entitlement') ?? 0;
  const taken = watch('taken') ?? 0;
  const adjustment = watch('adjustment') ?? 0;
  const expiredBalance = watch('expired_balance') ?? 0;

  useEffect(() => {
    const closing =
      Number(openingBalance || 0) +
      Number(entitlement || 0) +
      Number(adjustment || 0) -
      Number(taken || 0) -
      Number(expiredBalance || 0);

    setValue('closing_balance', closing);
  }, [openingBalance, entitlement, taken, adjustment, expiredBalance, setValue]);

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
    reset(buildDefaultFormValue(employeeId));
  };

  const onClickNew = () => {
    clearErrors();
    setSelectedData(null);
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle('New Leave Balance');
    reset(buildDefaultFormValue(employeeId));
  };

  const onClickUpdate = (data: EmployeeLeaveBalance) => {
    clearErrors();
    setIsAddNew(false);
    setVisible(true);
    setPopupHeaderTitle('Update Leave Balance');
    setSelectedData(data);

    reset({
      id: data.id,
      employee_id: data.employee_id,
      leave_type_id: data.leave_type_id,
      period_start: data.period_start ? dayjs(data.period_start).toDate() : null,
      period_end: data.period_end ? dayjs(data.period_end).toDate() : null,
      opening_balance: data.opening_balance,
      entitlement: data.entitlement,
      taken: data.taken,
      adjustment: data.adjustment,
      closing_balance: data.closing_balance,
      expired_balance: data.expired_balance,
      deleted_at: data.deleted_at,
      row_version: data.row_version,
    });
  };

  const handleSubmitNew = async (data: EmployeeLeaveBalanceForm) => {
    try {
      setIsSaving(true);

      const res: ResponseType<ResponseTypeCreateSuccess> =
        await createEmployeeLeaveBalance(employeeId, data);

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave balance created successfully.',
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

  const handleUpdate = async (data: EmployeeLeaveBalanceForm) => {
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
        await updateEmployeeLeaveBalance(
          employeeId,
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
          detail: res.message || 'Leave balance updated successfully.',
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

  const handleDelete = async (data: EmployeeLeaveBalance) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await deleteEmployeeLeaveBalance(employeeId, data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave balance deleted successfully.',
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

  const handlePurge = async (data: EmployeeLeaveBalance) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await purgeEmployeeLeaveBalance(employeeId, data.id);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave balance deleted permanently.',
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

  const handleRestore = async (data: EmployeeLeaveBalance) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> =
        await restoreEmployeeLeaveBalance(employeeId, data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave balance restored successfully.',
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

  const onSubmit = async (data: EmployeeLeaveBalanceForm) => {
    if (!isValid) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: EmployeeLeaveBalance) => {
    confirmDialog({
      message: 'Do you want to delete this record?',
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

  const onClickRestore = (data: EmployeeLeaveBalance) => {
    confirmDialog({
      message: 'Do you want to restore this record?',
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

  const onClickPurge = (data: EmployeeLeaveBalance) => {
    confirmDialog({
      message: 'Do you want to delete this record forever?',
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

  const periodBody = (rowData: EmployeeLeaveBalance) => {
    return `${dayjs(rowData.period_start).format('DD MMM YYYY')} - ${dayjs(rowData.period_end).format('DD MMM YYYY')}`;
  };

  const statusBody = (rowData: EmployeeLeaveBalance) => {
    if (rowData.deleted_at) {
      return <Tag value="Deleted" severity="secondary" />;
    }

    return <Tag value="Active" severity="success" />;
  };

  const actionColumnBody = (rowData: EmployeeLeaveBalance) => {
    return (
      <div className="flex gap-2">
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
              onClick={() => onClickDelete(rowData)}
            />

            <Button
              tooltipOptions={{ appendTo: () => document.body, position: 'top' }}
              tooltip="update"
              rounded
              severity="help"
              icon="pi pi-pencil"
              size="small"
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

  if (isLoading) return <LoadingDataTable />;

  if (error) {
    return <ErrorNotConnectedToApi mutateKey={currentKey} />;
  }

  return (
    <>
      <ConfirmDialog />

      <Card>
        <div className="flex flex-col gap-5 p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="text-2xl font-semibold text-slate-800">Leave Balance</div>
              <div className="mt-1 text-sm text-slate-500">
                Manage leave balance for {selectedEmployee?.full_name ?? `employee #${employeeId}`}.
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
                  placeholder="Search leave type or period"
                />
              </IconField>

              <Button
                label="New Leave Balance"
                icon="pi pi-plus"
                onClick={onClickNew}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              value={employeeLeaveBalanceData}
              tableStyle={{ minWidth: '92rem' }}
              stripedRows
              paginator
              scrollable
              scrollHeight="500px"
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              dataKey="id"
              globalFilterFields={['leave_type_name', 'period_start', 'period_end']}
              emptyMessage="No leave balance found."
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
              <Column field="leave_type_name" header="Leave Type" style={{ minWidth: '14rem' }} />
              <Column header="Period" body={periodBody} style={{ minWidth: '18rem' }} />
              <Column field="opening_balance" header="Opening" style={{ minWidth: '8rem' }} />
              <Column field="entitlement" header="Entitlement" style={{ minWidth: '8rem' }} />
              <Column field="taken" header="Taken" style={{ minWidth: '7rem' }} />
              <Column field="adjustment" header="Adjustment" style={{ minWidth: '8rem' }} />
              <Column field="expired_balance" header="Expired" style={{ minWidth: '7rem' }} />
              <Column field="closing_balance" header="Closing" style={{ minWidth: '7rem' }} />
              <Column field="deleted_at" header="Status" body={statusBody} style={{ minWidth: '9rem' }} />
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
                <h3 className="text-sm font-semibold text-slate-800">Basic Information</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Define leave type and validity period for this employee balance.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-slate-700">Employee</label>
                  <InputText
                    value={selectedEmployee?.full_name ?? ''}
                    disabled
                    placeholder="Employee"
                  />
                </div>

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
                  <label htmlFor="period_start" className="text-sm font-medium text-slate-700">
                    Period Start
                  </label>
                  <Controller
                    name="period_start"
                    control={control}
                    rules={{ required: 'Period start is required' }}
                    render={({ field, fieldState }) => (
                      <>
                        <Calendar
                          id="period_start"
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
                  <label htmlFor="period_end" className="text-sm font-medium text-slate-700">
                    Period End
                  </label>
                  <Controller
                    name="period_end"
                    control={control}
                    rules={{
                      required: 'Period end is required',
                      validate: (value) => {
                        const start = watch('period_start');
                        if (!start || !value) return true;
                        return dayjs(value).isSame(start, 'day') || dayjs(value).isAfter(start, 'day')
                          || 'Period end must be after or equal to period start';
                      },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <Calendar
                          id="period_end"
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
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Balance Breakdown</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Maintain the leave balance components. Closing balance is calculated automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="opening_balance" className="text-sm font-medium text-slate-700">
                    Opening Balance
                  </label>
                  <Controller
                    name="opening_balance"
                    control={control}
                    rules={{ min: { value: 0, message: 'Must be 0 or greater' } }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="opening_balance"
                          inputRef={field.ref}
                          value={field.value ?? 0}
                          onValueChange={(e) => field.onChange(e.value ?? 0)}
                          useGrouping={false}
                          min={0}
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">{fieldState.error.message}</small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="entitlement" className="text-sm font-medium text-slate-700">
                    Entitlement
                  </label>
                  <Controller
                    name="entitlement"
                    control={control}
                    rules={{ min: { value: 0, message: 'Must be 0 or greater' } }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="entitlement"
                          inputRef={field.ref}
                          value={field.value ?? 0}
                          onValueChange={(e) => field.onChange(e.value ?? 0)}
                          useGrouping={false}
                          min={0}
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">{fieldState.error.message}</small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="taken" className="text-sm font-medium text-slate-700">
                    Taken
                  </label>
                  <Controller
                    name="taken"
                    control={control}
                    rules={{ min: { value: 0, message: 'Must be 0 or greater' } }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="taken"
                          inputRef={field.ref}
                          value={field.value ?? 0}
                          onValueChange={(e) => field.onChange(e.value ?? 0)}
                          useGrouping={false}
                          min={0}
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">{fieldState.error.message}</small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="adjustment" className="text-sm font-medium text-slate-700">
                    Adjustment
                  </label>
                  <Controller
                    name="adjustment"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="adjustment"
                          inputRef={field.ref}
                          value={field.value ?? 0}
                          onValueChange={(e) => field.onChange(e.value ?? 0)}
                          useGrouping={false}
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">{fieldState.error.message}</small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="expired_balance" className="text-sm font-medium text-slate-700">
                    Expired Balance
                  </label>
                  <Controller
                    name="expired_balance"
                    control={control}
                    rules={{ min: { value: 0, message: 'Must be 0 or greater' } }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="expired_balance"
                          inputRef={field.ref}
                          value={field.value ?? 0}
                          onValueChange={(e) => field.onChange(e.value ?? 0)}
                          useGrouping={false}
                          min={0}
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">{fieldState.error.message}</small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="closing_balance" className="text-sm font-medium text-slate-700">
                    Closing Balance
                  </label>
                  <Controller
                    name="closing_balance"
                    control={control}
                    render={({ field }) => (
                      <>
                        <InputNumber
                          id="closing_balance"
                          inputRef={field.ref}
                          value={field.value ?? 0}
                          useGrouping={false}
                          disabled
                        />
                        <small className="text-slate-500">
                          Calculated automatically from the balance formula.
                        </small>
                      </>
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default EmployeeTimeLeaveTableData;