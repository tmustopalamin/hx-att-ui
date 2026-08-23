"use client";
import { useI18n } from "@/app/i18n";

import {
  createEmployeeFamily,
  deleteEmployeeFamily,
  EmployeeFamilyPayload,
  getEmployeeFamilies,
  getGenderOptions,
  getMaritalOptions,
  getRelationshipOptions,
  updateEmployeeFamily,
} from "@/app/services/employee-general-service";
import { EmployeeFamilyRow, OptionItem } from "@/app/types/employee-general";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import dayjs from "dayjs";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import { useParams } from "next/navigation";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { InputSwitch } from "primereact/inputswitch";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

type FormData = {
  name: string;
  relationship_id: number | null;
  dob: Date | null;
  marital_status: string;
  gender_id: number | null;
  job: string;
  phone1: string;
  phone2: string;
  is_active: boolean;
};

const getBody = () => document.body;

const EmployeeFamilyDataTable = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const params = useParams();
  const employeeId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true);
  const [rows, setRows] = useState<EmployeeFamilyRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<EmployeeFamilyRow | null>(
    null,
  );

  const [relationships, setRelationships] = useState<OptionItem[]>([]);
  const [genders, setGenders] = useState<OptionItem[]>([]);
  const [maritals, setMaritals] = useState<OptionItem[]>([]);

  const { control, handleSubmit, reset, setValue } = useForm<FormData>({
    defaultValues: {
      name: "",
      relationship_id: null,
      dob: null,
      marital_status: "",
      gender_id: null,
      job: "",
      phone1: "",
      phone2: "",
      is_active: true,
    },
  });

  const activeRelationships = useMemo(
    () => relationships.filter((item) => item.is_active !== false),
    [relationships],
  );

  const activeGenders = useMemo(
    () => genders.filter((item) => item.is_active !== false),
    [genders],
  );

  const activeMaritals = useMemo(
    () => maritals.filter((item) => item.is_active !== false),
    [maritals],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [familyRows, relationshipList, genderList, maritalList] =
        await Promise.all([
          getEmployeeFamilies(employeeId),
          getRelationshipOptions(),
          getGenderOptions(),
          getMaritalOptions(),
        ]);

      setRows(familyRows);
      setRelationships(relationshipList);
      setGenders(genderList);
      setMaritals(maritalList);
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
  }, [employeeId]);

  const openNew = () => {
    setIsAddMode(true);
    setSelectedRow(null);
    reset({
      name: "",
      relationship_id: null,
      dob: null,
      marital_status: "",
      gender_id: null,
      job: "",
      phone1: "",
      phone2: "",
      is_active: true,
    });
    setVisible(true);
  };

  const openEdit = (row: EmployeeFamilyRow) => {
    setIsAddMode(false);
    setSelectedRow(row);
    setValue("name", row.name);
    setValue("relationship_id", row.relationship_id);
    setValue("dob", row.dob ? dayjs(row.dob).toDate() : null);
    setValue("marital_status", row.marital_status);
    setValue("gender_id", row.gender_id);
    setValue("job", row.job ?? "");
    setValue("phone1", row.phone1 ?? "");
    setValue("phone2", row.phone2 ?? "");
    setValue("is_active", row.is_active);
    setVisible(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload: EmployeeFamilyPayload = {
      name: data.name,
      relationship_id: Number(data.relationship_id),
      dob: data.dob ? dayjs(data.dob).format("YYYY-MM-DD") : "",
      marital_status: data.marital_status,
      gender_id: Number(data.gender_id),
      job: data.job || null,
      phone1: data.phone1 || null,
      phone2: data.phone2 || null,
      is_active: data.is_active,
    };

    try {
      if (isAddMode) {
        await createEmployeeFamily(employeeId, payload);
      } else if (selectedRow) {
        await updateEmployeeFamily(
          employeeId,
          selectedRow.id,
          selectedRow.row_version,
          payload,
        );
      }

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.g72xw0"),
          detail: isAddMode ? i18nT("static.1e2n938") : i18nT("static.19pon1d"),
        }),
      );

      setVisible(false);
      reset();
      await loadData();
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

  const onDelete = (row: EmployeeFamilyRow) => {
    requestActionConfirmation({
      message: i18nT("static.1b4g205"),
      header: i18nT("static.14tdkvz"),
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await deleteEmployeeFamily(employeeId, row.id, row.row_version);
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: i18nT("static.g72xw0"),
              detail: i18nT("static.1nxu2kn"),
            }),
          );
          await loadData();
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
        }
      },
    });
  };

  const actionBody = (row: EmployeeFamilyRow) => (
    <div className="flex flex-nowrap items-center justify-end gap-2">
      <Button
        type="button"
        rounded
        outlined
        size="small"
        icon="pi pi-pencil"
        severity="secondary"
        tooltip={i18nT("static.1i1lcq9")}
        onClick={() => openEdit(row)}
      />
      <Button
        type="button"
        rounded
        outlined
        size="small"
        icon="pi pi-trash"
        severity="danger"
        tooltip={i18nT("static.oay2cq")}
        onClick={() => onDelete(row)}
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-6">
        <EmployeeDetailTableHeader
          title={i18nT("static.1ii54cp")}
          description={i18nT("static.ueoc7o")}
          actions={
            <Button
              type="button"
              label={i18nT("static.1gjq8z")}
              icon="pi pi-plus"
              size="small"
              className="w-full sm:w-auto"
              onClick={openNew}
            />
          }
        />

        <DataTable
          value={rows}
          dataKey="id"
          loading={loading}
          stripedRows
          rowHover
          removableSort
          responsiveLayout="scroll"
          size="small"
          paginator
          rows={5}
          rowsPerPageOptions={[5, 10, 25]}
          emptyMessage={i18nT("static.112xcjc")}
          scrollable
          tableStyle={{ minWidth: "70rem" }}
          currentPageReportTemplate={i18nT("static.1kqh8lr")}
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        >
          <Column
            header="#"
            body={(_, options) => options.rowIndex + 1}
            style={{ width: "56px" }}
          />
          <Column field="name" header={i18nT("static.4el6o6")} />
          <Column field="relationship_name" header={i18nT("static.7fp6jf")} />
          <Column
            header={i18nT("static.1m101fi")}
            body={(row: EmployeeFamilyRow) =>
              row.dob ? formatDisplayDate(row.dob) : "-"
            }
          />
          <Column field="gender_name" header={i18nT("static.1adu274")} />
          <Column field="marital_name" header={i18nT("static.s7ogwz")} />
          <Column field="job" header={i18nT("static.ijqa2k")} />
          <Column field="phone1" header={i18nT("static.17pijxg")} />
          <Column field="phone2" header={i18nT("static.18jhd0d")} />
          <Column
            field="is_active"
            header={i18nT("static.8qzyhb")}
            body={(row: EmployeeFamilyRow) => (row.is_active ? "Yes" : "No")}
          />
          <Column
            header={i18nT("static.2wk0tb")}
            body={actionBody}
            frozen
            alignFrozen="right"
            className="bg-white"
            headerClassName="bg-white"
          />
        </DataTable>
      </div>

      <Dialog
        header={isAddMode ? i18nT("static.1l5p87d") : i18nT("static.n960nd")}
        visible={visible}
        style={{ width: "95vw", maxWidth: "42rem" }}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
        onHide={() => setVisible(false)}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label={i18nT("static.ew9em3")}
              icon="pi pi-times"
              text
              severity="secondary"
              className="w-full sm:w-auto"
              onClick={() => setVisible(false)}
            />
            <Button
              type="button"
              label={
                isAddMode ? i18nT("static.18b6kn3") : i18nT("static.6gmm1l")
              }
              icon="pi pi-check"
              className="w-full sm:w-auto"
              onClick={handleSubmit(onSubmit)}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
          <Controller
            name="name"
            control={control}
            rules={{ required: i18nT("static.izdgzf") }}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2 md:col-span-2">
                <label
                  htmlFor="family_name"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.4el6o6")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <InputText
                  id="family_name"
                  {...field}
                  placeholder={i18nT("static.i641zu")}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="relationship_id"
            control={control}
            rules={{ required: i18nT("static.m0qu8u") }}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="relationship_id"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.7fp6jf")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  id="relationship_id"
                  appendTo={getBody}
                  value={field.value}
                  options={activeRelationships}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={i18nT("static.1g6pggt")}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
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
                <label
                  htmlFor="family_dob"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1m101fi")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Calendar
                  id="family_dob"
                  appendTo={getBody}
                  dateFormat="dd MM yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
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
                <label
                  htmlFor="family_gender_id"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1adu274")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  id="family_gender_id"
                  appendTo={getBody}
                  value={field.value}
                  options={activeGenders}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={i18nT("static.rtoq86")}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="marital_status"
            control={control}
            rules={{ required: i18nT("static.14zb8qu") }}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="family_marital_status"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.s7ogwz")}{" "}
                  <span className="text-red-500">*</span>
                </label>
                <Dropdown
                  id="family_marital_status"
                  appendTo={getBody}
                  value={field.value}
                  options={activeMaritals}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={i18nT("static.r2t1q1")}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="job"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="family_job"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.ijqa2k")}{" "}
                </label>
                <InputText
                  id="family_job"
                  {...field}
                  placeholder={i18nT("static.1vq75gg")}
                  className="w-full"
                />
              </div>
            )}
          />

          <Controller
            name="phone1"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="family_phone1"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.yx0c3t")}{" "}
                </label>
                <InputText
                  id="family_phone1"
                  {...field}
                  placeholder={i18nT("static.uo48tb")}
                  className="w-full"
                />
              </div>
            )}
          />

          <Controller
            name="phone2"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="family_phone2"
                  className="text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1ag4es1")}{" "}
                </label>
                <InputText
                  id="family_phone2"
                  {...field}
                  placeholder={i18nT("static.bvb283")}
                  className="w-full"
                />
              </div>
            )}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <label
                      htmlFor="family_is_active"
                      className="cursor-pointer text-sm font-medium text-slate-700"
                    >
                      {i18nT("static.almk4n")}{" "}
                    </label>
                    <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
                      {i18nT("static.s1s8a")}{" "}
                    </p>
                  </div>
                  <InputSwitch
                    inputId="family_is_active"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.value)}
                  />
                </div>
              )}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default EmployeeFamilyDataTable;
