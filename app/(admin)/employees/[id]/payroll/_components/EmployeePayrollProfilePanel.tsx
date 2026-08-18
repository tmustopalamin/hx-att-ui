"use client";

import { useEffect, useState } from "react";
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
import { InputSwitch } from "primereact/inputswitch";
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
import type { Frequency } from "@/app/types/frequency";
import type { ResponseTypeError } from "@/app/types/response-type";
import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import { RootState } from "@/store/store";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

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
  tax_type_override: null,
  tax_type_override_reason: null,
  effective_from: "",
  effective_to: null,
  previous_employer_gross: "0",
  previous_employer_tax: "0",
  previous_employer_net: "0",
  notes: null,
};
const PTKP_OPTIONS = [
  {
    code: "TK/0",
    label: "TK/0 — Tidak kawin, tanpa tanggungan",
    amount: "54000000",
    ter: "A",
  },
  {
    code: "TK/1",
    label: "TK/1 — Tidak kawin, 1 tanggungan",
    amount: "58500000",
    ter: "A",
  },
  {
    code: "TK/2",
    label: "TK/2 — Tidak kawin, 2 tanggungan",
    amount: "63000000",
    ter: "B",
  },
  {
    code: "TK/3",
    label: "TK/3 — Tidak kawin, 3 tanggungan",
    amount: "67500000",
    ter: "B",
  },
  {
    code: "K/0",
    label: "K/0 — Kawin, tanpa tanggungan",
    amount: "58500000",
    ter: "A",
  },
  {
    code: "K/1",
    label: "K/1 — Kawin, 1 tanggungan",
    amount: "63000000",
    ter: "B",
  },
  {
    code: "K/2",
    label: "K/2 — Kawin, 2 tanggungan",
    amount: "67500000",
    ter: "B",
  },
  {
    code: "K/3",
    label: "K/3 — Kawin, 3 tanggungan",
    amount: "72000000",
    ter: "C",
  },
];

const formatIdr = (value: string | null | undefined) => {
  if (!value) return "—";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "—";
};
const SALARY: NewSalaryHistory = {
  base_salary: "0",
  currency_code: "IDR",
  payroll_setting_id: null,
  frequency_id: 0,
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
  const canOverrideTaxType = useSelector((state: RootState) =>
    state.profile.permissions.includes("payroll.tax-override"),
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
  const { data: frequencies } = useSWR<Frequency[]>(
    mode === "salary" ? "/api/frequency" : null,
    fetcher,
  );
  const [dialog, setDialog] = useState<"primary" | "wage" | null>(null);
  const [saving, setSaving] = useState(false);
  const [enrollment, setEnrollment] = useState(ENROLLMENT);
  const [wage, setWage] = useState(WAGE);
  const [tax, setTax] = useState(TAX);
  const [salary, setSalary] = useState(SALARY);

  useEffect(() => {
    if (mode !== "salary" || salary.frequency_id > 0 || !frequencies?.length) {
      return;
    }
    const monthly = frequencies.find(
      (frequency) =>
        frequency.is_active &&
        !frequency.deleted_at &&
        frequency.code.toUpperCase() === "MONTHLY",
    );
    if (monthly) {
      setSalary((current) => ({ ...current, frequency_id: monthly.id }));
    }
  }, [frequencies, mode, salary.frequency_id]);

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
      ? "Manage BPJS enrollment. The statutory wage base is derived automatically from salary plus classified fixed allowances."
      : mode === "tax"
        ? "Select the employee's PTKP status; the annual PTKP value and TER category are derived automatically."
        : "Manage effective-dated base salary without overwriting payroll history.";

  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <EmployeeDetailTableHeader
          title={title}
          description={description}
          actions={
            <>
              <Button
                type="button"
                label="Refresh"
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={isValidating}
                disabled={isValidating}
                className="w-full sm:w-auto"
                onClick={() => void mutate()}
              />
              {canCreate && mode === "bpjs" && (
                <Button
                  type="button"
                  label="Advanced Wage Override"
                  icon="pi pi-money-bill"
                  severity="secondary"
                  outlined
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={() => setDialog("wage")}
                />
              )}
              {canCreate && (
                <Button
                  type="button"
                  label={
                    mode === "bpjs"
                      ? "New Enrollment"
                      : mode === "tax"
                        ? "New Tax Profile"
                        : "New Salary"
                  }
                  icon="pi pi-plus"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={() => setDialog("primary")}
                />
              )}
            </>
          }
        />
        {mode === "bpjs" && (
          <>
            <DataTable
              value={data?.enrollments ?? []}
              loading={isLoading}
              size="small"
              stripedRows
              rowHover
              removableSort
              responsiveLayout="scroll"
              scrollable
              paginator
              rows={10}
              tableStyle={{ minWidth: "52rem" }}
              currentPageReportTemplate="{first} to {last} of {totalRecords}"
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
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
              <Column
                field="effective_from"
                header="Effective From"
                body={(row) => formatDisplayDate(row.effective_from)}
              />
              <Column
                field="effective_to"
                header="Effective To"
                body={(row) =>
                  formatDisplayDate(row.effective_to, "Open ended")
                }
              />
            </DataTable>
            <h2 className="text-base font-semibold text-slate-800">
              Statutory Wage Overrides (optional)
            </h2>
            <p className="m-0 -mt-3 text-sm leading-6 text-slate-500">
              Normally leave this empty. Payroll derives the statutory wage from
              active Salary History plus income components marked as fixed and
              included for the relevant BPJS program. Use an override only for a
              documented company or regulatory exception.
            </p>
            <DataTable
              value={data?.statutory_wages ?? []}
              loading={isLoading}
              size="small"
              stripedRows
              rowHover
              removableSort
              responsiveLayout="scroll"
              scrollable
              tableStyle={{ minWidth: "44rem" }}
            >
              <Column field="program_group" header="Group" />
              <Column field="wage_amount" header="Wage" />
              <Column field="source" header="Source" />
              <Column
                field="effective_from"
                header="Effective From"
                body={(row) => formatDisplayDate(row.effective_from)}
              />
              <Column
                field="effective_to"
                header="Effective To"
                body={(row) =>
                  formatDisplayDate(row.effective_to, "Open ended")
                }
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
            rowHover
            removableSort
            responsiveLayout="scroll"
            scrollable
            paginator
            rows={10}
            tableStyle={{ minWidth: "64rem" }}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          >
            <Column field="nik_masked" header="NIK" />
            <Column field="npwp_masked" header="NPWP" />
            <Column field="ptkp_code" header="PTKP" />
            <Column
              field="ptkp_amount"
              header="Annual PTKP"
              body={(row) =>
                formatIdr(
                  row.ptkp_amount ??
                    PTKP_OPTIONS.find((option) => option.code === row.ptkp_code)
                      ?.amount,
                )
              }
            />
            <Column
              field="ter_category"
              header="TER (derived)"
              body={(row) => row.ter_category ?? "—"}
            />
            <Column field="tax_method" header="Method" />
            <Column
              field="employee_tax_type"
              header="Tax Treatment"
              body={(row) => (
                <div className="flex flex-col gap-1">
                  <span>{row.employee_tax_type}</span>
                  <small className="text-slate-500">
                    {row.tax_type_source === "EMPLOYMENT_STATUS"
                      ? `From ${row.source_employment_status_name ?? "Employment Status"}`
                      : row.tax_type_source === "OVERRIDE"
                        ? "Approved override"
                        : "Legacy profile"}
                  </small>
                </div>
              )}
            />
            <Column
              field="effective_from"
              header="Effective From"
              body={(row) => formatDisplayDate(row.effective_from)}
            />
            <Column
              field="effective_to"
              header="Effective To"
              body={(row) => formatDisplayDate(row.effective_to, "Open ended")}
            />
          </DataTable>
        )}
        {mode === "salary" && (
          <DataTable
            value={data?.salary_history ?? []}
            loading={isLoading}
            size="small"
            stripedRows
            rowHover
            removableSort
            responsiveLayout="scroll"
            scrollable
            paginator
            rows={10}
            tableStyle={{ minWidth: "58rem" }}
            currentPageReportTemplate="{first} to {last} of {totalRecords}"
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          >
            <Column field="base_salary" header="Base Salary" />
            <Column field="currency_code" header="Currency" />
            <Column
              field="frequency_name"
              header="Wage Basis"
              body={(row) => (
                <div className="flex flex-col">
                  <span>{row.frequency_name}</span>
                  <small className="text-slate-500">
                    Rate period: {row.frequency_days_in_period} day(s)
                  </small>
                </div>
              )}
            />
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
            <Column
              field="effective_from"
              header="Effective From"
              body={(row) => formatDisplayDate(row.effective_from)}
            />
            <Column
              field="effective_to"
              header="Effective To"
              body={(row) => formatDisplayDate(row.effective_to, "Open ended")}
            />
            <Column field="change_reason" header="Reason" />
          </DataTable>
        )}
      </div>
      <Dialog
        header={
          dialog === "wage"
            ? "New Statutory Wage Override"
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
        closeOnEscape={!saving}
        closable={!saving}
        style={{ width: "95vw", maxWidth: "46rem" }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label="Cancel"
              icon="pi pi-times"
              severity="secondary"
              text
              disabled={saving}
              className="w-full sm:w-auto"
              onClick={() => setDialog(null)}
            />
            <Button
              type="button"
              label="Create History"
              icon="pi pi-check"
              loading={saving}
              disabled={saving}
              className="w-full sm:w-auto"
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
          <TaxForm
            value={tax}
            change={setTax}
            canOverride={canOverrideTaxType}
          />
        ) : (
          <SalaryForm
            value={salary}
            change={setSalary}
            settings={settings ?? []}
            frequencies={frequencies ?? []}
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
  canOverride,
}: {
  value: NewTaxProfile;
  change: React.Dispatch<React.SetStateAction<NewTaxProfile>>;
  canOverride: boolean;
}) {
  const selectedPtkp = PTKP_OPTIONS.find(
    (option) => option.code === value.ptkp_code,
  );
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
      <Field label="PTKP Status *">
        <Dropdown
          value={value.ptkp_code}
          options={PTKP_OPTIONS}
          optionLabel="label"
          optionValue="code"
          className="w-full"
          onChange={(e) => {
            const option = PTKP_OPTIONS.find((item) => item.code === e.value);
            change((current) => ({
              ...current,
              ptkp_code: String(e.value),
              ter_category: option?.ter ?? null,
            }));
          }}
        />
      </Field>
      <Field label="Annual PTKP">
        <InputText
          value={formatIdr(selectedPtkp?.amount)}
          readOnly
          className="bg-slate-50"
        />
      </Field>
      <Field label="TER Category (automatic)">
        <InputText
          value={selectedPtkp?.ter ?? ""}
          readOnly
          className="bg-slate-50"
        />
      </Field>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800 sm:col-span-2">
        TER is derived from the PTKP status. It is used for monthly PPh 21
        withholding; the final tax month uses the annual Article 17 calculation
        with the same PTKP status.
      </div>
      <Field label="Tax Method">
        <Dropdown
          value={value.tax_method}
          options={["GROSS", "NET", "GROSS_UP"]}
          onChange={(e) =>
            change((v) => ({ ...v, tax_method: String(e.value) }))
          }
        />
      </Field>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            Tax Treatment
          </span>
          <p className="m-0 text-sm leading-6 text-slate-600">
            The treatment is resolved from the employee&apos;s active Employment
            Status when this profile is saved. It is stored as a snapshot for
            payroll history.
          </p>
          {canOverride && (
            <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
              <div>
                <span className="text-sm font-medium text-slate-700">
                  Override tax treatment
                </span>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  Use only for an approved tax exception and provide a reason.
                </p>
              </div>
              <InputSwitch
                checked={Boolean(value.tax_type_override)}
                onChange={(event) =>
                  change((current) => ({
                    ...current,
                    tax_type_override: event.value ? "PERMANENT" : null,
                    tax_type_override_reason: event.value
                      ? current.tax_type_override_reason
                      : null,
                  }))
                }
              />
            </div>
          )}
          {value.tax_type_override && (
            <>
              <Dropdown
                value={value.tax_type_override}
                options={["PERMANENT", "NON_PERMANENT"]}
                onChange={(event) =>
                  change((current) => ({
                    ...current,
                    tax_type_override: String(event.value),
                  }))
                }
                className="w-full"
              />
              <InputText
                value={value.tax_type_override_reason ?? ""}
                placeholder="Override reason *"
                onChange={(event) =>
                  change((current) => ({
                    ...current,
                    tax_type_override_reason: event.target.value || null,
                  }))
                }
                className="w-full"
              />
            </>
          )}
        </div>
      </div>
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
  frequencies,
}: {
  value: NewSalaryHistory;
  change: React.Dispatch<React.SetStateAction<NewSalaryHistory>>;
  settings: PayrollSetting[];
  frequencies: Frequency[];
}) {
  const activeFrequencies = frequencies.filter(
    (frequency) => frequency.is_active && !frequency.deleted_at,
  );
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
      <Field label="Wage Basis *">
        <Dropdown
          value={value.frequency_id || null}
          options={activeFrequencies}
          optionLabel="name"
          optionValue="id"
          placeholder="Select salary wage basis"
          className="w-full"
          onChange={(event) =>
            change((current) => ({
              ...current,
              frequency_id: event.value ? Number(event.value) : 0,
            }))
          }
        />
        <small className="text-xs leading-5 text-slate-500">
          Base salary is the amount for the selected wage basis. This basis
          normalizes the amount; payroll calendar dates remain controlled by
          Payroll Settings &gt; General Settings.
        </small>
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
        <PrimeDatePicker
          value={from}
          onValueChange={(value) => set(value, to)}
        />
      </Field>
      <Field label="Effective To">
        <PrimeDatePicker
          value={to}
          onValueChange={(value) => set(from, value || null)}
        />
      </Field>
    </>
  );
}
