"use client";

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
  { label: "Earning", value: "EARNING" },
  { label: "Deduction", value: "DEDUCTION" },
  { label: "Employer Contribution", value: "EMPLOYER_CONTRIBUTION" },
];
const emptyPayload = (): ComponentCategoryPayload => ({
  code: "",
  name: "",
  description: null,
  display_order: 0,
  category_type: "EARNING",
  is_active: true,
});

export default function ComponentCategoryDataTable() {
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
      notify("error", "Code, name, and component type are required.");
      return;
    }
    if (!/^[A-Z0-9_]+$/.test(code)) {
      notify(
        "error",
        "Code may contain only uppercase letters, numbers, and underscores.",
      );
      return;
    }

    try {
      setSaving(true);
      const payload: ComponentCategoryPayload = {
        ...form,
        code,
        name,
        description: form.description?.trim() || null,
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
      notify("success", "Component category saved successfully.");
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
      notify("success", "Component category deleted successfully.");
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const restore = async (row: ComponentCategory) => {
    try {
      await restoreComponentCategory(row.id, row.row_version);
      await mutate();
      notify("success", "Component category restored successfully.");
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };
  const purge = async (row: ComponentCategory) => {
    try {
      await purgeComponentCategory(row.id);
      await mutate();
      notify("success", "Component category permanently deleted.");
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
      header: `${label} Component Category`,
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
  const actions = (row: ComponentCategory) => {
    if (!canManage)
      return <span className="text-sm text-slate-400">No action</span>;
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
                  Component Category
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Classify earnings, deductions, and employer contributions for
                  payroll and payslip reporting.
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
                  label="New Component Category"
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
                  Show deleted records
                </label>
              </div>
            )}
            <IconField iconPosition="left" className="w-full md:w-80">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search}
                onChange={onSearch}
                placeholder="Search code, name, or type"
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
              emptyMessage="No component category found."
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
                body={(row: ComponentCategory) => (
                  <span className="font-mono text-sm font-semibold text-slate-700">
                    {row.code ?? "-"}
                  </span>
                )}
                style={{ minWidth: "12rem" }}
              />
              <Column
                field="name"
                header="Category Name"
                sortable
                body={(row: ComponentCategory) => (
                  <span className="font-medium text-slate-800">{row.name}</span>
                )}
                style={{ minWidth: "15rem" }}
              />
              <Column
                field="category_type"
                header="Type"
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
                header="Order"
                sortable
                style={{ minWidth: "7rem" }}
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
        header={selected ? "Edit Component Category" : "New Component Category"}
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
              form="component-category-form"
              label={selected ? "Save Changes" : "Create Component Category"}
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
            <Field label="Code" required>
              <InputText
                value={form.code ?? ""}
                maxLength={50}
                autoComplete="off"
                className="w-full"
                placeholder="e.g. FIXED_ALLOWANCE"
                onChange={(event) => updateForm("code", event.target.value)}
              />
              <small className="text-slate-500">
                Uppercase letters, numbers, and underscores only.
              </small>
            </Field>
            <Field label="Name" required>
              <InputText
                value={form.name}
                maxLength={100}
                autoComplete="off"
                className="w-full"
                placeholder="e.g. Fixed Allowance"
                onChange={(event) => updateForm("name", event.target.value)}
              />
            </Field>
            <Field label="Component Type" required>
              <Dropdown
                value={form.category_type}
                options={categoryTypeOptions}
                optionLabel="label"
                optionValue="value"
                appendTo={getBody}
                disabled={Boolean(selected)}
                className="w-full"
                onChange={(event) =>
                  updateForm("category_type", event.value as string)
                }
              />
              {selected && (
                <small className="text-slate-500">
                  The type cannot change after a category is created.
                </small>
              )}
            </Field>
            <Field label="Display Order" required>
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
                Lower numbers are shown first.
              </small>
            </Field>
          </div>
          <Field label="Description">
            <InputTextarea
              value={form.description ?? ""}
              rows={3}
              autoResize
              maxLength={500}
              className="w-full"
              placeholder="Optional description"
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <label
              htmlFor="category-active"
              className="cursor-pointer text-sm font-medium text-slate-700"
            >
              Active
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
