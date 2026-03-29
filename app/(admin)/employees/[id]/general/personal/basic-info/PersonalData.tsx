"use client"

import { RootState } from '@/store/store';
import { showToast } from '@/store/ToastSlice';
import dayjs from 'dayjs';
import { useParams } from 'next/navigation';
import { Button } from 'primereact/button'
import { Calendar } from 'primereact/calendar';
import { ConfirmDialog } from 'primereact/confirmdialog';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Toast } from 'primereact/toast';
import React, { useEffect, useRef } from 'react'
import { Controller, FieldErrors, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';

interface GenderType {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface ReligionType {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface MaritalStatusType {
  id: number;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type FormData = {
  firstName: string;
  lastName: string;
  birthplace: string;
  dob: string;
  gender: number,
  religion: number;
  marital: string;
};


const getBody = () => document.body;

const PersonalData = () => {
  const params = useParams();
  const id = params.id;
  const dispatch = useDispatch();
  const profileData = useSelector((state: RootState) => state.profile);

  const { control, handleSubmit, setValue } = useForm<FormData>({ mode: "onChange" });
  const [isPageEdit, setIsPageEdit] = React.useState<boolean>(false);
  const [listReligion, setListReligion] = React.useState<ReligionType[]>([]);
  const [listGender, setListGender] = React.useState<GenderType[]>([]);
  const [listMaritalStatus, setListMaritalStatus] = React.useState<MaritalStatusType[]>([]);
  const toast = useRef<Toast>(null!);

  const getPersonalData = async () => {

    const response = await fetch(`http://localhost:3050/api/employees/${id}/personal-data`, { credentials: "include", });
    const data = await response.json();

    setValue('firstName', data.first_name);
    setValue('lastName', data.last_name);
    setValue('dob', data.dob);
    setValue('gender', data.gender_id);
    setValue('religion', data.religion_id);
    setValue('marital', data.marital_status_id);
    setValue('birthplace', data.birth_place);
  }

  useEffect(() => {
    getlistReligion();
    getListGender();
    getListMaritalStatus();
  }, []);

  useEffect(() => {
    getPersonalData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listReligion, listGender, listMaritalStatus]);

  const getlistReligion = async () => {
    const response = await fetch('http://localhost:3050/api/religion', { credentials: "include", });
    const data = await response.json();
    setListReligion(data);
  }

  const getListGender = async () => {
    const response = await fetch('http://localhost:3050/api/gender', { credentials: "include", });
    const data = await response.json();
    setListGender(data);
  }

  const getListMaritalStatus = async () => {
    const response = await fetch('http://localhost:3050/api/marital', { credentials: "include", });
    const data = await response.json();
    setListMaritalStatus(data);
  }

  const onSubmit = async (data: FormData) => {
    const putData = {
      first_name: data.firstName,
      last_name: data.lastName,
      birth_place: data.birthplace,
      dob: dayjs(data.dob).format("YYYY-MM-DD"),
      gender_id: data.gender,
      religion_id: data.religion,
      marital_status_id: data.marital,
      photo_url: profileData.photo_url,
    }

    const res = await fetch(`http://localhost:3050/api/employees/${id}/personal-data`, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(putData),
    });

    const result = await res.json();
    if (result) {
      dispatch(showToast({ visible: true, severity: "success", summary: "success", detail: "update personal data success" }));
      setIsPageEdit(false)
    }

    getPersonalData();
  };

  const onInvalid = (errors: FieldErrors<FormData>) => {
    console.log("❌ Form is invalid:", errors);
  };

  return (
    <>
      <Toast ref={toast} position="top-center" />
      <ConfirmDialog />
      <form onSubmit={handleSubmit((data: FormData) => onSubmit(data), onInvalid)}>
        <div className="m-0">
          <div className="flex flex-col gap-5">
            <div className="header flex justify-between">
              <div className="title flex flex-col">
                <h5 className="text-xl">Personal Data</h5>
                <h5 className="text-sm">Your personal data information</h5>
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
                    <label htmlFor="name">Full Name</label>
                  </div>
                  <div className="w-4/5 flex flex-row gap-5">
                    <Controller
                      name="firstName"
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
                              disabled={!isPageEdit}
                              id="firstName"
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
                      name="lastName"
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
                              disabled={!isPageEdit}
                              id="lastName"
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
                    <label htmlFor="birthplace">Place Of Birth</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="birthplace"
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
                            disabled={!isPageEdit}
                            id="birthplace"
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
                            disabled={!isPageEdit}
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
                    <label htmlFor="gender">Gender</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="gender"
                      control={control}
                      rules={{ required: "gender is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="gender"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={listGender}
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
                    <label htmlFor="religion">Religion</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="religion"
                      control={control}
                      rules={{ required: "religion is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="religion"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={listReligion}
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
                    <label htmlFor="marital">Marital Status</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="marital"
                      control={control}
                      rules={{ required: "marital status is required" }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="marital"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={listMaritalStatus}
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
            </div>
          </div>
        </div>
      </form>
    </>
  );
}

export default PersonalData