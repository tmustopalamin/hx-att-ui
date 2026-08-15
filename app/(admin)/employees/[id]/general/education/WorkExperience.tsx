"use client";

import {
  createEmployeeWorkExperience,
  deleteEmployeeWorkExperience,
  getEmployeeWorkExperiences,
  updateEmployeeWorkExperience,
} from "@/app/services/employee-general-service";
import { EmployeeWorkExperienceRow } from "@/app/types/employee-general";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import dayjs from "dayjs";
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
  company: string;
  position: string;
  start_date: Date | null;
  end_date: Date | null;
  is_active: boolean;
};

type EmployeeWorkExperiencePayload = {
  company: string;
  position: string;
  start_date: string;
  end_date?: string | null;
  is_active: boolean;
};

const getBody = () => document.body;

const emptyFormValues: FormData = {
  company: "",
  position: "",
  start_date: null,
  end_date: null,
  is_active: true,
};

const fieldLabelClass = "mb-2 block text-sm font-medium text-slate-700";
const helperTextClass = "mt-1 text-xs text-slate-500";

const WorkExperience = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const employeeId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true);
  const [rows, setRows] = useState<EmployeeWorkExperienceRow[]>([]);
  const [selectedRow, setSelectedRow] =
    useState<EmployeeWorkExperienceRow | null>(null);

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: emptyFormValues,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getEmployeeWorkExperiences(employeeId);
      setRows(result);
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
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

  const openEdit = (row: EmployeeWorkExperienceRow) => {
    setIsAddMode(false);
    setSelectedRow(row);

    reset({
      company: row.company,
      position: row.position,
      start_date: row.start_date ? dayjs(row.start_date).toDate() : null,
      end_date: row.end_date ? dayjs(row.end_date).toDate() : null,
      is_active: row.is_active,
    });

    setVisible(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload: EmployeeWorkExperiencePayload = {
      company: data.company.trim(),
      position: data.position.trim(),
      start_date: data.start_date
        ? dayjs(data.start_date).format("YYYY-MM-DD")
        : "",
      end_date: data.end_date
        ? dayjs(data.end_date).format("YYYY-MM-DD")
        : null,
      is_active: data.is_active,
    };

    try {
      if (isAddMode) {
        await createEmployeeWorkExperience(employeeId, payload);
      } else if (selectedRow) {
        await updateEmployeeWorkExperience(
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
          summary: "Success",
          detail: isAddMode
            ? "Work experience created successfully"
            : "Work experience updated successfully",
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
            summary: "Error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const onDelete = (row: EmployeeWorkExperienceRow) => {
    requestActionConfirmation({
      message: "Do you want to delete this work experience record?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await deleteEmployeeWorkExperience(
            employeeId,
            row.id,
            row.row_version,
          );
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: "Success",
              detail: "Work experience deleted successfully",
            }),
          );
          await loadData();
        } catch (err: unknown) {
          if (isResponseTypeError(err)) {
            dispatch(
              showToast({
                visible: true,
                severity: "error",
                summary: "Error",
                detail: getErrorMessage(err, "message"),
              }),
            );
          }
        }
      },
    });
  };

  const periodBodyTemplate = (row: EmployeeWorkExperienceRow) => {
    const start = row.start_date
      ? dayjs(row.start_date).format("DD MMM YYYY")
      : "-";
    const end = row.end_date ? dayjs(row.end_date).format("DD MMM YYYY") : "-";

    return `${start} - ${end}`;
  };

  const activeBodyTemplate = (row: EmployeeWorkExperienceRow) => {
    return row.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="secondary" />
    );
  };

  const actionBodyTemplate = (row: EmployeeWorkExperienceRow) => {
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
          tooltip="Edit"
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
          tooltip="Delete"
          tooltipOptions={{ position: "top" }}
        />
      </div>
    );
  };

  const dialogFooter = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
      <Button
        type="button"
        label="Cancel"
        icon="pi pi-times"
        text
        severity="secondary"
        className="w-full sm:w-auto"
        onClick={hideDialog}
      />
      <Button
        type="button"
        label={isAddMode ? "Create Experience" : "Save Changes"}
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
          title="Work Experience"
          description="Manage previous company and professional experience records."
          actions={
            <Button
              type="button"
              label="New Experience"
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
          emptyMessage="No work experience found."
          scrollable
          tableStyle={{ minWidth: "48rem" }}
          currentPageReportTemplate="{first} to {last} of {totalRecords}"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        >
          <Column
            header="#"
            body={(_, options) => options.rowIndex + 1}
            style={{ width: "60px" }}
          />
          <Column field="company" header="Company" />
          <Column field="position" header="Position" />
          <Column
            header="Period"
            body={periodBodyTemplate}
            style={{ minWidth: "180px" }}
          />
          <Column
            header="Active"
            body={activeBodyTemplate}
            style={{ minWidth: "110px" }}
          />
          <Column
            header="Action"
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
        header={isAddMode ? "New Work Experience" : "Update Work Experience"}
        visible={visible}
        style={{ width: "95vw", maxWidth: "48rem" }}
        onHide={hideDialog}
        footer={dialogFooter}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
          <Controller
            name="company"
            control={control}
            rules={{ required: "Company is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="work_company" className={fieldLabelClass}>
                  Company
                </label>
                <InputText
                  id="work_company"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder="Enter company name"
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="position"
            control={control}
            rules={{ required: "Position is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="work_position" className={fieldLabelClass}>
                  Position
                </label>
                <InputText
                  id="work_position"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder="Enter position"
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
            rules={{ required: "Start date is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="work_start_date" className={fieldLabelClass}>
                  Start Date
                </label>
                <Calendar
                  id="work_start_date"
                  appendTo={getBody}
                  dateFormat="dd-mm-yy"
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
                <label htmlFor="work_end_date" className={fieldLabelClass}>
                  End Date
                </label>
                <Calendar
                  id="work_end_date"
                  appendTo={getBody}
                  dateFormat="dd-mm-yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                />
              </div>
            )}
          />

          <div className="md:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Active
                      </p>
                      <p className={helperTextClass}>
                        Control whether this work experience record is still
                        active.
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

export default WorkExperience;
