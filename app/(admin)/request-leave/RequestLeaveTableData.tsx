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
import { ConfirmDialog } from 'primereact/confirmdialog';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { useDispatch, useSelector } from 'react-redux';
// import { Tag } from 'primereact/tag';
import { Checkbox } from 'primereact/checkbox';
import { RootState } from '@/store/store';
// import { hasRole } from '@/app/utils/role-utils';
import { createRequestLeave, updateRequestLeave } from '@/app/services/request-leave-service';
import { RequestLeave } from '@/app/types/request-leave';
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import { Employee } from '@/app/types/employee';
import { EmployeeLeaveBalance } from '@/app/types/employee-leave-balance';
import dayjs from 'dayjs';
import { LeaveType } from '@/app/types/leave-type';


const RequestLeaveTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<RequestLeave | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors, watch, setValue } = useForm<RequestLeave>();
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
    setIsViewOnly(false);
    setPopupHeaderTitle("New Request Leave");
    reset({
      id: 0,
      employee_id: 0,
      employee_leave_balance_id: 0,
      start_date: null,
      end_date: null,
      total_days: 0,
      reason: '',
      // status: '',
      // approved_by: '',
      // approved_at: null,
      deleted_at: '',
      row_version: 0,
    });
  }

  const footerContent = (
    <div className='text-right flex gap-5 justify-end'>
      <Button disabled={isViewOnly} type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); }} className="p-button-text" />
      <Button disabled={isViewOnly} type="submit" label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" />
    </div>
  );

  const { data: RequestLeaveData, error, isLoading } = useSWR<RequestLeave[]>(`/api/request-leave?show_all=${isShowDeletedDataChecked}`, fetcher);

  const { data: employeeData, error: employeeError, isLoading: employeeIsLoading } = useSWR<Employee[]>(`/api/employees`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
  const { data: leaveBalanceData, error: leaveBalanceError, isLoading: leaveBalanceIsLoading } = useSWR<EmployeeLeaveBalance[]>(watch('employee_id') ? `/api/employees/leave-balance` : null, fetcher);
  const { data: leaveTypeData, error: leaveTypeError, isLoading: leaveTypeIsLoading } = useSWR<LeaveType[]>(`/api/leave-type`, fetcher);

  const employeeActive = employeeData?.filter(e => e.id === profileState.employee_id);
  const leaveBalanceActive = leaveBalanceData?.filter(a => a.closing_balance > 0);
  const leaveTypeActive = leaveTypeData?.filter(a => a.is_active);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/request-leave?show_all=true' />
  }


  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const handleSubmitNew = async (data: RequestLeave) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createRequestLeave(data);
      setVisible(false);
      reset();
      mutate(`/api/request-leave?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: RequestLeave) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    try {
      console.log(selectedData.row_version, 'hiyaa')
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateRequestLeave(selectedData.id, selectedData.row_version, data)

      setVisible(false);
      mutate(`/api/request-leave?show_all=${isShowDeletedDataChecked}`);
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

  // const handleDelete = async (data: RequestLeave) => {
  //   try {
  //     const res: ResponseType<ResponseTypeCreateSuccess> = await deleteRequestLeave(data.id, data.row_version);
  //     setVisible(false);
  //     reset();
  //     mutate(`/api/request-leave?show_all=${isShowDeletedDataChecked}`);

  //     dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
  //   } catch (err: unknown) {
  //     if (isResponseTypeError(err)) {
  //       dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
  //     } else if (err instanceof Error) {
  //       dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
  //     }
  //   }
  // }

  // const handlePurge = async (data: RequestLeave) => {
  //   try {
  //     const res: ResponseType<ResponseTypeCreateSuccess> = await purgeRequestLeave(data.id);
  //     setVisible(false);
  //     reset();
  //     mutate(`/api/request-leave?show_all=${isShowDeletedDataChecked}`);

  //     dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
  //   } catch (err: unknown) {
  //     if (isResponseTypeError(err)) {
  //       dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
  //     } else if (err instanceof Error) {
  //       dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
  //     }
  //   }
  // }

  // const handleRestore = async (data: RequestLeave) => {
  //   try {
  //     const res: ResponseType<ResponseTypeCreateSuccess> = await restoreRequestLeave(data.id, data.row_version);
  //     setVisible(false);
  //     reset();
  //     mutate(`/api/request-leave?show_all=${isShowDeletedDataChecked}`);

  //     dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
  //   } catch (err: unknown) {
  //     if (isResponseTypeError(err)) {
  //       dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
  //     } else if (err instanceof Error) {
  //       dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
  //     }
  //   }
  // }

  const onSubmit = (data: RequestLeave) => {
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

  const onClickUpdate = (data: RequestLeave) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle('Update RequestLeave');
    setIsViewOnly(true)

    const viewData = {
      ...data,
      start_date: dayjs(data.start_date).toDate(),
      end_date: dayjs(data.end_date).toDate()
    }
    reset(viewData)
    setSelectedData(viewData);
  }


  // const activeColumnBody = (rowData: RequestLeave) => {
  //   return rowData.is_active ? (
  //     <Tag value="Active" severity="success" />
  //   ) : (
  //     <Tag value="Inactive" severity="danger" />
  //   );
  // };


  const actionColumnBody = (rowData: RequestLeave) => {
    return <>
      <div className="flex gap-2">
        {/* {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />} */}

        {/* {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { onClickUpdate(rowData) }} /> */}
        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='view' rounded severity='help' label="" icon="pi pi-search" size="small" onClick={() => { onClickUpdate(rowData) }} />
      </div>
    </>
  };

  const approvedAtColumnBody = (rowData: RequestLeave) => {
    const approved_at_date = dayjs(rowData.approved_at);

    return <>
      {approved_at_date.isValid() ? approved_at_date.format('DD-MM-YYYY HH:mm') : ''}
    </>
  };

  const startDateColumnBody = (rowData: RequestLeave) => {
    const start_date = dayjs(rowData.start_date);

    return <>
      {start_date.isValid() ? start_date.format('DD-MM-YYYY') : ''}
    </>
  };

  const endDateColumnBody = (rowData: RequestLeave) => {
    const end_date = dayjs(rowData.end_date);

    return <>
      {end_date.isValid() ? end_date.format('DD-MM-YYYY') : ''}
    </>
  };

  // const onClickDelete = (data: RequestLeave) => {
  //   confirmDialog({
  //     message: 'Do you want to delete this record?',
  //     header: 'Delete Confirmation',
  //     icon: 'pi pi-info-circle',
  //     defaultFocus: 'accept',
  //     accept: () => {
  //       setSelectedData(data);
  //       handleDelete(data);
  //     },
  //     reject: () => { },
  //     footer: (options) => (
  //       <div className="flex gap-3 justify-end">
  //         <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
  //         <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
  //       </div>
  //     )
  //   });
  // };

  // const onClickRestore = (data: RequestLeave) => {
  //   confirmDialog({
  //     message: 'Do you want to restore this record?',
  //     header: 'Restore Confirmation',
  //     icon: 'pi pi-info-circle',
  //     defaultFocus: 'accept',
  //     accept: () => {
  //       setSelectedData(data);
  //       handleRestore(data);
  //     },
  //     reject: () => { },
  //     footer: (options) => (
  //       <div className="flex gap-3 justify-end">
  //         <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
  //         <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-success" />
  //       </div>
  //     )
  //   });
  // };

  // const onClickPurge = (data: RequestLeave) => {
  //   confirmDialog({
  //     message: 'Do you want to delete this record forever?',
  //     header: 'Delete Confirmation',
  //     icon: 'pi pi-info-circle',
  //     defaultFocus: 'accept',
  //     accept: () => {
  //       handlePurge(data);
  //     },
  //     reject: () => { },
  //     footer: (options) => (
  //       <div className="flex gap-3 justify-end">
  //         <Button label="No" icon="pi pi-times" onClick={options.reject} className="p-button-text" />
  //         <Button label="Yes" icon="pi pi-check" onClick={options.accept} className="p-button-danger" />
  //       </div>
  //     )
  //   });
  // };

  const calculateTotalDays = () => {
    const start_date = dayjs(watch('start_date'));
    const end_date = dayjs(watch('end_date'));
    const total = end_date.diff(start_date, "day") + 1;

    if (total <= 0) {
      setValue('total_days', 0);
      return;
    }

    setValue('total_days', total);
  }

  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title='Request Leave' url='' />}>
        <div className="p-3 flex flex-col gap-5">
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
            value={RequestLeaveData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No RequestLeave found."
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1} />
            <Column field="leave_name" header="Leave" />
            <Column header="Start Date" body={(rowData) => startDateColumnBody(rowData)} />
            <Column header="End Date" body={(rowData) => endDateColumnBody(rowData)} />

            <Column field="total_days" header="Total Days" />
            <Column field="reason" header="Reason" />
            <Column field="status" header="Status" />
            <Column field="approved_by_name" header="Approved By" />
            <Column header="Approved At" body={(rowData) => approvedAtColumnBody(rowData)} />
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
          style={{ width: '50vw' }}
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
                      disabled={employeeIsLoading || !!employeeError || isViewOnly}
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
                      loading={leaveTypeIsLoading}
                      disabled={leaveTypeIsLoading || !!leaveTypeError || isViewOnly}
                      onChange={(e) => field.onChange(e.value)}
                      optionLabel="name"
                      optionValue="id"
                      placeholder={leaveTypeIsLoading ? "Loading leave types..." : "Select a leave type"}
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {leaveBalanceError && <small className="p-error font-bold">We couldn’t load the list of leave types. Please try again</small>}
                  </>
                )}
              />
            </div>

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="employee_leave_balance_id">Leave Balance</label>
              <Controller
                name="employee_leave_balance_id"
                control={control}
                rules={{ required: "Leave type is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="employee_leave_balance_id"
                      appendTo={() => document.body}
                      value={field.value}
                      options={leaveBalanceActive}
                      loading={leaveBalanceIsLoading}
                      disabled={leaveBalanceIsLoading || !!leaveBalanceError || isViewOnly}
                      onChange={(e) => field.onChange(e.value)}
                      optionLabel="leave_type_name"
                      optionValue="id"
                      placeholder={leaveBalanceIsLoading ? "Loading leave balances..." : "Select a leave balance"}
                      className={fieldState.invalid ? "p-invalid" : ""}
                      itemTemplate={(option) => (
                        <span>{option.leave_type_name} ({option.closing_balance} left)</span>
                      )}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {leaveBalanceError && <small className="p-error font-bold">We couldn’t load the list of leave balances. Please try again</small>}
                  </>
                )}
              />
            </div>

            <div className="flex w-full gap-5">
              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="start_date">Start Date</label>
                <Controller
                  name="start_date"
                  control={control}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        disabled={isViewOnly}
                        dateFormat='dd-mm-yy'
                        appendTo={() => document.body}
                        {...field}
                        id="start_date"
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.value);
                          calculateTotalDays()
                        }}
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
                <label htmlFor="end_date">End Date</label>
                <Controller
                  name="end_date"
                  control={control}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        disabled={isViewOnly}
                        dateFormat='dd-mm-yy'
                        appendTo={() => document.body}
                        {...field}
                        id="end_date"
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.value);
                          calculateTotalDays()
                        }}
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

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="total_days">Total Days</label>
              <Controller
                name="total_days"
                control={control}
                defaultValue={0}
                rules={{ required: "*required", }}
                render={({ field, fieldState }) => (
                  <>
                    <InputNumber
                      disabled
                      id="total_days"
                      placeholder='example: input 20 for 20 minutes'
                      inputRef={field.ref} onValueChange={(e) => field.onChange(e.value)}
                      value={Number(field.value ? field.value : 0)}
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
              <label htmlFor="reason">Reason</label>
              <Controller
                name="reason"
                control={control}
                rules={{ required: "*required", maxLength: { value: 50, message: 'maximum 50 character' } }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      disabled={isViewOnly}
                      id="reason"
                      placeholder=''
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

            {/* <div className="m-0 flex flex-col gap-2">
              <label htmlFor="status">Status</label>
              <Controller
                name="status"
                disabled={true}
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="status"
                      placeholder=''
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
              <label htmlFor="approved_by">Approved By</label>
              <Controller
                name="approved_by"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      disabled
                      id="approved_by"
                      placeholder=''
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
              <label htmlFor="approved_at">Approved Date</label>
              <Controller
                name="approved_at"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Calendar
                      disabled
                      dateFormat='dd-mm-yy'
                      appendTo={() => document.body}
                      {...field}
                      id="approved_at"
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
            </div> */}
          </div>
        </Dialog>
      </form>
    </>
  );
}

export default RequestLeaveTableData