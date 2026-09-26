"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { getMyPayrollPayslips } from "@/app/services/payroll-batch-service";
import type { PayrollPayslip } from "@/app/types/payroll-batch";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

const payslipUrl = "/api/payroll-payslips/me";

const formatStatusLabel = (status?: string | null) => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (!normalized) return "Unknown";
  return normalized
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

const formatCurrency = (value: string | number | null | undefined) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDuration = (seconds?: number | string | null) => {
  const secs = Number(seconds ?? 0);
  if (!Number.isFinite(secs) || secs <= 0) return "0m";
  const totalMinutes = Math.floor(secs / 60);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}j ${mins}m`;
  if (hours > 0) return `${hours}j`;
  return `${mins}m`;
};

function terbilangAngka(n: number): string {
  const bilangan = [
    "",
    "Satu",
    "Dua",
    "Tiga",
    "Empat",
    "Lima",
    "Enam",
    "Tujuh",
    "Delapan",
    "Sembilan",
    "Sepuluh",
    "Sebelas",
  ];
  n = Math.floor(Math.abs(n));

  if (n < 12) return bilangan[n];
  if (n < 20) return `${terbilangAngka(n - 10)} Belas`;
  if (n < 100)
    return `${terbilangAngka(Math.floor(n / 10))} Puluh ${terbilangAngka(n % 10)}`.trim();
  if (n < 200) return `Seratus ${terbilangAngka(n - 100)}`.trim();
  if (n < 1000)
    return `${terbilangAngka(Math.floor(n / 100))} Ratus ${terbilangAngka(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${terbilangAngka(n - 1000)}`.trim();
  if (n < 1000000)
    return `${terbilangAngka(Math.floor(n / 1000))} Ribu ${terbilangAngka(n % 1000)}`.trim();
  if (n < 1000000000)
    return `${terbilangAngka(Math.floor(n / 1000000))} Juta ${terbilangAngka(n % 1000000)}`.trim();
  if (n < 1000000000000)
    return `${terbilangAngka(Math.floor(n / 1000000000))} Miliar ${terbilangAngka(n % 1000000000)}`.trim();
  return `${n}`;
}

const formatTerbilang = (
  amount: string | number | null | undefined,
): string => {
  const num = Math.round(Number(amount ?? 0));
  if (!Number.isFinite(num) || num <= 0) return "-";
  return `${terbilangAngka(num)} Rupiah`;
};

const formatComponentType = (type: string, isId: boolean) => {
  const normalized = String(type ?? "").toUpperCase();
  if (normalized === "EARNING") {
    return (
      <Tag
        value={isId ? "Pendapatan" : "Earning"}
        severity="success"
        className="text-[11px] font-medium"
      />
    );
  }
  if (normalized === "DEDUCTION") {
    return (
      <Tag
        value={isId ? "Potongan" : "Deduction"}
        severity="danger"
        className="text-[11px] font-medium"
      />
    );
  }
  if (normalized === "EMPLOYER_CONTRIBUTION") {
    return (
      <Tag
        value={isId ? "Iuran Perusahaan" : "Employer Contrib."}
        severity="info"
        className="text-[11px] font-medium"
      />
    );
  }
  if (normalized === "TAX") {
    return (
      <Tag
        value={isId ? "Pajak (PPh 21)" : "Tax"}
        severity="warning"
        className="text-[11px] font-medium"
      />
    );
  }
  return <Tag value={type} severity="secondary" className="text-[11px]" />;
};

const formatComponentSource = (source: string, isId: boolean) => {
  const normalized = String(source ?? "").toUpperCase();
  switch (normalized) {
    case "ATTENDANCE":
      return isId ? "Kehadiran" : "Attendance";
    case "FIXED":
      return isId ? "Tetap" : "Fixed";
    case "PERCENTAGE":
      return isId ? "Persentase" : "Percentage";
    case "FORMULA":
      return "Formula";
    case "REGULATORY":
      return isId ? "Regulasi" : "Regulatory";
    case "ADJUSTMENT":
      return isId ? "Penyesuaian" : "Adjustment";
    case "PERFORMANCE":
      return isId ? "Kinerja" : "Performance";
    case "POSITION_ALLOWANCE":
      return isId ? "Tunjangan Jabatan" : "Position Allowance";
    case "HOLIDAY_POSITION_INCENTIVE":
      return isId ? "Insentif Libur" : "Holiday Incentive";
    case "OVERTIME":
      return isId ? "Lembur" : "Overtime";
    case "MANUAL":
      return "Manual";
    default:
      return source ? source.replace(/_/g, " ") : "-";
  }
};

const renderCalculation = (
  row: PayrollPayslip["snapshot_json"]["components"][number],
  snapshot: PayrollPayslip["snapshot_json"],
  isId: boolean,
) => {
  const code = (row.component_code ?? "").toUpperCase();
  const source = (row.source ?? "").toUpperCase();
  const amounts = snapshot.amounts;
  const attendance = snapshot.attendance as
    Record<string, string | number> | undefined;

  // 1. Basic Salary
  if (code === "BASIC_SALARY") {
    const proration = amounts.proration as Record<string, unknown> | undefined;
    const factor = Number(amounts.proration_factor ?? proration?.factor ?? 1);
    if (factor > 0 && factor < 1) {
      const payableDays = proration?.payable_days ?? attendance?.present_days;
      const denomDays =
        proration?.denominator_days ??
        proration?.scheduled_days ??
        attendance?.scheduled_days;
      const pct = (factor * 100).toFixed(1);
      return (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-800">
            {isId ? "Prorata" : "Proration"}: {String(payableDays)}/
            {String(denomDays)} {isId ? "hari" : "days"}
          </span>
          <span className="text-[11px] text-slate-500">
            ({pct}% {isId ? "dari gaji pokok penuh" : "of base salary"})
          </span>
        </div>
      );
    }
    return (
      <span className="text-slate-600">
        {isId ? "Gaji Penuh (1 Bulan)" : "Full Month (100%)"}
      </span>
    );
  }

  // 2. Overtime
  if (code === "LEMBUR" || source === "OVERTIME") {
    const otSecs = Number(attendance?.approved_overtime_seconds ?? 0);
    const otHours = otSecs > 0 ? (otSecs / 3600).toFixed(1) : null;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-slate-800">
          {otHours
            ? `${otHours} ${isId ? "jam disetujui" : "approved hrs"}`
            : isId
              ? "Lembur Disetujui"
              : "Approved Overtime"}
        </span>
        <span className="text-[11px] text-slate-500">
          {isId
            ? "Tarif: 1/173 × Gaji Pokok (PP 35/2021)"
            : "Rate: 1/173 × Base Salary"}
        </span>
      </div>
    );
  }

  // 3. Late penalty
  if (code === "POTONGAN_KETERLAMBATAN" || code.includes("TERLAMBAT")) {
    const lateSec = Number(attendance?.late_seconds ?? 0);
    const earlySec = Number(attendance?.early_out_seconds ?? 0);
    const lateMins = Math.round(lateSec / 60);
    const earlyMins = Math.round(earlySec / 60);
    const totalMins = lateMins + earlyMins;
    return (
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-slate-800">
          {totalMins > 0
            ? `${totalMins} ${isId ? "menit penalti" : "penalty mins"}`
            : isId
              ? "Penalti Keterlambatan"
              : "Late Penalty"}
        </span>
        {(lateMins > 0 || earlyMins > 0) && (
          <span className="text-[11px] font-medium text-amber-700">
            {lateMins > 0 ? `${lateMins}m ${isId ? "terlambat" : "late"}` : ""}
            {lateMins > 0 && earlyMins > 0 ? " + " : ""}
            {earlyMins > 0
              ? `${earlyMins}m ${isId ? "pulang cepat" : "early departure"}`
              : ""}
          </span>
        )}
        <span className="text-[11px] text-slate-500">
          {isId
            ? "Tarif: 1/173 × Gaji / 60 mnt"
            : "Rate: 1/173 × Base / 60 min"}
        </span>
      </div>
    );
  }

  // 4. BPJS Kesehatan
  if (code === "BPJS_KESEHATAN") {
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          {isId ? "1% Iuran Karyawan" : "1% Employee Share"}
        </span>
        <span className="text-[11px] text-slate-500">
          {isId ? "Batas maks. upah Rp 12.000.000" : "Wage ceiling Rp 12M"}
        </span>
      </div>
    );
  }
  if (code === "BPJS_KESEHATAN_EMPLOYER") {
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          {isId ? "4% Ditanggung Perusahaan" : "4% Employer Share"}
        </span>
        <span className="text-[11px] text-slate-500">
          {isId ? "Manfaat Jaminan Kesehatan" : "Health Benefit"}
        </span>
      </div>
    );
  }

  // 5. BPJS Ketenagakerjaan
  if (code === "BPJS_TK_JHT") {
    return (
      <span className="font-medium text-slate-700">
        {isId ? "2% Iuran JHT Karyawan" : "2% JHT Employee Share"}
      </span>
    );
  }
  if (code === "BPJS_TK_JHT_EMPLOYER") {
    return (
      <span className="font-medium text-slate-700">
        {isId ? "3.7% Iuran JHT Perusahaan" : "3.7% JHT Employer Share"}
      </span>
    );
  }
  if (code === "BPJS_TK_JKK_EMPLOYER") {
    return (
      <span className="font-medium text-slate-700">
        {isId ? "Jaminan Kecelakaan Kerja (Perusahaan)" : "JKK Employer Share"}
      </span>
    );
  }
  if (code === "BPJS_TK_JKM_EMPLOYER") {
    return (
      <span className="font-medium text-slate-700">
        {isId
          ? "0.3% Jaminan Kematian (Perusahaan)"
          : "0.3% JKM Employer Share"}
      </span>
    );
  }
  if (code === "BPJS_TK_JP") {
    return (
      <span className="font-medium text-slate-700">
        {isId ? "1% Jaminan Pensiun Karyawan" : "1% JP Employee Share"}
      </span>
    );
  }
  if (code === "BPJS_TK_JP_EMPLOYER") {
    return (
      <span className="font-medium text-slate-700">
        {isId ? "2% Jaminan Pensiun Perusahaan" : "2% JP Employer Share"}
      </span>
    );
  }

  // 6. Tax PPh 21
  if (code === "PPH_21" || code === "PPH21" || row.component_type === "TAX") {
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          {isId ? "PPh 21 TER Bulanan" : "Monthly TER PPh 21"}
        </span>
        <span className="text-[11px] text-slate-500">
          {isId ? "PP 58/2023 & PMK 168/2023" : "Indonesian Tax Regulation"}
        </span>
      </div>
    );
  }

  // 7. Attendance allowances
  if (source === "ATTENDANCE") {
    const presentDays = attendance?.present_days;
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-slate-800">
          {isId ? "Tunjangan Kehadiran" : "Attendance Allowance"}
        </span>
        {presentDays !== undefined && (
          <span className="text-[11px] text-slate-500">
            {String(presentDays)}{" "}
            {isId ? "hari hadir tercatat" : "present days recorded"}
          </span>
        )}
      </div>
    );
  }

  // 8. Performance bonus
  if (source === "PERFORMANCE") {
    return (
      <span className="font-medium text-slate-700">
        {isId ? "Insentif / Bonus Kinerja Karyawan" : "Performance Incentive"}
      </span>
    );
  }

  // 9. Fixed amount
  if (source === "FIXED") {
    return (
      <span className="text-slate-600">
        {isId ? "Nominal Tetap (Flat)" : "Fixed Amount (Flat)"}
      </span>
    );
  }

  return <span className="text-slate-400">-</span>;
};

const renderCalculationSubtext = (
  item: PayrollPayslip["snapshot_json"]["components"][number],
  snapshot: PayrollPayslip["snapshot_json"],
) => {
  const code = (item.component_code ?? "").toUpperCase();
  const source = (item.source ?? "").toUpperCase();
  const amounts = snapshot.amounts;
  const attendance = snapshot.attendance as
    Record<string, string | number> | undefined;

  if (code === "BASIC_SALARY") {
    const proration = amounts.proration as Record<string, unknown> | undefined;
    const factor = Number(amounts.proration_factor ?? proration?.factor ?? 1);
    if (factor > 0 && factor < 1) {
      const payableDays = proration?.payable_days ?? attendance?.present_days;
      const denomDays =
        proration?.denominator_days ??
        proration?.scheduled_days ??
        attendance?.scheduled_days;
      return (
        <span className="block text-[9px] text-slate-500">
          Prorata {String(payableDays)}/{String(denomDays)} hr (
          {(factor * 100).toFixed(1)}%)
        </span>
      );
    }
    return null;
  }

  if (code === "LEMBUR" || source === "OVERTIME") {
    const otSecs = Number(attendance?.approved_overtime_seconds ?? 0);
    if (otSecs > 0) {
      const hrs = (otSecs / 3600).toFixed(1);
      return (
        <span className="block text-[9px] text-slate-500">
          {hrs} jam lembur disetujui (1/173 × Gaji)
        </span>
      );
    }
    return null;
  }

  if (code === "POTONGAN_KETERLAMBATAN") {
    const lateSec = Number(attendance?.late_seconds ?? 0);
    const earlySec = Number(attendance?.early_out_seconds ?? 0);
    const totalMins = Math.round((lateSec + earlySec) / 60);
    if (totalMins > 0) {
      return (
        <span className="block text-[9px] text-slate-500">
          {totalMins} mnt penalti waktu
        </span>
      );
    }
    return null;
  }

  if (code === "BPJS_KESEHATAN") {
    return (
      <span className="block text-[9px] text-slate-500">1% iuran pekerja</span>
    );
  }
  if (code === "BPJS_TK_JHT") {
    return (
      <span className="block text-[9px] text-slate-500">
        2% iuran JHT pekerja
      </span>
    );
  }
  if (code === "BPJS_TK_JP") {
    return (
      <span className="block text-[9px] text-slate-500">
        1% jaminan pensiun
      </span>
    );
  }
  if (code === "PPH_21" || code === "PPH21" || item.component_type === "TAX") {
    return (
      <span className="block text-[9px] text-slate-500">
        PPh 21 TER bulanan
      </span>
    );
  }
  if (source === "ATTENDANCE" && attendance?.present_days) {
    return (
      <span className="block text-[9px] text-slate-500">
        {String(attendance.present_days)} hari hadir
      </span>
    );
  }
  return null;
};

export default function MyPayslipsData() {
  const { t: i18nT, locale } = useI18n();
  const isId = locale === "id";
  const { data, error, isLoading } = useSWR<PayrollPayslip[]>(
    payslipUrl,
    getMyPayrollPayslips,
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = useMemo(
    () =>
      data?.find((payslip) => payslip.id === selectedId) ?? data?.[0] ?? null,
    [data, selectedId],
  );

  if (isLoading) return <LoadingDataTable />;
  if (error || !data) return <ErrorNotConnectedToApi mutateKey={payslipUrl} />;

  return (
    <div className="flex flex-col gap-5">
      <Card className="border border-slate-200 shadow-xs">
        <div className="flex items-start gap-3 p-3 sm:p-4 md:p-5">
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
            <i className="pi pi-wallet text-xl" />
          </div>
          <div>
            <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
              {i18nT("static.18hf8vs")}{" "}
            </h1>
            <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
              {isId
                ? "Daftar slip gaji resmi yang telah dipublikasikan oleh bagian payroll."
                : i18nT("static.k2uw42")}{" "}
            </p>
          </div>
        </div>
      </Card>

      <Card className="border border-slate-200 shadow-xs">
        <div className="p-3 sm:p-4 md:p-5">
          <DataTable
            value={data}
            dataKey="id"
            selectionMode="single"
            selection={selected}
            onSelectionChange={(event) =>
              setSelectedId((event.value as PayrollPayslip).id)
            }
            paginator
            rows={10}
            stripedRows
            rowHover
            scrollable
            responsiveLayout="scroll"
            size="small"
            tableStyle={{ minWidth: "48rem" }}
            emptyMessage={i18nT("static.c7p42h")}
          >
            <Column
              field="payslip_no"
              header={i18nT("static.7ovzpo")}
              sortable
            />
            <Column
              header={i18nT("static.11hwh7o")}
              body={(row: PayrollPayslip) =>
                `${formatDisplayDate(row.snapshot_json.batch.period_start)} – ${formatDisplayDate(row.snapshot_json.batch.period_end)}`
              }
            />
            <Column
              field="snapshot_json.batch.payroll_date"
              header={i18nT("static.1tkvpiv")}
              body={(row: PayrollPayslip) =>
                formatDisplayDate(row.snapshot_json.batch.payroll_date)
              }
            />
            <Column
              header={i18nT("static.1brz9dr")}
              body={(row: PayrollPayslip) => (
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(row.snapshot_json.amounts.take_home_pay)}
                </span>
              )}
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: PayrollPayslip) => (
                <Tag
                  value={i18nT(formatStatusLabel(row.status))}
                  severity="success"
                />
              )}
            />
          </DataTable>
        </div>
      </Card>

      {selected && <PayslipSummary payslip={selected} />}
    </div>
  );
}

function PayslipSummary({ payslip }: { payslip: PayrollPayslip }) {
  const { t: i18nT, locale } = useI18n();
  const isId = locale === "id";
  const { amounts, batch, components, employee } = payslip.snapshot_json;
  const attendance = payslip.snapshot_json.attendance as
    Record<string, string | number> | undefined;

  const [viewMode, setViewMode] = useState<"INTERACTIVE" | "DOCUMENT">(
    "INTERACTIVE",
  );
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredComponents = useMemo(() => {
    if (filterType === "ALL") return components;
    return components.filter(
      (c) => c.component_type?.toUpperCase() === filterType,
    );
  }, [components, filterType]);

  const earnings = useMemo(
    () =>
      components.filter((c) => c.component_type?.toUpperCase() === "EARNING"),
    [components],
  );

  const deductionsAndTax = useMemo(
    () =>
      components.filter(
        (c) =>
          c.component_type?.toUpperCase() === "DEDUCTION" ||
          c.component_type?.toUpperCase() === "TAX",
      ),
    [components],
  );

  const employerContribs = useMemo(
    () =>
      components.filter(
        (c) => c.component_type?.toUpperCase() === "EMPLOYER_CONTRIBUTION",
      ),
    [components],
  );

  const subtotalEarnings = useMemo(
    () => earnings.reduce((acc, c) => acc + Number(c.amount || 0), 0),
    [earnings],
  );

  const subtotalDeductions = useMemo(
    () =>
      components
        .filter((c) => c.component_type?.toUpperCase() === "DEDUCTION")
        .reduce((acc, c) => acc + Number(c.amount || 0), 0),
    [components],
  );

  const subtotalTax = useMemo(
    () =>
      components
        .filter((c) => c.component_type?.toUpperCase() === "TAX")
        .reduce((acc, c) => acc + Number(c.amount || 0), 0),
    [components],
  );

  const totalDeductions = useMemo(
    () => deductionsAndTax.reduce((acc, c) => acc + Number(c.amount || 0), 0),
    [deductionsAndTax],
  );

  const subtotalEmployer = useMemo(
    () => employerContribs.reduce((acc, c) => acc + Number(c.amount || 0), 0),
    [employerContribs],
  );

  return (
    <Card className="payslip-print-root border border-slate-200 shadow-xs">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        {/* Navigation & Action Bar (Hidden during print) */}
        <div className="payslip-print-actions flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="m-0 text-base font-bold text-slate-800 sm:text-lg">
                {payslip.payslip_no}
              </h2>
              <Tag
                value={isId ? "Telah Terbit" : i18nT("static.1drx2ll")}
                severity="success"
              />
            </div>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {isId ? "Periode Penggajian" : "Payroll Period"}:{" "}
              <span className="font-medium text-slate-700">
                {formatDisplayDate(batch.period_start)} {i18nT("static.idyip0")}{" "}
                {formatDisplayDate(batch.period_end)}
              </span>{" "}
              • {isId ? "Tanggal Pembayaran" : "Payment Date"}:{" "}
              <span className="font-medium text-slate-700">
                {formatDisplayDate(batch.payroll_date)}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              label={
                viewMode === "INTERACTIVE"
                  ? isId
                    ? "Pratinjau Lembar Resmi (1 Lembar)"
                    : "Print Sheet Preview (1 Page)"
                  : isId
                    ? "Tampilan Interaktif"
                    : "Interactive View"
              }
              icon={
                viewMode === "INTERACTIVE" ? "pi pi-file-pdf" : "pi pi-table"
              }
              severity="secondary"
              outlined
              size="small"
              onClick={() =>
                setViewMode((curr) =>
                  curr === "INTERACTIVE" ? "DOCUMENT" : "INTERACTIVE",
                )
              }
            />
            <Button
              label={isId ? "Cetak / Simpan PDF" : i18nT("static.5db01g")}
              icon="pi pi-print"
              size="small"
              onClick={() => window.print()}
            />
          </div>
        </div>

        {/* ======================================================== */}
        {/* 1. INTERACTIVE SCREEN VIEW (when viewMode === "INTERACTIVE") */}
        {/* ======================================================== */}
        {viewMode === "INTERACTIVE" && (
          <div className="payslip-screen-only flex flex-col gap-5">
            {/* Employee Info Header */}
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 sm:grid-cols-4">
              <PayslipDetail
                label={isId ? "Nama Karyawan" : i18nT("static.1fak8xt")}
                value={employee.employee_name}
              />
              <PayslipDetail
                label={
                  isId ? "Nomor Induk Karyawan (NIK)" : i18nT("static.1lghzb2")
                }
                value={employee.employee_code}
              />
              <PayslipDetail
                label={isId ? "Jabatan / Posisi" : "Position"}
                value={employee.position_name ?? "-"}
              />
              <PayslipDetail
                label={isId ? "Departemen / Divisi" : i18nT("static.1430r53")}
                value={employee.department_name ?? "-"}
              />
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Amount
                label={
                  isId ? "Pendapatan Kotor (Gross)" : i18nT("static.awjta6")
                }
                value={amounts.gross_income}
              />
              <Amount
                label={isId ? "Potongan Karyawan" : i18nT("static.1yemymq")}
                value={amounts.employee_deduction}
                isDeduction
              />
              <Amount
                label={isId ? "Pajak PPh 21" : i18nT("static.mlv85w")}
                value={amounts.pph21_amount}
                isDeduction
              />
              <Amount
                label={
                  isId ? "Gaji Bersih Diterima (THP)" : i18nT("static.1brz9dr")
                }
                value={amounts.take_home_pay}
                emphasized
              />
            </div>

            {/* Attendance Summary Strip */}
            {attendance && (
              <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <h3 className="m-0 mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <i className="pi pi-calendar text-sm text-blue-600" />
                  {isId
                    ? "Ringkasan Kehadiran & Waktu Kerja"
                    : "Attendance & Work Hours Summary"}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  <Metric
                    label={isId ? "Hari Kerja" : "Scheduled"}
                    value={String(attendance.scheduled_days ?? "-")}
                    suffix={isId ? "hari" : "days"}
                  />
                  <Metric
                    label={isId ? "Hadir" : "Present"}
                    value={String(attendance.present_days ?? "-")}
                    suffix={isId ? "hari" : "days"}
                  />
                  <Metric
                    label={isId ? "Cuti Berbayar" : "Paid Leave"}
                    value={String(attendance.paid_leave_days ?? "0")}
                    suffix={isId ? "hari" : "days"}
                  />
                  <Metric
                    label={isId ? "Izin / Alpa" : "Unpaid / Absent"}
                    value={String(
                      Number(attendance.unpaid_leave_days ?? 0) +
                        Number(attendance.absent_days ?? 0),
                    )}
                    suffix={isId ? "hari" : "days"}
                  />
                  <Metric
                    label={isId ? "Lembur Disetujui" : "Approved Overtime"}
                    value={formatDuration(attendance.approved_overtime_seconds)}
                  />
                  <Metric
                    label={
                      isId ? "Terlambat / Pulang Cepat" : "Late / Early Out"
                    }
                    value={`${formatDuration(attendance.late_seconds)} / ${formatDuration(attendance.early_out_seconds)}`}
                  />
                </div>
              </section>
            )}

            {/* Payroll Components Section */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="m-0 text-sm font-semibold text-slate-800">
                    {isId ? "Rincian Komponen Gaji" : i18nT("static.11zzcwa")}
                  </h3>
                  <p className="m-0 mt-0.5 text-xs text-slate-500">
                    {isId
                      ? "Rincian seluruh pendapatan, potongan, pajak PPh 21, dan iuran perusahaan periode ini."
                      : "Breakdown of earnings, deductions, taxes, and company contributions."}
                  </p>
                </div>

                {/* Filter buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    {
                      key: "ALL",
                      label: isId ? "Semua" : "All",
                      count: components.length,
                    },
                    {
                      key: "EARNING",
                      label: isId ? "Pendapatan" : "Earnings",
                      count: earnings.length,
                    },
                    {
                      key: "DEDUCTION",
                      label: isId ? "Potongan" : "Deductions",
                      count: components.filter(
                        (c) => c.component_type?.toUpperCase() === "DEDUCTION",
                      ).length,
                    },
                    {
                      key: "TAX",
                      label: isId ? "Pajak (PPh 21)" : "Tax",
                      count: components.filter(
                        (c) => c.component_type?.toUpperCase() === "TAX",
                      ).length,
                    },
                    {
                      key: "EMPLOYER_CONTRIBUTION",
                      label: isId ? "Iuran Perusahaan" : "Employer",
                      count: employerContribs.length,
                    },
                  ]
                    .filter((tab) => tab.count > 0 || tab.key === "ALL")
                    .map((tab) => (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilterType(tab.key)}
                        className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          filterType === tab.key
                            ? "bg-slate-800 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {tab.label} ({tab.count})
                      </button>
                    ))}
                </div>
              </div>

              <DataTable
                value={filteredComponents}
                size="small"
                stripedRows
                scrollable
                responsiveLayout="scroll"
                tableStyle={{ minWidth: "52rem" }}
                emptyMessage={
                  isId ? "Tidak ada komponen gaji." : "No payroll components."
                }
              >
                <Column
                  field="component_name"
                  header={isId ? "Komponen" : i18nT("static.bvqo3k")}
                  body={(
                    row: PayrollPayslip["snapshot_json"]["components"][number],
                  ) => (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">
                          {row.component_name}
                        </span>
                        {row.component_type === "EMPLOYER_CONTRIBUTION" ||
                        !row.affects_take_home_pay ? (
                          <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
                            {isId ? "Ditanggung Perusahaan" : "Company Borne"}
                          </span>
                        ) : null}
                        {row.taxable ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                            {isId ? "Objek Pajak" : "Taxable"}
                          </span>
                        ) : null}
                      </div>
                      <span className="font-mono text-xs text-slate-400">
                        {row.component_code}
                      </span>
                    </div>
                  )}
                />
                <Column
                  field="component_type"
                  header={isId ? "Tipe" : i18nT("static.1m2zofh")}
                  body={(
                    row: PayrollPayslip["snapshot_json"]["components"][number],
                  ) => formatComponentType(row.component_type, isId)}
                  style={{ width: "9rem" }}
                />
                <Column
                  field="source"
                  header={isId ? "Sumber" : i18nT("static.r5qyuw")}
                  body={(
                    row: PayrollPayslip["snapshot_json"]["components"][number],
                  ) => (
                    <span className="text-xs font-medium text-slate-600">
                      {formatComponentSource(row.source, isId)}
                    </span>
                  )}
                  style={{ width: "8rem" }}
                />
                <Column
                  header={
                    isId ? "Perhitungan / Keterangan" : "Calculation Details"
                  }
                  body={(
                    row: PayrollPayslip["snapshot_json"]["components"][number],
                  ) => renderCalculation(row, payslip.snapshot_json, isId)}
                  style={{ minWidth: "15rem" }}
                />
                <Column
                  header={isId ? "Nominal" : i18nT("static.a2ky21")}
                  body={(
                    row: PayrollPayslip["snapshot_json"]["components"][number],
                  ) => {
                    const type = row.component_type?.toUpperCase();
                    const isEarning = type === "EARNING";
                    const isDeduction = type === "DEDUCTION" || type === "TAX";
                    return (
                      <span
                        className={`font-semibold ${
                          isEarning
                            ? "text-emerald-700"
                            : isDeduction
                              ? "text-rose-700"
                              : "text-slate-800"
                        }`}
                      >
                        {isEarning ? "+ " : isDeduction ? "- " : ""}
                        {formatCurrency(row.amount)}
                      </span>
                    );
                  }}
                  style={{ width: "10rem", textAlign: "right" }}
                />
              </DataTable>

              {/* Subtotals & Take Home Pay Summary Footer Card */}
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 md:border-r md:border-b-0 md:pb-0 md:pr-4">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>
                        {isId
                          ? "Total Pendapatan Kotor (Earnings):"
                          : "Total Gross Earnings:"}
                      </span>
                      <span className="font-semibold text-emerald-700">
                        +{" "}
                        {formatCurrency(
                          subtotalEarnings || amounts.gross_income,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>
                        {isId
                          ? "Total Potongan Karyawan (Deductions):"
                          : "Total Employee Deductions:"}
                      </span>
                      <span className="font-semibold text-rose-700">
                        -{" "}
                        {formatCurrency(
                          subtotalDeductions || amounts.employee_deduction,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>
                        {isId
                          ? "Potongan PPh 21 (Tax):"
                          : "PPh 21 Tax Withheld:"}
                      </span>
                      <span className="font-semibold text-rose-700">
                        - {formatCurrency(subtotalTax || amounts.pph21_amount)}
                      </span>
                    </div>
                    {subtotalEmployer > 0 && (
                      <div className="flex justify-between border-t border-slate-200 pt-1 text-xs text-slate-500">
                        <span>
                          {isId
                            ? "Iuran Perusahaan (Benefit BPJS):"
                            : "Employer Contributions:"}
                        </span>
                        <span className="font-medium text-slate-700">
                          {formatCurrency(
                            subtotalEmployer || amounts.employer_contribution,
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-center rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 sm:p-4">
                    <span className="text-xs font-semibold text-emerald-800">
                      {isId
                        ? "Gaji Bersih Diterima (Take Home Pay)"
                        : "Net Take Home Pay"}
                    </span>
                    <span className="mt-1 text-xl font-bold tracking-tight text-emerald-900 sm:text-2xl">
                      {formatCurrency(amounts.take_home_pay)}
                    </span>
                    <span className="mt-0.5 text-[11px] text-emerald-700">
                      {isId
                        ? "Gaji bersih yang telah ditransfer ke rekening bank Anda."
                        : "Net amount transferred to your bank account."}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. OFFICIAL 1-PAGE DOCUMENT SHEET (Print & Document Preview) */}
        {/* ======================================================== */}
        <div
          className={`${
            viewMode === "DOCUMENT" ? "block" : "payslip-print-only"
          }`}
        >
          <OfficialPayslipSheet
            payslip={payslip}
            earnings={earnings}
            deductionsAndTax={deductionsAndTax}
            employerContribs={employerContribs}
            totalEarnings={subtotalEarnings || Number(amounts.gross_income)}
            totalDeductions={totalDeductions}
            totalEmployer={
              subtotalEmployer || Number(amounts.employer_contribution)
            }
          />
        </div>
      </div>
    </Card>
  );
}

function OfficialPayslipSheet({
  payslip,
  earnings,
  deductionsAndTax,
  employerContribs,
  totalEarnings,
  totalDeductions,
  totalEmployer,
}: {
  payslip: PayrollPayslip;
  earnings: PayrollPayslip["snapshot_json"]["components"];
  deductionsAndTax: PayrollPayslip["snapshot_json"]["components"];
  employerContribs: PayrollPayslip["snapshot_json"]["components"];
  totalEarnings: number;
  totalDeductions: number;
  totalEmployer: number;
}) {
  const { batch, employee, amounts } = payslip.snapshot_json;
  const attendance = payslip.snapshot_json.attendance as
    Record<string, string | number> | undefined;

  return (
    <div className="mx-auto w-full max-w-[210mm] rounded-lg border border-slate-300 bg-white p-5 text-slate-900 shadow-sm print:max-w-none print:border-0 print:p-0 print:shadow-none">
      {/* KOP SURAT RESMI */}
      <div className="border-b-2 border-slate-800 pb-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Logo Resmi Perusahaan */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="PT. Hexing Technology"
              className="h-10 w-auto object-contain sm:h-11"
            />
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-wide text-slate-900 sm:text-base">
                PT. HEXING TECHNOLOGY
              </span>
              <span className="text-[10px] leading-tight text-slate-600">
                Kawasan Industri Mitrakarawang, Jl. Mitra Raya II Blok E No.
                5-7, Parungmulya, Ciampel, Karawang, Jawa Barat 41361
              </span>
              <span className="text-[10px] text-slate-500">
                Telepon: (021) 8911-9988 • Email: hrd@hexing.co.id • Website:
                www.hexing.co.id
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-block rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-rose-700">
              CONFIDENTIAL
            </span>
            <div className="mt-1 font-mono text-[11px] font-semibold text-slate-700">
              No: {payslip.payslip_no}
            </div>
          </div>
        </div>
      </div>

      {/* JUDUL DOKUMEN */}
      <div className="my-2.5 text-center">
        <h1 className="m-0 text-sm font-bold tracking-wider text-slate-900 sm:text-base">
          SLIP GAJI KARYAWAN
        </h1>
        <p className="m-0 mt-0.5 text-[10.5px] text-slate-600">
          Periode:{" "}
          <strong className="text-slate-800">
            {formatDisplayDate(batch.period_start)} s/d{" "}
            {formatDisplayDate(batch.period_end)}
          </strong>{" "}
          • Tanggal Pembayaran:{" "}
          <strong className="text-slate-800">
            {formatDisplayDate(batch.payroll_date)}
          </strong>
        </p>
      </div>

      {/* DATA KARYAWAN */}
      <table className="mb-2 w-full border-collapse border border-slate-300 bg-slate-50/60 text-[10.5px]">
        <tbody>
          <tr className="border-b border-slate-200">
            <td className="w-24 border-r border-slate-200 px-2 py-1 text-slate-500">
              Nama
            </td>
            <td className="border-r border-slate-300 px-2 py-1 font-bold text-slate-900">
              {employee.employee_name}
            </td>
            <td className="w-28 border-r border-slate-200 px-2 py-1 text-slate-500">
              Jabatan / Posisi
            </td>
            <td className="px-2 py-1 font-bold text-slate-900">
              {employee.position_name ?? "-"}
            </td>
          </tr>
          <tr className="border-b border-slate-200">
            <td className="border-r border-slate-200 px-2 py-1 text-slate-500">
              NIK
            </td>
            <td className="border-r border-slate-300 px-2 py-1 font-bold text-slate-900">
              {employee.employee_code}
            </td>
            <td className="border-r border-slate-200 px-2 py-1 text-slate-500">
              Departemen
            </td>
            <td className="px-2 py-1 font-bold text-slate-900">
              {employee.department_name ?? "-"}
            </td>
          </tr>
          <tr>
            <td className="border-r border-slate-200 px-2 py-1 text-slate-500">
              Status Karyawan
            </td>
            <td className="border-r border-slate-300 px-2 py-1 font-semibold text-slate-800">
              {employee.employment_status_name ?? "Karyawan Tetap"}
            </td>
            <td className="border-r border-slate-200 px-2 py-1 text-slate-500">
              Lokasi Kerja
            </td>
            <td className="px-2 py-1 font-semibold text-slate-800">
              {employee.branch_name ?? "Karawang Plant"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* RINGKASAN KEHADIRAN (HORIZONTAL STRIP) */}
      {attendance && (
        <div className="mb-2.5 rounded border border-slate-300 bg-white p-1 text-[10px]">
          <div className="grid grid-cols-6 divide-x divide-slate-200 text-center">
            <div>
              <span className="text-slate-500">Hari Kerja: </span>
              <strong className="text-slate-800">
                {attendance.scheduled_days ?? "-"}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Hadir: </span>
              <strong className="text-slate-800">
                {attendance.present_days ?? "-"}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Cuti: </span>
              <strong className="text-slate-800">
                {attendance.paid_leave_days ?? "0"}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Izin / Alpa: </span>
              <strong className="text-slate-800">
                {Number(attendance.unpaid_leave_days ?? 0) +
                  Number(attendance.absent_days ?? 0)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Lembur: </span>
              <strong className="text-slate-800">
                {formatDuration(attendance.approved_overtime_seconds)}
              </strong>
            </div>
            <div>
              <span className="text-slate-500">Terlambat: </span>
              <strong className="text-slate-800">
                {formatDuration(attendance.late_seconds)}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 2-KOLOM: PENDAPATAN & POTONGAN */}
      <div className="mb-2 grid grid-cols-2 gap-2.5">
        {/* KOLOM KIRI: PENGHASILAN (EARNINGS) */}
        <div className="flex flex-col justify-between rounded border border-slate-300">
          <div>
            <div className="flex justify-between border-b border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-800">
              <span>I. PENGHASILAN / PENDAPATAN</span>
              <span>JUMLAH (RP)</span>
            </div>
            <table className="w-full text-[10px]">
              <tbody className="divide-y divide-slate-100">
                {earnings.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-1">
                      <div className="font-semibold text-slate-800">
                        {item.component_name}
                      </div>
                      {renderCalculationSubtext(item, payslip.snapshot_json)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right font-semibold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between border-t border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-900">
            <span>TOTAL PENGHASILAN (A)</span>
            <span className="text-emerald-800">
              {formatCurrency(totalEarnings)}
            </span>
          </div>
        </div>

        {/* KOLOM KANAN: POTONGAN (DEDUCTIONS) */}
        <div className="flex flex-col justify-between rounded border border-slate-300">
          <div>
            <div className="flex justify-between border-b border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-800">
              <span>II. POTONGAN</span>
              <span>JUMLAH (RP)</span>
            </div>
            <table className="w-full text-[10px]">
              <tbody className="divide-y divide-slate-100">
                {deductionsAndTax.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-2 py-1">
                      <div className="font-semibold text-slate-800">
                        {item.component_name}
                      </div>
                      {renderCalculationSubtext(item, payslip.snapshot_json)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-1 text-right font-semibold text-rose-700">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-between border-t border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] font-bold text-slate-900">
            <span>TOTAL POTONGAN (B)</span>
            <span className="text-rose-700">
              {formatCurrency(totalDeductions)}
            </span>
          </div>
        </div>
      </div>

      {/* KOTAK TAKE HOME PAY */}
      <div className="mb-2 rounded border-2 border-slate-800 bg-slate-50/90 p-2.5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-900 sm:text-xs">
              GAJI BERSIH DITERIMA (TAKE HOME PAY = A - B)
            </span>
            <div className="mt-0.5 text-[10px] italic text-slate-700">
              Terbilang: {formatTerbilang(amounts.take_home_pay)}
            </div>
          </div>
          <div className="text-right">
            <span className="text-base font-extrabold text-slate-900 sm:text-lg">
              {formatCurrency(amounts.take_home_pay)}
            </span>
          </div>
        </div>
      </div>

      {/* BENEFIT PERUSAHAAN (INFORMASI TAMBAHAN) */}
      {employerContribs.length > 0 && (
        <div className="mb-2.5 rounded border border-slate-200 bg-slate-50/40 px-2 py-1 text-[9.5px] leading-tight text-slate-600">
          <span className="font-bold text-slate-700">
            Iuran BPJS Ditanggung Perusahaan:
          </span>{" "}
          {employerContribs
            .map((c) => `${c.component_name}: ${formatCurrency(c.amount)}`)
            .join(" • ")}{" "}
          (Total:{" "}
          <strong className="text-slate-800">
            {formatCurrency(totalEmployer)}
          </strong>{" "}
          - <em>Manfaat BPJS, tidak mengurangi take home pay</em>)
        </div>
      )}

      {/* TANDA TANGAN & PENGESAHAN */}
      <div className="mt-2 text-[10.5px]">
        <div className="flex items-end justify-between px-6">
          <div className="w-48 text-center">
            <p className="m-0 text-slate-600">Diterima oleh,</p>
            <div className="h-10" />
            <p className="m-0 font-bold text-slate-900 underline">
              {employee.employee_name}
            </p>
            <p className="m-0 text-[9.5px] text-slate-500">Karyawan</p>
          </div>
          <div className="w-48 text-center">
            <p className="m-0 text-slate-600">
              Karawang, {formatDisplayDate(batch.payroll_date)}
            </p>
            <p className="m-0 text-slate-600">PT. Hexing Technology,</p>
            <div className="h-8" />
            <p className="m-0 font-bold text-slate-900 underline">
              Bagian Payroll / HRD
            </p>
            <p className="m-0 text-[9.5px] text-slate-500">
              Authorized Signature
            </p>
          </div>
        </div>
        <div className="mt-2.5 border-t border-slate-200 pt-1 text-center text-[9px] text-slate-400">
          Dokumen ini diterbitkan secara resmi melalui Sistem HRIS PT. Hexing
          Technology dan sah tanpa tanda tangan basah jika terverifikasi dalam
          sistem.
        </div>
      </div>
    </div>
  );
}

function PayslipDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="shadow-2xs flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-2.5">
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p className="m-0 mt-1 text-sm font-semibold text-slate-800">
        {value}
        {suffix ? ` ${suffix}` : ""}
      </p>
    </div>
  );
}

function Amount({
  label,
  value,
  emphasized = false,
  isDeduction = false,
}: {
  label: string;
  value: string | number;
  emphasized?: boolean;
  isDeduction?: boolean;
}) {
  return (
    <div
      className={
        emphasized
          ? "shadow-2xs rounded-lg border border-emerald-200 bg-emerald-50/80 p-3"
          : isDeduction
            ? "rounded-lg border border-rose-100 bg-rose-50/50 p-3"
            : "rounded-lg border border-slate-200 bg-slate-50 p-3"
      }
    >
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p
        className={
          emphasized
            ? "m-0 mt-1 text-base font-bold text-emerald-800 sm:text-lg"
            : isDeduction
              ? "m-0 mt-1 text-sm font-semibold text-rose-700 sm:text-base"
              : "m-0 mt-1 text-sm font-semibold text-slate-800 sm:text-base"
        }
      >
        {isDeduction && Number(value) > 0 ? "- " : ""}
        {formatCurrency(value)}
      </p>
    </div>
  );
}
