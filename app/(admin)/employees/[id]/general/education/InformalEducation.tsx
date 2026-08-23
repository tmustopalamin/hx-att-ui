"use client";
import { useI18n } from "@/app/i18n";

import {
  createEmployeeEducation,
  deleteEmployeeEducation,
  getEmployeeEducation,
  updateEmployeeEducation,
} from "@/app/services/employee-general-service";
import { EmployeeEducationRow } from "@/app/types/employee-general";
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
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

type FormData = {
  name: string;
  institution_name: string;
  major: string;
  degree: string;
  start_date: Date | null;
  end_date: Date | null;
  score: string;
  held_by: string;
  is_certificate: boolean;
  is_active: boolean;
};

type EmployeeEducationPayload = {
  name: string;
  institution_name: string;
  major: string;
  start_date: string;
  end_date?: string | null;
  score: string;
  is_certificate: boolean;
  held_by: string;
  degree: string;
  is_active: boolean;
};

const getBody = () => document.body;

const emptyFormValues: FormData = {
  name: "",
  institution_name: "",
  major: "",
  degree: "",
  start_date: null,
  end_date: null,
  score: "",
  held_by: "",
  is_certificate: false,
  is_active: true,
};

const fieldLabelClass = "mb-2 block text-sm font-medium text-slate-700";
const helperTextClass = "mt-1 text-xs text-slate-500";

const InformalEducation = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const params = useParams();
  const employeeId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true);
  const [rows, setRows] = useState<EmployeeEducationRow[]>([]);
  const [selectedRow, setSelectedRow] = useState<EmployeeEducationRow | null>(
    null,
  );

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: emptyFormValues,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getEmployeeEducation(employeeId, "informal");
      setRows(result);
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
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

  const hideDialog = () => {
    setVisible(false);
    setSelectedRow(null);
    reset(emptyFormValues);
  };

  const openNew = () => {
    setIsAddMode(true);
    setSelectedRow(null);
    reset(emptyFormValues);
    setVisible(true);
  };

  const openEdit = (row: EmployeeEducationRow) => {
    setIsAddMode(false);
    setSelectedRow(row);

    reset({
      name: row.name,
      institution_name: row.institution_name,
      major: row.major,
      degree: row.degree,
      start_date: row.start_date ? dayjs(row.start_date).toDate() : null,
      end_date: row.end_date ? dayjs(row.end_date).toDate() : null,
      score: row.score,
      held_by: row.held_by,
      is_certificate: row.is_certificate,
      is_active: row.is_active,
    });

    setVisible(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload: EmployeeEducationPayload = {
      name: data.name.trim(),
      institution_name: data.institution_name.trim(),
      major: data.major.trim(),
      degree: data.degree.trim(),
      start_date: data.start_date
        ? dayjs(data.start_date).format("YYYY-MM-DD")
        : "",
      end_date: data.end_date
        ? dayjs(data.end_date).format("YYYY-MM-DD")
        : null,
      score: data.score.trim(),
      held_by: data.held_by.trim(),
      is_certificate: data.is_certificate,
      is_active: data.is_active,
    };

    try {
      if (isAddMode) {
        await createEmployeeEducation(employeeId, "informal", payload);
      } else if (selectedRow) {
        await updateEmployeeEducation(
          employeeId,
          "informal",
          selectedRow.id,
          selectedRow.row_version,
          payload,
        );
      }

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: isAddMode ? i18nT("static.vpfx0w") : i18nT("static.uscamd"),
        }),
      );

      hideDialog();
      await loadData();
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.1vks92p"),
            detail: err.message,
          }),
        );
      }
    }
  };

  const onDelete = (row: EmployeeEducationRow) => {
    requestActionConfirmation({
      message: i18nT("static.zqphun"),
      header: i18nT("static.14tdkvz"),
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await deleteEmployeeEducation(
            employeeId,
            "informal",
            row.id,
            row.row_version,
          );
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: i18nT("static.udvru8"),
              detail: i18nT("static.ph6yxn"),
            }),
          );
          await loadData();
        } catch (err: unknown) {
          if (isResponseTypeError(err)) {
            dispatch(
              showToast({
                visible: true,
                severity: "error",
                summary: i18nT("static.1vks92p"),
                detail: getErrorMessage(err, "message"),
              }),
            );
          }
        }
      },
    });
  };

  const periodBodyTemplate = (row: EmployeeEducationRow) => {
    const start = row.start_date ? formatDisplayDate(row.start_date) : "-";
    const end = row.end_date ? formatDisplayDate(row.end_date) : "-";

    return `${start} - ${end}`;
  };

  const certificateBodyTemplate = (row: EmployeeEducationRow) => {
    return row.is_certificate ? (
      <Tag value={i18nT("static.1dudzcg")} severity="info" />
    ) : (
      <Tag value={i18nT("static.r5wqai")} severity="secondary" />
    );
  };

  const activeBodyTemplate = (row: EmployeeEducationRow) => {
    return row.is_active ? (
      <Tag value={i18nT("static.8qzyhb")} severity="success" />
    ) : (
      <Tag value={i18nT("static.13zf5vc")} severity="secondary" />
    );
  };

  const actionBodyTemplate = (row: EmployeeEducationRow) => {
    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        <Button
          type="button"
          rounded
          outlined
          size="small"
          icon="pi pi-pencil"
          severity="secondary"
          onClick={() => openEdit(row)}
          tooltip={i18nT("static.1i1lcq9")}
          tooltipOptions={{ position: "top" }}
        />
        <Button
          type="button"
          rounded
          outlined
          size="small"
          icon="pi pi-trash"
          severity="danger"
          onClick={() => onDelete(row)}
          tooltip={i18nT("static.oay2cq")}
          tooltipOptions={{ position: "top" }}
        />
      </div>
    );
  };

  const dialogFooter = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label={i18nT("static.ew9em3")}
        icon="pi pi-times"
        text
        severity="secondary"
        className="w-full sm:w-auto"
        onClick={hideDialog}
      />
      <Button
        type="button"
        label={isAddMode ? i18nT("static.1dmlj8v") : i18nT("static.6gmm1l")}
        icon="pi pi-check"
        className="w-full sm:w-auto"
        onClick={() => void handleSubmit(onSubmit)()}
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-5">
        <EmployeeDetailTableHeader
          title={i18nT("static.kkkn53")}
          description={i18nT("static.1h1shk1")}
          actions={
            <Button
              type="button"
              label={i18nT("static.9pzugj")}
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
          emptyMessage={i18nT("static.157wcee")}
          scrollable
          tableStyle={{ minWidth: "70rem" }}
          currentPageReportTemplate={i18nT("static.1kqh8lr")}
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        >
          <Column
            header="#"
            body={(_, options) => options.rowIndex + 1}
            style={{ width: "60px" }}
          />
          <Column field="degree" header={i18nT("static.1gcn45o")} />
          <Column field="name" header={i18nT("static.2gldt8")} />
          <Column field="institution_name" header={i18nT("static.1a523l1")} />
          <Column field="major" header={i18nT("static.hzjs0w")} />
          <Column
            header={i18nT("static.11hwh7o")}
            body={periodBodyTemplate}
            style={{ minWidth: "180px" }}
          />
          <Column field="score" header={i18nT("static.x9tsfp")} />
          <Column field="held_by" header={i18nT("static.1h4t9b7")} />
          <Column
            header={i18nT("static.l17574")}
            body={certificateBodyTemplate}
            style={{ minWidth: "120px" }}
          />
          <Column
            header={i18nT("static.8qzyhb")}
            body={activeBodyTemplate}
            style={{ minWidth: "110px" }}
          />
          <Column
            header={i18nT("static.2wk0tb")}
            body={actionBodyTemplate}
            frozen
            alignFrozen="right"
            className="bg-white"
            headerClassName="bg-white"
            style={{ minWidth: "140px" }}
          />
        </DataTable>
      </div>

      <Dialog
        header={isAddMode ? i18nT("static.3lo7rd") : i18nT("static.8so816")}
        visible={visible}
        style={{ width: "95vw", maxWidth: "56rem" }}
        onHide={hideDialog}
        footer={dialogFooter}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
          <Controller
            name="degree"
            control={control}
            rules={{ required: i18nT("static.p0umy5") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="informal_degree" className={fieldLabelClass}>
                  {i18nT("static.1gcn45o")}{" "}
                </label>
                <InputText
                  id="informal_degree"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder={i18nT("static.1gfqdb3")}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="name"
            control={control}
            rules={{ required: i18nT("static.1j30tfx") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="informal_name" className={fieldLabelClass}>
                  {i18nT("static.2gldt8")}{" "}
                </label>
                <InputText
                  id="informal_name"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder={i18nT("static.1w6dbkn")}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="institution_name"
            control={control}
            rules={{ required: i18nT("static.15ixj50") }}
            render={({ field, fieldState }) => (
              <div>
                <label
                  htmlFor="informal_institution"
                  className={fieldLabelClass}
                >
                  {i18nT("static.1a523l1")}{" "}
                </label>
                <InputText
                  id="informal_institution"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder={i18nT("static.s0mghu")}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="major"
            control={control}
            rules={{ required: i18nT("static.zpavjl") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="informal_major" className={fieldLabelClass}>
                  {i18nT("static.hzjs0w")}{" "}
                </label>
                <InputText
                  id="informal_major"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder={i18nT("static.17tkdri")}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="start_date"
            control={control}
            rules={{ required: i18nT("static.oz4lds") }}
            render={({ field, fieldState }) => (
              <div>
                <label
                  htmlFor="informal_start_date"
                  className={fieldLabelClass}
                >
                  {i18nT("static.7bl5hd")}{" "}
                </label>
                <Calendar
                  id="informal_start_date"
                  appendTo={getBody}
                  dateFormat="dd MM yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="end_date"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="informal_end_date" className={fieldLabelClass}>
                  {i18nT("static.1j4m31m")}{" "}
                </label>
                <Calendar
                  id="informal_end_date"
                  appendTo={getBody}
                  dateFormat="dd MM yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                />
              </div>
            )}
          />

          <Controller
            name="score"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="informal_score" className={fieldLabelClass}>
                  {i18nT("static.x9tsfp")}{" "}
                </label>
                <InputText
                  id="informal_score"
                  {...field}
                  className="w-full"
                  placeholder={i18nT("static.v2zt03")}
                />
              </div>
            )}
          />

          <Controller
            name="held_by"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="informal_held_by" className={fieldLabelClass}>
                  {i18nT("static.1h4t9b7")}{" "}
                </label>
                <InputText
                  id="informal_held_by"
                  {...field}
                  className="w-full"
                  placeholder={i18nT("static.1a1wuj2")}
                />
              </div>
            )}
          />

          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <Controller
                name="is_certificate"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {i18nT("static.l9hrkr")}{" "}
                      </p>
                      <p className={helperTextClass}>
                        {i18nT("static.aowj0e")}{" "}
                      </p>
                    </div>
                    <InputSwitch
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.value)}
                    />
                  </div>
                )}
              />

              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {i18nT("static.8qzyhb")}{" "}
                      </p>
                      <p className={helperTextClass}>
                        {i18nT("static.10uo91a")}{" "}
                      </p>
                    </div>
                    <InputSwitch
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.value)}
                    />
                  </div>
                )}
              />
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default InformalEducation;
