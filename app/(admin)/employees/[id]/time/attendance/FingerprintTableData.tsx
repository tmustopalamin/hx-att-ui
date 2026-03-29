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
import { Employee } from '@/app/types/employee';
import { EmployeeFingerprint } from '@/app/types/employee-fingerprint';
import { useParams } from 'next/navigation';
import { createEmployeeFingerprint, updateEmployeeFingerprint, deleteEmployeeFingerprint, purgeEmployeeFingerprint, restoreEmployeeFingerprint, checkPinEmployeeFingerprint } from '@/app/services/employee-fingerprint-data-service';
import { FingerprintScanner } from '@/app/types/fingerprint-scanner';


const EmployeeFingerprintTableData = () => {
  const params = useParams();
  const id = params.id;

  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<EmployeeFingerprint | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isPinValid, setIsPinValid] = useState(false);
  const [isPinAlreadyUsed, setIsPinAlreadyUsed] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors, watch } = useForm<EmployeeFingerprint>();
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);

  const onGlobalFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const _filters = { ...filters };

    _filters['global'].value = value;

    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const onClickNew = () => {
    setIsViewOnly(false);

    clearErrors();
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Fingerprint");
    reset({
      id: 0,
      employee_id: 0,
      fp_device_id: 0,
      fp_pin: '',
      deleted_at: '',
      row_version: 0,
      pin_already_exist: false,
    });
  }

  const footerContent = (
    <div className='text-right flex gap-5 justify-end'>
      <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); }} className="p-button-text" />
      <Button type="submit" label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" />
    </div>
  );

  const { data: EmployeeFingerprintData, error, isLoading } = useSWR<EmployeeFingerprint[]>(`/api/employees/${id}/fingerprint?show_all=${isShowDeletedDataChecked}`, fetcher);
  const { data: employeeData, error: employeeError, isLoading: employeeIsLoading } = useSWR<Employee[]>(`/api/employees`, fetcher);
  const { data: fpData, error: fpError, isLoading: fpIsLoading } = useSWR<FingerprintScanner[]>(`/api/fingerprint-scanner`, fetcher);
  const employeeActive = employeeData?.filter(a => a.id === Number(id));
  const leaveTypeActive = fpData;

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey={`/api/employees/${id}/fingerprint?show_all=true`} />
  }


  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const handleSubmitNew = async (data: EmployeeFingerprint) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createEmployeeFingerprint(data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/fingerprint?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: EmployeeFingerprint) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateEmployeeFingerprint(selectedData.id, selectedData.row_version, data)

      setVisible(false);
      mutate(`/api/employees/${id}/fingerprint?show_all=${isShowDeletedDataChecked}`);
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

  const handleDelete = async (data: EmployeeFingerprint) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteEmployeeFingerprint(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/fingerprint?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handlePurge = async (data: EmployeeFingerprint) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeEmployeeFingerprint(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/fingerprint?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleRestore = async (data: EmployeeFingerprint) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreEmployeeFingerprint(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/fingerprint?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onclickCheckPin = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    try {
      const fp_device_id = watch('fp_device_id');
      const pin = watch('fp_pin');

      const res = await checkPinEmployeeFingerprint(fp_device_id, pin);

      //data ada di mesin
      if (res.data) {
        if (watch('pin_already_exist')) {
          dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: "The PIN is already in the machine" }));
          setIsPinValid(true);
          setIsPinAlreadyUsed(false)
          return;
        } else {
          dispatch(showToast({ visible: true, severity: "error", summary: "PIN not available", detail: "" }));
          setIsPinValid(false);
          setIsPinAlreadyUsed(false)
          return;
        }
      }

      //data tdk ada di mesin
      dispatch(showToast({ visible: true, severity: "success", summary: "PIN available", detail: "" }));
      setIsPinValid(true);
      setIsPinAlreadyUsed(false)

    } catch (err: unknown) {
      setIsPinAlreadyUsed(true)
      setIsPinValid(false)

      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onSubmit = (data: EmployeeFingerprint) => {
    if (watch('pin_already_exist')) {
      if (isPinAlreadyUsed) {
        dispatch(showToast({ visible: true, severity: "warn", summary: "warning", detail: "Pin Already in Used with another employee" }));
        return;
      } else {
        if (!isPinValid) {
          dispatch(showToast({ visible: true, severity: "warn", summary: "warning", detail: "check PIN to make sure PIN is available" }));
          return;
        }
      }
    } else {
      if (!isPinValid) {
        dispatch(showToast({ visible: true, severity: "warn", summary: "warning", detail: "check PIN to make sure PIN is available" }));
        return;
      }
    }

    if (!isValid)
      return;

    if (isAddNew) {
      handleSubmitNew(data);

      setIsPinValid(false)
      setIsPinAlreadyUsed(false)
      return;
    }

    if (selectedData) {
      handleUpdate(data);

      setIsPinValid(false)
      setIsPinAlreadyUsed(false)
    }
  };

  const onClickUpdate = (data: EmployeeFingerprint) => {
    setVisible(true);
    setIsAddNew(false);
    setIsViewOnly(true);
    setPopupHeaderTitle('View Fingerprint');

    reset(data)
    setSelectedData(data);
  }

  // const activeColumnBody = (rowData: EmployeeFingerprint) => {
  //   return rowData.is_active ? (
  //     <Tag value="Active" severity="success" />
  //   ) : (
  //     <Tag value="Inactive" severity="danger" />
  //   );
  // };

  const actionColumnBody = (rowData: EmployeeFingerprint) => {
    return <>
      <div className="flex gap-2">
        {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

        {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='view' rounded severity='help' label="" icon="pi pi-search" size="small" onClick={() => { onClickUpdate(rowData) }} />
      </div>
    </>
  };

  const onClickDelete = (data: EmployeeFingerprint) => {
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
          <Button label="Yes" icon="pi pi-check" disabled={isViewOnly} onClick={options.accept} className="p-button-danger" />
        </div>
      )
    });
  };

  const onClickRestore = (data: EmployeeFingerprint) => {
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

  const onClickPurge = (data: EmployeeFingerprint) => {
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
      <Card title={<CardTitle title='Fingerprint' url='' />}>
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
            value={EmployeeFingerprintData}
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
            <Column style={{ width: '1rem' }} header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1} />
            <Column style={{ width: '8rem' }} field="fp_device_name" header="Fingerprint Scanner" />
            <Column style={{ width: '8rem' }} field="fp_pin" header="User ID" />
            <Column
              headerClassName="bg-white"
              className="bg-white"
              header="Action"
              body={(rowData) => actionColumnBody(rowData)}
              frozen={true}
              style={{ width: '8rem' }}
              headerStyle={{ width: '8rem' }}
              alignFrozen="right"
            />
          </DataTable>
        </div>
      </Card>

      <form onSubmit={handleSubmit((data) => onSubmit(data))}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          className='w-[90%] md:w-[60%] lg:w-[50%] xl:w-[40%]'
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
              <label htmlFor="fp_device_id">Fingerprint Scanner Device</label>
              <Controller
                name="fp_device_id"
                control={control}
                rules={{ required: "Leave type is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="fp_device_id"
                      appendTo={() => document.body}
                      value={field.value}
                      options={leaveTypeActive}
                      loading={isLoading}
                      disabled={fpIsLoading || !!fpError || isViewOnly}
                      onChange={(e) => field.onChange(e.value)}
                      optionLabel="name"
                      optionValue="id"
                      placeholder={isLoading ? "Loading leave types..." : "Select a leave type"}
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {fpError && <small className="p-error font-bold">We couldn’t load the list of leave types. Please try again</small>}
                  </>
                )}
              />
            </div>

            <div className="m-0 flex flex-col gap-2 w-full">
              <label htmlFor="fp_pin">PIN</label>
              <Controller
                name="fp_pin"
                control={control}
                rules={{
                  required: "*required",
                  validate: (value) => !/\s/.test(value) || "must not contain spaces.",
                  maxLength: { value: 50, message: 'maximum 50 character' }
                }}
                render={({ field, fieldState }) => (
                  <>
                    <div className="flex gap-5">
                      <InputText
                        id="fp_pin"
                        placeholder='example: pin123'
                        {...field}
                        className={fieldState.invalid ? "p-invalid flex-1" : "flex-1"}
                        onChange={(e) => {
                          field.onChange(e.target.value)
                          setIsPinValid(false)
                          setIsPinAlreadyUsed(false)
                        }}
                        disabled={isViewOnly}
                      />
                      <Button type="button" label="check PIN" icon="pi pi-search" tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='check available PIN in the fingerprint scanner' onClick={onclickCheckPin} disabled={isViewOnly} />
                    </div>
                    <div className="m-0 flex gap-2">
                      <Controller
                        name="pin_already_exist"
                        control={control}
                        render={({ field }) => (
                          <Checkbox
                            disabled={isViewOnly}
                            // id="pin_already_exist"
                            inputId="pin_already_exist"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.checked)}
                          ></Checkbox>
                        )}
                      />
                      <label htmlFor="pin_already_exist">do not insert pin into fingerprint device</label>
                    </div>
                    {fieldState.error && (
                      <small className="font-bold p-error"> {fieldState.error.message} </small>
                    )}
                  </>
                )}
              />
            </div>

            <div className="m-0 flex flex-col gap-2 w-full">
              <small>please check manually also into fingerprint device is PIN exist or not</small>
            </div>

          </div>
        </Dialog>
      </form>
    </>
  );
}

export default EmployeeFingerprintTableData