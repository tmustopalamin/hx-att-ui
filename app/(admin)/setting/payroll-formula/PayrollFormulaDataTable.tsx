"use client";
import { useI18n } from "@/app/i18n";

import { type ChangeEvent, useState } from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  createPayrollFormula,
  deletePayrollFormula,
  purgePayrollFormula,
  restorePayrollFormula,
  updatePayrollFormula,
} from "@/app/services/payroll-formula-service";
import type {
  PayrollFormula,
  PayrollFormulaPayload,
} from "@/app/types/payroll-formula";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const formulaUrl = (showDeleted: boolean) =>
  `/api/payroll-formula?show_all=${showDeleted}`;
const emptyPayload = (): PayrollFormulaPayload => ({
  code: "",
  name: "",
  expression: "",
  description: null,
  is_active: true,
});
const getBody = () => document.body;

export default function PayrollFormulaDataTable() {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const profile = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("payroll-config");
  const canManage = profile.permissions.includes("payroll-config.manage");
  const isSuperadmin = archivedAccess.canShowDeleted;
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [selected, setSelected] = useState<PayrollFormula | null>(null);
  const [form, setForm] = useState<PayrollFormulaPayload>(emptyPayload);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const listKey = formulaUrl(archivedAccess.canShowDeleted && showDeleted);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    PayrollFormula[]
  >(listKey, fetcher);

  const notify = (severity: "success" | "error", detail: string) =>
    dispatch(
      showToast({
        visible: true,
        severity,
        summary:
          severity === "success"
            ? i18nT("static.udvru8")
            : i18nT("static.1vks92p"),
        detail,
      }),
    );
  const showError = (requestError: unknown) =>
    notify(
      "error",
      isResponseTypeError(requestError)
        ? getErrorMessage(requestError, "message")
        : requestError instanceof Error
          ? requestError.message
          : i18nT("static.37lwsc"),
    );
  const closeDialog = () => {
    setDialogVisible(false);
    setSelected(null);
    setForm(emptyPayload());
  };
  const openNew = () => {
    setSelected(null);
    setForm(emptyPayload());
    setDialogVisible(true);
  };
  const openEdit = (row: PayrollFormula) => {
    setSelected(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      expression: row.expression,
      description: row.description,
      is_active: row.is_active,
    });
    setDialogVisible(true);
  };
  const submit = async () => {
    const code = form.code?.trim().toUpperCase() || "";
    const name = form.name.trim();
    const expression = form.expression.trim();
    if (!code || !name || !expression) {
      notify("error", i18nT("static.xyb2l9"));
      return;
    }
    if (/\s/.test(code)) {
      notify("error", i18nT("static.d2ke11"));
      return;
    }
    try {
      setSaving(true);
      const payload: PayrollFormulaPayload = {
        code,
        name,
        expression,
        description: form.description?.trim() || null,
        is_active: form.is_active,
      };
      if (selected)
        await updatePayrollFormula(selected.id, selected.row_version, payload);
      else await createPayrollFormula(payload);
      await mutate();
      closeDialog();
      notify("success", i18nT("static.1693oyi"));
    } catch (requestError: unknown) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row: PayrollFormula) => {
    try {
      await deletePayrollFormula(row.id, row.row_version);
      await mutate();
      notify("success", i18nT("static.h1ls0"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const restore = async (row: PayrollFormula) => {
    try {
      await restorePayrollFormula(row.id, row.row_version);
      await mutate();
      notify("success", i18nT("static.km2nqv"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const purge = async (row: PayrollFormula) => {
    try {
      await purgePayrollFormula(row.id);
      await mutate();
      notify("success", i18nT("static.1xiyidm"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const ask = (row: PayrollFormula, action: "delete" | "restore" | "purge") => {
    const label =
      action === "delete"
        ? "Delete"
        : action === "restore"
          ? "Restore"
          : "Delete Permanently";
    const detail =
      action === "delete"
        ? "This formula will no longer be available for new component configuration."
        : action === "restore"
          ? "This formula will be available again."
          : "This action cannot be undone.";
    requestActionConfirmation({
      header: i18nT("static.1x6uy9u", { p0: label }),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{detail}</span>
          <span className="font-semibold text-slate-800">{row.name}</span>
        </div>
      ),
      icon:
        action === "restore" ? "pi pi-refresh" : "pi pi-exclamation-triangle",
      defaultFocus: "reject",
      accept: () =>
        void (action === "delete"
          ? remove(row)
          : action === "restore"
            ? restore(row)
            : purge(row)),
      reject: () => undefined,
      footer: (options) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            label={i18nT("static.ew9em3")}
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />
          <Button
            type="button"
            label={label}
            icon={action === "restore" ? "pi pi-refresh" : "pi pi-trash"}
            severity={action === "restore" ? "success" : "danger"}
            onClick={options.accept}
          />
        </div>
      ),
    });
  };
  const status = (row: PayrollFormula) => {
    if (row.deleted_at)
      return (
        <Tag
          value={i18nT("static.1v6qcju")}
          severity="secondary"
          icon="pi pi-trash"
          rounded
        />
      );
    if (!row.is_active)
      return (
        <Tag
          value={i18nT("static.13zf5vc")}
          severity="warning"
          icon="pi pi-minus-circle"
          rounded
        />
      );
    return (
      <Tag
        value={row.status || i18nT("static.8qzyhb")}
        severity={row.status === "PUBLISHED" ? "success" : "info"}
        rounded
      />
    );
  };
  const actions = (row: PayrollFormula) => {
    if (!canManage)
      return (
        <span className="text-sm text-slate-400">{i18nT("static.yaeuo4")}</span>
      );
    if (row.deleted_at)
      return isSuperadmin ? (
        <div className="flex justify-end gap-2">
          {archivedAccess.canRestore && (
            <Button
              type="button"
              icon="pi pi-refresh"
              rounded
              outlined
              severity="success"
              size="small"
              tooltip={i18nT("static.4fiyr5")}
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              onClick={() => ask(row, "restore")}
            />
          )}
          {archivedAccess.canPurge && (
            <Button
              type="button"
              icon="pi pi-trash"
              rounded
              outlined
              severity="danger"
              size="small"
              tooltip={i18nT("static.1ny6sg3")}
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              onClick={() => ask(row, "purge")}
            />
          )}
        </div>
      ) : (
        <span className="text-sm text-slate-400">{i18nT("static.yaeuo4")}</span>
      );
    return (
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          icon="pi pi-pencil"
          rounded
          outlined
          severity="secondary"
          size="small"
          tooltip={i18nT("static.1i1lcq9")}
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          onClick={() => openEdit(row)}
        />
        <Button
          type="button"
          icon="pi pi-trash"
          rounded
          outlined
          severity="danger"
          size="small"
          tooltip={i18nT("static.oay2cq")}
          tooltipOptions={{ appendTo: getBody, position: "top" }}
          onClick={() => ask(row, "delete")}
        />
      </div>
    );
  };
  const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearch(value);
    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
  };
  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey={listKey} />;

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-calculator text-xl" />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.niax0g")}{" "}
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.u01lmd")}{" "}
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                label={i18nT("static.28r6qc")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isValidating}
                onClick={() => void mutate()}
                className="w-full sm:w-auto"
              />
              {canManage && (
                <Button
                  type="button"
                  label={i18nT("static.ofqpse")}
                  icon="pi pi-plus"
                  size="small"
                  onClick={openNew}
                  className="w-full sm:w-auto"
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {archivedAccess.canShowDeleted && (
              <div className="flex items-center gap-2">
                <Checkbox
                  inputId="formula-show-deleted"
                  checked={showDeleted}
                  onChange={(event) => setShowDeleted(Boolean(event.checked))}
                />
                <label
                  htmlFor="formula-show-deleted"
                  className="cursor-pointer select-none text-sm text-slate-600"
                >
                  {i18nT("static.1kk3in7")}{" "}
                </label>
              </div>
            )}
            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={onSearch}
                placeholder={i18nT("static.1r2h5xe")}
                className="w-full"
              />
            </IconField>
          </div>
          <div className="w-full overflow-hidden">
            <DataTable
              value={data ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={[
                "code",
                "name",
                "expression",
                "description",
                "status",
              ]}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              stripedRows
              rowHover
              scrollable
              removableSort
              responsiveLayout="scroll"
              size="small"
              loading={isValidating}
              tableStyle={{ minWidth: "68rem" }}
              emptyMessage={i18nT("static.n02rwh")}
              currentPageReportTemplate={i18nT("static.1kqh8lr")}
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            >
              <Column
                header="#"
                body={(_, options) => options.rowIndex + 1}
                headerStyle={{ width: "4rem" }}
                bodyStyle={{ width: "4rem" }}
              />
              <Column
                field="code"
                header={i18nT("static.xoaiok")}
                sortable
                body={(row: PayrollFormula) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {row.code ?? "-"}
                  </span>
                )}
                style={{ minWidth: "10rem" }}
              />
              <Column
                field="name"
                header={i18nT("static.jxx3no")}
                sortable
                body={(row: PayrollFormula) => (
                  <span className="font-medium text-slate-800">{row.name}</span>
                )}
                style={{ minWidth: "14rem" }}
              />
              <Column
                field="expression"
                header={i18nT("static.1tcetjf")}
                sortable
                body={(row: PayrollFormula) => (
                  <code className="text-xs text-slate-700">
                    {row.expression}
                  </code>
                )}
                style={{ minWidth: "16rem" }}
              />
              <Column
                field="version"
                header={i18nT("static.q0zd4n")}
                sortable
                style={{ minWidth: "7rem" }}
              />
              <Column
                header={i18nT("static.3pd73")}
                body={status}
                style={{ minWidth: "10rem" }}
              />
              <Column
                header={i18nT("static.2wk0tb")}
                body={actions}
                frozen
                alignFrozen="right"
                headerClassName="bg-white"
                bodyClassName="bg-white"
                headerStyle={{
                  width: "9rem",
                  minWidth: "9rem",
                  textAlign: "right",
                }}
                bodyStyle={{ width: "9rem", minWidth: "9rem" }}
              />
            </DataTable>
          </div>
        </div>
      </Card>
      <Dialog
        header={selected ? i18nT("static.1i8xzpq") : i18nT("static.ofqpse")}
        visible={dialogVisible}
        style={{ width: "95vw", maxWidth: "44rem" }}
        breakpoints={{ "640px": "95vw" }}
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!saving}
        closable={!saving}
        onHide={closeDialog}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label={i18nT("static.ew9em3")}
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={saving}
              className="w-full sm:w-auto"
              onClick={closeDialog}
            />
            <Button
              type="submit"
              form="payroll-formula-form"
              label={selected ? i18nT("static.6gmm1l") : i18nT("static.30b61m")}
              icon="pi pi-check"
              loading={saving}
              disabled={saving}
              className="w-full sm:w-auto"
            />
          </div>
        }
      >
        <form
          id="payroll-formula-form"
          className="flex flex-col gap-5 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label={i18nT("static.xoaiok")} required>
              <InputText
                value={form.code ?? ""}
                maxLength={50}
                className="w-full"
                autoComplete="off"
                placeholder={i18nT("static.1745oo5")}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
              />
              <small className="text-slate-500">
                {i18nT("static.18donso")}{" "}
              </small>
            </Field>
            <Field label={i18nT("static.4el6o6")} required>
              <InputText
                value={form.name}
                maxLength={100}
                className="w-full"
                autoComplete="off"
                placeholder={i18nT("static.1utgix8")}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
              />
            </Field>
          </div>

          <Field label={i18nT("static.1tcetjf")} required>
            <InputTextarea
              value={form.expression}
              rows={6}
              autoResize
              className="w-full font-mono"
              placeholder={i18nT("static.1t03dcr")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  expression: event.target.value,
                }))
              }
            />
            <small className="leading-5 text-slate-500">
              {i18nT("static.1jmwe8x")}{" "}
            </small>
          </Field>

          <Field label={i18nT("static.sjj37t")}>
            <InputTextarea
              value={form.description ?? ""}
              rows={3}
              autoResize
              className="w-full"
              maxLength={500}
              placeholder={i18nT("static.154ro8v")}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </Field>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <label
              htmlFor="formula-active"
              className="cursor-pointer text-sm font-medium text-slate-700"
            >
              {i18nT("static.8qzyhb")}{" "}
            </label>
            <InputSwitch
              inputId="formula-active"
              checked={form.is_active}
              onChange={(event) =>
                setForm((current) => ({ ...current, is_active: event.value }))
              }
            />
          </div>
        </form>
      </Dialog>
    </>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
