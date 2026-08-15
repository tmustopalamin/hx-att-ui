"use client";

import { useState, type ReactNode } from "react";
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

type BankForm = NewEmployeeBankAccount & { id?: number; row_version?: number };

const emptyForm = (): BankForm => ({
  bank_id: 0,
  account_number: "",
  account_holder_name: "",
  is_primary: true,
  is_active: true,
});

export default function EmployeeBankAccountPanel() {
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
  const [form, setForm] = useState<BankForm>(emptyForm);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [formTouched, setFormTouched] = useState(false);
  const { confirmDiscard } = useDirtyFormGuard(visible && formTouched, !saving);

  const notify = (severity: "success" | "error", detail: string) =>
    dispatch(
      showToast({
        visible: true,
        severity,
        summary: severity === "success" ? "Success" : "Error",
        detail,
      }),
    );
  const message = (error: unknown) =>
    typeof error === "object" && error !== null && "message" in error
      ? String((error as ResponseTypeError).message)
      : "Unexpected error.";

  const openNew = () => {
    setForm(emptyForm());
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
  const save = async () => {
    try {
      setSaving(true);
      if (form.id) {
        const payload: UpdateEmployeeBankAccount = {
          bank_id: form.bank_id,
          account_holder_name: form.account_holder_name,
          is_primary: form.is_primary,
          is_active: form.is_active,
          ...(form.account_number.trim()
            ? { account_number: form.account_number }
            : {}),
        };
        await updateEmployeeBankAccount(
          employeeId,
          form.id,
          form.row_version ?? -1,
          payload,
        );
        notify("success", "Bank account updated.");
      } else {
        await createEmployeeBankAccount(employeeId, form);
        notify("success", "Bank account added.");
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
      action: "Remove bank account",
      target: account.account_number_masked,
      severity: "danger",
      confirmLabel: "Remove",
      confirmIcon: "pi pi-trash",
      description: "Remove this payroll bank account?",
      onAccept: async () => {
        setDeletingId(account.id);
        try {
          await deletePayrollProfileItem(
            employeeId,
            "bank-accounts",
            account.id,
            account.row_version,
          );
          notify("success", "Bank account removed.");
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
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800">
              Bank Accounts
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Manage active payroll settlement accounts. Account numbers are
              encrypted and only shown masked.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              size="small"
              loading={isValidating}
              onClick={() => void mutate()}
            />
            {canCreate && (
              <Button
                label="Add Bank Account"
                icon="pi pi-plus"
                size="small"
                onClick={openNew}
              />
            )}
          </div>
        </div>
        <DataTable
          value={data?.bank_accounts ?? []}
          loading={isLoading}
          stripedRows
          paginator
          rows={10}
          emptyMessage="No bank account has been added."
        >
          <Column
            field="bank_name"
            header="Bank"
            body={(row: EmployeeBankAccount) => (
              <span>
                {row.bank_code
                  ? `${row.bank_name} (${row.bank_code})`
                  : row.bank_name}
              </span>
            )}
          />
          <Column field="account_number_masked" header="Account Number" />
          <Column field="account_holder_name" header="Account Holder" />
          <Column
            header="Primary"
            body={(row: EmployeeBankAccount) => (
              <Tag
                value={row.is_primary ? "Primary" : "Secondary"}
                severity={row.is_primary ? "success" : "secondary"}
              />
            )}
          />
          <Column
            header="Status"
            body={(row: EmployeeBankAccount) => (
              <Tag
                value={row.is_active ? "Active" : "Inactive"}
                severity={row.is_active ? "success" : "secondary"}
              />
            )}
          />
          {(canUpdate || canDelete) && (
            <Column
              header="Action"
              body={(row: EmployeeBankAccount) => (
                <div className="flex gap-1">
                  {canUpdate && (
                    <Button
                      icon="pi pi-pencil"
                      text
                      rounded
                      severity="secondary"
                      aria-label="Edit bank account"
                      onClick={() => openEdit(row)}
                    />
                  )}
                  {canDelete && (
                    <Button
                      icon="pi pi-trash"
                      text
                      rounded
                      severity="danger"
                      aria-label="Remove bank account"
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
        header={form.id ? "Edit Bank Account" : "Add Bank Account"}
        visible={visible}
        onHide={closeForm}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "38rem" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              text
              severity="secondary"
              disabled={saving}
              onClick={closeForm}
            />
            <Button
              label={form.id ? "Save Changes" : "Add Account"}
              icon="pi pi-check"
              loading={saving}
              onClick={() => void save()}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label="Bank *">
            <Dropdown
              value={form.bank_id || null}
              options={data?.bank_options ?? []}
              optionLabel="name"
              optionValue="id"
              filter
              showClear
              placeholder="Select bank"
              className="w-full"
              onChange={(event) => {
                setFormTouched(true);
                setForm((value) => ({
                  ...value,
                  bank_id: Number(event.value) || 0,
                }));
              }}
            />
          </Field>
          <Field label={form.id ? "New Account Number" : "Account Number *"}>
            <InputText
              value={form.account_number}
              inputMode="numeric"
              autoComplete="off"
              className="w-full"
              placeholder={
                form.id ? "Leave empty to keep current number" : "Digits only"
              }
              onChange={(event) => {
                setFormTouched(true);
                setForm((value) => ({
                  ...value,
                  account_number: event.target.value,
                }));
              }}
            />
          </Field>
          <Field label="Account Holder *">
            <InputText
              value={form.account_holder_name}
              className="w-full"
              onChange={(event) => {
                setFormTouched(true);
                setForm((value) => ({
                  ...value,
                  account_holder_name: event.target.value,
                }));
              }}
            />
          </Field>
          <div className="flex items-end gap-6 pb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <InputSwitch
                checked={form.is_active}
                onChange={(event) => {
                  setFormTouched(true);
                  setForm((value) => ({
                    ...value,
                    is_active: Boolean(event.value),
                    is_primary: event.value ? value.is_primary : false,
                  }));
                }}
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <InputSwitch
                checked={form.is_primary}
                disabled={!form.is_active}
                onChange={(event) => {
                  setFormTouched(true);
                  setForm((value) => ({
                    ...value,
                    is_primary: Boolean(event.value),
                  }));
                }}
              />
              Primary
            </label>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
