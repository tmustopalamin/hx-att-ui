"use client";

import {
  createEmployeeIdentity,
  deleteEmployeeIdentity,
  getEmployeeIdentities,
  getIdentityTypeOptions,
  purgeEmployeeIdentity,
  restoreEmployeeIdentity,
  updateEmployeeIdentity,
} from "@/app/services/employee-general-service";
import {
  EmployeeIdentityPayload,
  EmployeeIdentityRow,
  OptionItem,
} from "@/app/types/employee-general";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import dayjs from "dayjs";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useDispatch } from "react-redux";

type FormData = {
  identity_type_id: number | null;
  number: string;
  expire_date: Date | null;
  citizen_address: string;
  residential_address: string;
  is_permanent: boolean;
  is_active: boolean;
};

const getBody = () => document.body;

const emptyFormValues: FormData = {
  identity_type_id: null,
  number: "",
  expire_date: null,
  citizen_address: "",
  residential_address: "",
  is_permanent: false,
  is_active: true,
};

const fieldLabelClass = "mb-2 block text-sm font-medium text-slate-700";
const helperTextClass = "mt-1 text-xs text-slate-500";

const PersonalIdentityAndAddress = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const employeeId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true);
  const [identities, setIdentities] = useState<EmployeeIdentityRow[]>([]);
  const [identityTypes, setIdentityTypes] = useState<OptionItem[]>([]);
  const [selectedRow, setSelectedRow] = useState<EmployeeIdentityRow | null>(
    null,
  );

  const { control, handleSubmit, reset, setValue } = useForm<FormData>({
    defaultValues: emptyFormValues,
  });

  const isPermanent = useWatch({
    control,
    name: "is_permanent",
  });

  const activeIdentityTypes = useMemo(
    () => identityTypes.filter((item) => item.is_active !== false),
    [identityTypes],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [rows, types] = await Promise.all([
        getEmployeeIdentities(employeeId),
        getIdentityTypeOptions(),
      ]);

      setIdentities(rows);
      setIdentityTypes(types);
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

  useEffect(() => {
    if (isPermanent) {
      setValue("expire_date", null);
    }
  }, [isPermanent, setValue]);

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

  const openEdit = (row: EmployeeIdentityRow) => {
    setIsAddMode(false);
    setSelectedRow(row);

    reset({
      identity_type_id: row.identity_type_id,
      number: row.number,
      expire_date: row.expire_date ? dayjs(row.expire_date).toDate() : null,
      citizen_address: row.citizen_address,
      residential_address: row.residential_address,
      is_permanent: row.is_permanent,
      is_active: row.is_active,
    });

    setVisible(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload: EmployeeIdentityPayload = {
      identity_type_id: Number(data.identity_type_id),
      number: data.number.trim(),
      expire_date:
        data.is_permanent || !data.expire_date
          ? null
          : dayjs(data.expire_date).format("YYYY-MM-DD"),
      citizen_address: data.citizen_address.trim(),
      residential_address: data.residential_address.trim(),
      is_permanent: data.is_permanent,
      is_active: data.is_active,
    };

    try {
      if (isAddMode) {
        await createEmployeeIdentity(employeeId, payload);
      } else if (selectedRow) {
        await updateEmployeeIdentity(
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
            ? "Identity created successfully"
            : "Identity updated successfully",
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

  const onDelete = (row: EmployeeIdentityRow) => {
    confirmDialog({
      message: "Do you want to delete this identity record?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await deleteEmployeeIdentity(employeeId, row.id, row.row_version);
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: "Success",
              detail: "Identity deleted successfully",
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

  const onRestore = async (row: EmployeeIdentityRow) => {
    try {
      await restoreEmployeeIdentity(employeeId, row.id, row.row_version);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: "Identity restored successfully",
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
  };

  const onPurge = (row: EmployeeIdentityRow) => {
    confirmDialog({
      message: "This will permanently delete the identity record. Continue?",
      header: "Permanent Delete Confirmation",
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await purgeEmployeeIdentity(employeeId, row.id);
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: "Success",
              detail: "Identity permanently deleted",
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

  const activeBodyTemplate = (row: EmployeeIdentityRow) => {
    return row.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="secondary" />
    );
  };

  const expiryBodyTemplate = (row: EmployeeIdentityRow) => {
    if (row.is_permanent) {
      return <Tag value="Lifetime" severity="info" />;
    }

    if (!row.expire_date) {
      return "-";
    }

    return dayjs(row.expire_date).format("DD MMM YYYY");
  };

  const actionBodyTemplate = (row: EmployeeIdentityRow) => {
    const isDeleted = !!row.deleted_at;

    return (
      <div className="flex flex-nowrap items-center justify-end gap-2">
        {!isDeleted && (
          <>
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
          </>
        )}

        {isDeleted && (
          <>
            <Button
              type="button"
              rounded
              outlined
              size="small"
              icon="pi pi-refresh"
              severity="success"
              onClick={() => void onRestore(row)}
              tooltip="Restore"
              tooltipOptions={{ position: "top" }}
            />
            <Button
              type="button"
              rounded
              outlined
              size="small"
              icon="pi pi-trash"
              severity="danger"
              onClick={() => onPurge(row)}
              tooltip="Purge"
              tooltipOptions={{ position: "top" }}
            />
          </>
        )}
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
        label={isAddMode ? "Create Identity" : "Save Changes"}
        icon="pi pi-check"
        className="w-full sm:w-auto"
        onClick={() => void handleSubmit(onSubmit)()}
      />
    </div>
  );

  return (
    <>
      <ConfirmDialog />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h5 className="text-xl font-semibold text-slate-900">
              Identity & Address
            </h5>
            <p className="mt-1 text-sm text-slate-500">
              Manage employee identity documents and registered addresses.
            </p>
          </div>

          <Button
            type="button"
            label="New Identity"
            icon="pi pi-plus"
            size="small"
            className="w-full sm:w-auto"
            onClick={openNew}
          />
        </div>

        <DataTable
          value={identities}
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
          emptyMessage="No identity data found."
          scrollable
          tableStyle={{ minWidth: "70rem" }}
          currentPageReportTemplate="{first} to {last} of {totalRecords}"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        >
          <Column
            header="#"
            body={(_, options) => options.rowIndex + 1}
            style={{ width: "60px" }}
          />
          <Column field="identity_type_name" header="Identity Type" sortable />
          <Column field="number" header="Number" sortable />
          <Column
            header="Expiry"
            body={expiryBodyTemplate}
            style={{ minWidth: "140px" }}
          />
          <Column
            field="citizen_address"
            header="Citizen Address"
            sortable
            style={{ minWidth: "220px" }}
          />
          <Column
            field="residential_address"
            header="Residential Address"
            sortable
            style={{ minWidth: "220px" }}
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
            headerStyle={{
              width: "9rem",
              minWidth: "9rem",
              textAlign: "right",
            }}
            bodyStyle={{ width: "9rem", minWidth: "9rem" }}
          />
        </DataTable>
      </div>

      <Dialog
        header={isAddMode ? "New Identity" : "Update Identity"}
        visible={visible}
        style={{ width: "95vw", maxWidth: "52rem" }}
        onHide={hideDialog}
        footer={dialogFooter}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
          <Controller
            name="identity_type_id"
            control={control}
            rules={{ required: "Identity type is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="identity_type_id" className={fieldLabelClass}>
                  Identity Type
                </label>
                <Dropdown
                  id="identity_type_id"
                  appendTo={getBody}
                  value={field.value}
                  options={activeIdentityTypes}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select identity type"
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="number"
            control={control}
            rules={{ required: "Identity number is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="number" className={fieldLabelClass}>
                  Identity Number
                </label>
                <InputText
                  id="number"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder="Enter identity number"
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
              <Controller
                name="is_permanent"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        Valid for lifetime
                      </p>
                      <p className={helperTextClass}>
                        Enable this if the document does not have an expiration
                        date.
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
                        Active
                      </p>
                      <p className={helperTextClass}>
                        Control whether this identity record is still active.
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

          <Controller
            name="expire_date"
            control={control}
            render={({ field }) => (
              <div>
                <label htmlFor="expire_date" className={fieldLabelClass}>
                  Expire Date
                </label>
                <Calendar
                  id="expire_date"
                  appendTo={getBody}
                  disabled={!!isPermanent}
                  dateFormat="dd-mm-yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                  placeholder={
                    isPermanent ? "Lifetime document" : "Select expire date"
                  }
                />
                <p className={helperTextClass}>
                  Leave empty for documents without expiry.
                </p>
              </div>
            )}
          />

          <div className="hidden md:block" />

          <Controller
            name="citizen_address"
            control={control}
            rules={{ required: "Citizen address is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="citizen_address" className={fieldLabelClass}>
                  Citizen Address
                </label>
                <InputTextarea
                  id="citizen_address"
                  {...field}
                  rows={4}
                  autoResize
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder="Enter citizen address"
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="residential_address"
            control={control}
            rules={{ required: "Residential address is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label
                  htmlFor="residential_address"
                  className={fieldLabelClass}
                >
                  Residential Address
                </label>
                <InputTextarea
                  id="residential_address"
                  {...field}
                  rows={4}
                  autoResize
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder="Enter residential address"
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />
        </div>
      </Dialog>
    </>
  );
};

export default PersonalIdentityAndAddress;
