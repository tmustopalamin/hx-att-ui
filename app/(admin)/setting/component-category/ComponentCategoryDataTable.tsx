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
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  createComponentCategory,
  deleteComponentCategory,
  purgeComponentCategory,
  restoreComponentCategory,
  updateComponentCategory,
} from "@/app/services/component-category-service";
import type {
  ComponentCategory,
  ComponentCategoryPayload,
} from "@/app/types/component-category";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const getBody = () => document.body;
const listUrl = (showDeleted: boolean) =>
  `/api/component-category?show_all=${showDeleted}`;
const categoryTypeOptions = [
  { labelKey: "Earning", value: "EARNING" },
  { labelKey: "Deduction", value: "DEDUCTION" },
  { labelKey: "Employer Contribution", value: "EMPLOYER_CONTRIBUTION" },
];
const emptyPayload = (): ComponentCategoryPayload => ({
  code: "",
  name: "",
  description: null,
  display_order: 0,
  category_type: "EARNING",
  is_active: true,
  include_in_bpjs_health: false,
  include_in_bpjs_employment: false,
});

export default function ComponentCategoryDataTable() {
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
  const [selected, setSelected] = useState<ComponentCategory | null>(null);
  const [form, setForm] = useState<ComponentCategoryPayload>(emptyPayload);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentUrl = listUrl(archivedAccess.canShowDeleted && showDeleted);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    ComponentCategory[]
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
  const openEdit = (row: ComponentCategory) => {
    setSelected(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      description: row.description,
      display_order: row.display_order,
      category_type: row.category_type,
      is_active: row.is_active,
      include_in_bpjs_health: row.include_in_bpjs_health,
      include_in_bpjs_employment: row.include_in_bpjs_employment,
    });
    setDialogVisible(true);
  };
  const updateForm = <K extends keyof ComponentCategoryPayload>(
    key: K,
    value: ComponentCategoryPayload[K],
  ) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async () => {
    const code = form.code?.trim().toUpperCase() ?? "";
    const name = form.name.trim();
    if (!code || !name || !form.category_type) {
      notify("error", i18nT("static.1ebicea"));
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(code)) {
      notify("error", i18nT("static.1bzmybo"));
      return;
    }

    const isFixedAllowance =
      form.category_type === "EARNING" && code === "FIXED_ALLOWANCE";
    if (
      !isFixedAllowance &&
      (form.include_in_bpjs_health || form.include_in_bpjs_employment)
    ) {
      notify("error", i18nT("static.1m9z4zi"));
      return;
    }

    try {
      setSaving(true);
      const payload: ComponentCategoryPayload = {
        ...form,
        code,
        name,
        description: form.description?.trim() || null,
        include_in_bpjs_health: isFixedAllowance
          ? form.include_in_bpjs_health
          : false,
        include_in_bpjs_employment: isFixedAllowance
          ? form.include_in_bpjs_employment
          : false,
      };
      if (selected) {
        await updateComponentCategory(
          selected.id,
          selected.row_version,
          payload,
        );
      } else {
        await createComponentCategory(payload);
      }
      await mutate();
      closeDialog();
      notify("success", i18nT("static.g5upbm"));
    } catch (requestError: unknown) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row: ComponentCategory) => {
    try {
      await deleteComponentCategory(row.id, row.row_version);
      await mutate();
      notify("success", i18nT("static.254y6g"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const restore = async (row: ComponentCategory) => {
    try {
      await restoreComponentCategory(row.id, row.row_version);
      await mutate();
      notify("success", i18nT("static.1fauv2n"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const purge = async (row: ComponentCategory) => {
    try {
      await purgeComponentCategory(row.id);
      await mutate();
      notify("success", i18nT("static.10evi6a"));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const ask = (
    row: ComponentCategory,
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
        ? "This category can no longer be selected for new payroll components."
        : action === "restore"
          ? "This category will be available again."
          : "This action cannot be undone.";
    requestActionConfirmation({
      header: i18nT("static.1pxnyra", { p0: label }),
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
  const status = (row: ComponentCategory) => {
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
  const actions = (row: ComponentCategory) => {
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
                <i className="pi pi-tags text-xl" />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {i18nT("static.coj8d4")}{" "}
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.1v081qw")}{" "}
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
                  label={i18nT("static.4k56k2")}
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
                  inputId="category-show-deleted"
                  checked={showDeleted}
                  onChange={(event) => setShowDeleted(Boolean(event.checked))}
                />
                <label
                  htmlFor="category-show-deleted"
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
                placeholder={i18nT("static.1g9d44o")}
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
                "category_type",
                "description",
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
              tableStyle={{ minWidth: "65rem" }}
              emptyMessage={i18nT("static.11gydr3")}
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
                body={(row: ComponentCategory) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {row.code ?? "-"}
                  </span>
                )}
                style={{ minWidth: "12rem" }}
              />
              <Column
                field="name"
                header={i18nT("static.izdfpk")}
                sortable
                body={(row: ComponentCategory) => (
                  <span className="font-medium text-slate-800">{row.name}</span>
                )}
                style={{ minWidth: "15rem" }}
              />
              <Column
                field="category_type"
                header={i18nT("static.1m2zofh")}
                sortable
                body={(row: ComponentCategory) => (
                  <Tag
                    value={row.category_type.replaceAll("_", " ")}
                    severity={
                      row.category_type === "EARNING"
                        ? "success"
                        : row.category_type === "DEDUCTION"
                          ? "warning"
                          : "info"
                    }
                  />
                )}
                style={{ minWidth: "13rem" }}
              />
              <Column
                field="display_order"
                header={i18nT("static.6wrg3b")}
                sortable
                style={{ minWidth: "7rem" }}
              />
              <Column
                header={i18nT("static.1rexqhx")}
                body={(row: ComponentCategory) => {
                  if (
                    row.code?.toUpperCase() !== "FIXED_ALLOWANCE" ||
                    row.category_type !== "EARNING"
                  ) {
                    return (
                      <Tag
                        value={i18nT("static.18967bv")}
                        severity="secondary"
                      />
                    );
                  }
                  const programs = [
                    row.include_in_bpjs_health ? "Health" : null,
                    row.include_in_bpjs_employment ? "Employment" : null,
                  ].filter(Boolean);
                  return (
                    <Tag
                      value={
                        programs.length
                          ? programs.join(" + ")
                          : i18nT("static.tio6hj")
                      }
                      severity={programs.length ? "success" : "secondary"}
                    />
                  );
                }}
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
        header={selected ? i18nT("static.1aahy7m") : i18nT("static.4k56k2")}
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
              form="component-category-form"
              label={selected ? i18nT("static.6gmm1l") : i18nT("static.8b3o0u")}
              icon="pi pi-check"
              loading={saving}
              disabled={saving}
              className="w-full sm:w-auto"
            />
          </div>
        }
      >
        <form
          id="component-category-form"
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
                placeholder={i18nT("static.1r8v4xo")}
                onChange={(event) => {
                  const code = event.target.value;
                  updateForm("code", code);
                  if (!(
                    form.category_type === "EARNING" &&
                    code.trim().toUpperCase() === "FIXED_ALLOWANCE"
                  )) {
                    updateForm("include_in_bpjs_health", false);
                    updateForm("include_in_bpjs_employment", false);
                  }
                }}
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
                placeholder={i18nT("static.ftk5rn")}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </Field>
            <Field label={i18nT("static.c0we20")} required>
              <Dropdown
                value={form.category_type}
                options={categoryTypeOptions.map((option) => ({
                  label: i18nT(option.labelKey),
                  value: option.value,
                }))}
                optionLabel="label"
                optionValue="value"
                appendTo={getBody}
                disabled={Boolean(selected)}
                className="w-full"
                onChange={(event) => {
                  const categoryType = event.value as string;
                  updateForm("category_type", categoryType);
                  if (categoryType !== "EARNING") {
                    updateForm("include_in_bpjs_health", false);
                    updateForm("include_in_bpjs_employment", false);
                  }
                }}
              />
              {selected && (
                <small className="text-slate-500">
                  {i18nT("static.193np76")}{" "}
                </small>
              )}
            </Field>
            <Field label={i18nT("static.rz5u01")} required>
              <InputNumber
                value={form.display_order}
                useGrouping={false}
                min={0}
                max={9999}
                className="w-full"
                inputClassName="w-full"
                onValueChange={(event) =>
                  updateForm("display_order", event.value ?? 0)
                }
              />
              <small className="text-slate-500">
                {i18nT("static.9ureql")}{" "}
              </small>
            </Field>
          </div>
          <Field label={i18nT("static.sjj37t")}>
            <InputTextarea
              value={form.description ?? ""}
              rows={3}
              autoResize
              maxLength={500}
              className="w-full"
              placeholder={i18nT("static.154ro8v")}
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />
          </Field>
          <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <div>
              <p className="m-0 text-sm font-semibold text-slate-800">
                {i18nT("static.frzx9y")}{" "}
              </p>
              <p className="m-0 mt-1 text-xs leading-5 text-slate-600">
                {i18nT("static.1uuvll0")}{" "}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-3">
                <Checkbox
                  inputId="category-bpjs-health"
                  checked={form.include_in_bpjs_health}
                  disabled={
                    !(
                      form.category_type === "EARNING" &&
                      form.code?.trim().toUpperCase() === "FIXED_ALLOWANCE"
                    )
                  }
                  onChange={(event) =>
                    updateForm("include_in_bpjs_health", Boolean(event.checked))
                  }
                />
                <label
                  htmlFor="category-bpjs-health"
                  className="cursor-pointer text-sm font-medium text-slate-700"
                >
                  {i18nT("static.s2o1i2")}{" "}
                </label>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-3">
                <Checkbox
                  inputId="category-bpjs-employment"
                  checked={form.include_in_bpjs_employment}
                  disabled={
                    !(
                      form.category_type === "EARNING" &&
                      form.code?.trim().toUpperCase() === "FIXED_ALLOWANCE"
                    )
                  }
                  onChange={(event) =>
                    updateForm(
                      "include_in_bpjs_employment",
                      Boolean(event.checked),
                    )
                  }
                />
                <label
                  htmlFor="category-bpjs-employment"
                  className="cursor-pointer text-sm font-medium text-slate-700"
                >
                  {i18nT("static.1h89vja")}{" "}
                </label>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <label
              htmlFor="category-active"
              className="cursor-pointer text-sm font-medium text-slate-700"
            >
              {i18nT("static.8qzyhb")}{" "}
            </label>
            <InputSwitch
              inputId="category-active"
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
