"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import {
  createEmployeeBankAccount,
  deletePayrollProfileItem,
  updateEmployeeBankAccount,
} from "@/app/services/employee-payroll-profile-service";
import type { EmployeePersonalData } from "@/app/types/employee-general";
import type {
  EmployeeBankAccount,
  EmployeePayrollProfile,
  NewEmployeeBankAccount,
  UpdateEmployeeBankAccount,
} from "@/app/types/employee-payroll-profile";
import type { ResponseTypeError } from "@/app/types/response-type";
import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { useDirtyFormGuard } from "@/app/_components/useDirtyFormGuard";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";

type BankForm = NewEmployeeBankAccount & { id?: number; row_version?: number };

type BankFormErrors = {
  bank_id?: string;
  account_number?: string;
  account_holder_name?: string;
};

const emptyForm = (): BankForm => ({
  bank_id: 0,
  account_number: "",
  account_holder_name: "",
  is_primary: true,
  is_active: true,
});

export default function EmployeeBankAccountPanel() {
  const { t: i18nT } = useI18n();
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canCreate = permissions.includes("payroll.create");
  const canUpdate = permissions.includes("payroll.update");
  const canDelete = permissions.includes("payroll.delete");
  const key =
    Number.isSafeInteger(employeeId) && employeeId > 0
      ? `/api/employees/${employeeId}/payroll-profile`
      : null;
  const { data, isLoading, isValidating, mutate } =
    useSWR<EmployeePayrollProfile>(key, fetcher);
  const { data: employeeData, isLoading: employeeIsLoading } =
    useSWR<EmployeePersonalData>(
      Number.isSafeInteger(employeeId) && employeeId > 0
        ? `/api/employees/${employeeId}/personal-data`
        : null,
      fetcher,
    );
  const employeeFullName = useMemo(() => {
    if (!employeeData) return "";
    return [
      employeeData.first_name,
      employeeData.middle_name,
      employeeData.last_name,
    ]
      .filter(Boolean)
      .join(" ");
  }, [employeeData]);
  const [form, setForm] = useState<BankForm>(emptyForm);
  const selectedBank = useMemo(
    () => data?.bank_options?.find((b) => b.id === form.bank_id) ?? null,
    [data?.bank_options, form.bank_id],
  );
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formTouched, setFormTouched] = useState(false);
  const [formErrors, setFormErrors] = useState<BankFormErrors>({});
  const { confirmDiscard } = useDirtyFormGuard(visible && formTouched, !saving);

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
  const message = (error: unknown) =>
    typeof error === "object" && error !== null && "message" in error
      ? String((error as ResponseTypeError).message)
      : "Unexpected error.";

  const openNew = () => {
    setForm(emptyForm());
    setFormErrors({});
    setFormTouched(false);
    setVisible(true);
  };
  const openEdit = (account: EmployeeBankAccount) => {
    setForm({
      id: account.id,
      row_version: account.row_version,
      bank_id: account.bank_id,
      account_number: "",
      account_holder_name: account.account_holder_name,
      is_primary: account.is_primary,
      is_active: account.is_active,
    });
    setFormErrors({});
    setFormTouched(false);
    setVisible(true);
  };
  const closeForm = () => {
    if (saving) return;
    if (!formTouched) {
      setVisible(false);
      return;
    }
    void confirmDiscard().then((discard) => {
      if (discard) setVisible(false);
    });
  };

  const validateForm = () => {
    const errors: BankFormErrors = {};
    const accountNumber = form.account_number.trim();
    const accountHolderName = form.account_holder_name.trim();

    if (!form.bank_id) {
      errors.bank_id = "Select a bank.";
    }

    if (!form.id && !accountNumber) {
      errors.account_number = "Account number is required.";
    } else if (accountNumber) {
      if (!/^\d+$/.test(accountNumber)) {
        errors.account_number = "Use digits only.";
      } else if (accountNumber.length < 4 || accountNumber.length > 50) {
        errors.account_number = "Use 4 to 50 digits.";
      }
    }

    if (!accountHolderName) {
      errors.account_holder_name = "Account holder is required.";
    } else if (accountHolderName.length > 100) {
      errors.account_holder_name =
        "Account holder cannot exceed 100 characters.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const save = async () => {
    if (saving || !validateForm()) return;

    const accountNumber = form.account_number.trim();
    const accountHolderName = form.account_holder_name.trim();

    try {
      setSaving(true);
      if (form.id) {
        const payload: UpdateEmployeeBankAccount = {
          bank_id: form.bank_id,
          account_holder_name: accountHolderName,
          is_primary: form.is_primary,
          is_active: form.is_active,
          ...(accountNumber ? { account_number: accountNumber } : {}),
        };
        await updateEmployeeBankAccount(
          employeeId,
          form.id,
          form.row_version ?? -1,
          payload,
        );
        notify("success", i18nT("static.rqikhz"));
      } else {
        const payload: NewEmployeeBankAccount = {
          bank_id: form.bank_id,
          account_number: accountNumber,
          account_holder_name: accountHolderName,
          is_primary: form.is_primary,
          is_active: form.is_active,
        };
        await createEmployeeBankAccount(employeeId, payload);
        notify("success", i18nT("static.1it6y4w"));
      }
      setFormTouched(false);
      setVisible(false);
      await mutate();
    } catch (error: unknown) {
      notify("error", message(error));
    } finally {
      setSaving(false);
    }
  };
  const remove = (account: EmployeeBankAccount) => {
    requestActionConfirmation({
      action: i18nT("static.99c55m"),
      target: account.account_number_masked,
      severity: "danger",
      confirmLabel: i18nT("static.9c35st"),
      confirmIcon: "pi pi-trash",
      description: i18nT("static.1nswnw8"),
      onAccept: async () => {
        setDeletingId(account.id);
        try {
          await deletePayrollProfileItem(
            employeeId,
            "bank-accounts",
            account.id,
            account.row_version,
          );
          notify("success", i18nT("static.trq4gq"));
          await mutate();
        } catch (error: unknown) {
          notify("error", message(error));
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <EmployeeDetailTableHeader
          title={i18nT("static.ezavjh")}
          description={i18nT("static.6fwwfy")}
          actions={
            <>
              <Button
                type="button"
                label={i18nT("static.28r6qc")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isValidating}
                disabled={isValidating}
                className="w-full sm:w-auto"
                onClick={() => void mutate()}
              />
              {canCreate && (
                <Button
                  type="button"
                  label={i18nT("static.4le62h")}
                  icon="pi pi-plus"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={openNew}
                />
              )}
            </>
          }
        />
        <DataTable
          value={data?.bank_accounts ?? []}
          dataKey="id"
          loading={isLoading}
          stripedRows
          rowHover
          paginator
          rows={10}
          rowsPerPageOptions={[5, 10, 25]}
          removableSort
          responsiveLayout="scroll"
          scrollable
          size="small"
          tableStyle={{ minWidth: "56rem" }}
          emptyMessage={i18nT("static.1ikpo61")}
          currentPageReportTemplate={i18nT("static.1kqh8lr")}
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        >
          <Column
            field="bank_name"
            header={i18nT("static.192q8xj")}
            sortable
            style={{ minWidth: "15rem" }}
            body={(row: EmployeeBankAccount) => (
              <span className="font-medium text-slate-800">
                {row.bank_code
                  ? i18nT("static.14r9r1n", {
                      p0: row.bank_name,
                      p1: row.bank_code,
                    })
                  : row.bank_name}
              </span>
            )}
          />
          <Column
            field="account_number_masked"
            header={i18nT("static.1aqdbdx")}
            sortable
            style={{ minWidth: "13rem" }}
          />
          <Column
            field="account_holder_name"
            header={i18nT("static.17ajpb6")}
            sortable
            style={{ minWidth: "15rem" }}
          />
          <Column
            header={i18nT("static.1jcui61")}
            style={{ minWidth: "9rem" }}
            body={(row: EmployeeBankAccount) => (
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
          />
          <Column
            header={i18nT("static.3pd73")}
            style={{ minWidth: "9rem" }}
            body={(row: EmployeeBankAccount) => (
              <Tag
                value={
                  row.is_active
                    ? i18nT("static.8qzyhb")
                    : i18nT("static.13zf5vc")
                }
                severity={row.is_active ? "success" : "secondary"}
                rounded
              />
            )}
          />
          {(canUpdate || canDelete) && (
            <Column
              header={i18nT("static.2wk0tb")}
              frozen
              alignFrozen="right"
              headerClassName="bg-white"
              bodyClassName="bg-white"
              headerStyle={{
                width: "8rem",
                minWidth: "8rem",
                textAlign: "right",
              }}
              bodyStyle={{
                width: "8rem",
                minWidth: "8rem",
              }}
              body={(row: EmployeeBankAccount) => (
                <div className="flex flex-nowrap items-center justify-end gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      icon="pi pi-pencil"
                      rounded
                      outlined
                      severity="secondary"
                      size="small"
                      tooltip={i18nT("static.1i1lcq9")}
                      aria-label={i18nT("static.14czhri")}
                      onClick={() => openEdit(row)}
                    />
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      icon="pi pi-trash"
                      rounded
                      outlined
                      severity="danger"
                      size="small"
                      tooltip={i18nT("static.9c35st")}
                      aria-label={i18nT("static.99c55m")}
                      loading={deletingId === row.id}
                      disabled={deletingId !== null}
                      onClick={() => remove(row)}
                    />
                  )}
                </div>
              )}
            />
          )}
        </DataTable>
      </div>
      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i
              className={`pi ${
                form.id
                  ? "pi-pencil text-amber-600"
                  : "pi-plus-circle text-blue-600"
              } text-lg`}
            />
            <span className="text-base font-semibold text-slate-800">
              {form.id ? i18nT("static.sx66rd") : i18nT("static.1o9mtgu")}
            </span>
          </div>
        }
        visible={visible}
        style={{ width: "95vw", maxWidth: "44rem" }}
        breakpoints={{ "640px": "95vw" }}
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
              onClick={closeForm}
            />
            <Button
              type="submit"
              form="employee-bank-account-form"
              label={form.id ? i18nT("static.6gmm1l") : i18nT("static.79psmr")}
              icon="pi pi-check"
              loading={saving}
              disabled={saving}
              className="w-full sm:w-auto"
            />
          </div>
        }
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!saving}
        closable={!saving}
        onHide={closeForm}
      >
        <form
          id="employee-bank-account-form"
          className="grid grid-cols-1 gap-5 pt-2 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {/* Employee Context Summary Card */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 sm:col-span-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <i className="pi pi-user text-base" />
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {i18nT("static.1fak8xt")}
                </span>
                <span className="truncate text-sm font-semibold text-slate-800">
                  {employeeFullName ||
                    (employeeIsLoading
                      ? i18nT("static.151p210")
                      : `Employee #${employeeId}`)}
                </span>
              </div>
            </div>
            <Tag
              severity="info"
              value={`ID: ${employeeId}`}
              rounded
              className="font-mono text-xs"
            />
          </div>

          <Field
            id="employee-bank-account-bank"
            label={i18nT("static.192q8xj")}
            required
            error={formErrors.bank_id}
            className="sm:col-span-2"
          >
            <Dropdown
              inputId="employee-bank-account-bank"
              value={form.bank_id || null}
              options={data?.bank_options ?? []}
              optionLabel="name"
              optionValue="id"
              filter
              showClear={false}
              placeholder={i18nT("static.nfjo79")}
              className={`w-full ${formErrors.bank_id ? "p-invalid" : ""}`}
              onChange={(event) => {
                setFormTouched(true);
                setFormErrors((current) => ({
                  ...current,
                  bank_id: undefined,
                }));
                setForm((value) => ({
                  ...value,
                  bank_id: Number(event.value) || 0,
                }));
              }}
            />
          </Field>

          {/* Selected Bank Information Card */}
          {selectedBank && (
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-slate-600 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <i className="pi pi-building text-blue-600" />
                  <span className="font-semibold text-slate-800">
                    {selectedBank.name}
                  </span>
                </div>
                {selectedBank.code && (
                  <Tag
                    value={selectedBank.code}
                    severity="secondary"
                    className="text-[11px]"
                  />
                )}
              </div>
            </div>
          )}

          <Field
            id="employee-bank-account-number"
            label={i18nT("static.1aqdbdx")}
            required={!form.id}
            hint={form.id ? i18nT("static.qunaqk") : i18nT("static.1xr57dq")}
            error={formErrors.account_number}
          >
            <InputText
              id="employee-bank-account-number"
              value={form.account_number}
              inputMode="numeric"
              autoComplete="off"
              className={`w-full ${formErrors.account_number ? "p-invalid" : ""}`}
              placeholder={
                form.id ? i18nT("static.1yfbac9") : i18nT("static.1bndnwf")
              }
              onChange={(event) => {
                setFormTouched(true);
                setFormErrors((current) => ({
                  ...current,
                  account_number: undefined,
                }));
                setForm((value) => ({
                  ...value,
                  account_number: event.target.value,
                }));
              }}
            />
          </Field>

          <Field
            id="employee-bank-account-holder"
            label={i18nT("static.17ajpb6")}
            required
            error={formErrors.account_holder_name}
          >
            <InputText
              id="employee-bank-account-holder"
              value={form.account_holder_name}
              autoComplete="off"
              className={`w-full ${formErrors.account_holder_name ? "p-invalid" : ""}`}
              onChange={(event) => {
                setFormTouched(true);
                setFormErrors((current) => ({
                  ...current,
                  account_holder_name: undefined,
                }));
                setForm((value) => ({
                  ...value,
                  account_holder_name: event.target.value,
                }));
              }}
            />
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2">
            <StatusOption
              inputId="employee-bank-account-active"
              label={i18nT("static.8qzyhb")}
              description={i18nT("static.5a4onp")}
              checked={form.is_active}
              onChange={(checked) => {
                setFormTouched(true);
                setForm((value) => ({
                  ...value,
                  is_active: checked,
                  is_primary: checked ? value.is_primary : false,
                }));
              }}
            />

            <StatusOption
              inputId="employee-bank-account-primary"
              label={i18nT("static.1izp2jy")}
              description={i18nT("static.mk1phm")}
              checked={form.is_primary}
              disabled={!form.is_active}
              onChange={(checked) => {
                setFormTouched(true);
                setForm((value) => ({
                  ...value,
                  is_primary: checked,
                }));
              }}
            />
          </div>
        </form>
      </Dialog>
    </Card>
  );
}

function Field({
  id,
  label,
  required = false,
  hint,
  error,
  children,
  className = "",
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error ? (
        <small className="p-error">{error}</small>
      ) : (
        hint && <small className="text-slate-500">{hint}</small>
      )}
    </div>
  );
}

function StatusOption({
  inputId,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  inputId: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <InputSwitch
        inputId={inputId}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(Boolean(event.value))}
      />
      <div className="min-w-0">
        <label
          htmlFor={inputId}
          className="cursor-pointer text-sm font-semibold text-slate-700"
        >
          {label}
        </label>
        <p className="m-0 mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}
