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
import { createEmployeeShiftRule, updateEmployeeShiftRule, deleteEmployeeShiftRule, purgeEmployeeShiftRule, restoreEmployeeShiftRule } from '@/app/services/employee-shift-rule-service';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import { EmployeeShiftRule, RotationRule } from '@/app/types/employee-shift-rule';
import { Dropdown } from 'primereact/dropdown';
import { Employee } from '@/app/types/employee';
import { Shift } from '@/app/types/shift';
import { InputNumber } from 'primereact/inputnumber';
import { PickList, PickListChangeEvent } from 'primereact/picklist';


const EmployeeShiftRuleTableData = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [source, setSource] = useState([]);
  const [target, setTarget] = useState([]);

  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<EmployeeShiftRule | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors, watch } = useForm<EmployeeShiftRule>();
  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "rules",
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFetchRule, setIsFetchRule] = useState(false);

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
    setPopupHeaderTitle("New Employee Shift Rule");
    reset({
      id: 0,
      employee_id: [],
      base_shift_id: 0,
      is_rotation: false,
      is_active: true,
      deleted_at: '',
      row_version: 0,
      rules: []
    });
  }

  const footerContent = (
    <div className='text-right flex gap-5 justify-end'>
      <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); }} className="p-button-text" />
      <Button type="submit" label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" />
    </div>
  );

  const onChange = (event: PickListChangeEvent) => {
    setSource(event.source);
    setTarget(event.target);
  };

  const itemTemplate = (item: Employee) => {
    return (
      <div className="flex flex-wrap p-2 align-items-center gap-3">
        <div className="flex-1 flex flex-col gap-2">
          <span className="font-bold">{item.first_name} {item.last_name}</span>
          <div className="flex align-items-center gap-2">
            <i className="pi pi-home text-sm"></i>
            <span>{item.agency_name}</span>
          </div>
        </div>
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: shiftRotationRuleData, error: shiftRotationRuleError, isLoading: shiftRotationRuleLoading } = useSWR(isFetchRule ? `/api/shift-rotation-rule/${selectedData?.id}` : null, fetcher);
  const { data: EmployeeShiftRuleData, error, isLoading } = useSWR<EmployeeShiftRule[]>(`/api/shift-employee?show_all=${isShowDeletedDataChecked}`, fetcher);
  const { data: employeeData, error: employeeError, isLoading: employeeIsLoading } = useSWR<Employee[]>(`/api/employees`, fetcher);
  const { data: shiftData, error: shiftError, isLoading: shiftIsLoading } = useSWR<Shift[]>(`/api/shift`, fetcher);
  // const activeState = employeeData?.filter(a => a.is_active);
  const activeEmployee = employeeData;
  const activeShift = shiftData?.filter(a => a.is_active);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/shift-employee' />
  }

  const handleSubmitNew = async (data: EmployeeShiftRule) => {
    try {
      if (!data.is_rotation) {
        data.rules = []
      }

      const res: ResponseType<ResponseTypeCreateSuccess> = await createEmployeeShiftRule(data);
      setVisible(false);
      reset();
      mutate(`/api/shift-employee?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: EmployeeShiftRule) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    if (Number(data.employee_id) <= 0) {
      dispatch(showToast({ visible: true, severity: "warn", summary: "Validation Error", detail: "At leat choose one employee" }));
      return;
    }

    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateEmployeeShiftRule(selectedData.id, selectedData.row_version, data)
      mutate(`/api/shift-employee?show_all=${isShowDeletedDataChecked}`);

      setVisible(false);
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

  const handleDelete = async (data: EmployeeShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteEmployeeShiftRule(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/shift-employee?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handlePurge = async (data: EmployeeShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeEmployeeShiftRule(data.id);
      setVisible(false);
      reset();
      mutate(`/api/shift-employee?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleRestore = async (data: EmployeeShiftRule) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreEmployeeShiftRule(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/shift-employee?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onSubmit = (data: EmployeeShiftRule) => {
    if ((!data.rules || data.rules.length === 0) && data.is_rotation) {
      dispatch(showToast({
        visible: true,
        severity: "error",
        summary: "Validation Error",
        detail: "At least one rotation rule is required"
      }));
      return;
    }
    // return;

    if (!isValid)
      return;

    if (isAddNew) {
      data.employee_id = target

      if (data.employee_id.length === 0) {
        dispatch(showToast({ visible: true, severity: "warn", summary: "Validation Error", detail: "At leat choose one employee" }));
        return;
      }

      data.employee_id = [...new Set([...target].map((item: Employee) => item.id))]


      handleSubmitNew(data);
      return;
    }

    if (selectedData) {
      handleUpdate(data);
      return;
    }
  };

  const onClickUpdate = async (data: EmployeeShiftRule) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle("Update Employee Shift Rule");
    setSelectedData(data);

    // langsung fetch rules pakai id dari parameter
    const freshRules: RotationRule[] = await fetcher(`/api/shift-rotation-rule/${data.id}`);

    const data_update = {
      ...data,
      rules: freshRules ?? [],
    };

    if (freshRules?.length > 0) {
      freshRules.forEach((rule) => {
        append({
          sequence: rule.sequence,
          shift: rule.shift,
          duration: rule.duration,
        });
      });
    }

    reset(data_update);
  };

  const activeColumnBody = (rowData: EmployeeShiftRule) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };

  const isRotationColumnBody = (rowData: EmployeeShiftRule) => {
    return rowData.is_rotation ? (
      <Tag value="Yes" severity="info" />
    ) : (
      <Tag value="No" severity="warning" />
    );
  };

  const actionColumnBody = (rowData: EmployeeShiftRule) => {
    return <>
      <div className="flex gap-2">
        {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

        {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { onClickUpdate(rowData) }} />
      </div>
    </>
  };

  const onClickDelete = (data: EmployeeShiftRule) => {
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

  const onClickRestore = (data: EmployeeShiftRule) => {
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

  const onClickPurge = (data: EmployeeShiftRule) => {
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
              <div className="text-2xl font-semibold">Employee Shift Rule</div>
              <div className="text-sm text-gray-500">
                Configure employee shift rules and schedules
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
            value={EmployeeShiftRuleData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No Employee Shift found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="employee_name" header="Employee Name"></Column>
            <Column field="base_shift_name" header="Default Shift"></Column>
            <Column field="is_rotation" header="Rotation" body={isRotationColumnBody}></Column>
            <Column field="patterns" header="Patterns"></Column>
            <Column field="is_active" header="Active" body={activeColumnBody}></Column>
            <Column headerClassName='bg-white' className='bg-white' header="Action" body={(rowData) => actionColumnBody(rowData)} frozen={true} alignFrozen="right"></Column>
          </DataTable>

        </div>
      </Card>

      <form onSubmit={handleSubmit((data: EmployeeShiftRule) => {
        // if (isAddNew)
        //   data.employee_id = target

        onSubmit(data)
      })}>
        <Dialog
          header={popupHeaderTitle}
          visible={visible}
          className='w-[90%] md:w-[70%]'
          onHide={() => { if (!visible) return; setVisible(false); reset(); }}
          footer={footerContent}
          onShow={() => {
            setFocus('employee_id');
          }}
        >
          <div className="flex flex-col gap-5">

            {!isAddNew && (
              <div className="m-0 flex flex-col gap-2">
                <label htmlFor="employee_id">Employee</label>
                <Controller
                  name="employee_id"
                  control={control}
                  // rules={{ required: "employee is required" }}
                  render={({ field, fieldState }) => (
                    <>
                      <Dropdown
                        id="employee_id"
                        appendTo={() => document.body}
                        value={field.value}
                        options={activeEmployee}
                        loading={employeeIsLoading}
                        disabled={employeeIsLoading || !!employeeError}
                        onChange={(e) => field.onChange(e.value)}
                        optionLabel="first_name"
                        optionValue="id"
                        placeholder={
                          isLoading ? "Loading employees..." : "Select a employee"
                        }
                        className={fieldState.invalid ? "p-invalid" : ""}
                      />
                      {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                      {employeeError && (<small className="p-error font-bold">We couldn’t load the list of employees. Please try again</small>)}
                    </>
                  )}
                />
              </div>
            )}

            {isAddNew && (
              <div className="m-0 flex flex-col gap-2">
                <label htmlFor="employee_id">Employee</label>
                <Controller
                  name="employee_id"
                  control={control}
                  // rules={{ required: "employee is required" }}
                  render={({ fieldState }) => (
                    <>
                      <PickList id="employee_id" dataKey="id" source={activeEmployee} target={target} onChange={onChange} itemTemplate={itemTemplate} filter filterBy="first_name,last_name" breakpoint="1280px"
                        sourceHeader="Available" targetHeader="Selected" sourceStyle={{ height: '15rem' }} targetStyle={{ height: '15rem' }}
                        sourceFilterPlaceholder="Search by name" targetFilterPlaceholder="Search by name" />
                      {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                      {employeeError && (<small className="p-error font-bold">We couldn’t load the list of employees. Please try again</small>)}
                    </>
                  )}
                />
              </div>
            )}

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="base_shift_id">Default Shift</label>
              <Controller
                name="base_shift_id"
                control={control}
                rules={{ required: "shift is required" }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="base_shift_id"
                      appendTo={() => document.body}
                      value={field.value}
                      options={activeShift}
                      loading={shiftIsLoading}
                      disabled={shiftIsLoading || !!shiftError}
                      onChange={(e) => field.onChange(e.value)}
                      optionLabel="name"
                      optionValue="id"
                      placeholder={
                        isLoading ? "Loading shifts..." : "Select a shift"
                      }
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {shiftError && (<small className="p-error font-bold">We couldn’t load the list of shifts. Please try again</small>)}
                  </>
                )}
              />
            </div>

            <div className="m-0 flex gap-2">
              <Controller
                name="is_rotation"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    // id="is_rotation"
                    inputId="is_rotation"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.checked)}
                  ></Checkbox>
                )}
              />
              <label htmlFor="is_rotation">Enable Rotation</label>
            </div>

            <div className="m-0">
              {watch('is_rotation') && (
                <>
                  <h1 className="font-bold">Rotation Pattern</h1>
                  <h2 className="text-gray-400">Define shift rotation order and duration</h2>

                  <div className="pt-5">
                    {/* wrapper scroll */}
                    <div className="max-h-60 overflow-y-auto overflow-x-auto border rounded-md">
                      <table className="min-w-[600px] w-full border-separate border-spacing-x-3 border-spacing-y-2">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                          <tr className="font-bold text-gray-600">
                            <th className="w-20 text-center">Seq</th>
                            <th className="text-left">Shift</th>
                            <th className="w-28 text-center">Duration</th>
                            <th className="w-16 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fields.map((field, index) => (
                            <tr key={field.id}>
                              {/* Seq */}
                              <td className="text-center align-top bg-white rounded-md shadow-sm">
                                <Controller
                                  name={`rules.${index}.sequence`}
                                  control={control}
                                  rules={{
                                    required: "Sequence is required",
                                    validate: (val) =>
                                      Number(val) > 0 || "Sequence must be greater than 0",
                                  }}
                                  render={({ field, fieldState }) => (
                                    <div className="flex flex-col items-center">
                                      <InputNumber
                                        inputRef={field.ref}
                                        value={field.value ?? null}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        placeholder="#"
                                        className={fieldState.error ? "p-invalid" : ""}
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
                                  name={`rules.${index}.shift`}
                                  control={control}
                                  rules={{ required: "Shift is required" }}
                                  render={({ field, fieldState }) => (
                                    <div className="flex flex-col">
                                      <Dropdown
                                        appendTo={() => document.body}
                                        {...field}
                                        options={activeShift}
                                        optionLabel="name"
                                        optionValue="id"
                                        placeholder="Select Shift"
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

                              {/* Duration */}
                              <td className="text-center align-top bg-white rounded-md shadow-sm">
                                <Controller
                                  name={`rules.${index}.duration`}
                                  control={control}
                                  rules={{
                                    required: "Duration is required",
                                    validate: (val) =>
                                      Number(val) > 0 || "Duration must be greater than 0",
                                  }}
                                  render={({ field, fieldState }) => (
                                    <div className="flex flex-col items-center">
                                      <InputNumber
                                        inputRef={field.ref}
                                        onValueChange={(e) => field.onChange(e.value)}
                                        value={Number(field.value ? field.value : 0)}
                                        placeholder="Days"
                                        className={fieldState.error ? "p-invalid" : ""}
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
                    </div>

                    {/* Add rule button */}
                    <div className="pt-3">
                      <Button
                        type="button"
                        label="Add Rule"
                        icon="pi pi-plus"
                        onClick={() =>
                          append({ sequence: fields.length + 1, shift: "", duration: 7 })
                        }
                      />
                    </div>
                  </div>
                </>

              )}
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
        </Dialog >
      </form >
    </>
  )
}

export default EmployeeShiftRuleTableData