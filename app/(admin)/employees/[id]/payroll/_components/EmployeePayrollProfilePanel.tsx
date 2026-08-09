"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import {
  createSalaryHistory,
  createStatutoryEnrollment,
  createStatutoryWage,
  createTaxProfile,
} from "@/app/services/employee-payroll-profile-service";
import type {
  EmployeePayrollProfile,
  NewSalaryHistory,
  NewStatutoryEnrollment,
  NewStatutoryWage,
  NewTaxProfile,
} from "@/app/types/employee-payroll-profile";
import type { PayrollSetting } from "@/app/types/payroll-configuration";
import type { ResponseTypeError } from "@/app/types/response-type";
import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";

type Mode = "bpjs" | "tax" | "salary";
const ENROLLMENT: NewStatutoryEnrollment = {
  statutory_program_id: 0,
  participant_number: null,
  enrollment_status: "ACTIVE",
  effective_from: "",
  effective_to: null,
  bpjs_risk_class_id: null,
  company_registration_number: null,
  notes: null,
};
const WAGE: NewStatutoryWage = {
  program_group: "ALL",
  wage_amount: "0",
  effective_from: "",
  effective_to: null,
  source: "MANUAL",
  notes: null,
};
const TAX: NewTaxProfile = {
  nik: null,
  npwp: null,
  ptkp_code: "TK/0",
  ter_category: "A",
  tax_residency: "RESIDENT",
  tax_method: "GROSS",
  employee_tax_type: "PERMANENT",
  effective_from: "",
  effective_to: null,
  previous_employer_gross: "0",
  previous_employer_tax: "0",
  previous_employer_net: "0",
  notes: null,
};
const SALARY: NewSalaryHistory = {
  base_salary: "0",
  currency_code: "IDR",
  payroll_setting_id: null,
  effective_from: "",
  effective_to: null,
  change_reason: null,
  status: "ACTIVE",
};

export default function EmployeePayrollProfilePanel({ mode }: { mode: Mode }) {
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const dispatch = useDispatch();
  const canCreate = useSelector((state: RootState) =>
    state.profile.permissions.includes("payroll.create"),
  );
  const key = Number.isFinite(employeeId)
    ? `/api/employees/${employeeId}/payroll-profile`
    : null;
  const { data, isLoading, isValidating, mutate } =
    useSWR<EmployeePayrollProfile>(key, fetcher);
  const { data: settings } = useSWR<PayrollSetting[]>(
    mode === "salary" ? "/api/payroll-settings" : null,
    fetcher,
  );
  const [dialog, setDialog] = useState<"primary" | "wage" | null>(null);
  const [saving, setSaving] = useState(false);
  const [enrollment, setEnrollment] = useState(ENROLLMENT);
  const [wage, setWage] = useState(WAGE);
  const [tax, setTax] = useState(TAX);
  const [salary, setSalary] = useState(SALARY);

  const notify = (severity: "success" | "error", detail: string) =>
    dispatch(
      showToast({
        visible: true,
        severity,
        summary: severity === "success" ? "Success" : "Error",
        detail,
      }),
    );
  const fail = (error: unknown) =>
    notify(
      "error",
      typeof error === "object" && error !== null && "message" in error
        ? String((error as ResponseTypeError).message)
        : "Unexpected error.",
    );
  const run = async (action: () => Promise<unknown>, message: string) => {
    try {
      setSaving(true);
      await action();
      await mutate();
      setDialog(null);
      notify("success", message);
    } catch (error: unknown) {
      fail(error);
    } finally {
      setSaving(false);
    }
  };

  const title =
    mode === "bpjs"
      ? "BPJS & Statutory"
      : mode === "tax"
        ? "Tax Profile"
        : "Salary History";
  const description =
    mode === "bpjs"
      ? "Manage program enrollment and effective statutory wage history."
      : mode === "tax"
        ? "Manage effective-dated PPh 21 identity and treatment."
        : "Manage effective-dated base salary without overwriting payroll history.";

  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800">
              {title}
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">{description}</p>
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
            {canCreate && mode === "bpjs" && (
              <Button
                label="New Wage"
                icon="pi pi-money-bill"
                severity="secondary"
                outlined
                size="small"
                onClick={() => setDialog("wage")}
              />
            )}
            {canCreate && (
              <Button
                label={
                  mode === "bpjs"
                    ? "New Enrollment"
                    : mode === "tax"
                      ? "New Tax Profile"
                      : "New Salary"
                }
                icon="pi pi-plus"
                size="small"
                onClick={() => setDialog("primary")}
              />
            )}
          </div>
        </div>
        {mode === "bpjs" && (
          <>
            <DataTable
              value={data?.enrollments ?? []}
              loading={isLoading}
              size="small"
              stripedRows
              paginator
              rows={10}
            >
              <Column field="program_code" header="Program" />
              <Column field="participant_number" header="Participant No." />
              <Column
                field="enrollment_status"
                header="Status"
                body={(row) => (
                  <Tag
                    value={row.enrollment_status}
                    severity={
                      row.enrollment_status === "ACTIVE"
                        ? "success"
                        : "secondary"
                    }
                  />
                )}
              />
              <Column field="risk_class_code" header="Risk Class" />
              <Column field="effective_from" header="Effective From" />
              <Column
                field="effective_to"
                header="Effective To"
                body={(row) => row.effective_to ?? "Open ended"}
              />
            </DataTable>
            <h2 className="text-base font-semibold text-slate-800">
              Statutory Wage History
            </h2>
            <DataTable
              value={data?.statutory_wages ?? []}
              loading={isLoading}
              size="small"
              stripedRows
            >
              <Column field="program_group" header="Group" />
              <Column field="wage_amount" header="Wage" />
              <Column field="source" header="Source" />
              <Column field="effective_from" header="Effective From" />
              <Column
                field="effective_to"
                header="Effective To"
                body={(row) => row.effective_to ?? "Open ended"}
              />
            </DataTable>
          </>
        )}
        {mode === "tax" && (
          <DataTable
            value={data?.tax_profiles ?? []}
            loading={isLoading}
            size="small"
            stripedRows
            paginator
            rows={10}
          >
            <Column field="nik_masked" header="NIK" />
            <Column field="npwp_masked" header="NPWP" />
            <Column field="ptkp_code" header="PTKP" />
            <Column field="ter_category" header="TER" />
            <Column field="tax_method" header="Method" />
            <Column field="employee_tax_type" header="Employee Type" />
            <Column field="effective_from" header="Effective From" />
            <Column
              field="effective_to"
              header="Effective To"
              body={(row) => row.effective_to ?? "Open ended"}
            />
          </DataTable>
        )}
        {mode === "salary" && (
          <DataTable
            value={data?.salary_history ?? []}
            loading={isLoading}
            size="small"
            stripedRows
            paginator
            rows={10}
          >
            <Column field="base_salary" header="Base Salary" />
            <Column field="currency_code" header="Currency" />
            <Column field="payroll_setting_name" header="Payroll Setting" />
            <Column
              field="status"
              header="Status"
              body={(row) => (
                <Tag
                  value={row.status}
                  severity={row.status === "ACTIVE" ? "success" : "secondary"}
                />
              )}
            />
            <Column field="effective_from" header="Effective From" />
            <Column
              field="effective_to"
              header="Effective To"
              body={(row) => row.effective_to ?? "Open ended"}
            />
            <Column field="change_reason" header="Reason" />
          </DataTable>
        )}
      </div>
      <Dialog
        header={
          dialog === "wage"
            ? "New Statutory Wage"
            : mode === "bpjs"
              ? "New Enrollment"
              : mode === "tax"
                ? "New Tax Profile"
                : "New Salary History"
        }
        visible={dialog !== null}
        onHide={() => setDialog(null)}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "46rem" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              disabled={saving}
              onClick={() => setDialog(null)}
            />
            <Button
              label="Create History"
              icon="pi pi-check"
              loading={saving}
              onClick={() => {
                if (dialog === "wage")
                  void run(
                    () => createStatutoryWage(employeeId, wage),
                    "Statutory wage created.",
                  );
                else if (mode === "bpjs")
                  void run(
                    () => createStatutoryEnrollment(employeeId, enrollment),
                    "Enrollment created.",
                  );
                else if (mode === "tax")
                  void run(
                    () => createTaxProfile(employeeId, tax),
                    "Tax profile created.",
                  );
                else
                  void run(
                    () => createSalaryHistory(employeeId, salary),
                    "Salary history created.",
                  );
              }}
            />
          </div>
        }
      >
        {dialog === "wage" ? (
          <WageForm value={wage} change={setWage} profile={data} />
        ) : mode === "bpjs" ? (
          <EnrollmentForm
            value={enrollment}
            change={setEnrollment}
            profile={data}
          />
        ) : mode === "tax" ? (
          <TaxForm value={tax} change={setTax} />
        ) : (
          <SalaryForm
            value={salary}
            change={setSalary}
            settings={settings ?? []}
          />
        )}
      </Dialog>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
function EnrollmentForm({
  value,
  change,
  profile,
}: {
  value: NewStatutoryEnrollment;
  change: React.Dispatch<React.SetStateAction<NewStatutoryEnrollment>>;
  profile?: EmployeePayrollProfile;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
      <Field label="Program *">
        <Dropdown
          value={value.statutory_program_id || null}
          options={profile?.statutory_programs ?? []}
          optionLabel="name"
          optionValue="id"
          onChange={(e) =>
            change((v) => ({ ...v, statutory_program_id: Number(e.value) }))
          }
        />
      </Field>
      <Field label="Participant Number">
        <InputText
          value={value.participant_number ?? ""}
          onChange={(e) =>
            change((v) => ({
              ...v,
              participant_number: e.target.value || null,
            }))
          }
        />
      </Field>
      <Field label="Status">
        <Dropdown
          value={value.enrollment_status}
          options={["PENDING", "ACTIVE", "INACTIVE", "TERMINATED"]}
          onChange={(e) =>
            change((v) => ({ ...v, enrollment_status: String(e.value) }))
          }
        />
      </Field>
      <Field label="Risk Class">
        <Dropdown
          value={value.bpjs_risk_class_id}
          options={profile?.bpjs_risk_classes ?? []}
          optionLabel="name"
          optionValue="id"
          showClear
          onChange={(e) =>
            change((v) => ({
              ...v,
              bpjs_risk_class_id: e.value ? Number(e.value) : null,
            }))
          }
        />
      </Field>
      <Dates
        from={value.effective_from}
        to={value.effective_to}
        set={(from, to) =>
          change((v) => ({ ...v, effective_from: from, effective_to: to }))
        }
      />
    </div>
  );
}
function WageForm({
  value,
  change,
  profile,
}: {
  value: NewStatutoryWage;
  change: React.Dispatch<React.SetStateAction<NewStatutoryWage>>;
  profile?: EmployeePayrollProfile;
}) {
  const programGroups = [
    { label: "All statutory programs (fallback)", value: "ALL" },
    ...(profile?.statutory_programs ?? []).map((program) => ({
      label: `${program.name} (${program.code})`,
      value: program.code,
    })),
  ];
  return (
    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
      <Field label="Program Group *">
        <Dropdown
          value={value.program_group}
          options={programGroups}
          optionLabel="label"
          optionValue="value"
          className="w-full"
          onChange={(event) =>
            change((current) => ({
              ...current,
              program_group: String(event.value),
            }))
          }
        />
      </Field>
      <Field label="Wage Amount *">
        <InputText
          value={value.wage_amount}
          onChange={(e) =>
            change((v) => ({ ...v, wage_amount: e.target.value }))
          }
        />
      </Field>
      <Field label="Source">
        <Dropdown
          value={value.source}
          options={["MANUAL", "SALARY", "REGULATORY", "IMPORT"]}
          onChange={(e) => change((v) => ({ ...v, source: String(e.value) }))}
        />
      </Field>
      <Dates
        from={value.effective_from}
        to={value.effective_to}
        set={(from, to) =>
          change((v) => ({ ...v, effective_from: from, effective_to: to }))
        }
      />
    </div>
  );
}
function TaxForm({
  value,
  change,
}: {
  value: NewTaxProfile;
  change: React.Dispatch<React.SetStateAction<NewTaxProfile>>;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
      <Field label="NIK">
        <InputText
          value={value.nik ?? ""}
          onChange={(e) =>
            change((v) => ({ ...v, nik: e.target.value || null }))
          }
        />
      </Field>
      <Field label="NPWP">
        <InputText
          value={value.npwp ?? ""}
          onChange={(e) =>
            change((v) => ({ ...v, npwp: e.target.value || null }))
          }
        />
      </Field>
      <Field label="PTKP">
        <InputText
          value={value.ptkp_code}
          onChange={(e) => change((v) => ({ ...v, ptkp_code: e.target.value }))}
        />
      </Field>
      <Field label="TER Category">
        <Dropdown
          value={value.ter_category}
          options={["A", "B", "C"]}
          onChange={(e) =>
            change((v) => ({ ...v, ter_category: String(e.value) }))
          }
        />
      </Field>
      <Field label="Tax Method">
        <Dropdown
          value={value.tax_method}
          options={["GROSS", "NET", "GROSS_UP"]}
          onChange={(e) =>
            change((v) => ({ ...v, tax_method: String(e.value) }))
          }
        />
      </Field>
      <Field label="Employee Type">
        <Dropdown
          value={value.employee_tax_type}
          options={["PERMANENT", "NON_PERMANENT", "COMMISSIONER", "PENSIONER"]}
          onChange={(e) =>
            change((v) => ({ ...v, employee_tax_type: String(e.value) }))
          }
        />
      </Field>
      <Dates
        from={value.effective_from}
        to={value.effective_to}
        set={(from, to) =>
          change((v) => ({ ...v, effective_from: from, effective_to: to }))
        }
      />
    </div>
  );
}
function SalaryForm({
  value,
  change,
  settings,
}: {
  value: NewSalaryHistory;
  change: React.Dispatch<React.SetStateAction<NewSalaryHistory>>;
  settings: PayrollSetting[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
      <Field label="Base Salary *">
        <InputText
          value={value.base_salary}
          onChange={(e) =>
            change((v) => ({ ...v, base_salary: e.target.value }))
          }
        />
      </Field>
      <Field label="Currency">
        <InputText
          value={value.currency_code}
          maxLength={3}
          onChange={(e) =>
            change((v) => ({
              ...v,
              currency_code: e.target.value.toUpperCase(),
            }))
          }
        />
      </Field>
      <Field label="Payroll Setting">
        <Dropdown
          value={value.payroll_setting_id}
          options={settings}
          optionLabel="name"
          optionValue="id"
          showClear
          onChange={(e) =>
            change((v) => ({
              ...v,
              payroll_setting_id: e.value ? Number(e.value) : null,
            }))
          }
        />
      </Field>
      <Field label="Status">
        <Dropdown
          value={value.status}
          options={["DRAFT", "ACTIVE", "EXPIRED", "CANCELLED"]}
          onChange={(e) => change((v) => ({ ...v, status: String(e.value) }))}
        />
      </Field>
      <Dates
        from={value.effective_from}
        to={value.effective_to}
        set={(from, to) =>
          change((v) => ({ ...v, effective_from: from, effective_to: to }))
        }
      />
      <Field label="Change Reason">
        <InputText
          value={value.change_reason ?? ""}
          onChange={(e) =>
            change((v) => ({ ...v, change_reason: e.target.value || null }))
          }
        />
      </Field>
    </div>
  );
}
function Dates({
  from,
  to,
  set,
}: {
  from: string;
  to: string | null;
  set: (from: string, to: string | null) => void;
}) {
  return (
    <>
      <Field label="Effective From *">
        <InputText
          type="date"
          value={from}
          onChange={(e) => set(e.target.value, to)}
        />
      </Field>
      <Field label="Effective To">
        <InputText
          type="date"
          value={to ?? ""}
          onChange={(e) => set(from, e.target.value || null)}
        />
      </Field>
    </>
  );
}
