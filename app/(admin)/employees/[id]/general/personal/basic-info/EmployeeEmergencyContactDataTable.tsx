"use client";

import {
  createEmployeeEmergencyContact,
  deleteEmployeeEmergencyContact,
  getEmployeeEmergencyContacts,
  getRelationshipOptions,
  updateEmployeeEmergencyContact,
} from "@/app/services/employee-general-service";
import {
  EmployeeEmergencyContactRow,
  OptionItem,
} from "@/app/types/employee-general";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";

type FormData = {
  name: string;
  relationship_id: number | null;
  phone: string;
  is_active: boolean;
};

type EmployeeEmergencyContactPayload = {
  name: string;
  relationship_id: number;
  phone: string;
  is_active: boolean;
};

const getBody = () => document.body;

const emptyFormValues: FormData = {
  name: "",
  relationship_id: null,
  phone: "",
  is_active: true,
};

const fieldLabelClass = "mb-2 block text-sm font-medium text-slate-700";
const helperTextClass = "mt-1 text-xs text-slate-500";

const EmployeeEmergencyContactDataTable = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const employeeId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [isAddMode, setIsAddMode] = useState(true);
  const [rows, setRows] = useState<EmployeeEmergencyContactRow[]>([]);
  const [relationships, setRelationships] = useState<OptionItem[]>([]);
  const [selectedRow, setSelectedRow] =
    useState<EmployeeEmergencyContactRow | null>(null);

  const { control, handleSubmit, reset } = useForm<FormData>({
    defaultValues: emptyFormValues,
  });

  const activeRelationships = useMemo(
    () => relationships.filter((item) => item.is_active !== false),
    [relationships],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [contactRows, relationshipList] = await Promise.all([
        getEmployeeEmergencyContacts(employeeId),
        getRelationshipOptions(),
      ]);

      setRows(contactRows);
      setRelationships(relationshipList);
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

  const openEdit = (row: EmployeeEmergencyContactRow) => {
    setIsAddMode(false);
    setSelectedRow(row);
    reset({
      name: row.name,
      relationship_id: row.relationship_id,
      phone: row.phone,
      is_active: row.is_active,
    });
    setVisible(true);
  };

  const onSubmit = async (data: FormData) => {
    const payload: EmployeeEmergencyContactPayload = {
      name: data.name.trim(),
      relationship_id: Number(data.relationship_id),
      phone: data.phone.trim(),
      is_active: data.is_active,
    };

    try {
      if (isAddMode) {
        await createEmployeeEmergencyContact(employeeId, payload);
      } else if (selectedRow) {
        await updateEmployeeEmergencyContact(
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
            ? "Emergency contact created successfully"
            : "Emergency contact updated successfully",
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

  const onDelete = (row: EmployeeEmergencyContactRow) => {
    requestActionConfirmation({
      message: "Do you want to delete this emergency contact?",
      header: "Delete Confirmation",
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await deleteEmployeeEmergencyContact(
            employeeId,
            row.id,
            row.row_version,
          );
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: "Success",
              detail: "Emergency contact deleted successfully",
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

  const activeBodyTemplate = (row: EmployeeEmergencyContactRow) => {
    return row.is_active ? (
      <Tag value="Active" severity="success" />
    ) : (
      <Tag value="Inactive" severity="secondary" />
    );
  };

  const actionBodyTemplate = (row: EmployeeEmergencyContactRow) => {
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
        label={isAddMode ? "Create Contact" : "Save Changes"}
        icon="pi pi-check"
        className="w-full sm:w-auto"
        onClick={() => void handleSubmit(onSubmit)()}
      />
    </div>
  );

  return (
    <>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h5 className="text-xl font-semibold text-slate-900">
              Emergency Contact
            </h5>
            <p className="mt-1 text-sm text-slate-500">
              Manage people to contact in case of emergency.
            </p>
          </div>

          <Button
            type="button"
            label="New Contact"
            icon="pi pi-plus"
            size="small"
            className="w-full sm:w-auto"
            onClick={openNew}
          />
        </div>

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
          emptyMessage="No emergency contact found."
          scrollable
          tableStyle={{ minWidth: "44rem" }}
          currentPageReportTemplate="{first} to {last} of {totalRecords}"
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        >
          <Column
            header="#"
            body={(_, options) => options.rowIndex + 1}
            style={{ width: "60px" }}
          />
          <Column field="name" header="Name" />
          <Column field="relationship_name" header="Relationship" />
          <Column field="phone" header="Phone" />
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
        header={
          isAddMode ? "New Emergency Contact" : "Update Emergency Contact"
        }
        visible={visible}
        style={{ width: "95vw", maxWidth: "42rem" }}
        onHide={hideDialog}
        footer={dialogFooter}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
      >
        <div className="grid grid-cols-1 gap-5 pt-2 md:grid-cols-2">
          <Controller
            name="name"
            control={control}
            rules={{ required: "Name is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="emergency_name" className={fieldLabelClass}>
                  Name
                </label>
                <InputText
                  id="emergency_name"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder="Enter full name"
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
            rules={{ required: "Relationship is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label
                  htmlFor="emergency_relationship"
                  className={fieldLabelClass}
                >
                  Relationship
                </label>
                <Dropdown
                  id="emergency_relationship"
                  appendTo={getBody}
                  value={field.value}
                  options={activeRelationships}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder="Select relationship"
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <Controller
            name="phone"
            control={control}
            rules={{ required: "Phone is required" }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="emergency_phone" className={fieldLabelClass}>
                  Phone
                </label>
                <InputText
                  id="emergency_phone"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder="Enter phone number"
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
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
                        Control whether this emergency contact is still active.
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

export default EmployeeEmergencyContactDataTable;
