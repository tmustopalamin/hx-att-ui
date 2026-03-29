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
import { createSalaryComponent, updateSalaryComponent, deleteSalaryComponent, purgeSalaryComponent, restoreSalaryComponent } from '@/app/services/salary-component-service';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import { SalaryComponent } from '@/app/types/salary_component';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import dayjs from 'dayjs';
import { Calendar } from 'primereact/calendar';


const SalaryComponentTableData = () => {
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);
  const [selectedData, setSelectedData] = useState<SalaryComponent | null>(null);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);
  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors, watch } = useForm<SalaryComponent>();
  const { fields, append, remove } = useFieldArray({
    control: control,
    name: "formula",
  });

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

  const componentTypeList: { code: string, description: string }[] = [
    { code: 'income', description: 'Income' },
    { code: 'deduction', description: 'Deduction' }
  ]

  const calculationTypeList: { code: string, description: string }[] = [
    { code: 'fixed', description: 'Fixed' },
    { code: 'per_unit', description: 'Per Unit' },
    { code: 'percentage', description: 'Percentage' },
    { code: 'formula', description: 'Formula' },
  ]

  const onClickNew = () => {
    clearErrors();
    setIsAddNew(true);
    setVisible(true);
    setPopupHeaderTitle("New Salary Component");
    reset({
      id: 0,
      code: '',
      name: '',
      component_type: '',
      calculation_type: '',
      default_amount: 0,
      percentage: 0,
      base_component: '',
      taxable: false,
      is_active: true,
      deleted_at: 0,
      row_version: 0,
      formula: []
    });
  }

  const footerContent = (
    <div className='text-right flex gap-5 justify-end'>
      <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); }} className="p-button-text" />
      <Button type="submit" label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" />
    </div>
  );

  const { data: SalaryComponentData, error, isLoading } = useSWR<SalaryComponent[]>(`/api/salary-component?show_all=${isShowDeletedDataChecked}`, fetcher);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/salary-component?show_all=true' />
  }

  const handleSubmitNew = async (data: SalaryComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createSalaryComponent(data);
      setVisible(false);
      reset();
      mutate(`/api/salary-component?show_all=${isShowDeletedDataChecked}`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleUpdate = async (data: SalaryComponent) => {
    if (!selectedData) {
      dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: "please select data" }));
      return;
    }

    try {
      console.log(data, 'creare')
      const res: ResponseType<ResponseTypeCreateSuccess> = await updateSalaryComponent(selectedData.id, selectedData.row_version, data)

      setVisible(false);
      mutate(`/api/salary-component?show_all=${isShowDeletedDataChecked}`);
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

  const handleDelete = async (data: SalaryComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await deleteSalaryComponent(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/salary-component?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handlePurge = async (data: SalaryComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await purgeSalaryComponent(data.id);
      setVisible(false);
      reset();
      mutate(`/api/salary-component?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const handleRestore = async (data: SalaryComponent) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await restoreSalaryComponent(data.id, data.row_version);
      setVisible(false);
      reset();
      mutate(`/api/salary-component?show_all=${isShowDeletedDataChecked}`);

      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const onSubmit = (data: SalaryComponent) => {
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

  const onClickUpdate = (data: SalaryComponent) => {
    setVisible(true);
    setIsAddNew(false);
    setPopupHeaderTitle('Update Salary Component');
    reset(data)
    setSelectedData(data);
  }


  const activeColumnBody = (rowData: SalaryComponent) => {
    return rowData.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="danger" />
    );
  };


  const actionColumnBody = (rowData: SalaryComponent) => {
    return <>
      <div className="flex gap-2">
        {hasRole(profileState.role, ["superadmin"]) && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete forever' rounded severity='secondary' label="" icon="pi pi-times" size="small" onClick={() => { onClickPurge(rowData) }} />}

        {hasRole(profileState.role, ["superadmin"]) && rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='restore' rounded severity='success' label="" icon="pi pi-refresh" size="small" onClick={() => { onClickRestore(rowData) }} />}

        {!rowData.deleted_at && <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='delete' rounded severity='danger' label="" icon="pi pi-trash" size="small" onClick={() => { onClickDelete(rowData) }} />}

        <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='update' rounded severity='help' label="" icon="pi pi-pencil" size="small" onClick={() => { onClickUpdate(rowData) }} />
      </div>
    </>
  };

  const onClickDelete = (data: SalaryComponent) => {
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

  const onClickRestore = (data: SalaryComponent) => {
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

  const onClickPurge = (data: SalaryComponent) => {
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
      <Card title={<CardTitle title='Salary Component' url='' />}>

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
            value={SalaryComponentData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No Salary Component found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="code" header="Code"></Column>
            <Column field="name" header="Name"></Column>
            <Column field="component_type" header="Component Type"></Column>
            <Column field="calculation_type" header="Calculation Type"></Column>
            <Column field="default_amount" header="Default Amount" body={(rowdata => {
              return Number(rowdata.percentage)
            })}></Column>
            <Column field="percentage" header="Percentage" body={(rowdata => {
              return `${Number(rowdata.percentage)}%`
            })}></Column>
            <Column field="base_component" header="Base Component"></Column>
            <Column field="taxable" header="Taxable" body={(rowdata => {
              return rowdata.taxable ? 'Yes' : 'No'
            })}></Column>
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
              <label htmlFor="code">Code</label>
              <Controller
                name="code"
                control={control}
                rules={{
                  required: "*required",
                  validate: (value) => !/\s/.test(value) || "must not contain spaces.",
                  maxLength: { value: 50, message: 'maximum 50 character' }
                }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="code"
                      placeholder='example: Position_abc'
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
              <label htmlFor="name">Name</label>
              <Controller
                name="name"
                control={control}
                rules={{ required: "*required", maxLength: { value: 50, message: 'maximum 50 character' } }}
                render={({ field, fieldState }) => (
                  <>
                    <InputText
                      id="name"
                      placeholder='example: uang makan'
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
              <label htmlFor="component_type">Component Type</label>
              <Controller
                name="component_type"
                control={control}
                rules={{ required: "*required", }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="component_type"
                      appendTo={() => document.body}
                      value={field.value ?? null}
                      options={componentTypeList}
                      // loading={stateIsLoading}
                      // disabled={stateIsLoading || !!stateError}
                      onChange={(e) => {
                        console.log("Clear clicked, value:", e.value);
                        field.onChange(e.value ?? null);
                      }}
                      optionLabel="description"
                      optionValue="code"
                      showClear={true}
                      placeholder={
                        isLoading ? "Loading Component Types..." : "Select a Component Type"
                      }
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {/* {stateError && (<small className="p-error font-bold">We couldn’t load the list of Component Types. Please try again</small>)} */}
                  </>
                )}
              />
            </div>


            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="calculation_type">Calculation Type</label>
              <Controller
                name="calculation_type"
                control={control}
                rules={{ required: "*required", }}
                render={({ field, fieldState }) => (
                  <>
                    <Dropdown
                      id="calculation_type"
                      appendTo={() => document.body}
                      value={field.value ?? null}
                      options={calculationTypeList}
                      // loading={stateIsLoading}
                      // disabled={stateIsLoading || !!stateError}
                      onChange={(e) => {
                        console.log("Clear clicked, value:", e.value);
                        field.onChange(e.value ?? null);
                      }}
                      optionLabel="description"
                      optionValue="code"
                      showClear={true}
                      placeholder={
                        isLoading ? "Loading Calculation Types..." : "Select a Calculation Type"
                      }
                      className={fieldState.invalid ? "p-invalid" : ""}
                    />
                    {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                    {/* {stateError && (<small className="p-error font-bold">We couldn’t load the list of Calculation Types. Please try again</small>)} */}
                  </>
                )}
              />
            </div>

            {watch('calculation_type') === 'fixed' && (
              <div className="m-0 flex flex-col gap-2">
                <label htmlFor="default_amount">Default Amount</label>
                <Controller
                  name="default_amount"
                  control={control}
                  defaultValue={0}
                  rules={{ required: "*required", }}
                  render={({ field, fieldState }) => (
                    <>
                      <InputNumber
                        id="default_amount"
                        placeholder='example: Rp.500.000 => 500000 or 0 for without default amount'
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
            )}

            {watch('calculation_type') === 'percentage' && (
              <>
                <div className="m-0 flex flex-col gap-2">
                  <label htmlFor="percentage">Percentage</label>
                  <Controller
                    name="percentage"
                    control={control}
                    defaultValue={0}
                    rules={{ required: "*required", min: 0 }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="percentage"
                          placeholder='example: 50% => 50 or 0 for without percentage'
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
                  <label htmlFor="base_component">Base Component</label>
                  <Controller
                    name="base_component"
                    control={control}
                    rules={{ required: "*required", }}
                    render={({ field, fieldState }) => (
                      <>
                        <Dropdown
                          id="base_component"
                          appendTo={() => document.body}
                          value={field.value ?? null}
                          options={SalaryComponentData}
                          loading={isLoading}
                          disabled={isLoading || !!error}
                          onChange={(e) => {
                            console.log("Clear clicked, value:", e.value);
                            field.onChange(e.value ?? null);
                          }}
                          optionLabel="name"
                          optionValue="code"
                          showClear={true}
                          placeholder={
                            isLoading ? "Loading Base Component..." : "Select a Position"
                          }
                          className={fieldState.invalid ? "p-invalid" : ""}
                        />
                        {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                        {error && (<small className="p-error font-bold">We couldn’t load the list of Base Component. Please try again</small>)}
                      </>
                    )}
                  />
                </div>
              </>

            )}

            {watch('calculation_type') === 'per_unit' && (
              <>
                <div className="m-0 flex flex-col gap-2">
                  <label htmlFor="default_amount">Rate Amount</label>
                  <Controller
                    name="default_amount"
                    control={control}
                    defaultValue={0}
                    rules={{ required: "*required", }}
                    render={({ field, fieldState }) => (
                      <>
                        <InputNumber
                          id="default_amount"
                          placeholder='example: Rp.500.000 => 500000 or 0 for without default amount'
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
              </>
            )}

            <div className="m-0 flex flex-col gap-2">
              <label htmlFor="taxable">Taxable</label>
              <Controller
                name="taxable"
                control={control}
                defaultValue={true}
                render={({ field }) => (
                  <InputSwitch
                    id="taxable" checked={field.value}
                    onChange={(e) => field.onChange(e.value)}
                  />
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

            <div className="m-0">
              {watch('calculation_type') === 'formula' && (
                <>
                  <h1 className="font-bold">Formula Configuration</h1>
                  {/* <h2 className="text-gray-400">Define shift rotation order and duration</h2> */}

                  <div className="pt-5">
                    {/* wrapper scroll */}
                    <div className="max-h-60 overflow-y-auto overflow-x-auto border rounded-md">
                      <table className="min-w-[600px] w-full border-separate border-spacing-x-3 border-spacing-y-2">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                          <tr className="font-bold text-gray-600">
                            <th className="w-50 text-left">Effective From</th>
                            <th className="text-left">Formula</th>
                            <th className="w-16 text-left">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fields.map((field, index) => (
                            <tr key={field.id}>
                              {/* effective date */}
                              <td className="align-top bg-white rounded-md shadow-sm">
                                <Controller
                                  name={`formula.${index}.effective_date`}
                                  control={control}
                                  rules={{ required: "Effective Date is required" }}
                                  render={({ field, fieldState }) => (
                                    <div className="flex flex-col">
                                      <Calendar
                                        appendTo={() => document.body}
                                        {...field}
                                        dateFormat='dd-mm-yy'
                                        showIcon
                                        value={field.value ? dayjs(field.value, "DD-MM-YYYY").toDate() : null}
                                        onChange={(e) => field.onChange(e.value)}
                                        className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                                      />
                                      {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                                    </div>
                                  )}
                                />
                              </td>

                              {/* formula */}
                              <td className="align-top bg-white rounded-md shadow-sm">
                                <Controller
                                  name={`formula.${index}.formula`}
                                  control={control}
                                  rules={{
                                    required: "formula is required",
                                  }}
                                  render={({ field, fieldState }) => (
                                    <div className="flex flex-col">
                                      <InputText
                                        placeholder='example: component_code*0.04'
                                        {...field}
                                        className={fieldState.invalid ? "p-invalid" : ""}
                                      />
                                      {fieldState.error && (
                                        <small className="font-bold p-error"> {fieldState.error.message} </small>
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
                        label="Add Formula"
                        icon="pi pi-plus"
                        onClick={() =>
                          append({ effective_date: dayjs().format("DD-MM-YYYY"), formula: '' })
                        }
                      />
                    </div>
                  </div>
                </>

              )}
            </div>

          </div>
        </Dialog>
      </form >
    </>
  )
}

export default SalaryComponentTableData