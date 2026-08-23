"use client";
import { useI18n } from "@/app/i18n";

import { apiFetchResponse } from "@/app/utils/api-client";

import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Toast } from "primereact/toast";
import React, { useRef } from "react";
import { Controller, useForm } from "react-hook-form";

type FormData = {
  firstName: string;
  lastName: string;
  birthplace: string;
  dob: string;
  gender: number;
  religion: number;
  marital: string;
};

const getBody = () => document.body;

const SalaryDetailSection = () => {
  const { t: i18nT } = useI18n();
  const params = useParams();
  const id = params.id;

  const { control, handleSubmit, setValue } = useForm<FormData>({
    mode: "onChange",
  });
  const [isPageEdit, setIsPageEdit] = React.useState<boolean>(false);
  const toast = useRef<Toast>(null!);

  const getPersonalData = async () => {
    console.clear();

    const response = await apiFetchResponse(
      `/api/employees/${id}/personal-data`,
      {
        credentials: "include",
      },
    );
    const data = await response.json();

    setValue("firstName", data.first_name);
    setValue("lastName", data.last_name);
    setValue("dob", data.dob);
    setValue("gender", data.gender_id);
    setValue("religion", data.religion_id);
    setValue("marital", data.marital_status_id);
    setValue("birthplace", data.birth_place);
  };

  const onSubmit = async (data: FormData) => {
    const putData = {
      first_name: data.firstName,
      last_name: data.lastName,
      birth_place: data.birthplace,
      dob: dayjs(data.dob).format("YYYY-MM-DD"),
      gender_id: data.gender,
      religion_id: data.religion,
      marital_status_id: data.marital,
    };

    await apiFetchResponse(`/api/employees/${id}/personal-data`, {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putData),
    });

    getPersonalData();
  };

  const onInvalid = () => undefined;

  return (
    <>
      <Toast ref={toast} position="top-center" />
      <form
        onSubmit={handleSubmit((data: FormData) => onSubmit(data), onInvalid)}
      >
        <div className="m-0">
          <div className="flex flex-col gap-5">
            <div className="header flex justify-between">
              <div className="title flex flex-col">
                <h5 className="text-xl">{i18nT("static.16u7g4f")}</h5>
                <h5 className="text-sm">{i18nT("static.jdw0hs")}</h5>
              </div>

              {isPageEdit && (
                <>
                  <div className="m-0 flex flex-row gap-2 items-center justify-end">
                    <Button
                      label={i18nT("static.ew9em3")}
                      icon="pi pi-times"
                      className="p-button-text"
                      onClick={() => setIsPageEdit(false)}
                    />
                    <Button
                      label={i18nT("static.lewgh4")}
                      icon="pi pi-check"
                      type="submit"
                    />
                  </div>
                </>
              )}

              {!isPageEdit && (
                <>
                  <Button
                    icon="pi pi-pencil"
                    label={i18nT("static.1i1lcq9")}
                    severity="help"
                    text
                    onClick={() => setIsPageEdit(true)}
                  />
                </>
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex flex-col gap-5">
                <div className="m-0 flex flex-row gap-2 items-center">
                  <div className="w-1/5">
                    <label htmlFor="name">{i18nT("static.4eocnj")}</label>
                  </div>
                  <div className="w-4/5 flex flex-row gap-5">
                    <Controller
                      name="firstName"
                      defaultValue=""
                      control={control}
                      rules={{
                        required: i18nT("static.1jojti3"),
                        maxLength: {
                          value: 50,
                          message: i18nT("static.qf28bp"),
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <div className="flex flex-col w-full">
                            <InputText
                              disabled={!isPageEdit}
                              id="firstName"
                              {...field}
                              placeholder={i18nT("static.6yjm7s")}
                              className={
                                fieldState.invalid
                                  ? "p-invalid w-full"
                                  : "w-full"
                              }
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
                        required: i18nT("static.1tqg5ch"),
                        maxLength: {
                          value: 50,
                          message: i18nT("static.qf28bp"),
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <div className="flex flex-col w-full">
                            <InputText
                              disabled={!isPageEdit}
                              id="lastName"
                              {...field}
                              placeholder={i18nT("static.16p3u1s")}
                              className={
                                fieldState.invalid
                                  ? "p-invalid w-full"
                                  : "w-full"
                              }
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
                    <label htmlFor="birthplace">
                      {i18nT("static.1fejy8k")}
                    </label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="birthplace"
                      defaultValue=""
                      control={control}
                      rules={{
                        required: i18nT("static.xnq8qd"),
                        maxLength: {
                          value: 50,
                          message: i18nT("static.qf28bp"),
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <InputText
                            disabled={!isPageEdit}
                            id="birthplace"
                            {...field}
                            className={
                              fieldState.invalid ? "p-invalid w-full" : "w-full"
                            }
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
                    <label htmlFor="dob">{i18nT("static.1m101fi")}</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="dob"
                      control={control}
                      rules={{ required: i18nT("static.h0kbf7") }}
                      render={({ field, fieldState }) => (
                        <>
                          <Calendar
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            {...field}
                            id="dob"
                            dateFormat="dd MM yy"
                            showIcon
                            value={
                              field.value
                                ? dayjs(field.value, "DD-MM-YYYY").toDate()
                                : null
                            }
                            onChange={(e) => field.onChange(e.value)}
                            className={
                              fieldState.invalid ? "p-invalid w-full" : "w-full"
                            }
                          />
                          {fieldState.error && (
                            <small className="font-bold">
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
                    <label htmlFor="gender">{i18nT("static.1adu274")}</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="gender"
                      control={control}
                      rules={{ required: i18nT("static.td9j75") }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="gender"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={[]}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder={i18nT("static.144ms0n")}
                            className={
                              fieldState.invalid ? "p-invalid w-full" : "w-full"
                            }
                          />
                          {fieldState.error && (
                            <small className="font-bold">
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
                    <label htmlFor="religion">{i18nT("static.1y626di")}</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="religion"
                      control={control}
                      rules={{ required: i18nT("static.ps9i3f") }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="religion"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={[]}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder={i18nT("static.15wg4q1")}
                            className={
                              fieldState.invalid ? "p-invalid w-full" : "w-full"
                            }
                          />
                          {fieldState.error && (
                            <small className="font-bold">
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
                    <label htmlFor="marital">{i18nT("static.s7ogwz")}</label>
                  </div>
                  <div className="w-4/5">
                    <Controller
                      name="marital"
                      control={control}
                      rules={{ required: i18nT("static.1cyi5t2") }}
                      render={({ field, fieldState }) => (
                        <>
                          <Dropdown
                            id="marital"
                            disabled={!isPageEdit}
                            appendTo={getBody}
                            value={field.value}
                            options={[]}
                            onChange={(e) => field.onChange(e.value)}
                            optionLabel="name"
                            optionValue="id"
                            placeholder={i18nT("static.6jx6rw")}
                            className={
                              fieldState.invalid ? "p-invalid w-full" : "w-full"
                            }
                          />
                          {fieldState.error && (
                            <small className="font-bold">
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
};

export default SalaryDetailSection;
