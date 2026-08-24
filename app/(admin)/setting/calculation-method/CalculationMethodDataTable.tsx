"use client";
import { useI18n } from "@/app/i18n";

import { type ChangeEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useSWR from "swr";
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
  createCalculationMethod,
  deleteCalculationMethod,
  purgeCalculationMethod,
  restoreCalculationMethod,
  updateCalculationMethod,
} from "@/app/services/calculation-method-service";
import type {
  CalculationMethod,
  CalculationMethodPayload,
} from "@/app/types/calculation-method";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const getBody = () => document.body;
const listUrl = (showDeleted: boolean) =>
  `/api/calculation-method?show_all=${showDeleted}`;
const emptyPayload = (): CalculationMethodPayload => ({
  code: "",
  name: "",
  description: null,
  requires_formula: false,
  requires_reference_component: false,
  requires_attendance: false,
  is_active: true,
});

export default function CalculationMethodDataTable() {
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
  const [selected, setSelected] = useState<CalculationMethod | null>(null);
  const [form, setForm] = useState<CalculationMethodPayload>(emptyPayload);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentUrl = listUrl(archivedAccess.canShowDeleted && showDeleted);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    CalculationMethod[]
  >(currentUrl, fetcher);

  const notify = (severity: "success" | "error", detail: string) => {
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
  };
  const showError = (requestError: unknown) => {
    notify(
      "error",
      isResponseTypeError(requestError)
        ? getErrorMessage(requestError, "message")
        : requestError instanceof Error
          ? requestError.message
          : i18nT("static.37lwsc"),
    );
  };
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
  const openEdit = (row: CalculationMethod) => {
    setSelected(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      description: row.description,
      requires_formula: row.requires_formula,
      requires_reference_component: row.requires_reference_component,
      requires_attendance: row.requires_attendance,
      is_active: row.is_active,
    });
    setDialogVisible(true);
  };
  const updateForm = <K extends keyof CalculationMethodPayload>(
    key: K,
    value: CalculationMethodPayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    if (!isWhitespaceFreeIdentifier(form.code)) {
      notify("error", i18nT("validation.codeNoWhitespace"));
      return;
    }
    const code = form.code?.trim().toUpperCase() ?? "";
    const name = form.name.trim();
    if (!code || !name) {
      notify("error", i18nT("static.u9zubr"));
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(code)) {
      notify("error", i18nT("static.1bzmybo"));
      return;
    }
    try {
      setSaving(true);
      const payload: CalculationMethodPayload = {
        ...form,
        code,
        name,
        description: form.description?.trim() || null,
      };
      if (selected)
        await updateCalculationMethod(
          selected.id,
          selected.row_version,
          payload,
        );
      else await createCalculationMethod(payload);
      await mutate();
      closeDialog();
      notify("success", i18nT("static.rai4np"));
    } catch (requestError: unknown) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row: CalculationMethod) => {
    try {
      await deleteCalculationMethod(row.id, row.row_version);
      await mutate();
      notify("success", i18nT("static.1lv4pdj"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const restore = async (row: CalculationMethod) => {
    try {
      await restoreCalculationMethod(row.id, row.row_version);
      await mutate();
      notify("success", i18nT("static.k2h4v2"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const purge = async (row: CalculationMethod) => {
    try {
      await purgeCalculationMethod(row.id);
      await mutate();
      notify("success", i18nT("static.18vhhvr"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const ask = (
    row: CalculationMethod,
    action: "delete" | "restore" | "purge",
  ) => {
    const label =
      action === "delete"
        ? "Delete"
        : action === "restore"
          ? "Restore"
          : "Delete Permanently";
    const message =
      action === "delete"
        ? "This method can no longer be selected for new payroll components."
        : action === "restore"
          ? "This method will be available again."
          : "This action cannot be undone.";
    requestActionConfirmation({
      header: i18nT("static.1tud2b1", { p0: label }),
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{message}</span>
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
    });
  };
  const status = (row: CalculationMethod) => {
    if (row.deleted_at)
      return (
        <Tag
          value={i18nT("static.1v6qcju")}
          severity="secondary"
          icon="pi pi-trash"
          rounded
        />
      );
    return row.is_active ? (
      <Tag
        value={i18nT("static.8qzyhb")}
        severity="success"
        icon="pi pi-check-circle"
        rounded
      />
    ) : (
      <Tag
        value={i18nT("static.13zf5vc")}
        severity="warning"
        icon="pi pi-minus-circle"
        rounded
      />
    );
  };
  const requirements = (row: CalculationMethod) => {
    const items = [
      row.requires_formula && "Formula",
      row.requires_reference_component && "Reference",
      row.requires_attendance && "Attendance",
    ].filter(Boolean);
    return items.length ? (
      <span className="text-sm text-slate-700">{items.join(", ")}</span>
    ) : (
      <span className="text-sm text-slate-400">{i18nT("static.deku7v")}</span>
    );
  };
  const actions = (row: CalculationMethod) => {
    if (!canManage)
      return (
        <span className="text-sm text-slate-400">{i18nT("static.yaeuo4")}</span>
      );
    if (row.deleted_at) {
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
    }
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
  if (error) return <ErrorNotConnectedToApi mutateKey={currentUrl} />;

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-sliders-h text-xl" />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.16vvan3")}{" "}
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.r9q68c")}{" "}
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
                  label={i18nT("static.hqkx3d")}
                  icon="pi pi-plus"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={openNew}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {archivedAccess.canShowDeleted && (
              <div className="flex items-center gap-2">
                <Checkbox
                  inputId="method-show-deleted"
                  checked={showDeleted}
                  onChange={(event) => setShowDeleted(Boolean(event.checked))}
                />
                <label
                  htmlFor="method-show-deleted"
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
                placeholder={i18nT("static.41pktm")}
                className="w-full"
              />
            </IconField>
          </div>
          <div className="w-full overflow-hidden">
            <DataTable
              value={data ?? []}
              dataKey="id"
              filters={filters}
              globalFilterFields={["code", "name", "description"]}
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
              tableStyle={{ minWidth: "67rem" }}
              emptyMessage={i18nT("static.139ecoy")}
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
                body={(row: CalculationMethod) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {row.code ?? "-"}
                  </span>
                )}
                style={{ minWidth: "13rem" }}
              />
              <Column
                field="name"
                header={i18nT("static.nnmx2r")}
                sortable
                body={(row: CalculationMethod) => (
                  <span className="font-medium text-slate-800">{row.name}</span>
                )}
                style={{ minWidth: "16rem" }}
              />
              <Column
                header={i18nT("static.19nrj7c")}
                body={requirements}
                style={{ minWidth: "14rem" }}
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
        header={selected ? i18nT("static.1ngxoqx") : i18nT("static.hqkx3d")}
        visible={dialogVisible}
        style={{ width: "95vw", maxWidth: "42rem" }}
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
              form="calculation-method-form"
              label={selected ? i18nT("static.6gmm1l") : i18nT("static.hr1odh")}
              icon="pi pi-check"
              loading={saving}
              disabled={saving}
              className="w-full sm:w-auto"
            />
          </div>
        }
      >
        <form
          id="calculation-method-form"
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
                autoComplete="off"
                className="w-full"
                placeholder={i18nT("static.10t75de")}
                onChange={(event) => updateForm("code", event.target.value)}
              />
              <small className="text-slate-500">
                {i18nT("static.1v8tb1w")}{" "}
              </small>
            </Field>
            <Field label={i18nT("static.4el6o6")} required>
              <InputText
                value={form.name}
                maxLength={100}
                autoComplete="off"
                className="w-full"
                placeholder={i18nT("static.nd206j")}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </Field>
          </div>
          <Field label={i18nT("static.sjj37t")}>
            <InputTextarea
              value={form.description ?? ""}
              rows={3}
              autoResize
              maxLength={500}
              className="w-full"
              placeholder={i18nT("static.1f148lb")}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />
          </Field>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 p-3">
            <span className="text-sm font-medium text-slate-700">
              {i18nT("static.14kbklg")}{" "}
            </span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <ToggleField
                id="method-formula"
                label={i18nT("static.1b8agvx")}
                checked={form.requires_formula}
                onChange={(value) => updateForm("requires_formula", value)}
              />
              <ToggleField
                id="method-reference"
                label={i18nT("static.1sacpi5")}
                checked={form.requires_reference_component}
                onChange={(value) =>
                  updateForm("requires_reference_component", value)
                }
              />
              <ToggleField
                id="method-attendance"
                label={i18nT("static.5977ja")}
                checked={form.requires_attendance}
                onChange={(value) => updateForm("requires_attendance", value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <label
              htmlFor="method-active"
              className="cursor-pointer text-sm font-medium text-slate-700"
            >
              {i18nT("static.8qzyhb")}{" "}
            </label>
            <InputSwitch
              inputId="method-active"
              checked={form.is_active}
              onChange={(event) => updateForm("is_active", event.value)}
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

function ToggleField({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2">
      <label htmlFor={id} className="cursor-pointer text-sm text-slate-700">
        {label}
      </label>
      <InputSwitch
        inputId={id}
        checked={checked}
        onChange={(event) => onChange(event.value)}
      />
    </div>
  );
}
