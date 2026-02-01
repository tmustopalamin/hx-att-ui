'use client'

import { Card } from 'primereact/card'
import { Column } from 'primereact/column';
import { DataTable } from 'primereact/datatable';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { FilterMatchMode } from 'primereact/api';
import { Button } from 'primereact/button';
import CardTitle from '@/app/_components/CardTitle';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/app/utils/fetcher';
import LoadingDataTable from '@/app/_components/LoadingDataTable';
import ErrorNotConnectedToApi from '@/app/_components/ErrorNotConnectedToApi';
// import { Checkbox } from 'primereact/checkbox';
import { Employee } from '@/app/types/employee';
import { useRouter } from 'next/navigation';
import { ResponseTypeCreateSuccess, ResponseType } from '@/app/types/response-type';
import { useDispatch } from 'react-redux';
import { getErrorMessage, isResponseTypeError } from '@/app/utils/error-messages';
import { showToast } from '@/store/ToastSlice';
import { Dialog } from 'primereact/dialog';
import { Controller, useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
// import { RootState } from '@/store/store';
import { ReligionType } from '@/app/types/religion-type';
import { Gender } from '@/app/types/gender';
import { MaritalStatus } from '@/app/types/marital-status';
import { createEmployee } from '@/app/services/employee-service';
import Link from 'next/link';


const EmployeesDataTable = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  // const profileState = useSelector((state: RootState) => state.profile);
  const [globalFilterValue, setGlobalFilterValue] = useState('');
  const [filters, setFilters] = useState({
    global: { value: '', matchMode: FilterMatchMode.CONTAINS },
  });
  // const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] = useState(false);

  const [isAddNew, setIsAddNew] = useState(false);
  const [visible, setVisible] = useState(false);
  const [popupHeaderTitle, setPopupHeaderTitle] = useState('');
  const { control, handleSubmit, setFocus, formState: { isValid }, reset, clearErrors } = useForm<Employee>();

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
    setPopupHeaderTitle("New Employee");
    reset({
      id: 0,
      first_name: '',
      last_name: '',
      dob: '',
      gender_id: 0,
      religion_id: 0,
      birth_place: '',
      marital_status_id: '',
      photo_url: '',
      is_active: false,
      deleted_at: '',
      row_version: 0,
    });
  }

  const handleSubmitNew = async (data: Employee) => {
    try {
      const res: ResponseType<ResponseTypeCreateSuccess> = await createEmployee(data);
      setVisible(false);
      reset();
      mutate(`/api/employees/list`);
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: res.message }));
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }
    }
  }

  const footerContent = (
    <div className='text-right flex gap-5 justify-end'>
      <Button type="button" label="Cancel" icon="pi pi-times" onClick={() => { setVisible(false); }} className="p-button-text" />
      <Button type="submit" label={isAddNew ? "Submit" : "Save"} icon="pi pi-check" />
    </div>
  );

  const { data: EmployeesData, error, isLoading } = useSWR<Employee[]>(`/api/employees/list`, fetcher);
  const { data: genderData, error: genderError, isLoading: genderIsLoading } = useSWR<Gender[]>(`/api/gender`, fetcher);
  const { data: religionData, error: religionError, isLoading: religionIsLoading } = useSWR<ReligionType[]>(`/api/religion`, fetcher);
  const { data: maritalStatusData, error: maritalStatusError, isLoading: maritalStatusIsLoading } = useSWR<MaritalStatus[]>(`/api/marital`, fetcher);

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey='/api/employees?show_all=true' />
  }

  const genderActive = genderData?.filter(a => a.is_active);
  const religionActive = religionData?.filter(a => a.is_active);
  const maritalStatusActive = maritalStatusData?.filter(a => a.is_active);
  const nameColumnBody = (rowData: Employee) => {
    return rowData.first_name + " " + rowData.last_name
  };


  const actionColumnBody = (rowData: Employee) => {
    return <>
      <div className="flex gap-2">
        <Link href={`/employees/${rowData.id}/general/personal`}>
          <Button tooltipOptions={{ appendTo: () => document.body, position: 'top' }} tooltip='edit' rounded severity='help' label="" icon="pi pi-pencil" size="small" />
        </Link>
      </div>
    </>
  };

  const onClickUpdate = (data: Employee) => {
    router.push(`/employees/${data.id}/general/personal`);
  }

  const onSubmit = (data: Employee) => {
    if (!isValid)
      return;

    if (isAddNew) {
      handleSubmitNew(data);
      return;
    }

  };

  const getBody = () => document.body;

  return (
    <>
      <ConfirmDialog />
      <Card>
        <div className="pt-0 pr-3 pb-3 pl-3">

          <div className="flex items-center justify-between pb-5">
            <div className="flex">
              <div className="flex flex-col">
                <p className="text-2xl font-bold">Employees</p>
                <p className="text-md">Manage your employee records and branches</p>
              </div>
            </div>

            <div className="flex gap-5">
              <IconField iconPosition="left">
                <InputIcon className="pi pi-search" />
                <InputText className="p-inputtext-sm" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
              </IconField>

              <Button label="New" icon="pi pi-plus" size="small" onClick={() => { onClickNew() }} />
            </div>
          </div>

          <DataTable
            value={EmployeesData}
            tableStyle={{ minWidth: "50rem" }}
            stripedRows
            paginator
            scrollable
            scrollHeight="500px"
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            globalFilterFields={['name']}
            emptyMessage="No Employees found."
            header={<></>}
            filters={filters}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            loading={isLoading}
          >
            <Column header="#" headerStyle={{ width: '3rem' }} body={(data, options) => options.rowIndex + 1}></Column>
            <Column field="code" header="Employee ID"></Column>
            <Column field="name" header="Name" body={nameColumnBody}></Column>
            <Column field="gender_name" header="Gender"></Column>
            <Column field="agency_name" header="Agency"></Column>
            <Column field="branch_name" header="Branch"></Column>
            <Column headerClassName='bg-white' className='bg-white' header="Action" body={(rowData) => actionColumnBody(rowData)} frozen={true} alignFrozen="right"></Column>
          </DataTable>

          <form onSubmit={handleSubmit((data) => onSubmit(data))}>
            <Dialog
              header={popupHeaderTitle}
              visible={visible}
              style={{ width: '50vw' }}
              onHide={() => { if (!visible) return; setVisible(false); reset(); }}
              footer={footerContent}
              onShow={() => {
                setFocus('first_name');
              }}
            >
              <div className="flex flex-col gap-5">

                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="name">Full Name</label>
                  </div>
                  <div className="w-4/5 flex flex-row gap-5">
                    <Controller
                      name="first_name"
                      defaultValue=""
                      control={control}
                      rules={{
                        required: "name is required",
                        maxLength: {
                          value: 50,
                          message: "maximum 50 character",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <div className="flex flex-col w-full">
                            <InputText
                              id="first_name"
                              {...field}
                              placeholder='First Name'
                              className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                            />
                            {fieldState.error && (
                              <small className="font-bold p-error">
                                {fieldState.error.message}
                              </small>
                            )}
                          </div>
                        </>
                      )}
                    />

                    <Controller
                      name="last_name"
                      defaultValue=""
                      control={control}
                      rules={{
                        required: "last name is required",
                        maxLength: {
                          value: 50,
                          message: "maximum 50 character",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <div className="flex flex-col w-full">
                            <InputText
                              id="last_name"
                              {...field}
                              placeholder='Last Name'
                              className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                            />
                            {fieldState.error && (
                              <small className="font-bold p-error">
                                {fieldState.error.message}
                              </small>
                            )}
                          </div>
                        </>
                      )}
                    />
                  </div>
                </div>

                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="birth_place">Place Of Birth</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="birth_place"
                      defaultValue=""
                      control={control}
                      rules={{
                        required: "place of birth is required",
                        maxLength: {
                          value: 50,
                          message: "maximum 50 character",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputText
                            id="birth_place"
                            {...field}
                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
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

                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="dob">Birth Date</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="dob"
                      control={control}
                      rules={{ required: "birth date is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            appendTo={getBody}
                            {...field}
                            id="dob"
                            dateFormat='dd-mm-yy'
                            showIcon
                            value={field.value ? dayjs(field.value, "DD-MM-YYYY").toDate() : null}
                            onChange={(e) => field.onChange(e.value)}
                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                          />
                          {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                        </>
                      )}
                    />
                  </div>
                </div>

                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="gender_id">Gender</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="gender_id"
                      control={control}
                      rules={{ required: "gender_id is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="gender_id"
                            appendTo={getBody}
                            value={field.value}
                            options={genderActive}
                            loading={genderIsLoading}
                            disabled={genderIsLoading || !!genderError}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Gender"
                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                          />
                          {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                        </>
                      )}
                    />
                  </div>
                </div>

                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="religion_id">Religion</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="religion_id"
                      control={control}
                      rules={{ required: "religion is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="religion_id"
                            appendTo={getBody}
                            value={field.value}
                            options={religionActive}
                            loading={religionIsLoading}
                            disabled={religionIsLoading || !!religionError}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Religion"
                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                          />
                          {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                        </>
                      )}
                    />
                  </div>
                </div>

                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="marital_status_id">Marital Status</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="marital_status_id"
                      control={control}
                      rules={{ required: "marital status is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="marital_status_id"
                            appendTo={getBody}
                            value={field.value}
                            options={maritalStatusActive}
                            disabled={maritalStatusIsLoading || !!maritalStatusError}
                            loading={maritalStatusIsLoading}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Marital Status"
                            className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                          />
                          {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                        </>
                      )}
                    />
                  </div>
                </div>
              </div>
            </Dialog>
          </form>
        </div>

      </Card>
    </>
  )
}

export default EmployeesDataTable