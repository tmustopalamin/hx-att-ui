"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import { useI18n } from "@/app/i18n";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Paginator, PaginatorPageChangeEvent } from "primereact/paginator";

import { fetcher } from "@/app/utils/fetcher";
import { formatDate } from "@/app/utils/date-format";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  PayrollBatch,
  PayrollBatchDetail,
  PayrollEmployeeResultDetail,
} from "@/app/types/payroll-batch";

import ReportHeader from "../_components/ReportHeader";
import ReportFilterCard from "../_components/ReportFilterCard";
import ReportMetricsGrid, {
  MetricCardItem,
} from "../_components/ReportMetricsGrid";
import ReportPrintHeader from "../_components/ReportPrintHeader";
import ReportPrintSignatures from "../_components/ReportPrintSignatures";
import {
  exportReportToExcel,
  exportReportToCsv,
  formatReportTimestamp,
} from "../_components/report-export-utils";

const formatCurrency = (val: string | number | undefined | null) => {
  const num =
    typeof val === "string" ? Number.parseFloat(val) : Number(val || 0);
  if (isNaN(num)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
};

export default function PayrollReportData() {
  const { locale } = useI18n();
  const isId = locale === "id";

  // Batch query
  const {
    data: batches,
    error: batchError,
    isLoading: batchLoading,
    mutate: mutateBatches,
  } = useSWR<PayrollBatch[]>("/api/payroll-batches", fetcher);

  const batchList = useMemo(() => batches ?? [], [batches]);

  // Selected Batch State
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const activeBatchId = useMemo(() => {
    if (selectedBatchId) return selectedBatchId;
    return batchList.length > 0 ? batchList[0].id : null;
  }, [selectedBatchId, batchList]);

  // Query Detail of active batch
  const detailUrl = activeBatchId
    ? `/api/payroll-batches/${activeBatchId}/detail`
    : null;
  const {
    data: batchDetail,
    error: detailError,
    isLoading: detailLoading,
    isValidating: detailValidating,
    mutate: mutateDetail,
  } = useSWR<PayrollBatchDetail>(detailUrl, fetcher);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [first, setFirst] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const activeBatch = useMemo(() => {
    return batchList.find((b) => b.id === activeBatchId) ?? batchDetail?.batch;
  }, [batchList, activeBatchId, batchDetail]);

  const rawEmployees: PayrollEmployeeResultDetail[] = useMemo(() => {
    return batchDetail?.employee_results ?? [];
  }, [batchDetail]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return rawEmployees;
    const q = searchQuery.trim().toLowerCase();
    return rawEmployees.filter((emp) => {
      const name = (emp.employee_name || "").toLowerCase();
      const code = (emp.employee_code || "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [rawEmployees, searchQuery]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    return count;
  }, [searchQuery]);

  // Totals & KPI Metrics
  const {
    metrics,
    totalBaseSalary,
    totalGross,
    totalDeductions,
    totalTax,
    totalTakeHomePay,
    totalCompanyCost,
  } = useMemo(() => {
    let sumBase = 0;
    let sumGross = 0;
    let sumDeduct = 0;
    let sumTax = 0;
    let sumThp = 0;
    let sumCompanyCost = 0;

    for (const emp of filteredEmployees) {
      sumBase += Number.parseFloat(emp.base_salary || "0") || 0;
      sumGross += Number.parseFloat(emp.gross_income || "0") || 0;
      sumDeduct += Number.parseFloat(emp.employee_deduction || "0") || 0;
      sumTax += Number.parseFloat(emp.pph21_amount || "0") || 0;
      sumThp += Number.parseFloat(emp.take_home_pay || "0") || 0;
      sumCompanyCost += Number.parseFloat(emp.company_payroll_cost || "0") || 0;
    }

    const mList: MetricCardItem[] = [
      {
        id: "count",
        label: isId ? "Total Karyawan" : "Employees Paid",
        value: filteredEmployees.length.toLocaleString(),
        subValue: isId ? "Orang dalam batch" : "Total headcount",
        icon: "pi-users",
        tone: "blue",
      },
      {
        id: "thp",
        label: isId ? "Total Gaji Bersih (THP)" : "Total Take Home Pay",
        value: formatCurrency(sumThp),
        subValue: isId ? "Gaji ditransfer" : "Net payout",
        icon: "pi-wallet",
        tone: "emerald",
      },
      {
        id: "gross",
        label: isId ? "Total Penghasilan Bruto" : "Total Gross Earnings",
        value: formatCurrency(sumGross),
        subValue: isId ? "Gaji pokok + tunjangan" : "Gross earnings",
        icon: "pi-chart-line",
        tone: "indigo",
      },
      {
        id: "deduct",
        label: isId ? "Total Potongan Karyawan" : "Total Deductions",
        value: formatCurrency(sumDeduct),
        subValue: isId ? "Iuran BPJS & pinjaman" : "Employee deductions",
        icon: "pi-percentage",
        tone: "rose",
      },
      {
        id: "tax",
        label: isId ? "Total PPh 21" : "Total PPh 21 Tax",
        value: formatCurrency(sumTax),
        subValue: isId ? "Pajak dipotong" : "Income tax withheld",
        icon: "pi-building",
        tone: "amber",
      },
      {
        id: "cost",
        label: isId ? "Total Beban Perusahaan" : "Total Company Cost",
        value: formatCurrency(sumCompanyCost),
        subValue: isId ? "Gross + BPJS Perusahaan" : "Total employer cost",
        icon: "pi-money-bill",
        tone: "slate",
      },
    ];

    return {
      metrics: mList,
      totalBaseSalary: sumBase,
      totalGross: sumGross,
      totalDeductions: sumDeduct,
      totalTax: sumTax,
      totalTakeHomePay: sumThp,
      totalCompanyCost: sumCompanyCost,
    };
  }, [filteredEmployees, isId]);

  // Paginated list
  const paginatedList = useMemo(() => {
    return filteredEmployees.slice(first, first + rowsPerPage);
  }, [filteredEmployees, first, rowsPerPage]);

  // Batch Dropdown Options
  const batchOptions = useMemo(() => {
    return batchList.map((b) => ({
      label: `${b.batch_no} • ${b.period_reference_month || formatDate(b.period_start)} (${b.status})`,
      value: b.id,
    }));
  }, [batchList]);

  // Export handlers
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const detailRows = filteredEmployees.map((emp, index) => {
        const base = Number.parseFloat(emp.base_salary || "0") || 0;
        const gross = Number.parseFloat(emp.gross_income || "0") || 0;
        const deduct = Number.parseFloat(emp.employee_deduction || "0") || 0;
        const tax = Number.parseFloat(emp.pph21_amount || "0") || 0;
        const thp = Number.parseFloat(emp.take_home_pay || "0") || 0;
        const cost = Number.parseFloat(emp.company_payroll_cost || "0") || 0;
        const allowance = Math.max(gross - base, 0);

        return {
          No: index + 1,
          NIK: emp.employee_code || String(emp.employee_id),
          "Nama Karyawan": emp.employee_name || "-",
          "Gaji Pokok": base,
          "Tunjangan & Lembur": allowance,
          "Penghasilan Bruto": gross,
          "Potongan Karyawan": deduct,
          "PPh 21": tax,
          "Gaji Bersih (THP)": thp,
          "Beban Perusahaan": cost,
          Status: emp.status,
        };
      });

      const summaryRows = [
        {
          Parameter: "Laporan",
          Nilai: "Laporan Rekapitulasi Penggajian Karyawan",
        },
        { Parameter: "Nomor Batch", Nilai: activeBatch?.batch_no || "-" },
        {
          Parameter: "Periode Gaji",
          Nilai: activeBatch
            ? `${formatDate(activeBatch.period_start)} s/d ${formatDate(activeBatch.period_end)}`
            : "-",
        },
        {
          Parameter: "Tanggal Pembayaran",
          Nilai: activeBatch ? formatDate(activeBatch.payroll_date) : "-",
        },
        { Parameter: "Status Batch", Nilai: activeBatch?.status || "-" },
        { Parameter: "Total Karyawan", Nilai: filteredEmployees.length },
        { Parameter: "Total Gaji Pokok", Nilai: totalBaseSalary },
        { Parameter: "Total Penghasilan Bruto", Nilai: totalGross },
        { Parameter: "Total Potongan Karyawan", Nilai: totalDeductions },
        { Parameter: "Total PPh 21", Nilai: totalTax },
        { Parameter: "Total Gaji Bersih (THP)", Nilai: totalTakeHomePay },
        { Parameter: "Total Biaya Perusahaan", Nilai: totalCompanyCost },
        {
          Parameter: "Tanggal Ekspor",
          Nilai: dayjs().format("DD/MM/YYYY HH:mm:ss"),
        },
      ];

      exportReportToExcel({
        filename: `laporan_payroll_${activeBatch?.batch_no || "batch"}_${formatReportTimestamp()}`,
        sheets: [
          { sheetName: "Rekap & Parameter", data: summaryRows },
          { sheetName: "Rincian Gaji Karyawan", data: detailRows },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    const rows = filteredEmployees.map((emp, index) => ({
      No: index + 1,
      NIK: emp.employee_code || String(emp.employee_id),
      Nama_Karyawan: emp.employee_name || "",
      Gaji_Pokok: emp.base_salary,
      Gross_Income: emp.gross_income,
      Potongan: emp.employee_deduction,
      PPh_21: emp.pph21_amount,
      Take_Home_Pay: emp.take_home_pay,
      Company_Cost: emp.company_payroll_cost,
      Status: emp.status,
    }));

    exportReportToCsv({
      filename: `rekap_payroll_${activeBatch?.batch_no || "batch"}_${formatReportTimestamp()}`,
      rows,
    });
  };

  return (
    <div className="w-full">
      {/* 1. Header Komponen */}
      <ReportHeader
        title={isId ? "Laporan Penggajian & Payroll" : "Payroll Summary Report"}
        subtitle={
          isId
            ? "Laporan rekapitulasi penggajian karyawan, tunjangan, potongan pajak & BPJS, serta total beban perusahaan"
            : "Executive payroll summary including basic wages, allowances, statutory deductions, tax, and company cost"
        }
        icon="pi-calculator"
        recordCount={filteredEmployees.length}
        loading={batchLoading || detailLoading || detailValidating}
        exportLoading={isExporting}
        onRefresh={() => {
          void mutateBatches();
          void mutateDetail();
        }}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
      />

      {/* 2. Kartu Filter Interaktif */}
      <ReportFilterCard
        activeFilterCount={activeFilterCount}
        onReset={() => {
          setSearchQuery("");
          setFirst(0);
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {/* Batch Selector */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Pilih Batch Payroll" : "Select Payroll Batch"}
            </label>
            <Dropdown
              value={activeBatchId}
              options={batchOptions}
              onChange={(e) => {
                setSelectedBatchId(e.value);
                setFirst(0);
              }}
              placeholder={
                isId ? "Pilih batch payroll..." : "Select payroll batch..."
              }
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Quick Info Box */}
          {activeBatch && (
            <div className="flex flex-col justify-center rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-600">
              <div>
                Periode:{" "}
                <strong className="text-slate-800">
                  {formatDate(activeBatch.period_start)} s/d{" "}
                  {formatDate(activeBatch.period_end)}
                </strong>
              </div>
              <div className="mt-0.5">
                Bayar:{" "}
                <strong className="text-slate-800">
                  {formatDate(activeBatch.payroll_date)}
                </strong>{" "}
                • Status:{" "}
                <Tag
                  value={activeBatch.status}
                  severity={
                    activeBatch.status === "PAID"
                      ? "success"
                      : activeBatch.status === "CALCULATED"
                        ? "info"
                        : "warning"
                  }
                  className="text-[10px] py-0 px-1.5"
                />
              </div>
            </div>
          )}
        </div>

        {/* Pencarian Karyawan */}
        <div className="mt-3 flex items-center gap-2">
          <span className="p-input-icon-left w-full">
            <i className="pi pi-search text-xs" />
            <InputText
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setFirst(0);
              }}
              placeholder={
                isId
                  ? "Cari nama karyawan atau NIK dalam batch payroll ini..."
                  : "Search employee name or code in this payroll batch..."
              }
              className="p-inputtext-sm w-full text-xs"
            />
          </span>
        </div>
      </ReportFilterCard>

      {/* 3. Kartu Statistik Ringkasan (KPI) */}
      <ReportMetricsGrid metrics={metrics} />

      {/* 4. Tampilan Web Interaktif */}
      <div className="report-screen-only rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        {batchError || detailError ? (
          <ErrorNotConnectedToApi
            mutateKey={detailUrl ?? "/api/payroll-batches"}
          />
        ) : batchLoading || detailLoading ? (
          <LoadingDataTable />
        ) : (
          <>
            <DataTable
              value={paginatedList}
              size="small"
              stripedRows
              showGridlines
              emptyMessage={
                isId
                  ? "Tidak ada data rincian gaji untuk batch payroll ini."
                  : "No employee payroll records found for this batch."
              }
              className="text-xs"
            >
              <Column
                header="No"
                body={(_, opt) => first + opt.rowIndex + 1}
                style={{ width: "3.5rem", textAlign: "center" }}
              />
              <Column
                header={isId ? "NIK" : "Code"}
                body={(row: PayrollEmployeeResultDetail) => (
                  <span className="font-mono font-medium text-slate-800">
                    {row.employee_code || String(row.employee_id)}
                  </span>
                )}
                style={{ width: "7rem" }}
              />
              <Column
                header={isId ? "Nama Karyawan" : "Employee Name"}
                body={(row: PayrollEmployeeResultDetail) => (
                  <span className="font-semibold text-slate-900">
                    {row.employee_name || "-"}
                  </span>
                )}
              />
              <Column
                header={isId ? "Gaji Pokok" : "Basic Salary"}
                body={(row: PayrollEmployeeResultDetail) => (
                  <span className="font-mono text-slate-700">
                    {formatCurrency(row.base_salary)}
                  </span>
                )}
                style={{ width: "9rem", textAlign: "right" }}
              />
              <Column
                header={isId ? "Tunjangan/Lembur" : "Allowances"}
                body={(row: PayrollEmployeeResultDetail) => {
                  const base = Number.parseFloat(row.base_salary || "0") || 0;
                  const gross = Number.parseFloat(row.gross_income || "0") || 0;
                  const allowance = Math.max(gross - base, 0);
                  return (
                    <span className="font-mono text-slate-700">
                      {formatCurrency(allowance)}
                    </span>
                  );
                }}
                style={{ width: "9rem", textAlign: "right" }}
              />
              <Column
                header={isId ? "Bruto" : "Gross"}
                body={(row: PayrollEmployeeResultDetail) => (
                  <span className="font-mono font-medium text-slate-900">
                    {formatCurrency(row.gross_income)}
                  </span>
                )}
                style={{ width: "9rem", textAlign: "right" }}
              />
              <Column
                header={isId ? "Potongan" : "Deductions"}
                body={(row: PayrollEmployeeResultDetail) => (
                  <span className="font-mono text-rose-700">
                    - {formatCurrency(row.employee_deduction)}
                  </span>
                )}
                style={{ width: "9rem", textAlign: "right" }}
              />
              <Column
                header="PPh 21"
                body={(row: PayrollEmployeeResultDetail) => (
                  <span className="font-mono text-rose-700">
                    - {formatCurrency(row.pph21_amount)}
                  </span>
                )}
                style={{ width: "8rem", textAlign: "right" }}
              />
              <Column
                header={isId ? "Gaji Bersih (THP)" : "Take Home Pay"}
                body={(row: PayrollEmployeeResultDetail) => (
                  <span className="font-mono font-bold text-emerald-800">
                    {formatCurrency(row.take_home_pay)}
                  </span>
                )}
                style={{ width: "10rem", textAlign: "right" }}
              />
              <Column
                header={isId ? "Biaya Perusahaan" : "Employer Cost"}
                body={(row: PayrollEmployeeResultDetail) => (
                  <span className="font-mono text-slate-600">
                    {formatCurrency(row.company_payroll_cost)}
                  </span>
                )}
                style={{ width: "10rem", textAlign: "right" }}
              />
              <Column
                header="Status"
                body={(row: PayrollEmployeeResultDetail) => (
                  <Tag
                    value={row.status}
                    severity={
                      row.status === "CALCULATED" ? "success" : "warning"
                    }
                    className="text-[10px]"
                  />
                )}
                style={{ width: "6.5rem", textAlign: "center" }}
              />
            </DataTable>

            <Paginator
              first={first}
              rows={rowsPerPage}
              totalRecords={filteredEmployees.length}
              rowsPerPageOptions={[25, 50, 100]}
              onPageChange={(e: PaginatorPageChangeEvent) => {
                setFirst(e.first);
                setRowsPerPage(e.rows);
              }}
              className="mt-3 border-t border-slate-100 pt-2 text-xs"
            />
          </>
        )}
      </div>

      {/* 5. TAMPILAN CETAK RESMI (Direct Print / Print View) */}
      <div className="report-print-root report-print-only w-full bg-white p-4 text-slate-900">
        <ReportPrintHeader
          reportTitle="LAPORAN REKAPITULASI PEMBAYARAN GAJI (PAYROLL)"
          reportSubtitle="Dokumen Rekapitulasi Rincian Gaji, Tunjangan, Potongan, dan Beban Finansial PT Hexing Technology"
          params={[
            { label: "Nomor Batch", value: activeBatch?.batch_no || "-" },
            {
              label: "Periode",
              value: activeBatch
                ? `${formatDate(activeBatch.period_start)} s/d ${formatDate(activeBatch.period_end)}`
                : "-",
            },
            {
              label: "Tanggal Bayar",
              value: activeBatch ? formatDate(activeBatch.payroll_date) : "-",
            },
            { label: "Status Batch", value: activeBatch?.status || "-" },
          ]}
          totalRecords={filteredEmployees.length}
        />

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-300 p-1 text-center w-8">
                No
              </th>
              <th className="border border-slate-300 p-1 text-left w-20">
                NIK
              </th>
              <th className="border border-slate-300 p-1 text-left">
                Nama Karyawan
              </th>
              <th className="border border-slate-300 p-1 text-right w-24">
                Gaji Pokok
              </th>
              <th className="border border-slate-300 p-1 text-right w-24">
                Tunjangan/OT
              </th>
              <th className="border border-slate-300 p-1 text-right w-24">
                Bruto
              </th>
              <th className="border border-slate-300 p-1 text-right w-24">
                Potongan
              </th>
              <th className="border border-slate-300 p-1 text-right w-20">
                PPh 21
              </th>
              <th className="border border-slate-300 p-1 text-right w-28">
                Gaji Bersih (THP)
              </th>
              <th className="border border-slate-300 p-1 text-right w-28">
                Beban Perusahaan
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="border border-slate-300 p-3 text-center text-slate-500"
                >
                  Tidak ada data rincian gaji untuk batch payroll ini.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp, idx) => {
                const base = Number.parseFloat(emp.base_salary || "0") || 0;
                const gross = Number.parseFloat(emp.gross_income || "0") || 0;
                const deduct =
                  Number.parseFloat(emp.employee_deduction || "0") || 0;
                const tax = Number.parseFloat(emp.pph21_amount || "0") || 0;
                const thp = Number.parseFloat(emp.take_home_pay || "0") || 0;
                const cost =
                  Number.parseFloat(emp.company_payroll_cost || "0") || 0;
                const allowance = Math.max(gross - base, 0);

                return (
                  <tr key={emp.id} className="border-b border-slate-300">
                    <td className="border border-slate-300 p-1 text-center font-mono">
                      {idx + 1}
                    </td>
                    <td className="border border-slate-300 p-1 font-mono">
                      {emp.employee_code || String(emp.employee_id)}
                    </td>
                    <td className="border border-slate-300 p-1 font-bold text-slate-900">
                      {emp.employee_name || "-"}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      {formatCurrency(base)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono">
                      {formatCurrency(allowance)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                      {formatCurrency(gross)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono text-rose-900">
                      {formatCurrency(deduct)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono text-rose-900">
                      {formatCurrency(tax)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono font-bold text-emerald-900">
                      {formatCurrency(thp)}
                    </td>
                    <td className="border border-slate-300 p-1 text-right font-mono text-slate-700">
                      {formatCurrency(cost)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredEmployees.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td
                  colSpan={3}
                  className="border border-slate-400 p-1.5 text-right"
                >
                  TOTAL REKAPITULASI:
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">
                  {formatCurrency(totalBaseSalary)}
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">
                  {formatCurrency(Math.max(totalGross - totalBaseSalary, 0))}
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">
                  {formatCurrency(totalGross)}
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono text-rose-900">
                  {formatCurrency(totalDeductions)}
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono text-rose-900">
                  {formatCurrency(totalTax)}
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono text-emerald-950">
                  {formatCurrency(totalTakeHomePay)}
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">
                  {formatCurrency(totalCompanyCost)}
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        <ReportPrintSignatures
          preparedByRole="Staff Payroll & Kompensasi"
          reviewedByRole="Finance & Accounting Manager"
          approvedByRole="Direktur Keuangan / Direktur HRD"
        />
      </div>
    </div>
  );
}
