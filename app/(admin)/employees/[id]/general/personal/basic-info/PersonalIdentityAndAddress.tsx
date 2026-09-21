"use client";
import { useI18n } from "@/app/i18n";

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
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import { showToast } from "@/store/ToastSlice";
import dayjs from "dayjs";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import { useParams } from "next/navigation";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
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
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";

type FormData = {
  identity_type_id: number | null;
  number: string;
  expire_date: Date | null;
  citizen_address: string;
  residential_address: string;
  is_permanent: boolean;
  is_active: boolean;
  is_primary: boolean;
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
  is_primary: false,
};

const fieldLabelClass = "mb-2 block text-sm font-medium text-slate-700";
const helperTextClass = "mt-1 text-xs text-slate-500";

const PersonalIdentityAndAddress = () => {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const params = useParams();
  const employeeId = Number(params.id);
  const archivedAccess = useArchivedDataAccess("employee");

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
      is_primary: row.is_primary ?? false,
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
      is_primary: data.is_active ? data.is_primary : false,
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
          summary: i18nT("static.udvru8"),
          detail: isAddMode ? i18nT("static.7ccvkc") : i18nT("static.1cxmokp"),
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

  const onDelete = (row: EmployeeIdentityRow) => {
    requestActionConfirmation({
      message: i18nT("static.1p6vgqr"),
      header: i18nT("static.14tdkvz"),
      icon: "pi pi-info-circle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await deleteEmployeeIdentity(employeeId, row.id, row.row_version);
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: i18nT("static.udvru8"),
              detail: i18nT("static.5av9pb"),
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

  const onRestore = async (row: EmployeeIdentityRow) => {
    try {
      await restoreEmployeeIdentity(employeeId, row.id, row.row_version);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: i18nT("static.1ku8wk8"),
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
  };

  const onPurge = (row: EmployeeIdentityRow) => {
    requestActionConfirmation({
      message: i18nT("static.16fxab"),
      header: i18nT("static.5k7v89"),
      icon: "pi pi-exclamation-triangle",
      acceptClassName: "p-button-danger",
      accept: async () => {
        try {
          await purgeEmployeeIdentity(employeeId, row.id);
          dispatch(
            showToast({
              visible: true,
              severity: "success",
              summary: i18nT("static.udvru8"),
              detail: i18nT("static.heyxyn"),
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

  const activeBodyTemplate = (row: EmployeeIdentityRow) => {
    return row.is_active ? (
      <Tag value={i18nT("static.8qzyhb")} severity="success" />
    ) : (
      <Tag value={i18nT("static.13zf5vc")} severity="secondary" />
    );
  };

  const expiryBodyTemplate = (row: EmployeeIdentityRow) => {
    if (row.is_permanent) {
      return <Tag value={i18nT("static.1vh11ce")} severity="info" />;
    }

    if (!row.expire_date) {
      return "-";
    }

    return formatDisplayDate(row.expire_date);
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
          </>
        )}

        {isDeleted && archivedAccess.canShowDeleted && (
          <>
            <Button
              type="button"
              rounded
              outlined
              size="small"
              icon="pi pi-refresh"
              severity="success"
              onClick={() => void onRestore(row)}
              tooltip={i18nT("static.4fiyr5")}
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
              tooltip={i18nT("static.73yb38")}
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
        label={i18nT("static.ew9em3")}
        icon="pi pi-times"
        text
        severity="secondary"
        className="w-full sm:w-auto"
        onClick={hideDialog}
      />
      <Button
        type="button"
        label={isAddMode ? i18nT("static.q7hijd") : i18nT("static.6gmm1l")}
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
          title={i18nT("static.s7msxp")}
          description={i18nT("static.16p14z9")}
          actions={
            <Button
              type="button"
              label={i18nT("static.1eu437x")}
              icon="pi pi-plus"
              size="small"
              className="w-full sm:w-auto"
              onClick={openNew}
            />
          }
        />

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
          emptyMessage={i18nT("static.ncz95e")}
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
          <Column
            field="identity_type_name"
            header={i18nT("static.4mj4o9")}
            sortable
          />
          <Column field="number" header={i18nT("static.r616tc")} sortable />
          <Column
            header={i18nT("static.r38mzi")}
            body={expiryBodyTemplate}
            style={{ minWidth: "140px" }}
          />
          <Column
            field="citizen_address"
            header={i18nT("static.1r1dn73")}
            sortable
            style={{ minWidth: "220px" }}
          />
          <Column
            field="residential_address"
            header={i18nT("static.12qzyx9")}
            sortable
            style={{ minWidth: "220px" }}
          />
          <Column
            header={i18nT("static.1jcui61")}
            body={(row: EmployeeIdentityRow) => (
              <Tag
                value={
                  row.is_primary
                    ? i18nT("static.1jcui61")
                    : i18nT("static.75qooh")
                }
                severity={row.is_primary ? "success" : "secondary"}
                rounded
              />
            )}
            style={{ minWidth: "110px" }}
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
        header={isAddMode ? i18nT("static.1eu437x") : i18nT("static.7q8t7a")}
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
            rules={{ required: i18nT("static.pqu008") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="identity_type_id" className={fieldLabelClass}>
                  {i18nT("static.4mj4o9")}{" "}
                </label>
                <Dropdown
                  id="identity_type_id"
                  appendTo={getBody}
                  value={field.value}
                  options={activeIdentityTypes}
                  onChange={(e) => field.onChange(e.value)}
                  optionLabel="name"
                  optionValue="id"
                  placeholder={i18nT("static.1okaw0j")}
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
            rules={{ required: i18nT("static.7xznot") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="number" className={fieldLabelClass}>
                  {i18nT("static.eafcr0")}{" "}
                </label>
                <InputText
                  id="number"
                  {...field}
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder={i18nT("static.1yn3lai")}
                />
                {fieldState.error && (
                  <small className="p-error">{fieldState.error.message}</small>
                )}
              </div>
            )}
          />

          <div className="md:col-span-2">
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <Controller
                name="is_primary"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {i18nT("static.1jcui61")}{" "}
                      </p>
                      <p className={helperTextClass}>
                        {i18nT("Tandai sebagai dokumen utama.")}{" "}
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
                name="is_permanent"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start justify-between gap-4 rounded-xl bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {i18nT("static.6ewhj5")}{" "}
                      </p>
                      <p className={helperTextClass}>
                        {i18nT("static.184l94r")}{" "}
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
                        {i18nT("static.zhtc64")}{" "}
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
                  {i18nT("static.u2ldwy")}{" "}
                </label>
                <Calendar
                  id="expire_date"
                  appendTo={getBody}
                  disabled={!!isPermanent}
                  dateFormat="dd MM yy"
                  showIcon
                  value={field.value}
                  onChange={(e) => field.onChange(e.value)}
                  className="w-full"
                  placeholder={
                    isPermanent
                      ? i18nT("static.3chj13")
                      : i18nT("static.16tqp0")
                  }
                />
                <p className={helperTextClass}>{i18nT("static.3ywz2f")} </p>
              </div>
            )}
          />

          <div className="hidden md:block" />

          <Controller
            name="citizen_address"
            control={control}
            rules={{ required: i18nT("static.oxm12a") }}
            render={({ field, fieldState }) => (
              <div>
                <label htmlFor="citizen_address" className={fieldLabelClass}>
                  {i18nT("static.1r1dn73")}{" "}
                </label>
                <InputTextarea
                  id="citizen_address"
                  {...field}
                  rows={4}
                  autoResize
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder={i18nT("static.yharjh")}
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
            rules={{ required: i18nT("static.1lfvk6k") }}
            render={({ field, fieldState }) => (
              <div>
                <label
                  htmlFor="residential_address"
                  className={fieldLabelClass}
                >
                  {i18nT("static.12qzyx9")}{" "}
                </label>
                <InputTextarea
                  id="residential_address"
                  {...field}
                  rows={4}
                  autoResize
                  className={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                  placeholder={i18nT("static.lpsv9v")}
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
