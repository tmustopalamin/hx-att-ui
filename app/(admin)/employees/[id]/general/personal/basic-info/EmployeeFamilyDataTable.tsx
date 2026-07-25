"use client";

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
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
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
            summary: "error",
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
          summary: "success",
          detail: isAddMode
            ? "Family data created successfully"
            : "Family data updated successfully",
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
            summary: "error",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "error",
            detail: err.message,
          }),
        );
      }
    }
  };

  const onDelete = (row: EmployeeFamilyRow) => {
    confirmDialog({
      message: "Do you want to delete this family record?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await deleteEmployeeFamily(employeeId, row.id, row.row_version);
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: "success",
              detail: "Family data deleted successfully",
            }),
          );
          await loadData();
        } catch (err: unknown) {
          if (isResponseTypeError(err)) {
            dispatch(
              showToast({
                visible: true,
                severity: "error",
                summary: "error",
                detail: getErrorMessage(err, "message"),
              }),
            );
          }
        }
      },
    });
  };

  const actionBody = (row: EmployeeFamilyRow) => (
    <div className="flex justify-center gap-2">
      <Button
        rounded
        size="small"
        icon="pi pi-pencil"
        severity="help"
        onClick={() => openEdit(row)}
      />
      <Button
        rounded
        size="small"
        icon="pi pi-trash"
        severity="danger"
        onClick={() => onDelete(row)}
      />
    </div>
  );

  return (
    <>
      <ConfirmDialog />

      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h5 className="text-xl font-semibold text-slate-900">Family</h5>
            <p className="text-sm text-slate-500">
              Manage employee spouse, child, or family information
            </p>
          </div>

          <Button
            type="button"
            label="New Family"
            icon="pi pi-plus"
            onClick={openNew}
          />
        </div>

        <DataTable
          value={rows}
          dataKey="id"
          loading={loading}
          stripedRows
          paginator
          rows={5}
          rowsPerPageOptions={[5, 10, 25]}
          emptyMessage="No family data found."
          scrollable
        >
          <Column
            header="#"
            body={(_, options) => options.rowIndex + 1}
            style={{ width: "56px" }}
          />
          <Column field="name" header="Name" />
          <Column field="relationship_name" header="Relationship" />
          <Column
            header="Birth Date"
            body={(row: EmployeeFamilyRow) =>
              row.dob ? dayjs(row.dob).format("DD-MM-YYYY") : "-"
            }
          />
          <Column field="gender_name" header="Gender" />
          <Column field="marital_name" header="Marital Status" />
          <Column field="job" header="Job" />
          <Column field="phone1" header="Phone 1" />
          <Column field="phone2" header="Phone 2" />
          <Column
            field="is_active"
            header="Active"
            body={(row: EmployeeFamilyRow) => (row.is_active ? "Yes" : "No")}
          />
          <Column
            header="Action"
            body={actionBody}
            frozen
            alignFrozen="right"
            className="bg-white"
            headerClassName="bg-white"
          />
        </DataTable>
      </div>

      <Dialog
        header={isAddMode ? "New Family Data" : "Edit Family Data"}
        visible={visible}
        style={{ width: "42rem" }}
        onHide={() => setVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label="Cancel"
              className="p-button-text"
              onClick={() => setVisible(false)}
            />
            <Button
              type="button"
              label={isAddMode ? "Submit" : "Save"}
              icon="pi pi-check"
              onClick={handleSubmit(onSubmit)}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 pt-2">
          <Controller
            name="name"
            control={control}
            rules={{ required: "Name is required" }}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="family_name">Name</label>
                <InputText
                  id="family_name"
                  {...field}
                  className={fieldState.invalid ? "p-invalid" : ""}
                />
              </div>
            )}
          />

          <Controller
            name="relationship_id"
            control={control}
            rules={{ required: "Relationship is required" }}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="relationship_id">Relationship</label>
                <Dropdown
                  id="relationship_id"
                  appendTo={getBody}
                  value={field.value}
                  options={activeRelationships}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select relationship"
                  className={fieldState.invalid ? "p-invalid" : ""}
                />
              </div>
            )}
          />

          <Controller
            name="dob"
            control={control}
            rules={{ required: "Birth date is required" }}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="family_dob">Birth Date</label>
                <Calendar
                  id="family_dob"
                  appendTo={getBody}
                  dateFormat="dd-mm-yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className={fieldState.invalid ? "p-invalid w-full" : "w-full"}
                />
              </div>
            )}
          />

          <Controller
            name="gender_id"
            control={control}
            rules={{ required: "Gender is required" }}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="family_gender_id">Gender</label>
                <Dropdown
                  id="family_gender_id"
                  appendTo={getBody}
                  value={field.value}
                  options={activeGenders}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select gender"
                  className={fieldState.invalid ? "p-invalid" : ""}
                />
              </div>
            )}
          />

          <Controller
            name="marital_status"
            control={control}
            rules={{ required: "Marital status is required" }}
            render={({ field, fieldState }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="family_marital_status">Marital Status</label>
                <Dropdown
                  id="family_marital_status"
                  appendTo={getBody}
                  value={field.value}
                  options={activeMaritals}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select marital status"
                  className={fieldState.invalid ? "p-invalid" : ""}
                />
              </div>
            )}
          />

          <Controller
            name="job"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="family_job">Job</label>
                <InputText id="family_job" {...field} />
              </div>
            )}
          />

          <Controller
            name="phone1"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="family_phone1">Phone 1</label>
                <InputText id="family_phone1" {...field} />
              </div>
            )}
          />

          <Controller
            name="phone2"
            control={control}
            render={({ field }) => (
              <div className="flex flex-col gap-2">
                <label htmlFor="family_phone2">Phone 2</label>
                <InputText id="family_phone2" {...field} />
              </div>
            )}
          />

          <div className="flex items-center gap-2">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Checkbox
                  inputId="family_is_active"
                  checked={field.value}
                  onChange={(e) => field.onChange(!!e.checked)}
                />
              )}
            />
            <label htmlFor="family_is_active">Active</label>
          </div>
        </div>
      </Dialog>
    </>
  );
};

export default EmployeeFamilyDataTable;
