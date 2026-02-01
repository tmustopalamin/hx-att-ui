"use client"

import { ResponseTypeError } from '@/app/types/response-type'
import { getErrorMessage, isResponseTypeError } from '@/app/utils/error-messages'
import { showToast } from '@/store/ToastSlice'
import dayjs from 'dayjs'
import { useParams } from 'next/navigation'
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar'
import { ConfirmDialog } from 'primereact/confirmdialog'
import { Dropdown } from 'primereact/dropdown'
import { InputNumber } from 'primereact/inputnumber'
import { InputText } from 'primereact/inputtext'
import { Toast } from 'primereact/toast'
import React, { useEffect, useRef } from 'react'
import { Controller, FieldErrors, useForm } from 'react-hook-form'
import { useDispatch } from 'react-redux'


type DepartmentType = {
  id: number;
  name: string;
  is_active: boolean;
}

type AgencyType = {
  id: number;
  name: string;
  is_active: boolean;
}

type BranchType = {
  id: number;
  name: string;
  is_active: boolean;
}

type PositionType = {
  id: number;
  name: string;
  department_id: string;
  is_active: boolean;
}

type EmploymentStatusType = {
  id: number;
  name: string;
  is_active: boolean;
}

type EmployeeEmployment = {
  id: number;
  employee_id: number;
  code: string;
  join_date: string;
  end_date: string | null;
  department_id: number;
  position_id: number;
  employment_status_id: number;
  agency_id: number;
  branch_id: number;
};

type FormData = {
  employee_id: number;
  code: string;
  join_date: string;
  end_date: string;
  department: number;
  position: number;
  employment_status: number;
  agency_id: number;
  branch_id: number;
};

const EmployeeDetailEmployment = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const id = params.id;

  const toast = useRef<Toast>(null!);
  const { handleSubmit, control, reset, setValue } = useForm<FormData>();
  const [isPageEdit, setIsPageEdit] = React.useState<boolean>(false);
  const [listDepartment, setListDepartment] = React.useState<DepartmentType[]>([]);
  const [listAgency, setListAgency] = React.useState<AgencyType[]>([]);
  const [listBranch, setListBranch] = React.useState<BranchType[]>([]);
  const [listPosition, setListPosition] = React.useState<PositionType[]>([]);
  const [listPositionFiltered, setListPositionFiltered] = React.useState<PositionType[]>([]);
  const [listEmploymentStatus, setListEmploymentStatus] = React.useState<EmploymentStatusType[]>([]);

  const getListDepartment = async () => {
    const response = await fetch('http://localhost:3050/department');
    const data = await response.json();
    setListDepartment(data);
  }

  const getListAgency = async () => {
    const response = await fetch('http://localhost:3050/agency');
    const data = await response.json();
    setListAgency(data);
  }

  const getListBranch = async () => {
    const response = await fetch('http://localhost:3050/branch');
    const data = await response.json();
    setListBranch(data);
  }

  const getListPosition = async () => {
    const response = await fetch('http://localhost:3050/position');
    const data = await response.json();
    setListPosition(data);
    setListPositionFiltered(data);
  }

  const getListEmploymentStatus = async () => {
    const response = await fetch('http://localhost:3050/employment-status');
    const data = await response.json();
    setListEmploymentStatus(data);
  }

  const getEmploymentData = async () => {
    console.clear()

    const response = await fetch(`http://localhost:3050/employees/${id}/employment-data`);
    const data = await response.json();

    setValue('code', data.code);
    setValue('join_date', data.join_date);
    setValue('end_date', data.end_date);
    setValue('department', data.department_id);
    setValue('position', data.position_id);
    setValue('position', data.position_id);
    setValue('employment_status', data.employment_status_id);
    setValue('agency_id', data.agency_id);
    setValue('branch_id', data.branch_id);
  }

  useEffect(() => {
    getListDepartment();
    getListPosition();
    getListEmploymentStatus();
    getListAgency();
    getListBranch();

    getEmploymentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: FormData) => {
    const updatedData: EmployeeEmployment = {
      id: Number(id),
      employee_id: Number(id),
      code: data.code,
      join_date: dayjs(data.join_date).format("YYYY-MM-DD"),
      end_date: dayjs(data.end_date).isValid() ? dayjs(data.end_date).format("YYYY-MM-DD") : null,
      department_id: data.department,
      position_id: data.position,
      employment_status_id: data.employment_status,
      agency_id: data.agency_id,
      branch_id: data.branch_id,
    }

    try {

      const res = await fetch(`http://localhost:3050/employees/${id}/employment-data`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedData),
      });

      if (!res.ok) {
        const errorData: ResponseTypeError = await res.json();
        throw errorData;
      }
      const data_res = await res.json();
      console.log('Updated:', data_res);

      reset();

      toast.current?.show({ severity: 'success', summary: 'success', detail: 'update success', life: 3000 });
      setIsPageEdit(false)

    } catch (err: unknown) {

      if (isResponseTypeError(err)) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: getErrorMessage(err, 'message') }));
      } else if (err instanceof Error) {
        dispatch(showToast({ visible: true, severity: "error", summary: "error", detail: err.message }));
      }

    }
  };

  const onInvalid = (errors: FieldErrors<FormData>) => {
    console.log("❌ Form is invalid:", errors);
  };

  const getBody = () => document.body;

  return (
    <>
      <Toast ref={toast} position="top-center" />
      <ConfirmDialog />
      <form onSubmit={handleSubmit((data: FormData) => onSubmit(data), onInvalid)}>
        <div className="m-0">
          <div className="flex flex-col gap-5">
            <div className="header flex justify-between">
              <div className="title flex flex-col">
                <h5 className="text-xl">Employment Data</h5>
                <h5 className="text-sm">Your employment data information</h5>
              </div>

              {isPageEdit && <>
                <div className="m-0 flex flex-row gap-2 items-center justify-end">
                  <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setIsPageEdit(false)} />
                  <Button label='Save' icon="pi pi-check" type='submit' />
                </div>
              </>}

              {!isPageEdit && <>
                <Button icon="pi pi-pencil" label=" Edit" severity="help" text onClick={() => setIsPageEdit(true)} />
              </>}
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col gap-5">

                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="code">Employee ID</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="code"
                      defaultValue=""
                      control={control}
                      rules={{
                        required: "ID Number is required",
                        validate: (value) => !/\s/.test(value) || "must not contain spaces.",
                        maxLength: {
                          value: 50,
                          message: "maximum 50 character",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputText
                            id="code"
                            disabled={!isPageEdit}
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
                    <label htmlFor="agency_id">Agency</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="agency_id"
                      control={control}
                      rules={{ required: "agency is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="agency_id"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={listAgency}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Agency"
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
                    <label htmlFor="branch_id">Branch</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="branch_id"
                      control={control}
                      rules={{ required: "branch is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="branch_id"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={listBranch}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Branch"
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
                    <label htmlFor="department">Department</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="department"
                      control={control}
                      rules={{ required: "department is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="department"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={listDepartment}
                            onChange={(e) => {
                              field.onChange(e.value)
                              setListPositionFiltered(listPosition.filter((pos) => pos.department_id === e.value))
                            }}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Department"
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
                    <label htmlFor="position">Position</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="position"
                      control={control}
                      rules={{ required: "gender is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="position"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={listPositionFiltered}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Position"
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
                    <label htmlFor="employment_status">Employment Status</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="employment_status"
                      control={control}
                      rules={{ required: "employment_status is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="employment_status"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={listEmploymentStatus}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder="Select a Employment Status"
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
                    <label htmlFor="join_date">Join Date</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="join_date"
                      control={control}
                      rules={{ required: "join date is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            {...field}
                            id="join_date"
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
                    <label htmlFor="end_date">End Date</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="end_date"
                      control={control}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            {...field}
                            id="end_date"
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

              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  )
}

export default EmployeeDetailEmployment