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
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import { ResponseType, ResponseTypeCreateSuccess } from '@/app/types/response-type';
import { isResponseTypeError, getErrorMessage } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { useDispatch, useSelector } from 'react-redux';
import { Tag } from 'primereact/tag';
import { Checkbox } from 'primereact/checkbox';
import { RootState } from '@/store/store';
import { hasRole } from '@/app/utils/role-utils';
import { Shift } from '@/app/types/shift';
import { createShift, updateShift, deleteShift, purgeShift, restoreShift } from '@/app/services/shift-service';
import { Calendar } from 'primereact/calendar';
import { InputNumber } from 'primereact/inputnumber';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import LoadingDataTable from '@/app/_components/LoadingDataTable';


const ShiftTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<Shift | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors } = useForm<Shift>();

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    _filters['global'].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const onClickNew = () => {
    clearErrors();
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Shift");
    reset({
      id: 0,
      name: '',
      work_start: null,
      work_end: null,
      break_start: null,
      break_end: null,
      grace_period_minutes: 0,
      checkin_start: null,
      checkin_end: null,
      checkout_start: null,
      checkout_end: null,
      is_night_shift: false,
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

  const { data: ShiftData, error, isLoading } = useSWR<Shift[]>(`/api/shift?show_all=${isShowDeletedDataChecked}`, fetcher);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/shift?show_all=true' />
  }

  const handleSubmitNew = async (data: Shift) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createShift(data);
      setVisible(false);
      reset();
      mutate(`/api/shift?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: Shift) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    try {
      console.log(data, 'creare')
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateShift(selectedData.id, selectedData.row_version, data)

      setVisible(false);
      mutate(`/api/shift?show_all=${isShowDeletedDataChecked}`);
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

  const handleDelete = async (data: Shift) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteShift(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/shift?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handlePurge = async (data: Shift) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeShift(data.id);
      setVisible(false);
      reset();
      mutate(`/api/shift?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleRestore = async (data: Shift) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreShift(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/shift?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onSubmit = (data: Shift) => {
    console.log(data, 'asdas')
    // return;
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

  const onClickUpdate = (data: Shift) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle('Update Shift');

    console.log(data, 'ahahha')

    const updateData = {
      ...data,
      work_start: data.work_start ? new Date(`1970-01-01T${data.work_start}`) : null,
      work_end: data.work_end ? new Date(`1970-01-01T${data.work_end}`) : null,
      break_start: data.break_start ? new Date(`1970-01-01T${data.break_start}`) : null,
      break_end: data.break_end ? new Date(`1970-01-01T${data.break_end}`) : null,
      checkin_start: data.checkin_start ? new Date(`1970-01-01T${data.checkin_start}`) : null,
      checkin_end: data.checkin_end ? new Date(`1970-01-01T${data.checkin_end}`) : null,
      checkout_start: data.checkout_start ? new Date(`1970-01-01T${data.checkout_start}`) : null,
      checkout_end: data.checkout_end ? new Date(`1970-01-01T${data.checkout_end}`) : null,
    }

    reset(updateData)
    setSelectedData(updateData);
  }


  const activeColumnBody = (rowData: Shift) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };


  const actionColumnBody = (rowData: Shift) => {
    return <>
      <div className="flex gap-2">
        {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

        {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { onClickUpdate(rowData) }} />
      </div>
    </>
  };

  const onClickDelete = (data: Shift) => {
    confirmDialog({
      message: 'Do you want to delete this record?',
      header: 'Delete Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        const updateData = {
          ...data,
          work_start: data.work_start ? new Date(`1970-01-01T${data.work_start}`) : null,
          work_end: data.work_end ? new Date(`1970-01-01T${data.work_end}`) : null,
          break_start: data.break_start ? new Date(`1970-01-01T${data.break_start}`) : null,
          break_end: data.break_end ? new Date(`1970-01-01T${data.break_end}`) : null,
          checkin_start: data.checkin_start ? new Date(`1970-01-01T${data.checkin_start}`) : null,
          checkin_end: data.checkin_end ? new Date(`1970-01-01T${data.checkin_end}`) : null,
          checkout_start: data.checkout_start ? new Date(`1970-01-01T${data.checkout_start}`) : null,
          checkout_end: data.checkout_end ? new Date(`1970-01-01T${data.checkout_end}`) : null,
        }
        setSelectedData(updateData);
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

  const onClickRestore = (data: Shift) => {
    confirmDialog({
      message: 'Do you want to restore this record?',
      header: 'Restore Confirmation',
      icon: 'pi pi-info-circle',
      defaultFocus: 'accept',
      accept: () => {
        const updateData = {
          ...data,
          work_start: data.work_start ? new Date(`1970-01-01T${data.work_start}`) : null,
          work_end: data.work_end ? new Date(`1970-01-01T${data.work_end}`) : null,
          break_start: data.break_start ? new Date(`1970-01-01T${data.break_start}`) : null,
          break_end: data.break_end ? new Date(`1970-01-01T${data.break_end}`) : null,
          checkin_start: data.checkin_start ? new Date(`1970-01-01T${data.checkin_start}`) : null,
          checkin_end: data.checkin_end ? new Date(`1970-01-01T${data.checkin_end}`) : null,
          checkout_start: data.checkout_start ? new Date(`1970-01-01T${data.checkout_start}`) : null,
          checkout_end: data.checkout_end ? new Date(`1970-01-01T${data.checkout_end}`) : null,
        }
        setSelectedData(updateData);
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

  const onClickPurge = (data: Shift) => {
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
      <Card title={<CardTitle title='Shift' url='' />}>

        <div className="p-3 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <Button label="New" icon="pi pi-plus" size="small" onClick={() => { onClickNew() }} />

              <div className="flex align-items-center">
                <Checkbox inputId="showDeletedData" name="showDeletedData" value="yes" onChange={onIngredientsChange} checked={isShowDeletedDataChecked} />
                <label htmlFor="showDeletedData" className="ml-2">show deleted data</label>
              </div>
            </div>

            <IconField iconPosition="left">
              <InputIcon className="pi pi-search" />
              <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
            </IconField>
          </div>

          <DataTable
            value={ShiftData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No Shift found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="name" header="Name"></Column>
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
              <label htmlFor="name">Name</label>
              <Controller
                name="name"
                control={control}
                rules={{ required: "*required", maxLength: { value: 50, message: 'maximum 50 character' } }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="name"
                      placeholder='example: Shift abc'
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

            <div className="flex w-full gap-5">
              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="work_start">Work Start</label>
                <Controller
                  name="work_start"
                  control={control}
                  rules={{ required: "*required", maxLength: { value: 50, message: 'maximum 50 character' } }}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        appendTo={() => document.body}
                        {...field}
                        id="work_start"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}

                        showTime
                        showSeconds
                        timeOnly
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
                <label htmlFor="work_end">Work End</label>
                <Controller
                  name="work_end"
                  control={control}
                  rules={{ required: "*required", maxLength: { value: 50, message: 'maximum 50 character' } }}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        appendTo={() => document.body}
                        {...field}
                        id="work_end"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}

                        showTime
                        showSeconds
                        timeOnly
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
              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="break_start">Break Start</label>
                <Controller
                  name="break_start"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        appendTo={() => document.body}
                        {...field}
                        id="break_start"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}

                        showTime
                        showSeconds
                        timeOnly
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
                <label htmlFor="break_end">Break End</label>
                <Controller
                  name="break_end"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        appendTo={() => document.body}
                        {...field}
                        id="break_end"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}

                        showTime
                        showSeconds
                        timeOnly
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
              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="checkin_start">Check-In Start</label>
                <Controller
                  name="checkin_start"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        appendTo={() => document.body}
                        {...field}
                        id="checkin_start"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}

                        showTime
                        showSeconds
                        timeOnly
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
                <label htmlFor="checkin_end">Check-In End</label>
                <Controller
                  name="checkin_end"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        appendTo={() => document.body}
                        {...field}
                        id="checkin_end"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}

                        showTime
                        showSeconds
                        timeOnly
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
              <div className="m-0 w-1/2 flex flex-col gap-2">
                <label htmlFor="checkout_start">Check-Out Start</label>
                <Controller
                  name="checkout_start"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        appendTo={() => document.body}
                        {...field}
                        id="checkout_start"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}

                        showTime
                        showSeconds
                        timeOnly
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
                <label htmlFor="checkout_end">Check-Out End</label>
                <Controller
                  name="checkout_end"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        appendTo={() => document.body}
                        {...field}
                        id="checkout_end"
                        value={field.value}
                        onChange={(e) => field.onChange(e.value)}

                        showTime
                        showSeconds
                        timeOnly
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
              <label htmlFor="grace_period_minutes">Grace Period (min)</label>
              <Controller
                name="grace_period_minutes"
                control={control}
                defaultValue={0}
                rules={{ required: "*required", }}
                render={({ field, fieldState }) => (
                  <>
                    <InputNumber
                      id="grace_period_minutes"
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

            <div className="m-0 flex gap-2">
              <Controller
                name="is_night_shift"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    // id="is_night_shift"
                    inputId="is_night_shift"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.checked)}
                  ></Checkbox>
                )}
              />
              <label htmlFor="is_night_shift">Night Shift</label>
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
      </form >
    </>
  )
}

export default ShiftTableData