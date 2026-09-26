"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import dayjs from "dayjs";
import { useI18n } from "@/app/i18n";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { InputText } from "primereact/inputtext";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { Paginator, PaginatorPageChangeEvent } from "primereact/paginator";

import { fetcher } from "@/app/utils/fetcher";
import { formatDate, formatDateTimeWithSeconds } from "@/app/utils/date-format";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";

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

interface AttendanceLogItem {
  id: number;
  employee_id?: number | null;
  employee_name?: string | null;
  machine_id?: number | null;
  machine_name?: string | null;
  machine_pin?: string | null;
  event_time: string;
  source_type: string;
  status: string;
  processed: boolean;
  processed_at?: string | null;
  external_ref_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PaginatedAttendanceLogResponse {
  data: AttendanceLogItem[];
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

type DatePreset =
  "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";

export default function AttendanceLogReportData() {
  const { locale } = useI18n();
  const isId = locale === "id";

  // Filter States
  const [datePreset, setDatePreset] = useState<DatePreset>("THIS_MONTH");
  const [startDate, setStartDate] = useState<Date | null>(
    dayjs().startOf("month").toDate(),
  );
  const [endDate, setEndDate] = useState<Date | null>(
    dayjs().endOf("month").toDate(),
  );
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [processedFilter, setProcessedFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination States
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Preset Handler
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = dayjs();
    if (preset === "TODAY") {
      setStartDate(now.startOf("day").toDate());
      setEndDate(now.endOf("day").toDate());
    } else if (preset === "THIS_WEEK") {
      setStartDate(now.startOf("week").toDate());
      setEndDate(now.endOf("week").toDate());
    } else if (preset === "THIS_MONTH") {
      setStartDate(now.startOf("month").toDate());
      setEndDate(now.endOf("month").toDate());
    } else if (preset === "LAST_MONTH") {
      const lastMonth = now.subtract(1, "month");
      setStartDate(lastMonth.startOf("month").toDate());
      setEndDate(lastMonth.endOf("month").toDate());
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setDatePreset("THIS_MONTH");
    setStartDate(dayjs().startOf("month").toDate());
    setEndDate(dayjs().endOf("month").toDate());
    setStatusFilter("ALL");
    setSourceFilter("ALL");
    setProcessedFilter("ALL");
    setSearchQuery("");
    setPage(1);
  };

  // Build SWR Query URL
  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("page_size", String(pageSize));

    if (startDate) {
      params.set("start_date", dayjs(startDate).format("YYYY-MM-DD"));
    }
    if (endDate) {
      params.set("end_date", dayjs(endDate).format("YYYY-MM-DD"));
    }
    if (statusFilter && statusFilter !== "ALL") {
      params.set("status", statusFilter);
    }
    if (sourceFilter && sourceFilter !== "ALL") {
      params.set("source_type", sourceFilter);
    }
    if (processedFilter && processedFilter !== "ALL") {
      params.set("processed", processedFilter);
    }
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim());
    }

    return `/api/attendance-log?${params.toString()}`;
  }, [
    page,
    pageSize,
    startDate,
    endDate,
    statusFilter,
    sourceFilter,
    processedFilter,
    searchQuery,
  ]);

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<PaginatedAttendanceLogResponse>(queryUrl, fetcher);

  const logs = useMemo(() => data?.data ?? [], [data]);
  const totalRecords = data?.total_records ?? 0;

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (datePreset !== "THIS_MONTH") count++;
    if (statusFilter !== "ALL") count++;
    if (sourceFilter !== "ALL") count++;
    if (processedFilter !== "ALL") count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [datePreset, statusFilter, sourceFilter, processedFilter, searchQuery]);

  // Metrics summary
  const metrics: MetricCardItem[] = useMemo(() => {
    let validCount = 0;
    let pendingCount = 0;
    let invalidCount = 0;
    let processedCount = 0;

    for (const log of logs) {
      const st = String(log.status ?? "").toUpperCase();
      if (st === "VALID") validCount++;
      else if (st === "PENDING_REVIEW") pendingCount++;
      else invalidCount++;

      if (log.processed) processedCount++;
    }

    return [
      {
        id: "total",
        label: isId ? "Total Transaksi" : "Total Logs",
        value: totalRecords.toLocaleString(),
        subValue: isId ? "Hasil filter" : "Filtered results",
        icon: "pi-list",
        tone: "blue",
      },
      {
        id: "valid",
        label: isId ? "Log Valid" : "Valid Logs",
        value: validCount,
        subValue: isId ? "Halaman ini" : "On this page",
        icon: "pi-check-circle",
        tone: "emerald",
      },
      {
        id: "pending",
        label: isId ? "Perlu Review" : "Pending Review",
        value: pendingCount,
        subValue: isId ? "Halaman ini" : "On this page",
        icon: "pi-exclamation-triangle",
        tone: "amber",
      },
      {
        id: "invalid",
        label: isId ? "Log Invalid" : "Invalid Logs",
        value: invalidCount,
        subValue: isId ? "Halaman ini" : "On this page",
        icon: "pi-times-circle",
        tone: "rose",
      },
      {
        id: "processed",
        label: isId ? "Sudah Diproses" : "Processed Logs",
        value: processedCount,
        subValue: isId ? "Halaman ini" : "On this page",
        icon: "pi-sync",
        tone: "indigo",
      },
    ];
  }, [logs, totalRecords, isId]);

  // Status Badge helper
  const renderStatusBadge = (status?: string) => {
    const st = String(status ?? "").toUpperCase();
    if (st === "VALID") return <Tag value="VALID" severity="success" />;
    if (st === "PENDING_REVIEW")
      return <Tag value="PENDING" severity="warning" />;
    if (st === "DUPLICATE") return <Tag value="DUPLICATE" severity="info" />;
    return <Tag value={st || "UNKNOWN"} severity="danger" />;
  };

  // Export handlers
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const detailRows = logs.map((row, index) => ({
        No: (page - 1) * pageSize + index + 1,
        "Waktu Log": formatDateTimeWithSeconds(row.event_time),
        NIK: row.employee_id ? String(row.employee_id) : "-",
        "Nama Karyawan": row.employee_name || "-",
        Sumber: row.source_type,
        "Mesin / Perangkat": row.machine_name || "-",
        PIN: row.machine_pin || "-",
        Status: row.status,
        Terproses: row.processed ? "Ya" : "Belum",
        "Waktu Diproses": formatDateTimeWithSeconds(row.processed_at),
        Latitude: row.latitude ?? "-",
        Longitude: row.longitude ?? "-",
      }));

      const summaryRows = [
        { Parameter: "Laporan", Nilai: "Laporan Log Absensi (Attendance Log)" },
        {
          Parameter: "Periode",
          Nilai: `${formatDate(startDate)} s/d ${formatDate(endDate)}`,
        },
        { Parameter: "Filter Status", Nilai: statusFilter },
        { Parameter: "Filter Sumber", Nilai: sourceFilter },
        { Parameter: "Filter Terproses", Nilai: processedFilter },
        { Parameter: "Total Data Ditemukan", Nilai: totalRecords },
        {
          Parameter: "Tanggal Ekspor",
          Nilai: dayjs().format("DD/MM/YYYY HH:mm:ss"),
        },
      ];

      exportReportToExcel({
        filename: `laporan_attendance_log_${formatReportTimestamp()}`,
        sheets: [
          { sheetName: "Rekap & Filter", data: summaryRows },
          { sheetName: "Detail Log Absensi", data: detailRows },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    const rows = logs.map((row, index) => ({
      No: (page - 1) * pageSize + index + 1,
      Waktu_Log: formatDateTimeWithSeconds(row.event_time),
      NIK: row.employee_id ? String(row.employee_id) : "",
      Nama_Karyawan: row.employee_name || "",
      Sumber: row.source_type,
      Mesin: row.machine_name || "",
      Status: row.status,
      Terproses: row.processed ? "YES" : "NO",
      Latitude: row.latitude ?? "",
      Longitude: row.longitude ?? "",
    }));

    exportReportToCsv({
      filename: `attendance_log_${formatReportTimestamp()}`,
      rows,
    });
  };

  return (
    <div className="w-full">
      {/* 1. Header Komponen */}
      <ReportHeader
        title={isId ? "Laporan Log Absensi" : "Attendance Log Report"}
        subtitle={
          isId
            ? "Laporan riwayat transaksi absensi karyawan dari seluruh mesin fingerprint, aplikasi mobile, dan web"
            : "Detailed employee attendance log records across fingerprint scanners, mobile app, and web"
        }
        icon="pi-clock"
        recordCount={totalRecords}
        loading={isLoading || isValidating}
        exportLoading={isExporting}
        onRefresh={() => void mutate()}
        onExportExcel={handleExportExcel}
        onExportCsv={handleExportCsv}
      />

      {/* 2. Kartu Filter Interaktif */}
      <ReportFilterCard
        activeFilterCount={activeFilterCount}
        onReset={handleResetFilters}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* Preset Tanggal */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Pilihan Periode" : "Date Preset"}
            </label>
            <Dropdown
              value={datePreset}
              options={[
                {
                  label: isId ? "Bulan Ini" : "This Month",
                  value: "THIS_MONTH",
                },
                {
                  label: isId ? "Bulan Lalu" : "Last Month",
                  value: "LAST_MONTH",
                },
                {
                  label: isId ? "Minggu Ini" : "This Week",
                  value: "THIS_WEEK",
                },
                { label: isId ? "Hari Ini" : "Today", value: "TODAY" },
                { label: isId ? "Kustom" : "Custom", value: "CUSTOM" },
              ]}
              onChange={(e) => handlePresetChange(e.value)}
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Tanggal Mulai */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Dari Tanggal" : "Start Date"}
            </label>
            <Calendar
              value={startDate}
              onChange={(e) => {
                setStartDate(e.value as Date);
                setDatePreset("CUSTOM");
                setPage(1);
              }}
              dateFormat="dd/mm/yy"
              showIcon
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Tanggal Selesai */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Sampai Tanggal" : "End Date"}
            </label>
            <Calendar
              value={endDate}
              onChange={(e) => {
                setEndDate(e.value as Date);
                setDatePreset("CUSTOM");
                setPage(1);
              }}
              dateFormat="dd/mm/yy"
              showIcon
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Filter Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              Status
            </label>
            <Dropdown
              value={statusFilter}
              options={[
                { label: isId ? "Semua Status" : "All Statuses", value: "ALL" },
                { label: "Valid", value: "VALID" },
                { label: "Pending Review", value: "PENDING_REVIEW" },
                { label: "Invalid", value: "INVALID" },
                { label: "Duplicate", value: "DUPLICATE" },
                { label: "Ignored", value: "IGNORED" },
              ]}
              onChange={(e) => {
                setStatusFilter(e.value);
                setPage(1);
              }}
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Filter Sumber */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Sumber Absensi" : "Source Type"}
            </label>
            <Dropdown
              value={sourceFilter}
              options={[
                { label: isId ? "Semua Sumber" : "All Sources", value: "ALL" },
                { label: "Fingerprint / Machine", value: "MACHINE" },
                { label: "Mobile App", value: "MOBILE" },
                { label: "Web Browser", value: "WEB" },
                { label: "Import", value: "IMPORT" },
              ]}
              onChange={(e) => {
                setSourceFilter(e.value);
                setPage(1);
              }}
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Filter Terproses */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Pemrosesan" : "Processing"}
            </label>
            <Dropdown
              value={processedFilter}
              options={[
                { label: isId ? "Semua Status" : "All", value: "ALL" },
                {
                  label: isId ? "Sudah Diproses" : "Processed",
                  value: "PROCESSED",
                },
                {
                  label: isId ? "Belum Diproses" : "Unprocessed",
                  value: "UNPROCESSED",
                },
              ]}
              onChange={(e) => {
                setProcessedFilter(e.value);
                setPage(1);
              }}
              className="p-inputtext-sm text-xs"
            />
          </div>
        </div>

        {/* Baris Pencarian Teks */}
        <div className="mt-3 flex items-center gap-2">
          <span className="p-input-icon-left w-full">
            <i className="pi pi-search text-xs" />
            <InputText
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder={
                isId
                  ? "Cari nama karyawan, NIK, nama mesin scanner..."
                  : "Search employee name, code, scanner device..."
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
        {error ? (
          <ErrorNotConnectedToApi mutateKey={queryUrl} />
        ) : isLoading ? (
          <LoadingDataTable />
        ) : (
          <>
            <DataTable
              value={logs}
              size="small"
              stripedRows
              showGridlines
              emptyMessage={
                isId
                  ? "Tidak ada data log absensi yang cocok."
                  : "No attendance logs found."
              }
              className="text-xs"
            >
              <Column
                header="No"
                body={(_, opt) => (page - 1) * pageSize + opt.rowIndex + 1}
                style={{ width: "3.5rem", textAlign: "center" }}
              />
              <Column
                header={isId ? "Waktu Transaksi" : "Event Time"}
                body={(row: AttendanceLogItem) => (
                  <span className="font-mono font-medium">
                    {formatDateTimeWithSeconds(row.event_time)}
                  </span>
                )}
                style={{ width: "12rem" }}
              />
              <Column
                header={isId ? "NIK / ID" : "Employee Code"}
                body={(row: AttendanceLogItem) => (
                  <span className="font-mono text-slate-600">
                    {row.employee_id ? String(row.employee_id) : "-"}
                  </span>
                )}
                style={{ width: "7rem" }}
              />
              <Column
                header={isId ? "Nama Karyawan" : "Employee Name"}
                body={(row: AttendanceLogItem) => (
                  <span className="font-semibold text-slate-800">
                    {row.employee_name || "-"}
                  </span>
                )}
              />
              <Column
                header={isId ? "Sumber" : "Source"}
                body={(row: AttendanceLogItem) => (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {row.source_type}
                  </span>
                )}
                style={{ width: "7rem" }}
              />
              <Column
                header={isId ? "Mesin / PIN" : "Device / PIN"}
                body={(row: AttendanceLogItem) => (
                  <span className="text-slate-600">
                    {row.machine_name || row.machine_pin || "-"}
                  </span>
                )}
                style={{ width: "10rem" }}
              />
              <Column
                header="Status"
                body={(row: AttendanceLogItem) => renderStatusBadge(row.status)}
                style={{ width: "8rem", textAlign: "center" }}
              />
              <Column
                header={isId ? "Diproses" : "Processed"}
                body={(row: AttendanceLogItem) =>
                  row.processed ? (
                    <span className="font-semibold text-emerald-700">
                      <i className="pi pi-check text-xs mr-1" />
                      {isId ? "Ya" : "Yes"}
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      <i className="pi pi-minus text-xs mr-1" />
                      {isId ? "Belum" : "No"}
                    </span>
                  )
                }
                style={{ width: "6.5rem", textAlign: "center" }}
              />
              <Column
                header={isId ? "Lokasi GPS" : "Location"}
                body={(row: AttendanceLogItem) =>
                  row.latitude && row.longitude ? (
                    <span className="font-mono text-[11px] text-slate-600">
                      {row.latitude.toFixed(4)}, {row.longitude.toFixed(4)}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )
                }
                style={{ width: "10rem" }}
              />
            </DataTable>

            <Paginator
              first={(page - 1) * pageSize}
              rows={pageSize}
              totalRecords={totalRecords}
              rowsPerPageOptions={[25, 50, 100]}
              onPageChange={(e: PaginatorPageChangeEvent) => {
                setPage(e.page + 1);
                setPageSize(e.rows);
              }}
              className="mt-3 border-t border-slate-100 pt-2 text-xs"
            />
          </>
        )}
      </div>

      {/* 5. TAMPILAN CETAK RESMI (Direct Print / Print View) */}
      <div className="report-print-root report-print-only w-full bg-white p-4 text-slate-900">
        <ReportPrintHeader
          reportTitle="LAPORAN LOG TRANSAKSI ABSENSI KARYAWAN"
          reportSubtitle="Dokumen Rekapitulasi Riwayat Transaksi Presensi PT Hexing Technology"
          params={[
            {
              label: "Periode",
              value: `${formatDate(startDate)} s/d ${formatDate(endDate)}`,
            },
            { label: "Status Log", value: statusFilter },
            { label: "Sumber Data", value: sourceFilter },
            { label: "Status Pemrosesan", value: processedFilter },
          ]}
          totalRecords={totalRecords}
        />

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-300 p-1.5 text-center w-8">
                No
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-32">
                Waktu Transaksi
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-20">
                NIK
              </th>
              <th className="border border-slate-300 p-1.5 text-left">
                Nama Karyawan
              </th>
              <th className="border border-slate-300 p-1.5 text-center w-20">
                Sumber
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-28">
                Perangkat / Mesin
              </th>
              <th className="border border-slate-300 p-1.5 text-center w-20">
                Status
              </th>
              <th className="border border-slate-300 p-1.5 text-center w-16">
                Terproses
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-28">
                Koordinat GPS
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="border border-slate-300 p-3 text-center text-slate-500"
                >
                  Tidak ada data log kehadiran untuk parameter yang dipilih.
                </td>
              </tr>
            ) : (
              logs.map((row, idx) => (
                <tr key={row.id} className="border-b border-slate-300">
                  <td className="border border-slate-300 p-1 text-center font-mono">
                    {(page - 1) * pageSize + idx + 1}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono">
                    {formatDateTimeWithSeconds(row.event_time)}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono">
                    {row.employee_id ? String(row.employee_id) : "-"}
                  </td>
                  <td className="border border-slate-300 p-1 font-semibold text-slate-900">
                    {row.employee_name || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-medium">
                    {row.source_type}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-700">
                    {row.machine_name || row.machine_pin || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold">
                    {row.status}
                  </td>
                  <td className="border border-slate-300 p-1 text-center">
                    {row.processed ? "Ya" : "Belum"}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono text-[9px]">
                    {row.latitude && row.longitude
                      ? `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <ReportPrintSignatures
          preparedByRole="Staff HR & Kehadiran"
          reviewedByRole="Supervisor HRD"
          approvedByRole="HR Manager"
        />
      </div>
    </div>
  );
}
