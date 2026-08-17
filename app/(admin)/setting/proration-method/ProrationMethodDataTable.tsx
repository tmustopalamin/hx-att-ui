"use client";

import { type ChangeEvent, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useSWR from "swr";
import { FilterMatchMode } from "primereact/api";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  createPayrollProrationMethod,
  deletePayrollProrationMethod,
  purgePayrollProrationMethod,
  restorePayrollProrationMethod,
  updatePayrollProrationMethod,
} from "@/app/services/payroll-proration-method-service";
import type {
  NewPayrollProrationMethod,
  PayrollProrationMethod,
} from "@/app/types/payroll-proration-method";
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
  `/api/payroll-proration-methods?show_all=${showDeleted}`;

const emptyForm = (): NewPayrollProrationMethod => ({
  name: "",
  description: "",
  fixed_divisor_days: 30,
  is_active: true,
});

const basisLabel = (row: PayrollProrationMethod) => {
  switch (row.basis_code) {
    case "SCHEDULED_DAYS":
      return "Scheduled working days";
    case "CALENDAR_DAYS":
      return "Calendar days";
    case "FIXED_DIVISOR":
      return `Fixed divisor${row.fixed_divisor_days ? ` (${row.fixed_divisor_days})` : ""}`;
    default:
      return "No proration";
  }
};

export default function ProrationMethodDataTable() {
  const dispatch = useDispatch();
  const profile = useSelector((state: RootState) => state.profile);
  const archivedAccess = useArchivedDataAccess("payroll-config");
  const canManage = profile.permissions.includes("payroll-config.manage");
  const [showDeleted, setShowDeleted] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    global: { value: "", matchMode: FilterMatchMode.CONTAINS },
  });
  const [selected, setSelected] = useState<PayrollProrationMethod | null>(null);
  const [form, setForm] = useState<NewPayrollProrationMethod>(emptyForm);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const currentUrl = listUrl(archivedAccess.canShowDeleted && showDeleted);
  const { data, error, isLoading, isValidating, mutate } = useSWR<
    PayrollProrationMethod[]
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
    setForm(emptyForm());
  };

  const openNew = () => {
    setSelected(null);
    setForm(emptyForm());
    setDialogVisible(true);
  };

  const openEdit = (row: PayrollProrationMethod) => {
    setSelected(row);
    setForm({
      name: row.name,
      description: row.description,
      fixed_divisor_days: row.fixed_divisor_days ?? 30,
      is_active: row.is_active,
    });
    setDialogVisible(true);
  };

  const updateForm = <K extends keyof NewPayrollProrationMethod>(
    key: K,
    value: NewPayrollProrationMethod[K],
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    const name = form.name.trim();
    const description = form.description.trim();
    if (!name || !description) {
      notify("error", "Name and description are required.");
      return;
    }
    if (
      !selected &&
      (!Number.isInteger(form.fixed_divisor_days) ||
        form.fixed_divisor_days < 1 ||
        form.fixed_divisor_days > 366)
    ) {
      notify("error", "Fixed divisor must be a whole number from 1 to 366.");
      return;
    }
    try {
      setSaving(true);
      if (selected) {
        await updatePayrollProrationMethod(selected.id, selected.row_version, {
          name,
          description,
          is_active: form.is_active,
        });
      } else {
        await createPayrollProrationMethod({
          name,
          description,
          fixed_divisor_days: form.fixed_divisor_days,
          is_active: form.is_active,
        });
      }
      await mutate();
      closeDialog();
      notify("success", "Proration method saved successfully.");
    } catch (requestError: unknown) {
      showError(requestError);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: PayrollProrationMethod) => {
    try {
      await deletePayrollProrationMethod(row.id, row.row_version);
      await mutate();
      notify("success", "Proration method retired successfully.");
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };

  const restore = async (row: PayrollProrationMethod) => {
    try {
      await restorePayrollProrationMethod(row.id, row.row_version);
      await mutate();
      notify("success", "Proration method restored successfully.");
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };

  const purge = async (row: PayrollProrationMethod) => {
    try {
      await purgePayrollProrationMethod(row.id);
      await mutate();
      notify("success", "Proration method permanently deleted.");
    } catch (requestError: unknown) {
      showError(requestError);
    }
  };

  const ask = (
    row: PayrollProrationMethod,
    action: "delete" | "restore" | "purge",
  ) => {
    const label =
      action === "delete"
        ? "Retire"
        : action === "restore"
          ? "Restore"
          : "Delete Permanently";
    requestActionConfirmation({
      header: `${label} Proration Method`,
      message: (
        <div className="flex flex-col gap-1">
          <span className="text-slate-600">
            {action === "purge"
              ? "This action cannot be undone."
              : action === "delete"
                ? "It cannot be selected for new payroll settings."
                : "It will be available for payroll settings again."}
          </span>
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

  const status = (row: PayrollProrationMethod) => {
    if (row.deleted_at)
      return <Tag value="Deleted" severity="secondary" rounded />;
    return row.is_active ? (
      <Tag value="Active" severity="success" rounded />
    ) : (
      <Tag value="Inactive" severity="warning" rounded />
    );
  };

  const actions = (row: PayrollProrationMethod) => {
    if (!canManage) return <span className="text-sm text-slate-400">—</span>;
    if (row.deleted_at) {
      return (
        <div className="flex justify-end gap-2">
          {archivedAccess.canRestore && !row.is_system && (
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
          {archivedAccess.canPurge && !row.is_system && (
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
        {!row.is_system && (
          <Button
            type="button"
            icon="pi pi-trash"
            rounded
            outlined
            severity="danger"
            size="small"
            tooltip="Retire"
            tooltipOptions={{ appendTo: getBody, position: "top" }}
            onClick={() => ask(row, "delete")}
          />
        )}
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
                  Proration Method
                </h1>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Manage controlled payroll proration methods and the
                  explanation shown to HR.
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
                  label="New Fixed Divisor"
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
                  inputId="proration-show-deleted"
                  checked={showDeleted}
                  onChange={(event) => setShowDeleted(Boolean(event.checked))}
                />
                <label
                  htmlFor="proration-show-deleted"
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
                placeholder="Search code, name, or description"
                className="w-full"
              />
            </IconField>
          </div>
          <DataTable
            value={data ?? []}
            dataKey="id"
            filters={filters}
            globalFilterFields={["code", "name", "description", "basis_code"]}
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
            tableStyle={{ minWidth: "72rem" }}
            emptyMessage="No proration method found."
          >
            <Column
              field="code"
              header="Code"
              sortable
              body={(row: PayrollProrationMethod) => (
                <span className="font-mono text-xs font-semibold text-slate-700">
                  {row.code}
                </span>
              )}
            />
            <Column field="name" header="Name" sortable />
            <Column
              header="Basis"
              body={(row: PayrollProrationMethod) => basisLabel(row)}
            />
            <Column
              header="Explanation"
              body={(row: PayrollProrationMethod) => (
                <span className="block max-w-xl whitespace-normal text-sm text-slate-600">
                  {row.description}
                </span>
              )}
            />
            <Column header="Status" body={status} />
            <Column
              header="Managed"
              body={(row: PayrollProrationMethod) =>
                row.is_system ? (
                  <Tag value="System" severity="info" rounded />
                ) : (
                  <span className="text-sm text-slate-500">Custom</span>
                )
              }
            />
            {canManage && (
              <Column
                header="Action"
                frozen
                alignFrozen="right"
                body={actions}
              />
            )}
          </DataTable>
          <p className="m-0 text-xs leading-5 text-slate-500">
            System methods provide the supported algorithms. Custom entries are
            fixed-divisor variants only; they cannot introduce a new calculation
            algorithm.
          </p>
        </div>
      </Card>

      <Dialog
        header={selected ? "Edit Proration Method" : "New Fixed Divisor"}
        visible={dialogVisible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "38rem" }}
        onHide={closeDialog}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              disabled={saving}
              onClick={closeDialog}
            />
            <Button
              label="Save Method"
              icon="pi pi-check"
              loading={saving}
              onClick={() => void submit()}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4 pt-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">Name *</span>
            <InputText
              value={form.name}
              autoFocus
              className="w-full"
              onChange={(event) => updateForm("name", event.target.value)}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Explanation *
            </span>
            <InputTextarea
              value={form.description}
              rows={4}
              autoResize
              className="w-full"
              onChange={(event) =>
                updateForm("description", event.target.value)
              }
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700">
              Fixed Divisor Days *
            </span>
            <InputText
              type="number"
              value={String(form.fixed_divisor_days)}
              disabled={selected !== null}
              min={1}
              max={366}
              className="w-full"
              onChange={(event) =>
                updateForm("fixed_divisor_days", Number(event.target.value))
              }
            />
            {selected && (
              <span className="text-xs text-slate-500">
                The method code and divisor are immutable after creation.
              </span>
            )}
          </label>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-sm font-medium text-slate-700">Active</span>
            <InputSwitch
              checked={form.is_active}
              onChange={(event) =>
                updateForm("is_active", Boolean(event.value))
              }
            />
          </div>
          {selected?.is_system && (
            <p className="m-0 text-xs leading-5 text-blue-700">
              This is a system-managed algorithm. Its code, basis, and divisor
              cannot be changed.
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
