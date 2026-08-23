"use client";
import { useI18n } from "@/app/i18n";

import {
  getCountryOptions,
  getGenderOptions,
  getMaritalOptions,
  getReligionOptions,
  updateEmployeePersonalData,
} from "@/app/services/employee-general-service";
import { EmployeePersonalData, OptionItem } from "@/app/types/employee-general";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";
import useSWR from "swr";
import { fetcher } from "@/app/utils/fetcher";

type FormData = {
  first_name: string;
  middle_name: string;
  last_name: string;
  preferred_name: string;
  birth_place: string;
  dob: Date | null;
  gender_id: number | null;
  religion_id: number | null;
  marital_status_id: string;
  phone_number: string;
  personal_email: string;
  work_email: string;
  nationality_country_id: number | null;
};

const getBody = () => document.body;

const PersonalData = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const params = useParams();
  const employeeId = Number(params.id);
  const personalDataKey = `/api/employees/${employeeId}/personal-data`;
  const { data: personal, mutate: refreshPersonalData } =
    useSWR<EmployeePersonalData>(personalDataKey, fetcher);

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: {
      first_name: "",
      middle_name: "",
      last_name: "",
      preferred_name: "",
      birth_place: "",
      dob: null,
      gender_id: null,
      religion_id: null,
      marital_status_id: "",
      phone_number: "",
      personal_email: "",
      work_email: "",
      nationality_country_id: null,
    },
  });

  const [isPageEdit, setIsPageEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [genders, setGenders] = useState<OptionItem[]>([]);
  const [religions, setReligions] = useState<OptionItem[]>([]);
  const [maritals, setMaritals] = useState<OptionItem[]>([]);
  const [countries, setCountries] = useState<OptionItem[]>([]);

  const loadData = async () => {
    if (!personal) {
      return;
    }

    setLoading(true);
    try {
      const [genderList, religionList, maritalList, countryList] =
        await Promise.all([
          getGenderOptions(),
          getReligionOptions(),
          getMaritalOptions(),
          getCountryOptions(),
        ]);

      setGenders(genderList.filter((a) => a.is_active !== false));
      setReligions(religionList.filter((a) => a.is_active !== false));
      setMaritals(maritalList.filter((a) => a.is_active !== false));
      setCountries(countryList.filter((a) => a.is_active !== false));

      reset({
        first_name: personal.first_name ?? "",
        middle_name: personal.middle_name ?? "",
        last_name: personal.last_name ?? "",
        preferred_name: personal.preferred_name ?? "",
        birth_place: personal.birth_place ?? "",
        dob: personal.dob ? dayjs(personal.dob).toDate() : null,
        gender_id: personal.gender_id ?? null,
        religion_id: personal.religion_id ?? null,
        marital_status_id: personal.marital_status_id ?? "",
        phone_number: personal.phone_number ?? "",
        personal_email: personal.personal_email ?? "",
        work_email: personal.work_email ?? "",
        nationality_country_id: personal.nationality_country_id ?? null,
      });
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [employeeId, personal]);

  const onSubmit = async (data: FormData) => {
    const payload: EmployeePersonalData = {
      first_name: data.first_name,
      middle_name: data.middle_name || null,
      last_name: data.last_name,
      preferred_name: data.preferred_name || null,
      birth_place: data.birth_place,
      dob: data.dob ? dayjs(data.dob).format("YYYY-MM-DD") : "",
      gender_id: Number(data.gender_id),
      religion_id: Number(data.religion_id),
      marital_status_id: data.marital_status_id,
      photo_url: null,
      phone_number: data.phone_number || null,
      personal_email: data.personal_email || null,
      work_email: data.work_email || null,
      nationality_country_id: data.nationality_country_id
        ? Number(data.nationality_country_id)
        : null,
    };

    try {
      await updateEmployeePersonalData(employeeId, payload);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.g72xw0"),
          detail: i18nT("static.ywmzj1"),
        }),
      );
      setIsPageEdit(false);
      await refreshPersonalData();
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.9bb0pd"),
            detail: err.message,
          }),
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-sm text-slate-500">
        {i18nT("static.s0hc4r")}{" "}
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <EmployeeDetailTableHeader
            title={i18nT("static.16u7g4f")}
            description={i18nT("static.1fgsvc1")}
            actions={
              <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
                {isPageEdit ? (
                  <>
                    <Button
                      type="button"
                      label={i18nT("static.ew9em3")}
                      icon="pi pi-times"
                      text
                      severity="secondary"
                      size="small"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setIsPageEdit(false);
                        void loadData();
                      }}
                    />
                    <Button
                      type="submit"
                      label={i18nT("static.6gmm1l")}
                      icon="pi pi-check"
                      size="small"
                      className="w-full sm:w-auto"
                    />
                  </>
                ) : (
                  <Button
                    type="button"
                    icon="pi pi-pencil"
                    label={i18nT("static.1i1lcq9")}
                    severity="secondary"
                    outlined
                    size="small"
                    className="w-full sm:w-auto"
                    onClick={() => setIsPageEdit(true)}
                  />
                )}
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Controller
              name="first_name"
              control={control}
              rules={{ required: i18nT("static.18zbxl5") }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="first_name">{i18nT("static.6yjm7s")}</label>
                  <InputText
                    id="first_name"
                    {...field}
                    disabled={!isPageEdit}
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="middle_name"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="middle_name">{i18nT("static.1i6ktxn")}</label>
                  <InputText
                    id="middle_name"
                    {...field}
                    disabled={!isPageEdit}
                  />
                </div>
              )}
            />

            <Controller
              name="last_name"
              control={control}
              rules={{ required: i18nT("static.1vflgoh") }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="last_name">{i18nT("static.16p3u1s")}</label>
                  <InputText
                    id="last_name"
                    {...field}
                    disabled={!isPageEdit}
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="preferred_name"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="preferred_name">
                    {i18nT("static.f7e5k1")}
                  </label>
                  <InputText
                    id="preferred_name"
                    {...field}
                    disabled={!isPageEdit}
                  />
                </div>
              )}
            />

            <Controller
              name="birth_place"
              control={control}
              rules={{ required: i18nT("static.134zo") }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="birth_place">{i18nT("static.t87wj8")}</label>
                  <InputText
                    id="birth_place"
                    {...field}
                    disabled={!isPageEdit}
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="dob"
              control={control}
              rules={{ required: i18nT("static.1tvgdpv") }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="dob">{i18nT("static.1m101fi")}</label>
                  <Calendar
                    id="dob"
                    appendTo={getBody}
                    disabled={!isPageEdit}
                    dateFormat="dd MM yy"
                    showIcon
                    value={field.value}
                    onChange={(e) => field.onChange(e.value)}
                    className={
                      fieldState.invalid ? "p-invalid w-full" : "w-full"
                    }
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="gender_id"
              control={control}
              rules={{ required: i18nT("static.15jbp1t") }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="gender_id">{i18nT("static.1adu274")}</label>
                  <Dropdown
                    id="gender_id"
                    appendTo={getBody}
                    disabled={!isPageEdit}
                    value={field.value}
                    options={genders}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={i18nT("static.rtoq86")}
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="religion_id"
              control={control}
              rules={{ required: i18nT("static.hpe9yz") }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="religion_id">{i18nT("static.1y626di")}</label>
                  <Dropdown
                    id="religion_id"
                    appendTo={getBody}
                    disabled={!isPageEdit}
                    value={field.value}
                    options={religions}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={i18nT("static.d04w6o")}
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="marital_status_id"
              control={control}
              rules={{ required: i18nT("static.14zb8qu") }}
              render={({ field, fieldState }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="marital_status_id">
                    {i18nT("static.s7ogwz")}
                  </label>
                  <Dropdown
                    id="marital_status_id"
                    appendTo={getBody}
                    disabled={!isPageEdit}
                    value={field.value}
                    options={maritals}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={i18nT("static.r2t1q1")}
                    className={fieldState.invalid ? "p-invalid" : ""}
                  />
                  {fieldState.error && (
                    <small className="p-error">
                      {fieldState.error.message}
                    </small>
                  )}
                </div>
              )}
            />

            <Controller
              name="phone_number"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="phone_number">
                    {i18nT("static.1v8ev2w")}
                  </label>
                  <InputText
                    id="phone_number"
                    {...field}
                    disabled={!isPageEdit}
                  />
                </div>
              )}
            />

            <Controller
              name="personal_email"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="personal_email">
                    {i18nT("static.1kdz0sl")}
                  </label>
                  <InputText
                    id="personal_email"
                    {...field}
                    disabled={!isPageEdit}
                  />
                </div>
              )}
            />

            <Controller
              name="work_email"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="work_email">{i18nT("static.3ewaq0")}</label>
                  <InputText
                    id="work_email"
                    {...field}
                    disabled={!isPageEdit}
                  />
                </div>
              )}
            />

            <Controller
              name="nationality_country_id"
              control={control}
              render={({ field }) => (
                <div className="flex flex-col gap-2">
                  <label htmlFor="nationality_country_id">
                    {i18nT("static.jvv0p5")}
                  </label>
                  <Dropdown
                    id="nationality_country_id"
                    appendTo={getBody}
                    disabled={!isPageEdit}
                    value={field.value}
                    options={countries}
                    onChange={(e) => field.onChange(e.value)}
                    optionLabel="name"
                    optionValue="id"
                    placeholder={i18nT("static.m0lwb7")}
                  />
                </div>
              )}
            />
          </div>
        </div>
      </form>
    </>
  );
};

export default PersonalData;
