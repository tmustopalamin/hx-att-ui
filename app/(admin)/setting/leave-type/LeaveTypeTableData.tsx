'use client'

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import useSWR, { mutate } from 'swr';
import { useDispatch, useSelector } from 'react-redux';

import { Card } from 'primereact/card';
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import { InputSwitch } from 'primereact/inputswitch';
import { Checkbox } from 'primereact/checkbox';
import { Tag } from 'primereact/tag';
import { InputNumber } from 'primereact/inputnumber';

import { fetcher } from '@/app/utils/fetcher';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { hasRole } from '@/app/utils/role-utils';
import { showToast } from '@/store/ToastSlice';
import { RootState } from '@/store/store';

import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import { LeaveType } from '@/app/types/leave-type';
import {
  createLeaveType,
  updateLeaveType,
  deleteLeaveType,
  purgeLeaveType,
  restoreLeaveType,
} from '@/app/services/leave-type-service';

const defaultFormValue: LeaveType = {
  id: 0,
  code: '',
  name: '',
  description: '',
  is_paid: true,
  is_deductible: true,
  max_days: null,
  carry_forward: false,
  is_active: true,
  deleted_at: null,
  row_version: 0,
  requires_attachment: false,
  requires_reason: true,
  requires_approval: true,
};

const LeaveTypeTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  const [selectedData, setSelectedData] = useState<LeaveType | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('New Leave Type');
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const currentKey = `/api/leave-type?show_all=${isShowDeletedDataChecked}`;

  const {
    control,
    handleSubmit,
    setFocus,
    reset,
    clearErrors,
    formState: { isValid },
  } = useForm<LeaveType>({
    defaultValues: defaultFormValue,
    mode: 'onTouched',
  });

  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });

  const { data: leaveTypeData, error, isLoading } = useSWR<LeaveType[]>(currentKey, fetcher);

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
    reset(defaultFormValue);
  };

  const onClickNew = () => {
    clearErrors();
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle('New Leave Type');
    reset(defaultFormValue);
  };

  const onClickUpdate = (data: LeaveType) => {
    clearErrors();
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle('Update Leave Type');
    setSelectedData(data);

    reset({
      ...data,
      max_days: data.max_days ?? null,
      deleted_at: data.deleted_at ?? null,
      requires_attachment: !!data.requires_attachment,
      requires_reason: data.requires_reason ?? true,
      requires_approval: data.requires_approval ?? true,
    });
  };

  const handleSubmitNew = async (data: LeaveType) => {
    try {
      setIsSaving(true);

      const res: ResponseType<ResponseTypeCreateSuccess> = await createLeaveType(data);

      await refreshData();
      handleDialogHide();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave type created successfully.',
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

  const handleUpdate = async (data: LeaveType) => {
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

      const res: ResponseType<ResponseTypeCreateSuccess> = await updateLeaveType(
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
          detail: res.message || 'Leave type updated successfully.',
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

  const handleDelete = async (data: LeaveType) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteLeaveType(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave type deleted successfully.',
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

  const handlePurge = async (data: LeaveType) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeLeaveType(data.id);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave type deleted permanently.',
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

  const handleRestore = async (data: LeaveType) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreLeaveType(data.id, data.row_version);

      await refreshData();

      dispatch(
        showToast({
          visible: true,
          severity: 'success',
          summary: 'Success',
          detail: res.message || 'Leave type restored successfully.',
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

  const onSubmit = async (data: LeaveType) => {
    if (!isValid) {
      return;
    }

    if (isAddNew) {
      await handleSubmitNew(data);
      return;
    }

    await handleUpdate(data);
  };

  const onClickDelete = (data: LeaveType) => {
    confirmDialog({
      message: 'Do you want to delete this record?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        handleDelete(data);
      },
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
        </div>
      ),
    });
  };

  const onClickRestore = (data: LeaveType) => {
    confirmDialog({
      message: 'Do you want to restore this record?',
      header: 'Restore Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        handleRestore(data);
      },
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-success" />
        </div>
      ),
    });
  };

  const onClickPurge = (data: LeaveType) => {
    confirmDialog({
      message: 'Do you want to delete this record forever?',
      header: 'Delete Forever Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        handlePurge(data);
      },
      reject: () => { },
      footer: (options) => (
        <div className="flex justify-end gap-3">
          <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
          <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
        </div>
      ),
    });
  };

  const activeColumnBody = (rowData: LeaveType) => {
    if (rowData.deleted_at) {
      return <Tag value="Deleted" severity="secondary" />;
    }

    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  const booleanIconBody = (value: boolean) => {
    return value ? <i className="pi pi-check" /> : <i className="pi pi-times" />;
  };

  const maxDaysBody = (rowData: LeaveType) => {
    return rowData.max_days ?? '-';
  };

  const actionColumnBody = (rowData: LeaveType) => {
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

  if (isLoading) {
    return <LoadingDataTable />;
  }

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
              <div className="text-2xl font-semibold text-slate-800">Leave Type</div>
              <div className="mt-1 text-sm text-slate-500">
                Manage leave type master data and leave rules.
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
                  placeholder="Search code, name, or description"
                />
              </IconField>

              <Button label="New Leave Type" icon="pi pi-plus" onClick={onClickNew} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <DataTable
              value={leaveTypeData}
              tableStyle={{ minWidth: '90rem' }}
              stripedRows
              paginator
              scrollable
              scrollHeight="500px"
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              dataKey="id"
              globalFilterFields={['code', 'name', 'description']}
              emptyMessage="No leave type found."
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
              <Column field="code" header="Code" style={{ minWidth: '10rem' }} />
              <Column field="name" header="Name" style={{ minWidth: '14rem' }} />
              <Column field="description" header="Description" style={{ minWidth: '18rem' }} />
              <Column field="is_paid" header="Paid" body={(rowData) => booleanIconBody(rowData.is_paid)} style={{ minWidth: '7rem' }} />
              <Column field="is_deductible" header="Deduct Balance" body={(rowData) => booleanIconBody(rowData.is_deductible)} style={{ minWidth: '10rem' }} />
              <Column field="max_days" header="Max Days" body={maxDaysBody} style={{ minWidth: '8rem' }} />
              <Column field="carry_forward" header="Carry Forward" body={(rowData) => booleanIconBody(rowData.carry_forward)} style={{ minWidth: '10rem' }} />
              <Column field="requires_attachment" header="Need Attachment" body={(rowData) => booleanIconBody(rowData.requires_attachment)} style={{ minWidth: '11rem' }} />
              <Column field="requires_reason" header="Need Reason" body={(rowData) => booleanIconBody(rowData.requires_reason)} style={{ minWidth: '10rem' }} />
              <Column field="requires_approval" header="Need Approval" body={(rowData) => booleanIconBody(rowData.requires_approval)} style={{ minWidth: '10rem' }} />
              <Column field="is_active" header="Status" body={activeColumnBody} style={{ minWidth: '9rem' }} />
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
            setFocus('code');
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
                  Define the main identity of this leave type so it is easy to recognize and manage.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <label htmlFor="code" className="text-sm font-medium text-slate-700">
                    Code
                  </label>
                  <Controller
                    name="code"
                    control={control}
                    rules={{
                      required: '*required',
                      validate: (value) =>
                        !/\s/.test(value) || 'must not contain spaces.',
                      maxLength: { value: 50, message: 'maximum 50 character' },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputText
                          id="code"
                          placeholder="example: ANNUAL"
                          {...field}
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving || !isAddNew}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">{fieldState.error.message}</small>
                        )}
                        {!fieldState.error && !isAddNew && (
                          <small className="text-slate-500">
                            Code cannot be changed after the leave type is created.
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="name" className="text-sm font-medium text-slate-700">
                    Name
                  </label>
                  <Controller
                    name="name"
                    control={control}
                    rules={{
                      required: '*required',
                      maxLength: { value: 100, message: 'maximum 100 character' },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputText
                          id="name"
                          placeholder="example: Annual Leave"
                          {...field}
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

                <div className="flex flex-col gap-2 md:col-span-2">
                  <label htmlFor="description" className="text-sm font-medium text-slate-700">
                    Description
                  </label>
                  <Controller
                    name="description"
                    control={control}
                    rules={{
                      required: '*required',
                      maxLength: { value: 500, message: 'maximum 500 character' },
                    }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputTextarea
                          id="description"
                          placeholder="Explain the purpose and rule of this leave type"
                          {...field}
                          rows={4}
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
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Leave Configuration</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Configure how this leave behaves in terms of availability, payment, balance deduction, and carry forward.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="max_days" className="text-sm font-medium text-slate-700">
                    Maximum Days
                  </label>
                  <Controller
                    name="max_days"
                    control={control}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="max_days"
                          placeholder="Leave empty if no limit"
                          inputRef={field.ref}
                          onValueChange={(e) => field.onChange(e.value ?? null)}
                          value={field.value ?? null}
                          useGrouping={false}
                          min={0}
                          className={fieldState.invalid ? 'p-invalid' : ''}
                          disabled={isSaving}
                        />
                        {fieldState.error && (
                          <small className="font-bold p-error">{fieldState.error.message}</small>
                        )}
                        {!fieldState.error && (
                          <small className="text-slate-500">
                            Fill this only if the leave type has a fixed maximum duration.
                          </small>
                        )}
                      </>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="grid grid-cols-[1fr_auto] gap-4">
                      <div className="min-w-0">
                        <label htmlFor="is_active" className="block text-sm font-medium text-slate-700">
                          Active
                        </label>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Control whether this leave type can still be selected in new leave requests.
                        </p>
                      </div>
                      <div className="pt-1">
                        <Controller
                          name="is_active"
                          control={control}
                          defaultValue={true}
                          render={({ field }) => (
                            <InputSwitch
                              id="is_active"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.value)}
                              disabled={isSaving}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="grid grid-cols-[1fr_auto] gap-4">
                      <div className="min-w-0">
                        <label htmlFor="is_paid" className="block text-sm font-medium text-slate-700">
                          Paid Leave
                        </label>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Turn this on if employees continue receiving normal pay while using this leave.
                        </p>
                      </div>
                      <div className="pt-1">
                        <Controller
                          name="is_paid"
                          control={control}
                          defaultValue={true}
                          render={({ field }) => (
                            <InputSwitch
                              id="is_paid"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.value)}
                              disabled={isSaving}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="grid grid-cols-[1fr_auto] gap-4">
                      <div className="min-w-0">
                        <label htmlFor="is_deductible" className="block text-sm font-medium text-slate-700">
                          Deduct from Balance
                        </label>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Turn this on if approved leave should reduce the employee leave balance.
                        </p>
                      </div>
                      <div className="pt-1">
                        <Controller
                          name="is_deductible"
                          control={control}
                          defaultValue={true}
                          render={({ field }) => (
                            <InputSwitch
                              id="is_deductible"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.value)}
                              disabled={isSaving}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="grid grid-cols-[1fr_auto] gap-4">
                      <div className="min-w-0">
                        <label htmlFor="carry_forward" className="block text-sm font-medium text-slate-700">
                          Carry Forward
                        </label>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Turn this on if unused balance for this leave type may be carried to the next period.
                        </p>
                      </div>
                      <div className="pt-1">
                        <Controller
                          name="carry_forward"
                          control={control}
                          defaultValue={false}
                          render={({ field }) => (
                            <InputSwitch
                              id="carry_forward"
                              checked={field.value}
                              onChange={(e) => field.onChange(e.value)}
                              disabled={isSaving}
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-slate-800">Request Requirements</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Define what employees must provide when they request this leave type.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid grid-cols-[1fr_auto] gap-4">
                    <div className="min-w-0">
                      <label htmlFor="requires_attachment" className="block text-sm font-medium text-slate-700">
                        Requires Attachment
                      </label>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Enable this if the leave request must include supporting documents.
                      </p>
                    </div>
                    <div className="pt-1">
                      <Controller
                        name="requires_attachment"
                        control={control}
                        defaultValue={false}
                        render={({ field }) => (
                          <InputSwitch
                            id="requires_attachment"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.value)}
                            disabled={isSaving}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid grid-cols-[1fr_auto] gap-4">
                    <div className="min-w-0">
                      <label htmlFor="requires_reason" className="block text-sm font-medium text-slate-700">
                        Requires Reason
                      </label>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Enable this if employees must provide a reason before submitting the leave.
                      </p>
                    </div>
                    <div className="pt-1">
                      <Controller
                        name="requires_reason"
                        control={control}
                        defaultValue={true}
                        render={({ field }) => (
                          <InputSwitch
                            id="requires_reason"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.value)}
                            disabled={isSaving}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid grid-cols-[1fr_auto] gap-4">
                    <div className="min-w-0">
                      <label htmlFor="requires_approval" className="block text-sm font-medium text-slate-700">
                        Requires Approval
                      </label>
                      <p className="mt-1 text-sm leading-6 text-slate-500">
                        Enable this if the leave must go through an approval flow before it becomes final.
                      </p>
                    </div>
                    <div className="pt-1">
                      <Controller
                        name="requires_approval"
                        control={control}
                        defaultValue={true}
                        render={({ field }) => (
                          <InputSwitch
                            id="requires_approval"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.value)}
                            disabled={isSaving}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog>
      </form>
    </>
  );
};

export default LeaveTypeTableData;