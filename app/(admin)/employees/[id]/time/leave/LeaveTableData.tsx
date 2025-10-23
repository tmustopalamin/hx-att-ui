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
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Checkbox } from 'primereact/checkbox';
import { RootState } from '@/store/store';
import { hasRole } from '@/app/utils/role-utils';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { Employee } from '@/app/types/employee';
import { LeaveType } from '@/app/types/leave-type';
import { EmployeeLeaveBalance } from '@/app/types/employee-leave-balance';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import { createEmployeeLeaveBalance, updateEmployeeLeaveBalance, deleteEmployeeLeaveBalance, purgeEmployeeLeaveBalance, restoreEmployeeLeaveBalance } from '@/app/services/employee-leave-balance-service';


const EmployeeTimeLeaveTableData = () => {
  const params = useParams();
  const id = params.id;

  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<EmployeeLeaveBalance | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors, watch, setValue } = useForm<EmployeeLeaveBalance>();
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
    setPopupHeaderTitle("New Leave Balance");
    reset({
      id: 0,
      employee_id: 0,
      leave_type_id: 0,
      period_start: null,
      period_end: null,
      opening_balance: 0,
      entitlement: 0,
      taken: 0,
      adjustment: 0,
      closing_balance: 0,
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

  const { data: EmployeeLeaveBalanceData, error, isLoading } = useSWR<EmployeeLeaveBalance[]>(`/api/employees/${id}/leave-balance?show_all=${isShowDeletedDataChecked}`, fetcher);
  const { data: employeeData, error: employeeError, isLoading: employeeIsLoading } = useSWR<Employee[]>(`/api/employees`, fetcher);
  const { data: leaveTypeData, error: leaveTypeError, isLoading: leaveTypeIsLoading } = useSWR<LeaveType[]>(`/api/leave-type`, fetcher);
  const employeeActive = employeeData?.filter(a => a.id === Number(id));
  const leaveTypeActive = leaveTypeData?.filter(a => a.is_active);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey={`/api/employees/${id}/leave-balance?show_all=true`} />
  }


  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const calculateClosingBalance = () => {
    const opening_balance = watch('opening_balance');
    const entitlement = watch('entitlement');
    const adjustment = watch('adjustment');
    const taken = watch('taken');

    const closing_balance = (Number(opening_balance) + Number(entitlement) + Number(adjustment)) - Number(taken);
    setValue('closing_balance', closing_balance);
  }

  const handleSubmitNew = async (data: EmployeeLeaveBalance) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createEmployeeLeaveBalance(data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/leave-balance?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: EmployeeLeaveBalance) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateEmployeeLeaveBalance(selectedData.id, selectedData.row_version, data)

      setVisible(false);
      mutate(`/api/employees/${id}/leave-balance?show_all=${isShowDeletedDataChecked}`);
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

  const handleDelete = async (data: EmployeeLeaveBalance) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteEmployeeLeaveBalance(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/leave-balance?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handlePurge = async (data: EmployeeLeaveBalance) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeEmployeeLeaveBalance(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/leave-balance?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleRestore = async (data: EmployeeLeaveBalance) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreEmployeeLeaveBalance(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/leave-balance?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onSubmit = (data: EmployeeLeaveBalance) => {
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

  const onClickUpdate = (data: EmployeeLeaveBalance) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle('Update Leave Balance');

    const updatedData = {
      ...data,
      period_start: dayjs(data.period_start).toDate(),
      period_end: dayjs(data.period_end).toDate(),
    }

    reset(updatedData)
    setSelectedData(updatedData);
  }

  // const activeColumnBody = (rowData: EmployeeLeaveBalance) => {
  //   return rowData.is_active ? (
  //     <Tag value="Active" severity="success" />
  //   ) : (
  //     <Tag value="Inactive" severity="danger" />
  //   );
  // };

  const actionColumnBody = (rowData: EmployeeLeaveBalance) => {
    return <>
      <div className="flex gap-2">
        {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

        {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { onClickUpdate(rowData) }} />
      </div>
    </>
  };

  const onClickDelete = (data: EmployeeLeaveBalance) => {
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

  const onClickRestore = (data: EmployeeLeaveBalance) => {
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

  const onClickPurge = (data: EmployeeLeaveBalance) => {
    confirmDialog({
      message: 'Do you want to delete this record forever?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
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

  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title='Leave Balance' url='' />}>
        <div className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Button label="New" icon="pi pi-plus" size="small" onClick={() => onClickNew()} />

              <div className="flex align-items-center pl-5">
                <Checkbox
                  inputId="showDeletedData"
                  name="showDeletedData"
                  value="yes"
                  onChange={onIngredientsChange}
                  checked={isShowDeletedDataChecked}
                />
                <label htmlFor="showDeletedData" className="ml-2">Show deleted data</label>
              </div>
            </div>

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

          <DataTable
            value={EmployeeLeaveBalanceData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No data found."
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1} />
            <Column field="leave_type_name" header="Leave" />
            <Column field="period_start" header="Period Start" />
            <Column field="period_end" header="Period End" />
            <Column field="taken" header="Taken" />
            <Column field="closing_balance" header="Closing Balance" />
            {/* <Column field="is_active" header="Active" body={activeColumnBody} /> */}
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header="Action"
              body={(rowData) => actionColumnBody(rowData)}
              frozen={true}
              alignFrozen="right"
            />
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          className='w-[90%] md:w-[70%]'
          onHide={() => { if (!visible) return; setVisible(false); reset(); }}
          footer={footerContent}
          onShow={() => setFocus('employee_id')}
        >
          <div className="flex flex-col gap-5">
            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="employee_id">Employee</label>
              <Controller
                name="employee_id"
                control={control}
                rules={{ required: "Employee is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="employee_id"
                      appendTo={() => document.body}
                      value={field.value}
                      options={employeeActive}
                      loading={isLoading}
                      disabled={employeeIsLoading || !!employeeError}
                      onChange={(e) => field.onChange(e.value)}
                      optionLabel="full_name"
                      optionValue="id"
                      placeholder={isLoading ? "Loading employees..." : "Select an employee"}
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {employeeError && <small className="p-error font-bold">We couldn’t load the list of employees. Please try again</small>}
                  </>
                )}
              />
            </div>

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="leave_type_id">Leave Type</label>
              <Controller
                name="leave_type_id"
                control={control}
                rules={{ required: "Leave type is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="leave_type_id"
                      appendTo={() => document.body}
                      value={field.value}
                      options={leaveTypeActive}
                      loading={isLoading}
                      disabled={leaveTypeIsLoading || !!leaveTypeError}
                      onChange={(e) => field.onChange(e.value)}
                      optionLabel="name"
                      optionValue="id"
                      placeholder={isLoading ? "Loading leave types..." : "Select a leave type"}
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {leaveTypeError && <small className="p-error font-bold">We couldn’t load the list of leave types. Please try again</small>}
                  </>
                )}
              />
            </div>

            <div className="flex w-full gap-5">
              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="period_start">Period Start</label>
                <Controller
                  name="period_start"
                  control={control}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        dateFormat='dd-mm-yy'
                        appendTo={() => document.body}
                        {...field}
                        id="period_start"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        hourFormat="24"
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error"> {fieldState.error.message} </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="period_end">Period End</label>
                <Controller
                  name="period_end"
                  control={control}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        dateFormat='dd-mm-yy'
                        appendTo={() => document.body}
                        {...field}
                        id="period_end"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}
                        hourFormat="24"
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error"> {fieldState.error.message} </small>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div className="flex w-full gap-5">
              <div className="m-0 flex flex-col gap-2 flex-1">
                <label htmlFor="opening_balance">Opening Balance</label>
                <Controller
                  name="opening_balance"
                  control={control}
                  defaultValue={0}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="opening_balance"
                        placeholder='input amount of balance'
                        inputRef={field.ref} onValueChange={(e) => {
                          field.onChange(e.value)
                          calculateClosingBalance()
                        }}
                        value={Number(field.value ? field.value : 0)}
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error"> {fieldState.error.message} </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="m-0 flex flex-col gap-2 flex-1">
                <label htmlFor="entitlement">Entitlement</label>
                <Controller
                  name="entitlement"
                  control={control}
                  defaultValue={0}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="entitlement"
                        placeholder='input amount of balance'
                        inputRef={field.ref} onValueChange={(e) => {
                          field.onChange(e.value);
                          calculateClosingBalance();
                        }}
                        value={Number(field.value ? field.value : 0)}
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error"> {fieldState.error.message} </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="m-0 flex flex-col gap-2 flex-1">
                <label htmlFor="taken">taken</label>
                <Controller
                  name="taken"
                  control={control}
                  defaultValue={0}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="taken"
                        disabled={isAddNew ? true : false}
                        placeholder='input amount of balance'
                        inputRef={field.ref} onValueChange={(e) => {
                          field.onChange(e.value);
                          calculateClosingBalance();
                        }}
                        value={Number(field.value ? field.value : 0)}
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error"> {fieldState.error.message} </small>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

            <div className="flex w-full gap-5">
              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="adjustment">Adjustment</label>
                <Controller
                  name="adjustment"
                  control={control}
                  defaultValue={0}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="adjustment"
                        placeholder='input amount of balance'
                        inputRef={field.ref} onValueChange={(e) => {
                          field.onChange(e.value);
                          calculateClosingBalance();
                        }}
                        value={Number(field.value ? field.value : 0)}
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error"> {fieldState.error.message} </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="closing_balance">Closing Balance</label>
                <Controller
                  name="closing_balance"
                  control={control}
                  defaultValue={0}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="closing_balance"
                        disabled={true}
                        placeholder='input amount of balance'
                        inputRef={field.ref} onValueChange={(e) => field.onChange(e.value)}
                        value={Number(field.value ? field.value : 0)}
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error"> {fieldState.error.message} </small>
                      )}
                    </>
                  )}
                />
              </div>

              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="expired_balance">Expired Balance</label>
                <Controller
                  name="expired_balance"
                  control={control}
                  defaultValue={0}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="expired_balance"
                        disabled={true}
                        placeholder='input amount of balance'
                        inputRef={field.ref} onValueChange={(e) => field.onChange(e.value)}
                        value={Number(field.value ? field.value : 0)}
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error"> {fieldState.error.message} </small>
                      )}
                    </>
                  )}
                />
              </div>
            </div>

          </div>
        </Dialog>
      </form>
    </>
  );
}

export default EmployeeTimeLeaveTableData