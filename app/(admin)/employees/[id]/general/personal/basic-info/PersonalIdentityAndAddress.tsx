"use client"

import { showToast } from '@/store/ToastSlice';
import dayjs from 'dayjs';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import React, { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form';
import { useDispatch } from 'react-redux';

interface IdentityType {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type FormData = {
  identity_type: IdentityType;
  identity_number: string;
  exp_date: string;
  citizen_address: string;
  residential_address: string;
  is_permanent: boolean;
};

const PersonalIdentityAndAddress = () => {
  const params = useParams();
  const id = params.id;
  const dispatch = useDispatch();


  const { control, handleSubmit, setValue, watch } = useForm<FormData>();
  const [listIdentityType, setListIdentityType] = React.useState<IdentityType[]>([]);
  const [isPageEdit, setIsPageEdit] = React.useState<boolean>(false);

  const getIdentityData = async () => {
    const response = await fetch(`http://localhost:3050/api/employees/${id}/identity-address-data`, { credentials: 'include' });
    const data = await response.json();

    setValue('identity_type', data.identity_type_id);
    setValue('identity_number', data.number);
    setValue('exp_date', data.expire_date);
    setValue('citizen_address', data.citizen_address);
    setValue('residential_address', data.residential_address);
    setValue('is_permanent', data.is_permanent);
  }

  useEffect(() => {
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: FormData) => {
    const putData = {
      identity_type_id: data.identity_type,
      employee_id: Number(id),
      number: data.identity_number,
      citizen_address: data.citizen_address,
      expire_date: data.exp_date ? dayjs(data.exp_date).format("YYYY-MM-DD") : null,
      residential_address: data.residential_address,
      is_permanent: data.is_permanent,
    }

    const res = await fetch(`http://localhost:3050/api/employees/${id}/identity-address-data`, {
      credentials: 'include',
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(putData),
    });

    const result = await res.json();
    if (result) {
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: "update identity & address success" }));
      setIsPageEdit(false)
    }

    getIdentityData();
  };

  const getListIdentityType = async () => {
    const response = await fetch('http://localhost:3050/api/identity-type', { credentials: 'include' });
    const data = await response.json();
    setListIdentityType(data);
  }

  const getData = () => {
    getListIdentityType();
    getIdentityData();
  }

  return (
    <>
      <form onSubmit={handleSubmit((data: FormData) => onSubmit(data))}>
        <div className="m-0">
          <div className="flex flex-col gap-5">
            <div className="header flex justify-between">
              <div className="title flex flex-col">
                <h5 className="text-xl">Identity &amp; Address</h5>
                <h5 className="text-sm">Your personal identity information</h5>
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
                    <label htmlFor="identity_type">ID Type</label>
                  </div>
                  <div className="w-4/5">
                    <div className="flex flex-col gap-2">
                      <Controller
                        name="identity_type"
                        control={control}
                        rules={{ required: "ID Type is required" }}
                        render={({ field, fieldState }) => (
                          <>
                            <Dropdown
                              id="identity_type"
                              disabled={!isPageEdit}
                              appendTo={() => document.body}
                              value={field.value}
                              options={listIdentityType}
                              onChange={(e) => field.onChange(e.value)}
                              optionValue="id"
                              optionLabel="name"
                              placeholder="Select Identity Type"
                              className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                            />
                            {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                          </>
                        )}
                      />
                      <div className="flex gap-2">
                        <Controller
                          name="is_permanent"
                          control={control}
                          render={({ field, fieldState }) => (
                            <>
                              <Checkbox
                                inputId="is_permanent"
                                disabled={!isPageEdit}
                                onChange={(e) => {
                                  field.onChange(e.checked);
                                  if (e.checked) {
                                    setValue('exp_date', '');
                                  }
                                }}
                                checked={field.value}
                              />
                              {fieldState.error && <small className="font-bold">{fieldState.error.message}</small>}
                            </>
                          )}
                        />
                        <label htmlFor="is_permanent">berlaku seumur hidup</label>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="identity_number">ID Number</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="identity_number"
                      defaultValue=""
                      control={control}
                      rules={{
                        required: "ID Number is required",
                        maxLength: {
                          value: 50,
                          message: "maximum 50 character",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputText
                            id="identity_number"
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
                    <label htmlFor="exp_date">Expiration Date</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="exp_date"
                      control={control}
                      rules={{
                        validate: (value) => {
                          if (watch("is_permanent")) return true;
                          return value ? true : "Expiration Date is required";
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            id="exp_date"
                            dateFormat='dd-mm-yy'
                            showIcon
                            disabled={!isPageEdit}
                            appendTo={() => document.body}
                            {...field}
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
                    <label htmlFor="citizen_address">Citizenship Address</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="citizen_address"
                      defaultValue=""
                      control={control}
                      rules={{
                        required: "Citizenship Address is required",
                        maxLength: {
                          value: 50,
                          message: "maximum 50 character",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputText
                            id="citizen_address"
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
                    <label htmlFor="residential_address">Residential Address</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="residential_address"
                      disabled={!isPageEdit}
                      defaultValue=""
                      control={control}
                      rules={{
                        required: "Residential Address is required",
                        maxLength: {
                          value: 50,
                          message: "maximum 50 character",
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputText
                            id="residential_address"
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

              </div>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

export default PersonalIdentityAndAddress