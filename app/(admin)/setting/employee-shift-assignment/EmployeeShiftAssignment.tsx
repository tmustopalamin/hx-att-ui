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
import { Controller, useFieldArray, useForm } from 'react-hook-form';
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
import { EmployeeShiftAssignment } from '@/app/types/employee-shift-assignment';
import { createEmployeeShiftAssignment, updateEmployeeShiftAssignment, deleteEmployeeShiftAssignment, purgeEmployeeShiftAssignment, restoreEmployeeShiftAssignment } from '@/app/services/employee-shift-assignment-service';
import { Employee } from '@/app/types/employee';
import { Dropdown } from 'primereact/dropdown';
import { Shift } from '@/app/types/shift';
import { Calendar } from 'primereact/calendar';
import dayjs from 'dayjs';
import { EmployeeShiftRule } from '@/app/types/employee-shift-rule';

const EmployeeShiftAssignmentTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<EmployeeShiftAssignment | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors, watch, setValue } = useForm<EmployeeShiftAssignment>();
  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "bulk_data",
  });
  const [dataShiftRule, setDataShiftRule] = useState<Record<number, EmployeeShiftRule[]>>({});
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
    setPopupHeaderTitle("New Employee Shift Assignment");
    reset({
      id: 0,
      employee_id: 0,
      shift_id: 0,
      shift_date: null,
      deleted_at: '',
      row_version: 0,
    });
  }

  const footerContent = (
    <div className='text-right flex gap-5 justify-end'>
      <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); }} className="p-button-text" />
      <Button type="submit" form='formEmployeeShiftAssignment' label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" />
    </div>
  );

  const { data: EmployeeShiftAssignmentData, error, isLoading } = useSWR<EmployeeShiftAssignment[]>(`/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`, fetcher);

  const { data: shiftData, error: shiftError, isLoading: shiftIsLoading } = useSWR<Shift[]>(`/api/shift`, fetcher);

  const { data: employeeData, error: employeeError, isLoading: employeeIsLoading } = useSWR<Employee[]>(`/api/employees`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  // const { data: employeeShiftRuleData, error: employeeShiftRuleError, isLoading: employeeShiftRuleIsLoading } = useSWR<EmployeeShiftRule[]>(watch('employee_id') ? `/api/employees/leave-balance` : null, fetcher);

  const employeeActive = employeeData;
  const shiftActive = shiftData?.filter(s => s.is_active);
  // const employeeShiftRuleDataActive = employeeShiftRuleData;

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/employee-shift-assignment?show_all=true' />
  }

  const onIngredientsChange = () => {
    setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
  }

  const handleSubmitNew = async (data: EmployeeShiftAssignment) => {
    console.log(data, 'hahay')

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createEmployeeShiftAssignment(data);
      setVisible(false);
      reset();
      mutate(`/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: EmployeeShiftAssignment) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateEmployeeShiftAssignment(selectedData.id, selectedData.row_version, data)

      setVisible(false);
      mutate(`/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`);
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

  const handleDelete = async (data: EmployeeShiftAssignment) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteEmployeeShiftAssignment(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handlePurge = async (data: EmployeeShiftAssignment) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeEmployeeShiftAssignment(data.id);
      setVisible(false);
      reset();
      mutate(`/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleRestore = async (data: EmployeeShiftAssignment) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreEmployeeShiftAssignment(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onSubmit = (data: EmployeeShiftAssignment) => {
    if (!isValid)
      return;

    console.log(data, 'after')

    if (!data.is_bulk) {
      data.is_bulk = false
      data.bulk_data = []
    } else {
      if (!data.bulk_data) {
        dispatch(showToast({ visible: true, severity: "warn", summary: "error", detail: "add atleast one line" }));
        return
      }
    }

    if (isAddNew) {
      handleSubmitNew(data);
      return;
    } else {
      if (selectedData) {
        handleUpdate(data);
      }
    }

  };

  const onClickUpdate = (data: EmployeeShiftAssignment) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle('Update Employee Shift Assignment');

    const viewData = {
      ...data,
      shift_date: dayjs(data.shift_date).toDate(),
    }
    reset(viewData)
    setSelectedData(viewData);
  }

  const actionColumnBody = (rowData: EmployeeShiftAssignment) => {
    return <>
      <div className="flex gap-2">
        {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

        {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { onClickUpdate(rowData) }} />
      </div>
    </>
  };

  const shiftDateColumnBody = (rowData: EmployeeShiftAssignment) => {
    const shift_date = dayjs(rowData.shift_date);

    return <>
      {shift_date.isValid() ? shift_date.format('DD-MM-YYYY') : ''}
    </>
  };

  const onClickDelete = (data: EmployeeShiftAssignment) => {
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

  const onClickRestore = (data: EmployeeShiftAssignment) => {
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

  const onClickPurge = (data: EmployeeShiftAssignment) => {
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

      <Card>
        <div className="p-4 flex flex-col gap-4">

          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b pb-3">
            <div>
              <div className="text-2xl font-semibold">Employee Shift Assignment</div>
              <div className="text-sm text-gray-500">
                Manage employee shift scheduling
              </div>
            </div>

            <div className="flex items-center gap-5">

              <div className="flex align-items-center pl-5">
                <Checkbox inputId="showDeletedData" name="showDeletedData" value="yes" onChange={onIngredientsChange} checked={isShowDeletedDataChecked} />
                <label htmlFor="showDeletedData" className="ml-2">show deleted data</label>
              </div>

              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
              </IconField>

              <Button label="New" icon="pi pi-plus" size="small" onClick={() => { onClickNew() }} />
            </div>
          </div>

          {/* TABLE */}
          <DataTable
            value={EmployeeShiftAssignmentData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['employee_name', 'shift_name']}
            emptyMessage="No Employee Shift Assignment found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="employee_name" header="Employee"></Column>
            <Column field="shift_name" header="Shift"></Column>
            <Column header="Shift" body={shiftDateColumnBody}></Column>
            <Column headerClassName='bg-white' className='bg-white' header="Action" body={(rowData) => actionColumnBody(rowData)} frozen={true} alignFrozen="right" style={{ minWidth: '200px' }} ></Column>
          </DataTable>

        </div>
      </Card>

      <Dialog
        header={popupHeaderTitle}
        visible={visible}
        style={{ width: watch('is_bulk') ? '70vw' : '50vw' }}
        onHide={() => { if (!visible) return; setVisible(false); reset(); }}
        footer={footerContent}
        onShow={() => {
          setFocus('employee_id');
        }}
      >
        <form id="formEmployeeShiftAssignment" onSubmit={handleSubmit((data) => onSubmit(data))}>
          <div className="flex flex-col gap-5">

            {isAddNew && (
              <>

                <div className="m-0 flex gap-2">
                  <Controller
                    name="is_bulk"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        inputId="is_bulk"
                        checked={field.value}
                        onChange={(e) => field.onChange(e.checked)}
                      ></Checkbox>
                    )}
                  />
                  <label htmlFor="is_bulk">Bulk Insert Using Rule</label>
                </div>

                {watch('is_bulk') && (
                  <div className="min-h-60 overflow-y-auto overflow-x-auto border rounded-md">
                    <table className="min-w-[600px] w-full border-separate border-spacing-x-3 border-spacing-y-2">
                      <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr className="font-bold text-gray-600">
                          <th className="w-20 text-center">Employee</th>
                          <th className="text-left">Shift Rule</th>
                          <th className="text-left">Start Date</th>
                          <th className="text-left">End Date</th>
                          <th className="w-16 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => (
                          <tr key={field.id}>

                            {/* emp */}
                            <td className="align-top bg-white rounded-md shadow-sm">
                              <Controller
                                name={`bulk_data.${index}.employee_id`}
                                control={control}
                                rules={{ required: "Employee is required" }}
                                render={({ field, fieldState }) => (
                                  <div className="flex flex-col">
                                    <Dropdown
                                      appendTo={() => document.body}
                                      {...field}
                                      options={employeeData}
                                      optionLabel="full_name"
                                      optionValue="id"
                                      placeholder="Select Employee"
                                      onChange={async (e) => {
                                        field.onChange(e.value);

                                        if (e.value) {
                                          const empShiftRule: EmployeeShiftRule[] = await fetcher(`/api/shift-employee/${e.value}`);
                                          setValue(`bulk_data.${index}.shift_rule_id`, 0);
                                          setDataShiftRule((prev) => ({
                                            ...prev,
                                            [index]: empShiftRule,
                                          }));

                                        }
                                      }}
                                      className={`w-full ${fieldState.error ? "p-invalid" : ""
                                        }`}
                                    />
                                    {fieldState.error && (
                                      <small className="p-error">
                                        {fieldState.error.message}
                                      </small>
                                    )}
                                  </div>
                                )}
                              />
                            </td>

                            {/* Shift */}
                            <td className="align-top bg-white rounded-md shadow-sm">
                              <Controller
                                name={`bulk_data.${index}.shift_rule_id`}
                                control={control}
                                rules={{ required: "Shift is required" }}
                                render={({ field, fieldState }) => (
                                  <div className="flex flex-col">
                                    <Dropdown
                                      appendTo={() => document.body}
                                      {...field}
                                      options={dataShiftRule[index] ?? []}
                                      itemTemplate={(option) => (
                                        <div>
                                          {option.base_shift_name} - {option.patterns}
                                        </div>
                                      )}
                                      valueTemplate={(option, props) => {
                                        if (option) {
                                          return <span>{option.base_shift_name} - {option.patterns}</span>;
                                        }
                                        return <span>{props.placeholder}</span>;
                                      }}
                                      optionValue="id"
                                      placeholder="Select Shift Rule"
                                      className={`w-full ${fieldState.error ? "p-invalid" : ""
                                        }`}
                                    />
                                    {fieldState.error && (
                                      <small className="p-error">
                                        {fieldState.error.message}
                                      </small>
                                    )}
                                  </div>
                                )}
                              />
                            </td>

                            {/* Start Date */}
                            <td className="align-top bg-white rounded-md shadow-sm">
                              <Controller
                                name={`bulk_data.${index}.start_date`}
                                control={control}
                                rules={{ required: "start date is required" }}
                                render={({ field, fieldState }) => (
                                  <>
                                    <Calendar
                                      dateFormat='dd-mm-yy'
                                      appendTo={() => document.body}
                                      {...field}
                                      id="start_date"
                                      value={field.value}
                                      onChange={(e) => {
                                        field.onChange(e.value);
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
                            </td>

                            {/* End Date */}
                            <td className="align-top bg-white rounded-md shadow-sm">
                              <Controller
                                name={`bulk_data.${index}.end_date`}
                                control={control}
                                rules={{ required: "end date is required" }}
                                render={({ field, fieldState }) => (
                                  <>
                                    <Calendar
                                      dateFormat='dd-mm-yy'
                                      appendTo={() => document.body}
                                      {...field}
                                      id="start_date"
                                      value={field.value}
                                      onChange={(e) => {
                                        field.onChange(e.value);
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
                            </td>

                            {/* Action */}
                            <td className="text-center bg-white rounded-md shadow-sm">
                              <Button
                                icon="pi pi-trash"
                                severity="danger"
                                text
                                onClick={() => remove(index)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="p-5">
                      <div className="pt-3">
                        <Button
                          type="button"
                          label="Add Line"
                          icon="pi pi-plus"
                          onClick={() =>
                            append({ employee_id: 0, shift_rule_id: 0, start_date: null, end_date: null })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

              </>
            )}

            {!watch('is_bulk') && (
              <div className="m-0 flex flex-col gap-2">
                <label htmlFor="employee_id">Employee</label>
                <Controller
                  name="employee_id"
                  control={control}
                  rules={{ required: watch('is_bulk') ? false : "Employee is required" }}
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
            )}

            {!watch('is_bulk') && (
              <div className="m-0 flex flex-col gap-2">
                <label htmlFor="shift_id">Shift</label>
                <Controller
                  name="shift_id"
                  control={control}
                  rules={{ required: watch('is_bulk') ? false : "Shift is required" }}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="shift_id"
                        appendTo={() => document.body}
                        value={field.value}
                        options={shiftActive}
                        loading={shiftIsLoading}
                        disabled={shiftIsLoading || !!shiftError}
                        onChange={(e) => field.onChange(e.value)}
                        optionLabel="name"
                        optionValue="id"
                        placeholder={isLoading ? "Loading shifts..." : "Select a shift"}
                        className={fieldState.invalid ? "p-invalid" : ""}
                      />
                      {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                      {shiftError && <small className="p-error font-bold">We couldn’t load the list of shifts. Please try again</small>}
                    </>
                  )}
                />
              </div>
            )}

            {!watch('is_bulk') && (
              <div className="m-0 w-full flex flex-col gap-2">
                <label htmlFor="shift_date">Shift Date</label>
                <Controller
                  name="shift_date"
                  control={control}
                  rules={{ required: watch('is_bulk') ? false : "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <Calendar
                        dateFormat='dd-mm-yy'
                        appendTo={() => document.body}
                        {...field}
                        id="shift_date"
                        value={field.value}
                        onChange={(e) => {
                          field.onChange(e.value);
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
            )}

          </div>
        </form>
      </Dialog >
    </>
  )
}

export default EmployeeShiftAssignmentTableData