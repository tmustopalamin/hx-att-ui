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
import { EmployeeIncomeComponent } from '@/app/types/employee-income-component';
import { useParams } from 'next/navigation';
import dayjs from 'dayjs';
import { createEmployeeIncomeComponent, updateEmployeeIncomeComponent, deleteEmployeeIncomeComponent, purgeEmployeeIncomeComponent, restoreEmployeeIncomeComponent } from '@/app/services/employee-income-component-service';
import { InputSwitch } from 'primereact/inputswitch';
import { Tag } from 'primereact/tag';
import { Frequency } from '@/app/types/frequency';
import { IncomeComponent } from '@/app/types/income-component';


const EmployeePayrollEmployeeIncomeComponentTableData = () => {
  const params = useParams();
  const id = params.id;

  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<EmployeeIncomeComponent | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [selectedIncomeComponent, setSelectedIncomeComponent] = useState<IncomeComponent | null>(null);
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors, watch, setValue } = useForm<EmployeeIncomeComponent>();
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
    setPopupHeaderTitle("New Income Component");
    reset({
      id: 0,
      employee_id: 0,
      income_component_master_id: 0,
      based_on_component_id: 0,
      amount: 0,
      frequency: 0,
      start_date: null,
      end_date: null,
      is_active: true,
      notes: "",
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

  const { data: EmployeeIncomeComponentData, error, isLoading } = useSWR<EmployeeIncomeComponent[]>(`/api/employees/${id}/income-component?show_all=${isShowDeletedDataChecked}`, fetcher);
  const { data: employeeData, error: employeeError, isLoading: employeeIsLoading } = useSWR<Employee[]>(`/api/employees`, fetcher);
  const { data: incomeComponentData, error: incomeComponentError, isLoading: incomeComponentIsLoading } = useSWR<IncomeComponent[]>(`/api/income-component`, fetcher);
  const { data: frequencyData, error: errorFrequency, isLoading: isLoadingFrequency } = useSWR<Frequency[]>(`/api/frequency`, fetcher);
  const employeeIncomeComponentActive = incomeComponentData?.filter(a => a.is_active);
  const employeeActive = employeeData?.filter(a => a.id === Number(id));
  const activeFrequency = frequencyData?.filter(a => a.is_active);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey={`/api/employees/${id}/income-component?show_all=true`} />
  }

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const handleSubmitNew = async (data: EmployeeIncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createEmployeeIncomeComponent(data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/income-component?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: EmployeeIncomeComponent) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateEmployeeIncomeComponent(selectedData.id, selectedData.row_version, data)

      setVisible(false);
      mutate(`/api/employees/${id}/income-component?show_all=${isShowDeletedDataChecked}`);
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

  const handleDelete = async (data: EmployeeIncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteEmployeeIncomeComponent(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/income-component?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handlePurge = async (data: EmployeeIncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeEmployeeIncomeComponent(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/income-component?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleRestore = async (data: EmployeeIncomeComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreEmployeeIncomeComponent(data.id, data);
      setVisible(false);
      reset();
      mutate(`/api/employees/${id}/income-component?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onSubmit = (data: EmployeeIncomeComponent) => {
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

  const onClickUpdate = (data: EmployeeIncomeComponent) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle('Update Income Component');

    const updatedData = {
      ...data,
      start_date: dayjs(data.start_date).toDate(),
      end_date: dayjs(data.end_date).toDate(),
    }

    reset(updatedData)
    setSelectedData(updatedData);
  }

  const activeColumnBody = (rowData: EmployeeIncomeComponent) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  const actionColumnBody = (rowData: EmployeeIncomeComponent) => {
    return <>
      <div className="flex gap-2">
        {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

        {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { onClickUpdate(rowData) }} />
      </div>
    </>
  };

  const onClickDelete = (data: EmployeeIncomeComponent) => {
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

  const onClickRestore = (data: EmployeeIncomeComponent) => {
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

  const onClickPurge = (data: EmployeeIncomeComponent) => {
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

  const onChangeIncomeComponent = (id: number) => {
    const incomeComponent = incomeComponentData?.find((ic: IncomeComponent) => ic.id === id);
    if (incomeComponent) {
      setSelectedIncomeComponent(incomeComponent)
    }
  }

  return (
    <>
      <ConfirmDialog />
      <Card title={<CardTitle title='Income Component' url='' />}>
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
            value={EmployeeIncomeComponentData}
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
            <Column field="income_component_name" header="Component" />
            <Column field="start_date" header="Start Date" />
            <Column field="end_date" header="End Date" />
            <Column field="amount" header="Amount" />
            <Column field="frequency" header="Frequency" />
            <Column field="notes" header="Notes" />
            <Column field="is_active" header="Active" body={activeColumnBody} />
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
              <label htmlFor="income_component_master_id">Income Component</label>
              <Controller
                name="income_component_master_id"
                control={control}
                rules={{ required: "Income Component is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="income_component_master_id"
                      appendTo={() => document.body}
                      value={field.value}
                      options={employeeIncomeComponentActive}
                      loading={isLoading}
                      disabled={incomeComponentIsLoading || !!incomeComponentError}
                      onChange={(e) => {
                        field.onChange(e.value)
                        onChangeIncomeComponent(e.value)
                      }}
                      optionLabel="name"
                      optionValue="id"
                      placeholder={isLoading ? "Loading income components..." : "Select a income component"}
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {incomeComponentError && <small className="p-error font-bold">We couldn’t load the list of income components. Please try again</small>}
                  </>
                )}
              />
            </div>

            {selectedIncomeComponent?.calculation_method_code === 'fixed' && <>
              <div className="m-0 flex flex-col gap-2 flex-1">
                <label htmlFor="amount">Amount</label>
                <Controller
                  name="amount"
                  control={control}
                  defaultValue={0}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="amount"
                        placeholder='input amount of balance'
                        inputRef={field.ref} onValueChange={(e) => {
                          field.onChange(e.value);
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
            </>}

            <div className="m-0 flex flex-col gap-2 flex-1">
              <label htmlFor="frequency">Frequency</label>
              <Controller
                name="frequency"
                control={control}
                rules={{ required: "*required", }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="frequency"
                      appendTo={() => document.body}
                      value={field.value}
                      options={activeFrequency}
                      loading={isLoadingFrequency}
                      disabled={isLoadingFrequency || !!errorFrequency}
                      onChange={(e) => field.onChange(e.value)}
                      optionLabel="name"
                      optionValue="id"
                      placeholder={isLoading ? "Loading frequencys..." : "Select a frequency"}
                      className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {errorFrequency && (
                      <small className="p-error font-bold">
                        We couldn’t load the list of frequency. Please try again
                      </small>
                    )}
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
                        dateFormat='dd-mm-yy'
                        appendTo={() => document.body}
                        {...field}
                        id="start_date"
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
                <label htmlFor="end_date">End Date</label>
                <Controller
                  name="end_date"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        dateFormat='dd-mm-yy'
                        appendTo={() => document.body}
                        {...field}
                        id="end_date"
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


            {selectedIncomeComponent?.calculation_method_code === 'percentage' && <>
              <div className="m-0 flex flex-col gap-2">
                <label htmlFor="based_on_component_id">Based On Income Component</label>
                <Controller
                  name="based_on_component_id"
                  control={control}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="based_on_component_id"
                        appendTo={() => document.body}
                        value={field.value}
                        options={employeeIncomeComponentActive}
                        loading={isLoading}
                        disabled={incomeComponentIsLoading || !!incomeComponentError}
                        onChange={(e) => field.onChange(e.value)}
                        optionLabel="name"
                        optionValue="id"
                        placeholder={isLoading ? "Loading income components..." : "Select a income component"}
                        className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                      />
                      {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                      {incomeComponentError && (
                        <small className="p-error font-bold">
                          We couldn’t load the list of income components. Please try again
                        </small>
                      )}
                    </>
                  )}
                />
              </div>
            </>}

            {selectedIncomeComponent?.calculation_method_code === 'percentage' && <>
              <div className="m-0 flex flex-col gap-2">
                <label htmlFor="percentage">Percentage</label>
                <Controller
                  name="percentage"
                  control={control}
                  defaultValue={0}
                  rules={{ required: "*required" }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="percentage"
                        placeholder="input amount of balance"
                        inputRef={field.ref}
                        onValueChange={(e) => field.onChange(e.value)}
                        value={Number(field.value ?? 0)}
                        className={fieldState.invalid ? "w-full p-invalid" : "w-full"}
                      />
                      {fieldState.error && (
                        <small className="font-bold p-error">{fieldState.error.message}</small>
                      )}
                    </>
                  )}
                />
              </div>
            </>}

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="notes">Notes</label>
              <Controller
                name="notes"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="notes"
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
      </form>
    </>
  );
}

export default EmployeePayrollEmployeeIncomeComponentTableData