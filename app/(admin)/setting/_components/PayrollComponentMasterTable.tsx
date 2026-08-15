"use client";

import { type ChangeEvent, useMemo, useState } from "react";
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
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  createDeductionComponent,
  deleteDeductionComponent,
  purgeDeductionComponent,
  restoreDeductionComponent,
  updateDeductionComponent,
} from "@/app/services/deduction-component-service";
import {
  createIncomeComponent,
  deleteIncomeComponent,
  purgeIncomeComponent,
  restoreIncomeComponent,
  updateIncomeComponent,
} from "@/app/services/income-component-service";
import type { CalculationMethod } from "@/app/types/calculation-method";
import type { ComponentCategory } from "@/app/types/component-category";
import type { DeductionComponent } from "@/app/types/deduction-component";
import type { IncomeComponent } from "@/app/types/income-component";
import type { PayrollFormula } from "@/app/types/payroll-formula";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { useArchivedDataAccess } from "@/app/utils/archived-data-access";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

type ComponentKind = "income" | "deduction";
type PayrollComponent = IncomeComponent | DeductionComponent;

type ComponentForm = {
  code: string;
  name: string;
  category: number | null;
  calculation_method: number | null;
  formula_id: number | null;
  calculation_display: string;
  is_taxable: boolean;
  is_active: boolean;
};

const emptyForm = (): ComponentForm => ({
  code: "",
  name: "",
  category: null,
  calculation_method: null,
  formula_id: null,
  calculation_display: "",
  is_taxable: true,
  is_active: true,
});

const getBody = () => document.body;

const titleFor = (kind: ComponentKind) =>
  kind === "income" ? "Income Component" : "Deduction Component";

const endpointFor = (kind: ComponentKind) =>
  kind === "income" ? "/api/income-component" : "/api/deduction-component";

const categoryTypeFor = (kind: ComponentKind) =>
  kind === "income" ? "EARNING" : "DEDUCTION";

export default function PayrollComponentMasterTable({
  kind,
}: {
  kind: ComponentKind;
}) {
  const dispatch = useDispatch();
  const profile = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("payroll-config");
  const title = titleFor(kind);
  const endpoint = endpointFor(kind);
  const canManage = profile.permissions.includes("payroll-config.manage");
  const isSuperadmin = archivedAccess.canShowDeleted;
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [selected, setSelected] = useState<PayrollComponent | null>(null);
  const [form, setForm] = useState<ComponentForm>(emptyForm);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const listKey = `${endpoint}?show_all=${archivedAccess.canShowDeleted && showDeleted}`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    PayrollComponent[]
  >(listKey, fetcher);
  const { data: methods } = useSWR<CalculationMethod[]>(
    "/api/calculation-method?show_all=false",
    fetcher,
  );
  const { data: categories } = useSWR<ComponentCategory[]>(
    "/api/component-category?show_all=false",
    fetcher,
  );
  const { data: formulas } = useSWR<PayrollFormula[]>(
    "/api/payroll-formula?show_all=false",
    fetcher,
  );

  const availableCategories = useMemo(
    () =>
      (categories ?? []).filter(
        (item) =>
          item.is_active &&
          item.category_type.toUpperCase() === categoryTypeFor(kind),
      ),
    [categories, kind],
  );
  const activeMethods = useMemo(
    () => (methods ?? []).filter((item) => item.is_active),
    [methods],
  );
  const activeFormulas = useMemo(
    () => (formulas ?? []).filter((item) => item.is_active && !item.deleted_at),
    [formulas],
  );
  const selectedMethod =
    activeMethods.find((item) => item.id === form.calculation_method) ?? null;
  const requiresFormula = Boolean(selectedMethod?.requires_formula);
  const selectedCategory = availableCategories.find(
    (item) => item.id === form.category,
  );
  const selectedCategoryIsFixed =
    selectedCategory?.code?.toUpperCase() === "FIXED_ALLOWANCE" &&
    selectedCategory.category_type === "EARNING";

  const notify = (severity: "success" | "error", detail: string) => {
    dispatch(
      showToast({
        visible: true,
        severity,
        summary: severity === "success" ? "Success" : "Error",
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
          : "An unexpected error occurred.",
    );
  };
  const closeDialog = () => {
    setDialogVisible(false);
    setSelected(null);
    setForm(emptyForm());
  };
  const openNew = () => {
    setSelected(null);
    setForm(emptyForm());
    setDialogVisible(true);
  };
  const openEdit = (row: PayrollComponent) => {
    if (row.assignment_mode === "SYSTEM") {
      notify("error", "System-managed components cannot be edited here.");
      return;
    }
    setSelected(row);
    setForm({
      code: row.code ?? "",
      name: row.name,
      category: row.category ?? null,
      calculation_method: row.calculation_method ?? null,
      formula_id: row.formula_id ?? null,
      calculation_display: row.calculation_display ?? "",
      is_taxable: row.is_taxable,
      is_active: row.is_active,
    });
    setDialogVisible(true);
  };
  const updateForm = <Key extends keyof ComponentForm>(
    key: Key,
    value: ComponentForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };
  const submit = async () => {
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code || !name || !form.category || !form.calculation_method) {
      notify(
        "error",
        "Code, name, category, and calculation method are required.",
      );
      return;
    }
    if (/\s/.test(code)) {
      notify("error", "Component code must not contain spaces.");
      return;
    }
    if (requiresFormula && !form.formula_id) {
      notify("error", "Select a formula for this calculation method.");
      return;
    }
    const payload = {
      code,
      name,
      category: form.category,
      calculation_method: form.calculation_method,
      formula_id: requiresFormula ? form.formula_id : null,
      calculation_display: form.calculation_display.trim() || null,
      is_taxable: form.is_taxable,
      is_active: form.is_active,
    };
    try {
      setSaving(true);
      if (kind === "income") {
        if (selected)
          await updateIncomeComponent(
            selected.id,
            selected.row_version,
            payload,
          );
        else await createIncomeComponent(payload);
      } else if (selected) {
        await updateDeductionComponent(
          selected.id,
          selected.row_version,
          payload,
        );
      } else {
        await createDeductionComponent(payload);
      }
      await mutate();
      closeDialog();
      notify("success", `${title} saved successfully.`);
    } catch (requestError: unknown) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row: PayrollComponent) => {
    try {
      if (kind === "income")
        await deleteIncomeComponent(row.id, row.row_version);
      else await deleteDeductionComponent(row.id, row.row_version);
      await mutate();
      notify("success", `${title} deleted successfully.`);
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const restore = async (row: PayrollComponent) => {
    try {
      if (kind === "income")
        await restoreIncomeComponent(row.id, row.row_version);
      else await restoreDeductionComponent(row.id, row.row_version);
      await mutate();
      notify("success", `${title} restored successfully.`);
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const purge = async (row: PayrollComponent) => {
    try {
      if (kind === "income") await purgeIncomeComponent(row.id);
      else await purgeDeductionComponent(row.id);
      await mutate();
      notify("success", `${title} permanently deleted.`);
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const ask = (
    row: PayrollComponent,
    action: "delete" | "restore" | "purge",
  ) => {
    if (row.assignment_mode === "SYSTEM") {
      notify("error", "System-managed components cannot be deleted.");
      return;
    }
    const labels =
      action === "delete"
        ? [
            "Delete",
            "This component will no longer be available for new payroll configuration.",
          ]
        : action === "restore"
          ? ["Restore", "This component will be available again."]
          : ["Delete Permanently", "This cannot be undone."];
    requestActionConfirmation({
      header: `${labels[0]} ${title}`,
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">{labels[1]}</span>
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
            label="Cancel"
            icon="pi pi-times"
            text
            severity="secondary"
            onClick={options.reject}
          />
          <Button
            type="button"
            label={labels[0]}
            icon={action === "restore" ? "pi pi-refresh" : "pi pi-trash"}
            severity={action === "restore" ? "success" : "danger"}
            onClick={options.accept}
          />
        </div>
      ),
    });
  };
  const status = (row: PayrollComponent) => {
    if (row.deleted_at)
      return (
        <Tag value="Deleted" severity="secondary" icon="pi pi-trash" rounded />
      );
    return row.is_active ? (
      <Tag
        value="Active"
        severity="success"
        icon="pi pi-check-circle"
        rounded
      />
    ) : (
      <Tag
        value="Inactive"
        severity="warning"
        icon="pi pi-minus-circle"
        rounded
      />
    );
  };
  const actions = (row: PayrollComponent) => {
    if (!canManage)
      return <span className="text-sm text-slate-400">No action</span>;
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
              tooltip="Restore"
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
              tooltip="Delete permanently"
              tooltipOptions={{ appendTo: getBody, position: "top" }}
              onClick={() => ask(row, "purge")}
            />
          )}
        </div>
      ) : (
        <span className="text-sm text-slate-400">No action</span>
      );
    if (row.assignment_mode === "SYSTEM")
      return (
        <Tag value="System managed" severity="info" icon="pi pi-lock" rounded />
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
          tooltip="Edit"
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
          tooltip="Delete"
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
                <i
                  className={`pi ${kind === "income" ? "pi-plus-circle" : "pi-minus-circle"} text-xl`}
                />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {title}
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Configure payroll components; BPJS wage treatment is inherited
                  from Component Category.
                </p>
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                label="Refresh"
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
                  label={`New ${title}`}
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
                  inputId={`${kind}-show-deleted`}
                  checked={showDeleted}
                  onChange={(event) => setShowDeleted(Boolean(event.checked))}
                />
                <label
                  htmlFor={`${kind}-show-deleted`}
                  className="cursor-pointer select-none text-sm text-slate-600"
                >
                  Show deleted records
                </label>
              </div>
            )}
            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={onSearch}
                placeholder="Search code, name, or method"
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
                "calculation_method_name",
                "calculation_method_code",
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
              tableStyle={{ minWidth: "62rem" }}
              emptyMessage={`No ${title.toLowerCase()} found.`}
              currentPageReportTemplate="{first} to {last} of {totalRecords}"
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
                header="Code"
                sortable
                body={(row: PayrollComponent) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {row.code ?? "-"}
                  </span>
                )}
                style={{ minWidth: "10rem" }}
              />
              <Column
                field="name"
                header="Component Name"
                sortable
                body={(row: PayrollComponent) => (
                  <span className="font-medium text-slate-800">{row.name}</span>
                )}
                style={{ minWidth: "16rem" }}
              />
              <Column
                header="Calculation Method"
                sortable
                sortField="calculation_method_name"
                body={(row: PayrollComponent) =>
                  row.calculation_method_name ??
                  ("calculation_method_code" in row
                    ? row.calculation_method_code
                    : null) ??
                  "-"
                }
                style={{ minWidth: "13rem" }}
              />
              <Column
                header="Category"
                body={(row: PayrollComponent) => {
                  const category = availableCategories.find(
                    (item) => item.id === row.category,
                  );
                  return (
                    <span className="text-sm text-slate-700">
                      {category?.name ?? "-"}
                    </span>
                  );
                }}
                style={{ minWidth: "14rem" }}
              />
              <Column
                header="Taxable"
                body={(row: PayrollComponent) =>
                  row.is_taxable ? (
                    <Tag value="Yes" severity="info" />
                  ) : (
                    <Tag value="No" severity="secondary" />
                  )
                }
                style={{ minWidth: "8rem" }}
              />
              {kind === "income" && (
                <Column
                  header="Statutory Base"
                  body={(row: PayrollComponent) => {
                    const income = row as IncomeComponent;
                    if (!income.is_fixed_allowance)
                      return <Tag value="Variable" severity="secondary" />;
                    const programs = [
                      income.include_in_bpjs_health ? "Health" : null,
                      income.include_in_bpjs_employment ? "Employment" : null,
                    ].filter(Boolean);
                    return (
                      <Tag
                        value={
                          programs.length ? programs.join(" + ") : "Excluded"
                        }
                        severity={programs.length ? "success" : "secondary"}
                      />
                    );
                  }}
                  style={{ minWidth: "13rem" }}
                />
              )}
              <Column
                header="Assignment"
                body={(row: PayrollComponent) =>
                  row.assignment_mode === "SYSTEM" ? (
                    <Tag value="System" severity="info" icon="pi pi-lock" />
                  ) : (
                    <Tag value="Employee" severity="secondary" />
                  )
                }
                style={{ minWidth: "10rem" }}
              />
              <Column
                header="Status"
                body={status}
                style={{ minWidth: "10rem" }}
              />
              <Column
                header="Action"
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
        header={selected ? `Edit ${title}` : `New ${title}`}
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
              label="Cancel"
              icon="pi pi-times"
              text
              severity="secondary"
              disabled={saving}
              className="w-full sm:w-auto"
              onClick={closeDialog}
            />
            <Button
              type="submit"
              form={`${kind}-component-form`}
              label={selected ? "Save Changes" : `Create ${title}`}
              icon="pi pi-check"
              loading={saving}
              disabled={saving}
              className="w-full sm:w-auto"
            />
          </div>
        }
      >
        <form
          id={`${kind}-component-form`}
          className="flex flex-col gap-5 pt-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Code" required>
              <InputText
                value={form.code}
                maxLength={50}
                className="w-full"
                autoComplete="off"
                placeholder="e.g. BASIC_SALARY"
                onChange={(event) => updateForm("code", event.target.value)}
              />
              <small className="text-slate-500">
                Use a unique code without spaces.
              </small>
            </Field>
            <Field label="Name" required>
              <InputText
                value={form.name}
                maxLength={100}
                className="w-full"
                autoComplete="off"
                placeholder="e.g. Basic Salary"
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </Field>
            <Field label="Category" required>
              <Dropdown
                value={form.category}
                options={availableCategories}
                optionLabel="name"
                optionValue="id"
                filter
                showClear
                appendTo={getBody}
                className="w-full"
                placeholder="Select category"
                onChange={(event) =>
                  updateForm("category", event.value as number | null)
                }
              />
            </Field>
            <Field label="Calculation Method" required>
              <Dropdown
                value={form.calculation_method}
                options={activeMethods}
                optionLabel="name"
                optionValue="id"
                filter
                showClear
                appendTo={getBody}
                className="w-full"
                placeholder="Select calculation method"
                onChange={(event) => {
                  const methodId = event.value as number | null;
                  updateForm("calculation_method", methodId);
                  const method = activeMethods.find(
                    (item) => item.id === methodId,
                  );
                  if (!method?.requires_formula) updateForm("formula_id", null);
                }}
              />
            </Field>
            {requiresFormula && (
              <Field label="Formula" required>
                <Dropdown
                  value={form.formula_id}
                  options={activeFormulas}
                  optionLabel="name"
                  optionValue="id"
                  filter
                  showClear
                  appendTo={getBody}
                  className="w-full"
                  placeholder="Select formula"
                  onChange={(event) =>
                    updateForm("formula_id", event.value as number | null)
                  }
                />
                <small className="text-slate-500">
                  Only active formulas can be used.
                </small>
              </Field>
            )}
            <Field label="Calculation Display">
              <InputText
                value={form.calculation_display}
                maxLength={100}
                className="w-full"
                placeholder="Optional display label"
                onChange={(event) =>
                  updateForm("calculation_display", event.target.value)
                }
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-3">
              <Checkbox
                inputId={`${kind}-taxable`}
                checked={form.is_taxable}
                onChange={(event) =>
                  updateForm("is_taxable", Boolean(event.checked))
                }
              />
              <label
                htmlFor={`${kind}-taxable`}
                className="cursor-pointer text-sm font-medium text-slate-700"
              >
                Taxable component
              </label>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <label
                htmlFor={`${kind}-active`}
                className="cursor-pointer text-sm font-medium text-slate-700"
              >
                Active
              </label>
              <InputSwitch
                inputId={`${kind}-active`}
                checked={form.is_active}
                onChange={(event) => updateForm("is_active", event.value)}
              />
            </div>
          </div>
          {kind === "income" && (
            <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <div>
                <p className="m-0 text-sm font-semibold text-slate-800">
                  BPJS wage-base treatment
                </p>
                <p className="m-0 mt-1 text-xs leading-5 text-slate-600">
                  This component inherits the BPJS treatment from its category.
                  Configure it in Component Category; it is not entered per
                  income component.
                </p>
              </div>
              {selectedCategory ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <Tag
                    value={
                      selectedCategoryIsFixed ? "Fixed allowance" : "Variable"
                    }
                    severity={selectedCategoryIsFixed ? "info" : "secondary"}
                  />
                  {selectedCategoryIsFixed &&
                    selectedCategory.include_in_bpjs_health && (
                      <Tag value="BPJS Kesehatan" severity="success" />
                    )}
                  {selectedCategoryIsFixed &&
                    selectedCategory.include_in_bpjs_employment && (
                      <Tag value="BPJS Ketenagakerjaan" severity="success" />
                    )}
                  {(!selectedCategoryIsFixed ||
                    (!selectedCategory.include_in_bpjs_health &&
                      !selectedCategory.include_in_bpjs_employment)) && (
                    <Tag
                      value="Excluded from BPJS wage base"
                      severity="secondary"
                    />
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-500">
                  Select a category to preview the inherited treatment.
                </span>
              )}
            </div>
          )}
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
