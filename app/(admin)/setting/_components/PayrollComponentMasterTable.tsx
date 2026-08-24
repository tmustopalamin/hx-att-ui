"use client";
import { useI18n } from "@/app/i18n";

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
import { InputNumber } from "primereact/inputnumber";
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
import type {
  IncomeComponent,
  WorkingPeriodTier,
} from "@/app/types/income-component";
import type { PayrollFormula } from "@/app/types/payroll-formula";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
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
  working_period_tiers: WorkingPeriodTier[];
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
  working_period_tiers: [],
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
  const { t: i18nT } = useI18n();
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
  const isWorkingPeriod =
    kind === "income" &&
    selectedMethod?.code?.toUpperCase() === "WORKING_PERIOD";
  const selectedCategory = availableCategories.find(
    (item) => item.id === form.category,
  );
  const fixedAllowanceCategory = availableCategories.find(
    (item) => item.code?.toUpperCase() === "FIXED_ALLOWANCE",
  );
  const selectedCategoryIsFixed =
    selectedCategory?.code?.toUpperCase() === "FIXED_ALLOWANCE" &&
    selectedCategory.category_type.toUpperCase() === "EARNING";

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
    setForm(emptyForm());
  };
  const openNew = () => {
    setSelected(null);
    setForm(emptyForm());
    setDialogVisible(true);
  };
  const openEdit = (row: PayrollComponent) => {
    if (row.assignment_mode === "SYSTEM") {
      notify("error", i18nT("static.12zsb8x"));
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
      working_period_tiers:
        kind === "income"
          ? ((row as IncomeComponent).working_period_tiers ?? []).map(
              (tier) => ({
                ...tier,
                percentage: Number(tier.percentage),
              }),
            )
          : [],
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
    if (!isWhitespaceFreeIdentifier(form.code)) {
      notify("error", i18nT("validation.codeNoWhitespace"));
      return;
    }
    const code = form.code.trim().toUpperCase();
    const name = form.name.trim();
    if (!code || !name || !form.category || !form.calculation_method) {
      notify("error", i18nT("static.1tbgkp9"));
      return;
    }
    if (requiresFormula && !form.formula_id) {
      notify("error", i18nT("static.cnn8w5"));
      return;
    }
    const workingPeriodTiers = [...form.working_period_tiers].sort(
      (left, right) => left.minimum_months - right.minimum_months,
    );
    if (isWorkingPeriod) {
      if (!selectedCategoryIsFixed) {
        notify("error", i18nT("static.1a0u9o4"));
        return;
      }
      if (!workingPeriodTiers.length) {
        notify("error", i18nT("static.1q0msbd"));
        return;
      }
      for (let index = 0; index < workingPeriodTiers.length; index += 1) {
        const tier = workingPeriodTiers[index];
        if (
          !Number.isInteger(tier.minimum_months) ||
          tier.minimum_months < 0 ||
          (tier.maximum_months !== null &&
            (!Number.isInteger(tier.maximum_months) ||
              tier.maximum_months < tier.minimum_months)) ||
          tier.percentage < 0 ||
          tier.percentage > 100 ||
          (index === 0 && tier.minimum_months !== 0) ||
          (index < workingPeriodTiers.length - 1 &&
            tier.maximum_months === null) ||
          (index === workingPeriodTiers.length - 1 &&
            tier.maximum_months !== null) ||
          (index > 0 &&
            tier.minimum_months !==
              (workingPeriodTiers[index - 1].maximum_months ?? -1) + 1)
        ) {
          notify("error", i18nT("static.1rmzyk0"));
          return;
        }
      }
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
          await updateIncomeComponent(selected.id, selected.row_version, {
            ...payload,
            working_period_tiers: isWorkingPeriod ? workingPeriodTiers : [],
          });
        else
          await createIncomeComponent({
            ...payload,
            working_period_tiers: isWorkingPeriod ? workingPeriodTiers : [],
          });
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
      notify("success", i18nT("static.1rkm9pb", { p0: title }));
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
      notify("success", i18nT("static.10bigux", { p0: title }));
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
      notify("success", i18nT("static.1y3p2b8", { p0: title }));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const purge = async (row: PayrollComponent) => {
    try {
      if (kind === "income") await purgeIncomeComponent(row.id);
      else await purgeDeductionComponent(row.id);
      await mutate();
      notify("success", i18nT("static.6ygui1", { p0: title }));
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const ask = (
    row: PayrollComponent,
    action: "delete" | "restore" | "purge",
  ) => {
    if (row.assignment_mode === "SYSTEM") {
      notify("error", i18nT("static.8jsqt1"));
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
      header: i18nT("static.y7k7q", { p0: labels[0], p1: title }),
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
            label={i18nT("static.ew9em3")}
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
  const actions = (row: PayrollComponent) => {
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
    if (row.assignment_mode === "SYSTEM")
      return (
        <Tag
          value={i18nT("static.17he831")}
          severity="info"
          icon="pi pi-lock"
          rounded
        />
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
                <i
                  className={`pi ${kind === "income" ? "pi-plus-circle" : "pi-minus-circle"} text-xl`}
                />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  {title}
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  {i18nT("static.wu7z4r")}{" "}
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
                  label={i18nT("static.37xc9b", { p0: title })}
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
                  {i18nT("static.1kk3in7")}{" "}
                </label>
              </div>
            )}
            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={onSearch}
                placeholder={i18nT("static.1j0t5hd")}
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
              emptyMessage={i18nT("static.195usew", {
                p0: title.toLowerCase(),
              })}
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
                body={(row: PayrollComponent) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {row.code ?? "-"}
                  </span>
                )}
                style={{ minWidth: "10rem" }}
              />
              <Column
                field="name"
                header={i18nT("static.1fkuszn")}
                sortable
                body={(row: PayrollComponent) => (
                  <span className="font-medium text-slate-800">{row.name}</span>
                )}
                style={{ minWidth: "16rem" }}
              />
              <Column
                header={i18nT("static.16vvan3")}
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
                header={i18nT("static.1cr1mz5")}
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
                header={i18nT("static.vgbaji")}
                body={(row: PayrollComponent) =>
                  row.is_taxable ? (
                    <Tag value={i18nT("static.1dudzcg")} severity="info" />
                  ) : (
                    <Tag value={i18nT("static.r5wqai")} severity="secondary" />
                  )
                }
                style={{ minWidth: "8rem" }}
              />
              {kind === "income" && (
                <Column
                  header={i18nT("static.uzmksf")}
                  body={(row: PayrollComponent) => {
                    const income = row as IncomeComponent;
                    if (!income.is_fixed_allowance)
                      return (
                        <Tag
                          value={i18nT("static.ye709x")}
                          severity="secondary"
                        />
                      );
                    const programs = [
                      income.include_in_bpjs_health ? "Health" : null,
                      income.include_in_bpjs_employment ? "Employment" : null,
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
                  style={{ minWidth: "13rem" }}
                />
              )}
              {kind === "income" && (
                <Column
                  header={i18nT("static.18pqnh5")}
                  body={(row: PayrollComponent) => {
                    const income = row as IncomeComponent;
                    const methodCode =
                      income.calculation_method_code?.toUpperCase();
                    return methodCode === "WORKING_PERIOD" ? (
                      <Tag
                        value={i18nT("static.ui2e5t", {
                          p0: income.working_period_tiers?.length ?? 0,
                        })}
                        severity="info"
                      />
                    ) : (
                      <span className="text-slate-400">-</span>
                    );
                  }}
                  style={{ minWidth: "10rem" }}
                />
              )}
              <Column
                header={i18nT("static.10eds7k")}
                body={(row: PayrollComponent) =>
                  row.assignment_mode === "SYSTEM" ? (
                    <Tag
                      value={i18nT("static.13qbhrw")}
                      severity="info"
                      icon="pi pi-lock"
                    />
                  ) : (
                    <Tag value={i18nT("static.1fak8xt")} severity="secondary" />
                  )
                }
                style={{ minWidth: "10rem" }}
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
        header={
          selected
            ? i18nT("static.1kpycen", { p0: title })
            : i18nT("static.37xc9b", { p0: title })
        }
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
              form={`${kind}-component-form`}
              label={
                selected
                  ? i18nT("static.6gmm1l")
                  : i18nT("static.ww9hjf", { p0: title })
              }
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
            <Field label={i18nT("static.xoaiok")} required>
              <InputText
                value={form.code}
                maxLength={50}
                className="w-full"
                autoComplete="off"
                placeholder={i18nT("static.1qbwxkk")}
                onChange={(event) => updateForm("code", event.target.value)}
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
                placeholder={i18nT("static.fepvq9")}
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </Field>
            <Field label={i18nT("static.1cr1mz5")} required>
              <Dropdown
                value={form.category}
                options={availableCategories}
                optionLabel="name"
                optionValue="id"
                filter
                showClear
                appendTo={getBody}
                className="w-full"
                placeholder={i18nT("static.1fq1nm3")}
                onChange={(event) =>
                  updateForm("category", event.value as number | null)
                }
              />
            </Field>
            <Field label={i18nT("static.16vvan3")} required>
              <Dropdown
                value={form.calculation_method}
                options={activeMethods}
                optionLabel="name"
                optionValue="id"
                filter
                showClear
                appendTo={getBody}
                className="w-full"
                placeholder={i18nT("static.47cgl1")}
                onChange={(event) => {
                  const methodId = event.value as number | null;
                  const method = activeMethods.find(
                    (item) => item.id === methodId,
                  );
                  const methodCode = method?.code?.toUpperCase();
                  setForm((current) => ({
                    ...current,
                    calculation_method: methodId,
                    formula_id: method?.requires_formula
                      ? current.formula_id
                      : null,
                    category:
                      methodCode === "WORKING_PERIOD"
                        ? (fixedAllowanceCategory?.id ?? current.category)
                        : current.category,
                    working_period_tiers:
                      methodCode === "WORKING_PERIOD"
                        ? current.working_period_tiers.length
                          ? current.working_period_tiers
                          : [
                              {
                                minimum_months: 0,
                                maximum_months: null,
                                percentage: 0,
                              },
                            ]
                        : [],
                  }));
                }}
              />
            </Field>
            {requiresFormula && (
              <Field label={i18nT("static.1b8agvx")} required>
                <Dropdown
                  value={form.formula_id}
                  options={activeFormulas}
                  optionLabel="name"
                  optionValue="id"
                  filter
                  showClear
                  appendTo={getBody}
                  className="w-full"
                  placeholder={i18nT("static.1xwuo87")}
                  onChange={(event) =>
                    updateForm("formula_id", event.value as number | null)
                  }
                />
                <small className="text-slate-500">
                  {i18nT("static.10cebxk")}{" "}
                </small>
              </Field>
            )}
            <Field label={i18nT("static.4if2iw")}>
              <InputText
                value={form.calculation_display}
                maxLength={100}
                className="w-full"
                placeholder={i18nT("static.1q2x43d")}
                onChange={(event) =>
                  updateForm("calculation_display", event.target.value)
                }
              />
            </Field>
            {isWorkingPeriod && (
              <div className="flex flex-col gap-3 sm:col-span-2">
                <div>
                  <p className="m-0 text-sm font-semibold text-slate-800">
                    {i18nT("static.fof64j")}{" "}
                  </p>
                  <p className="m-0 mt-1 text-xs leading-5 text-slate-600">
                    {i18nT("static.1l5x89m")}{" "}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {form.working_period_tiers.map((tier, index) => (
                    <div
                      key={`${index}-${tier.minimum_months}`}
                      className="grid grid-cols-1 items-end gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <Field label={i18nT("static.g5qlua")} required>
                        <InputNumber
                          value={tier.minimum_months}
                          min={0}
                          maxFractionDigits={0}
                          useGrouping={false}
                          className="w-full"
                          onValueChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              working_period_tiers:
                                current.working_period_tiers.map(
                                  (currentTier, currentIndex) =>
                                    currentIndex === index
                                      ? {
                                          ...currentTier,
                                          minimum_months: event.value ?? 0,
                                        }
                                      : currentTier,
                                ),
                            }))
                          }
                        />
                      </Field>
                      <Field
                        label={
                          index === form.working_period_tiers.length - 1
                            ? i18nT("static.x3qc69")
                            : i18nT("static.1cxy1ho")
                        }
                        required={
                          index !== form.working_period_tiers.length - 1
                        }
                      >
                        <InputNumber
                          value={tier.maximum_months}
                          min={tier.minimum_months}
                          maxFractionDigits={0}
                          useGrouping={false}
                          className="w-full"
                          onValueChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              working_period_tiers:
                                current.working_period_tiers.map(
                                  (currentTier, currentIndex) =>
                                    currentIndex === index
                                      ? {
                                          ...currentTier,
                                          maximum_months: event.value ?? null,
                                        }
                                      : currentTier,
                                ),
                            }))
                          }
                        />
                      </Field>
                      <Field label={i18nT("static.wa149h")} required>
                        <InputNumber
                          value={tier.percentage}
                          min={0}
                          max={100}
                          minFractionDigits={2}
                          maxFractionDigits={6}
                          suffix=" %"
                          className="w-full"
                          onValueChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              working_period_tiers:
                                current.working_period_tiers.map(
                                  (currentTier, currentIndex) =>
                                    currentIndex === index
                                      ? {
                                          ...currentTier,
                                          percentage: event.value ?? 0,
                                        }
                                      : currentTier,
                                ),
                            }))
                          }
                        />
                      </Field>
                      <Button
                        type="button"
                        icon="pi pi-trash"
                        severity="danger"
                        outlined
                        aria-label={i18nT("static.jzkt10")}
                        disabled={form.working_period_tiers.length === 1}
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            working_period_tiers:
                              current.working_period_tiers.filter(
                                (_, currentIndex) => currentIndex !== index,
                              ),
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  label={i18nT("static.1672au8")}
                  icon="pi pi-plus"
                  outlined
                  className="w-full sm:w-fit"
                  onClick={() =>
                    setForm((current) => {
                      const tiers = current.working_period_tiers.map(
                        (tier) => ({
                          ...tier,
                        }),
                      );
                      const last = tiers[tiers.length - 1];
                      const nextMinimum =
                        last?.maximum_months !== null &&
                        last?.maximum_months !== undefined
                          ? last.maximum_months + 1
                          : (last?.minimum_months ?? -1) + 1;
                      if (last && last.maximum_months === null) {
                        last.maximum_months = nextMinimum - 1;
                      }
                      return {
                        ...current,
                        working_period_tiers: [
                          ...tiers,
                          {
                            minimum_months: nextMinimum,
                            maximum_months: null,
                            percentage: 0,
                          },
                        ],
                      };
                    })
                  }
                />
              </div>
            )}
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
                {i18nT("static.1q8sxw9")}{" "}
              </label>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
              <label
                htmlFor={`${kind}-active`}
                className="cursor-pointer text-sm font-medium text-slate-700"
              >
                {i18nT("static.8qzyhb")}{" "}
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
                  {i18nT("static.frzx9y")}{" "}
                </p>
                <p className="m-0 mt-1 text-xs leading-5 text-slate-600">
                  {i18nT("static.6qmtok")}{" "}
                </p>
              </div>
              {selectedCategory ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <Tag
                    value={
                      selectedCategoryIsFixed
                        ? i18nT("static.h66zc7")
                        : i18nT("static.ye709x")
                    }
                    severity={selectedCategoryIsFixed ? "info" : "secondary"}
                  />
                  {selectedCategoryIsFixed &&
                    selectedCategory.include_in_bpjs_health && (
                      <Tag value={i18nT("static.fkawu2")} severity="success" />
                    )}
                  {selectedCategoryIsFixed &&
                    selectedCategory.include_in_bpjs_employment && (
                      <Tag value={i18nT("static.13ljj7q")} severity="success" />
                    )}
                  {(!selectedCategoryIsFixed ||
                    (!selectedCategory.include_in_bpjs_health &&
                      !selectedCategory.include_in_bpjs_employment)) && (
                    <Tag value={i18nT("static.1iijn1f")} severity="secondary" />
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-500">
                  {i18nT("static.fi7wrw")}{" "}
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
