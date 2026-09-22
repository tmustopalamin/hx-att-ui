"use client";
import { useI18n } from "@/app/i18n";

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
  updateStatutoryEnrollment,
} from "@/app/services/employee-payroll-profile-service";
import { getEmployeeIdentities } from "@/app/services/employee-general-service";
import type {
  EmployeePayrollProfile,
  EmployeeStatutoryEnrollment,
  NewSalaryHistory,
  NewStatutoryEnrollment,
  NewStatutoryWage,
  NewTaxProfile,
} from "@/app/types/employee-payroll-profile";
import type { PayrollSetting } from "@/app/types/payroll-configuration";
import type { Frequency } from "@/app/types/frequency";
import type { ResponseTypeError } from "@/app/types/response-type";
import { fetcher } from "@/app/utils/fetcher";
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
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
    labelKey: "TK/0 — Tidak kawin, tanpa tanggungan",
    amount: "54000000",
    ter: "A",
  },
  {
    code: "TK/1",
    labelKey: "TK/1 — Tidak kawin, 1 tanggungan",
    amount: "58500000",
    ter: "A",
  },
  {
    code: "TK/2",
    labelKey: "TK/2 — Tidak kawin, 2 tanggungan",
    amount: "63000000",
    ter: "B",
  },
  {
    code: "TK/3",
    labelKey: "TK/3 — Tidak kawin, 3 tanggungan",
    amount: "67500000",
    ter: "B",
  },
  {
    code: "K/0",
    labelKey: "K/0 — Kawin, tanpa tanggungan",
    amount: "58500000",
    ter: "A",
  },
  {
    code: "K/1",
    labelKey: "K/1 — Kawin, 1 tanggungan",
    amount: "63000000",
    ter: "B",
  },
  {
    code: "K/2",
    labelKey: "K/2 — Kawin, 2 tanggungan",
    amount: "67500000",
    ter: "B",
  },
  {
    code: "K/3",
    labelKey: "K/3 — Kawin, 3 tanggungan",
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

const formatProgramLabel = (name: string, code?: string | null) => {
  if (!name) return code ?? "—";
  const upperCode = (code ?? "").toUpperCase();
  if (upperCode.includes("JHT") && !name.includes("JHT"))
    return `${name} (JHT)`;
  if (upperCode.includes("JKK") && !name.includes("JKK"))
    return `${name} (JKK)`;
  if (upperCode.includes("JKM") && !name.includes("JKM"))
    return `${name} (JKM)`;
  if (upperCode.includes("JKP") && !name.includes("JKP"))
    return `${name} (JKP)`;
  if (
    (upperCode.includes("JP") || upperCode.endsWith("_JP")) &&
    !name.includes("JP")
  )
    return `${name} (JP)`;
  return name;
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
  const { t: i18nT } = useI18n();
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
  const [isEditingEnrollment, setIsEditingEnrollment] = useState(false);
  const [editingEnrollmentId, setEditingEnrollmentId] = useState<number | null>(
    null,
  );
  const [editingEnrollmentRowVersion, setEditingEnrollmentRowVersion] =
    useState<number | null>(null);
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
        summary:
          severity === "success"
            ? i18nT("static.udvru8")
            : i18nT("static.1vks92p"),
        detail,
      }),
    );
  const fail = (error: unknown) =>
    notify(
      "error",
      typeof error === "object" && error !== null && "message" in error
        ? String((error as ResponseTypeError).message)
        : i18nT("static.i7zn8m"),
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

  const openTaxDialog = async () => {
    let initialNik: string | null = null;
    let initialNpwp: string | null = null;

    if (Number.isFinite(employeeId)) {
      try {
        const identities = await getEmployeeIdentities(employeeId);
        const activeIdentities = identities.filter((i) => i.is_active);

        const ktp =
          activeIdentities.find(
            (i) =>
              i.is_primary &&
              (i.identity_type_code?.toUpperCase() === "KTP" ||
                i.identity_type_code?.toUpperCase() === "NIK" ||
                i.identity_type_name?.toUpperCase().includes("KTP") ||
                i.identity_type_name?.toUpperCase().includes("NIK")),
          ) ??
          activeIdentities.find(
            (i) =>
              i.identity_type_code?.toUpperCase() === "KTP" ||
              i.identity_type_code?.toUpperCase() === "NIK" ||
              i.identity_type_name?.toUpperCase().includes("KTP") ||
              i.identity_type_name?.toUpperCase().includes("NIK"),
          );

        const npwp =
          activeIdentities.find(
            (i) =>
              i.is_primary &&
              (i.identity_type_code?.toUpperCase() === "NPWP" ||
                i.identity_type_name?.toUpperCase().includes("NPWP")),
          ) ??
          activeIdentities.find(
            (i) =>
              i.identity_type_code?.toUpperCase() === "NPWP" ||
              i.identity_type_name?.toUpperCase().includes("NPWP"),
          );

        if (ktp?.number) {
          initialNik = ktp.number;
        }
        if (npwp?.number) {
          initialNpwp = npwp.number;
        }
      } catch {
        // Fallback silently if fetching identities fails
      }
    }

    setTax({
      ...TAX,
      nik: initialNik,
      npwp: initialNpwp,
    });
    setDialog("primary");
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
              {canCreate && mode === "bpjs" && (
                <Button
                  type="button"
                  label={i18nT("static.1fidpif")}
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
                      ? i18nT("static.11h459n")
                      : mode === "tax"
                        ? i18nT("static.1ygaxld")
                        : i18nT("static.liz1dd")
                  }
                  icon="pi pi-plus"
                  size="small"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (mode === "tax") {
                      void openTaxDialog();
                      const enrolledProgramIds = new Set(
                        (data?.enrollments ?? [])
                          .filter((e) => e.effective_to === null)
                          .map((e) => e.statutory_program_id),
                      );
                      const allPrograms = data?.statutory_programs ?? [];
                      const availablePrograms = allPrograms.filter(
                        (p) => !enrolledProgramIds.has(p.id),
                      );
                      const defaultProgramId =
                        availablePrograms[0]?.id ?? allPrograms[0]?.id ?? 0;

                      setIsEditingEnrollment(false);
                      setEditingEnrollmentId(null);
                      setEditingEnrollmentRowVersion(null);
                      setEnrollment({
                        ...ENROLLMENT,
                        statutory_program_id: defaultProgramId,
                        effective_from: new Date().toISOString().slice(0, 10),
                      });
                      setDialog("primary");
                    } else {
                      setDialog("primary");
                    }
                  }}
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
              currentPageReportTemplate={i18nT("static.1kqh8lr")}
              paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
            >
              <Column
                field="program_code"
                header={i18nT("static.1if8prf")}
                body={(row) => (
                  <div className="flex flex-col">
                    <span className="font-medium text-slate-800">
                      {formatProgramLabel(row.program_name, row.program_code)}
                    </span>
                    <small className="text-slate-500 font-mono text-xs">
                      {row.program_code}
                    </small>
                  </div>
                )}
              />
              <Column
                field="participant_number"
                header={i18nT("static.zpx5hx")}
              />
              <Column
                field="enrollment_status"
                header={i18nT("static.3pd73")}
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
              <Column field="risk_class_code" header={i18nT("static.psbfa6")} />
              <Column
                field="effective_from"
                header={i18nT("static.ypbwia")}
                body={(row) => formatDisplayDate(row.effective_from)}
              />
              <Column
                field="effective_to"
                header={i18nT("static.mtbgcr")}
                body={(row) =>
                  formatDisplayDate(row.effective_to, "Open ended")
                }
              />
              <Column
                header={i18nT("static.4q4x6t")}
                body={(row: EmployeeStatutoryEnrollment) => (
                  <div className="flex items-center justify-center">
                    {canCreate && (
                      <Button
                        type="button"
                        icon="pi pi-pencil"
                        rounded
                        text
                        severity="secondary"
                        size="small"
                        tooltip="Perbarui Kepesertaan"
                        tooltipOptions={{ position: "top" }}
                        onClick={() => {
                          setEnrollment({
                            statutory_program_id: row.statutory_program_id,
                            participant_number: row.participant_number,
                            enrollment_status: row.enrollment_status,
                            effective_from:
                              row.effective_from ||
                              new Date().toISOString().slice(0, 10),
                            effective_to: row.effective_to,
                            bpjs_risk_class_id: row.bpjs_risk_class_id,
                            company_registration_number:
                              row.company_registration_number,
                            notes: row.notes,
                          });
                          setEditingEnrollmentId(row.id);
                          setEditingEnrollmentRowVersion(row.row_version);
                          setIsEditingEnrollment(true);
                          setDialog("primary");
                        }}
                      />
                    )}
                  </div>
                )}
                style={{ width: "4.5rem", textAlign: "center" }}
              />
            </DataTable>
            <h2 className="text-base font-semibold text-slate-800">
              {i18nT("static.kbepee")}{" "}
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
              <Column field="program_group" header={i18nT("static.1ihp9o")} />
              <Column field="wage_amount" header={i18nT("static.92yfvt")} />
              <Column field="source" header={i18nT("static.r5qyuw")} />
              <Column
                field="effective_from"
                header={i18nT("static.ypbwia")}
                body={(row) => formatDisplayDate(row.effective_from)}
              />
              <Column
                field="effective_to"
                header={i18nT("static.mtbgcr")}
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
            currentPageReportTemplate={i18nT("static.1kqh8lr")}
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          >
            <Column field="nik_masked" header={i18nT("static.lvt3nd")} />
            <Column field="npwp_masked" header={i18nT("static.4f980k")} />
            <Column field="ptkp_code" header={i18nT("static.1w1piju")} />
            <Column
              field="ptkp_amount"
              header={i18nT("static.10lu6yx")}
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
              header={i18nT("static.1wrk3n4")}
              body={(row) => row.ter_category ?? "—"}
            />
            <Column field="tax_method" header={i18nT("static.16cmxjk")} />
            <Column
              field="employee_tax_type"
              header={i18nT("static.p6ft6e")}
              body={(row) => (
                <div className="flex flex-col gap-1">
                  <span>{row.employee_tax_type}</span>
                  <small className="text-slate-500">
                    {row.tax_type_source === "EMPLOYMENT_STATUS"
                      ? i18nT("static.qpob7", {
                          p0:
                            row.source_employment_status_name ??
                            i18nT("static.p2ngjv"),
                        })
                      : row.tax_type_source === "OVERRIDE"
                        ? i18nT("static.jwdlri")
                        : i18nT("static.cs68k7")}
                  </small>
                </div>
              )}
            />
            <Column
              field="effective_from"
              header={i18nT("static.ypbwia")}
              body={(row) => formatDisplayDate(row.effective_from)}
            />
            <Column
              field="effective_to"
              header={i18nT("static.mtbgcr")}
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
            currentPageReportTemplate={i18nT("static.1kqh8lr")}
            paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          >
            <Column field="base_salary" header={i18nT("static.38iui2")} />
            <Column field="currency_code" header={i18nT("static.5o3zh2")} />
            <Column
              field="frequency_name"
              header={i18nT("static.1m95xl7")}
              body={(row) => (
                <div className="flex flex-col">
                  <span>{row.frequency_name}</span>
                  <small className="text-slate-500">
                    {i18nT("static.bmw8qi")} {row.frequency_days_in_period}{" "}
                    {i18nT("static.kjdug7")}{" "}
                  </small>
                </div>
              )}
            />
            <Column
              field="payroll_setting_name"
              header={i18nT("static.1aar9d6")}
            />
            <Column
              field="status"
              header={i18nT("static.3pd73")}
              body={(row) => (
                <Tag
                  value={row.status}
                  severity={row.status === "ACTIVE" ? "success" : "secondary"}
                />
              )}
            />
            <Column
              field="effective_from"
              header={i18nT("static.ypbwia")}
              body={(row) => formatDisplayDate(row.effective_from)}
            />
            <Column
              field="effective_to"
              header={i18nT("static.mtbgcr")}
              body={(row) => formatDisplayDate(row.effective_to, "Open ended")}
            />
            <Column field="change_reason" header={i18nT("static.i36sl5")} />
          </DataTable>
        )}
      </div>
      <Dialog
        header={
          dialog === "wage"
            ? i18nT("static.xlzi20")
            : mode === "bpjs"
              ? isEditingEnrollment
                ? "Perbarui Kepesertaan BPJS"
                : i18nT("static.11h459n")
              : mode === "tax"
                ? i18nT("static.1ygaxld")
                : i18nT("static.j1dh25")
        }
        visible={dialog !== null}
        onHide={() => {
          setDialog(null);
          setIsEditingEnrollment(false);
          setEditingEnrollmentId(null);
          setEditingEnrollmentRowVersion(null);
        }}
        modal
        draggable={false}
        resizable={false}
        closeOnEscape={!saving}
        closable={!saving}
        style={{ width: "95vw", maxWidth: "46rem" }}
        breakpoints={{ "640px": "95vw" }}
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              label={i18nT("static.ew9em3")}
              icon="pi pi-times"
              severity="secondary"
              text
              disabled={saving}
              className="w-full sm:w-auto"
              onClick={() => {
                setDialog(null);
                setIsEditingEnrollment(false);
                setEditingEnrollmentId(null);
                setEditingEnrollmentRowVersion(null);
              }}
            />
            <Button
              type="button"
              label={
                mode === "bpjs" && isEditingEnrollment
                  ? "Simpan Perubahan"
                  : i18nT("static.opuo55")
              }
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
                else if (mode === "bpjs") {
                  if (
                    !enrollment.statutory_program_id ||
                    enrollment.statutory_program_id <= 0
                  ) {
                    notify(
                      "error",
                      "Silakan pilih Program BPJS terlebih dahulu.",
                    );
                    return;
                  }
                  if (
                    !enrollment.effective_from ||
                    enrollment.effective_from.trim() === ""
                  ) {
                    notify("error", "Tanggal mulai berlaku wajib diisi.");
                    return;
                  }
                  if (
                    isEditingEnrollment &&
                    editingEnrollmentId &&
                    editingEnrollmentRowVersion !== null
                  ) {
                    void run(
                      () =>
                        updateStatutoryEnrollment(
                          employeeId,
                          editingEnrollmentId,
                          editingEnrollmentRowVersion,
                          {
                            participant_number: enrollment.participant_number,
                            enrollment_status: enrollment.enrollment_status,
                            effective_from: enrollment.effective_from,
                            effective_to: enrollment.effective_to,
                            bpjs_risk_class_id: enrollment.bpjs_risk_class_id,
                            company_registration_number:
                              enrollment.company_registration_number,
                            notes: enrollment.notes,
                          },
                        ),
                      "Data kepesertaan berhasil diperbarui.",
                    );
                  } else {
                    const existingActive = (data?.enrollments ?? []).find(
                      (e) =>
                        e.statutory_program_id ===
                          enrollment.statutory_program_id &&
                        e.effective_to === null,
                    );
                    if (
                      existingActive &&
                      enrollment.effective_from <= existingActive.effective_from
                    ) {
                      notify(
                        "error",
                        `Program ini sudah aktif terdaftar sejak ${existingActive.effective_from}. Tanggal mulai periode baru harus lebih besar dari ${existingActive.effective_from}, atau gunakan tombol pensil di tabel untuk mengedit data saat ini.`,
                      );
                      return;
                    }
                    void run(
                      () => createStatutoryEnrollment(employeeId, enrollment),
                      "Kepesertaan berhasil didaftarkan.",
                    );
                  }
                } else if (mode === "tax")
                  void run(
                    () => createTaxProfile(employeeId, tax),
                    "Tax profile created.",
                  );
                else if (!isWhitespaceFreeIdentifier(salary.currency_code))
                  notify("error", i18nT("validation.codeNoWhitespace"));
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
            isEdit={isEditingEnrollment}
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
  id,
  label,
  required = false,
  hint,
  helper,
  error,
  children,
  className = "",
}: {
  id?: string;
  label: React.ReactNode;
  required?: boolean;
  hint?: React.ReactNode;
  helper?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const displayHint = hint ?? helper;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label
        htmlFor={id}
        className="text-sm font-medium text-slate-700 flex items-center gap-1"
      >
        <span>{label}</span>
        {required && <span className="text-red-500 font-bold">*</span>}
      </label>
      {children}
      {error ? (
        <small className="p-error text-xs">{error}</small>
      ) : (
        displayHint && (
          <small className="text-slate-500 text-xs">{displayHint}</small>
        )
      )}
    </div>
  );
}
function EnrollmentForm({
  value,
  change,
  profile,
  isEdit = false,
}: {
  value: NewStatutoryEnrollment;
  change: React.Dispatch<React.SetStateAction<NewStatutoryEnrollment>>;
  profile?: EmployeePayrollProfile;
  isEdit?: boolean;
}) {
  const { t: i18nT } = useI18n();
  const [riskInfoOpen, setRiskInfoOpen] = useState(false);

  const selectedProgram = (profile?.statutory_programs ?? []).find(
    (p) => p.id === value.statutory_program_id,
  );
  const isJkk = selectedProgram?.code === "BPJS_TK_JKK";
  const isBpjsKes = selectedProgram?.code === "BPJS_KESEHATAN";

  const enrolledProgramIds = new Set(
    (profile?.enrollments ?? [])
      .filter((e) => e.effective_to === null)
      .map((e) => e.statutory_program_id),
  );

  const isSelectedProgramAlreadyEnrolled =
    !isEdit && enrolledProgramIds.has(value.statutory_program_id);

  const existingActiveForSelected = isSelectedProgramAlreadyEnrolled
    ? (profile?.enrollments ?? []).find(
        (e) =>
          e.statutory_program_id === value.statutory_program_id &&
          e.effective_to === null,
      )
    : null;

  const programOptions = (profile?.statutory_programs ?? []).map((program) => {
    const isEnrolled = !isEdit && enrolledProgramIds.has(program.id);
    const baseLabel = formatProgramLabel(program.name, program.code);
    return {
      ...program,
      displayName: isEnrolled ? `${baseLabel} (Sudah Aktif)` : baseLabel,
    };
  });

  const statusOptions = [
    { label: "ACTIVE — Aktif", value: "ACTIVE" },
    { label: "PENDING — Menunggu Registrasi", value: "PENDING" },
    { label: "INACTIVE — Tidak Aktif", value: "INACTIVE" },
    { label: "TERMINATED — Berhenti / Nonaktif", value: "TERMINATED" },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
        {isSelectedProgramAlreadyEnrolled && existingActiveForSelected && (
          <div className="sm:col-span-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 flex items-start gap-2">
            <i className="pi pi-exclamation-triangle text-amber-600 mt-0.5 text-sm" />
            <div>
              <p className="font-semibold m-0 mb-1">
                Program ini sudah terdaftar aktif sejak{" "}
                {existingActiveForSelected.effective_from}
              </p>
              <p className="m-0 text-amber-700 leading-relaxed">
                Pendaftaran periode baru akan menutup periode aktif secara
                otomatis. Tanggal mulai periode baru harus lebih besar dari{" "}
                <strong>{existingActiveForSelected.effective_from}</strong>.
                Jika Anda hanya ingin mengoreksi data periode saat ini (seperti
                nomor kartu, kelas risiko, dsb.), gunakan tombol edit (pensil)
                pada tabel.
              </p>
            </div>
          </div>
        )}

        {/* Row 1: Program BPJS (Full width sm:col-span-2) */}
        <Field
          id="enrollment-program"
          label={i18nT("static.1vqe40x")}
          required
          className="sm:col-span-2"
          hint={
            isEdit
              ? "Program kepesertaan yang sedang diperbarui datanya"
              : isSelectedProgramAlreadyEnrolled
                ? `Program ini sudah aktif sejak ${existingActiveForSelected?.effective_from}. Periode baru harus dimulai setelah tanggal tersebut.`
                : "Pilih salah satu program jaminan sosial wajib"
          }
        >
          <Dropdown
            inputId="enrollment-program"
            value={value.statutory_program_id || null}
            options={programOptions}
            optionLabel="displayName"
            optionValue="id"
            placeholder="Pilih Program BPJS"
            className="w-full"
            disabled={isEdit}
            onChange={(e) => {
              const programId = Number(e.value);
              const prog = (profile?.statutory_programs ?? []).find(
                (p) => p.id === programId,
              );
              change((v) => ({
                ...v,
                statutory_program_id: programId,
                bpjs_risk_class_id:
                  prog?.code === "BPJS_KESEHATAN" ? null : v.bpjs_risk_class_id,
              }));
            }}
          />
        </Field>

        {/* Row 2: Nomor Peserta & Kelas Risiko JKK */}
        <Field
          id="enrollment-participant-number"
          label={i18nT("static.3yqbxz")}
          hint="Nomor kartu BPJS Kesehatan (13 digit) atau KPJ (11 digit)"
        >
          <InputText
            id="enrollment-participant-number"
            value={value.participant_number ?? ""}
            placeholder="Contoh: 0001234567890 atau 12345678901"
            className="w-full"
            onChange={(e) =>
              change((v) => ({
                ...v,
                participant_number: e.target.value || null,
              }))
            }
          />
        </Field>

        <Field
          id="enrollment-risk-class"
          label={
            <span className="inline-flex items-center gap-1.5">
              <span>{i18nT("static.psbfa6")}</span>
              <button
                type="button"
                className="inline-flex items-center justify-center w-5 h-5 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 focus:outline-none transition-colors"
                title="Lihat panduan & tarif kelas risiko JKK"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRiskInfoOpen(true);
                }}
              >
                <i className="pi pi-info-circle text-xs" />
              </button>
            </span>
          }
          required={isJkk}
          hint={
            isBpjsKes
              ? "Tidak berlaku untuk BPJS Kesehatan"
              : isJkk
                ? "Wajib dipilih untuk menentukan tarif iuran JKK"
                : "Khusus program BPJS Ketenagakerjaan (JKK)"
          }
        >
          <Dropdown
            inputId="enrollment-risk-class"
            value={value.bpjs_risk_class_id}
            options={profile?.bpjs_risk_classes ?? []}
            optionLabel="name"
            optionValue="id"
            showClear
            disabled={isBpjsKes}
            placeholder={
              isBpjsKes
                ? "Tidak berlaku (BPJS Kesehatan)"
                : "Pilih Kelas Risiko JKK"
            }
            className="w-full"
            onChange={(e) =>
              change((v) => ({
                ...v,
                bpjs_risk_class_id: e.value ? Number(e.value) : null,
              }))
            }
          />
        </Field>

        {/* Row 3: Status Kepesertaan & NPP Perusahaan */}
        <Field
          id="enrollment-status"
          label={i18nT("static.3pd73")}
          required
          hint="Hanya status ACTIVE yang diproses dalam payroll"
        >
          <Dropdown
            inputId="enrollment-status"
            value={value.enrollment_status}
            options={statusOptions}
            optionLabel="label"
            optionValue="value"
            className="w-full"
            onChange={(e) =>
              change((v) => ({ ...v, enrollment_status: String(e.value) }))
            }
          />
        </Field>

        <Field
          id="enrollment-company-reg"
          label="No. Registrasi Perusahaan / NPP"
          hint="Opsional jika entitas/cabang memiliki NPP terpisah"
        >
          <InputText
            id="enrollment-company-reg"
            value={value.company_registration_number ?? ""}
            placeholder="Contoh: NPP Cabang / Kode Badan Usaha"
            className="w-full"
            onChange={(e) =>
              change((v) => ({
                ...v,
                company_registration_number: e.target.value || null,
              }))
            }
          />
        </Field>

        {/* Row 4: Masa Berlaku (Tanggal Mulai & Berakhir) */}
        <Field
          id="enrollment-effective-from"
          label={i18nT("static.8lx39w")}
          required
          hint="Tanggal mulai berlakunya kepesertaan"
        >
          <PrimeDatePicker
            value={value.effective_from}
            onValueChange={(date) =>
              change((v) => ({ ...v, effective_from: date }))
            }
          />
        </Field>

        <Field
          id="enrollment-effective-to"
          label={i18nT("static.mtbgcr")}
          hint="Kosongkan jika kepesertaan masih aktif (terbuka)"
        >
          <PrimeDatePicker
            value={value.effective_to}
            onValueChange={(date) =>
              change((v) => ({ ...v, effective_to: date || null }))
            }
          />
        </Field>

        {/* Row 5: Catatan (Full width sm:col-span-2) */}
        <Field
          id="enrollment-notes"
          label="Catatan"
          className="sm:col-span-2"
          hint="Catatan internal atau referensi mutasi kepesertaan jika ada"
        >
          <InputText
            id="enrollment-notes"
            value={value.notes ?? ""}
            placeholder="Contoh: Pendaftaran baru batch onboarding, mutasi cabang, dll."
            className="w-full"
            onChange={(e) =>
              change((v) => ({
                ...v,
                notes: e.target.value || null,
              }))
            }
          />
        </Field>
      </div>

      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-shield text-blue-600 text-base" />
            <span className="font-semibold text-slate-800 text-base">
              Detail Kelas Risiko JKK (Jaminan Kecelakaan Kerja)
            </span>
          </div>
        }
        visible={riskInfoOpen}
        onHide={() => setRiskInfoOpen(false)}
        modal
        dismissableMask
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "44rem" }}
      >
        <div className="flex flex-col gap-3.5 text-sm text-slate-600 pt-1">
          <p className="leading-relaxed text-slate-600 m-0">
            Sesuai <strong>PP No. 44 Tahun 2015</strong>, iuran JKK dibayarkan{" "}
            <strong>100% oleh pemberi kerja (perusahaan)</strong> berdasarkan
            tingkat risiko lingkungan kerja:
          </p>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                <tr>
                  <th className="p-2.5 sm:p-3">Opsi</th>
                  <th className="p-2.5 sm:p-3 text-center">Tarif</th>
                  <th className="p-2.5 sm:p-3">
                    Tingkat Risiko & Contoh Pekerjaan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr className="hover:bg-slate-50/60">
                  <td className="p-2.5 sm:p-3 font-semibold text-slate-800 whitespace-nowrap">
                    JKK Risk I
                  </td>
                  <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 font-bold rounded text-emerald-700 bg-emerald-50 border border-emerald-200 text-xs">
                      0,24%
                    </span>
                  </td>
                  <td className="p-2.5 sm:p-3 text-slate-600">
                    <strong>Sangat Rendah</strong> — Pekerjaan administrasi
                    kantor, perbankan/keuangan, pendidikan, riset, IT.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-2.5 sm:p-3 font-semibold text-slate-800 whitespace-nowrap">
                    JKK Risk II
                  </td>
                  <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 font-bold rounded text-teal-700 bg-teal-50 border border-teal-200 text-xs">
                      0,54%
                    </span>
                  </td>
                  <td className="p-2.5 sm:p-3 text-slate-600">
                    <strong>Rendah</strong> — Industri pakaian/garmen,
                    percetakan, retail, perdagangan, perhotelan & restoran.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-2.5 sm:p-3 font-semibold text-slate-800 whitespace-nowrap">
                    JKK Risk III
                  </td>
                  <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 font-bold rounded text-amber-700 bg-amber-50 border border-amber-200 text-xs">
                      0,89%
                    </span>
                  </td>
                  <td className="p-2.5 sm:p-3 text-slate-600">
                    <strong>Sedang</strong> — Manufaktur umum, transportasi
                    darat, pergudangan, perakitan mesin ringan, makanan &
                    minuman.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-2.5 sm:p-3 font-semibold text-slate-800 whitespace-nowrap">
                    JKK Risk IV
                  </td>
                  <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 font-bold rounded text-orange-700 bg-orange-50 border border-orange-200 text-xs">
                      1,27%
                    </span>
                  </td>
                  <td className="p-2.5 sm:p-3 text-slate-600">
                    <strong>Tinggi</strong> — Konstruksi umum, pengolahan logam,
                    industri kimia, pengolahan kayu, perikanan laut.
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/60">
                  <td className="p-2.5 sm:p-3 font-semibold text-slate-800 whitespace-nowrap">
                    JKK Risk V
                  </td>
                  <td className="p-2.5 sm:p-3 text-center whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 font-bold rounded text-rose-700 bg-rose-50 border border-rose-200 text-xs">
                      1,74%
                    </span>
                  </td>
                  <td className="p-2.5 sm:p-3 text-slate-600">
                    <strong>Sangat Tinggi</strong> — Pertambangan migas/batu
                    bara, peledakan (*blasting*), pengeboran lepas pantai,
                    ketinggian/bawah tanah ekstrem.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-md bg-blue-50/80 p-3 border border-blue-100 flex items-start gap-2.5 text-xs text-blue-800">
            <i className="pi pi-info-circle text-blue-600 text-sm mt-0.5" />
            <span>
              Iuran JKK ini dibayarkan perusahaan dan menjadi penambah
              penghasilan bruto karyawan untuk dasar perhitungan pajak PPh 21
              bulanan (TER).
            </span>
          </div>
        </div>
      </Dialog>
    </>
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
  const { t: i18nT } = useI18n();
  const programGroups = [
    { label: i18nT("static.16km7xr"), value: "ALL" },
    ...(profile?.statutory_programs ?? []).map((program) => ({
      label: i18nT("static.14r9r1n", {
        p0: formatProgramLabel(program.name, program.code),
        p1: program.code,
      }),
      value: program.code,
    })),
  ];
  return (
    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
      <Field label={i18nT("static.10xma8m")}>
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
      <Field label={i18nT("static.p8v2lh")}>
        <InputText
          value={value.wage_amount}
          onChange={(e) =>
            change((v) => ({ ...v, wage_amount: e.target.value }))
          }
        />
      </Field>
      <Field label={i18nT("static.r5qyuw")}>
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
  const { t: i18nT } = useI18n();
  const selectedPtkp = PTKP_OPTIONS.find(
    (option) => option.code === value.ptkp_code,
  );
  return (
    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800 sm:col-span-2 flex items-start gap-2">
        <i className="pi pi-info-circle mt-0.5 text-blue-600 shrink-0" />
        <span>
          {i18nT(
            "NIK and NPWP below are automatically retrieved from Identity & Address. You can still modify them manually if needed.",
          )}
        </span>
      </div>
      <Field
        label={i18nT("static.lvt3nd")}
        helper={i18nT("Retrieved from KTP/NIK in Identity & Address")}
      >
        <InputText
          value={value.nik ?? ""}
          onChange={(e) =>
            change((v) => ({ ...v, nik: e.target.value || null }))
          }
        />
      </Field>
      <Field
        label={i18nT("static.4f980k")}
        helper={i18nT("Retrieved from NPWP in Identity & Address")}
      >
        <InputText
          value={value.npwp ?? ""}
          onChange={(e) =>
            change((v) => ({ ...v, npwp: e.target.value || null }))
          }
        />
      </Field>
      <Field label={i18nT("static.abmxvi")}>
        <Dropdown
          value={value.ptkp_code}
          options={PTKP_OPTIONS.map((option) => ({
            ...option,
            label: i18nT(option.labelKey),
          }))}
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
      <Field label={i18nT("static.10lu6yx")}>
        <InputText
          value={formatIdr(selectedPtkp?.amount)}
          readOnly
          className="bg-slate-50"
        />
      </Field>
      <Field label={i18nT("static.1fa4tsi")}>
        <InputText
          value={selectedPtkp?.ter ?? ""}
          readOnly
          className="bg-slate-50"
        />
      </Field>
      <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800 sm:col-span-2">
        {i18nT("static.krif09")}{" "}
      </div>
      <Field label={i18nT("static.1vur36r")}>
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
            {i18nT("static.p6ft6e")}{" "}
          </span>
          <p className="m-0 text-sm leading-6 text-slate-600">
            {i18nT("static.122xort")}{" "}
          </p>
          {canOverride && (
            <div className="mt-2 flex items-center justify-between gap-4 border-t border-slate-200 pt-3">
              <div>
                <span className="text-sm font-medium text-slate-700">
                  {i18nT("static.1ppop90")}{" "}
                </span>
                <p className="m-0 mt-1 text-xs text-slate-500">
                  {i18nT("static.9bjm1e")}{" "}
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
                placeholder={i18nT("static.1a8w6op")}
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
  const { t: i18nT } = useI18n();
  const activeFrequencies = frequencies.filter(
    (frequency) => frequency.is_active && !frequency.deleted_at,
  );
  return (
    <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
      <Field label={i18nT("static.126qd30")}>
        <InputText
          value={value.base_salary}
          onChange={(e) =>
            change((v) => ({ ...v, base_salary: e.target.value }))
          }
        />
      </Field>
      <Field label={i18nT("static.5o3zh2")}>
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
      <Field label={i18nT("static.ks3sxt")}>
        <Dropdown
          value={value.frequency_id || null}
          options={activeFrequencies}
          optionLabel="name"
          optionValue="id"
          placeholder={i18nT("static.ib7hc1")}
          className="w-full"
          onChange={(event) =>
            change((current) => ({
              ...current,
              frequency_id: event.value ? Number(event.value) : 0,
            }))
          }
        />
        <small className="text-xs leading-5 text-slate-500">
          {i18nT("static.1idelm6")}{" "}
        </small>
      </Field>
      <Field label={i18nT("static.1aar9d6")}>
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
      <Field label={i18nT("static.3pd73")}>
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
      <Field label={i18nT("static.pyvnw3")}>
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
  const { t: i18nT } = useI18n();
  return (
    <>
      <Field label={i18nT("static.8lx39w")}>
        <PrimeDatePicker
          value={from}
          onValueChange={(value) => set(value, to)}
        />
      </Field>
      <Field label={i18nT("static.mtbgcr")}>
        <PrimeDatePicker
          value={to}
          onValueChange={(value) => set(from, value || null)}
        />
      </Field>
    </>
  );
}
