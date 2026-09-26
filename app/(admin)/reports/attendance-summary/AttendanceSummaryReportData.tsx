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
import { ResponseType } from "@/app/types/response-type";
import { AttendanceSummary } from "@/app/types/attendance-summary";
import { Department } from "@/app/types/department";

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

type DatePreset =
  "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "LAST_MONTH" | "CUSTOM";

type AttendanceSummaryRow = AttendanceSummary & {
  employee_code?: string | null;
  department_name?: string | null;
};

export default function AttendanceSummaryReportData() {
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
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination States
  const [first, setFirst] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Departments for dropdown
  const { data: deptData } = useSWR<ResponseType<Department[]> | Department[]>(
    "/api/department",
    fetcher,
  );
  const departmentOptions = useMemo(() => {
    const rawList = Array.isArray(deptData)
      ? deptData
      : ((deptData as ResponseType<Department[]>)?.data ?? []);
    return [
      { label: isId ? "Semua Departemen" : "All Departments", value: "ALL" },
      ...rawList.map((d) => ({ label: d.name, value: d.name })),
    ];
  }, [deptData, isId]);

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
    setFirst(0);
  };

  const handleResetFilters = () => {
    setDatePreset("THIS_MONTH");
    setStartDate(dayjs().startOf("month").toDate());
    setEndDate(dayjs().endOf("month").toDate());
    setSelectedDepartment("ALL");
    setStatusFilter("ALL");
    setSearchQuery("");
    setFirst(0);
  };

  // Build SWR Query URL
  const queryUrl = useMemo(() => {
    if (!startDate || !endDate) return null;
    const params = new URLSearchParams();
    params.set("start_date", dayjs(startDate).format("YYYY-MM-DD"));
    params.set("end_date", dayjs(endDate).format("YYYY-MM-DD"));
    return `/api/attendance-summary?${params.toString()}`;
  }, [startDate, endDate]);

  const {
    data: rawSummary,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<ResponseType<AttendanceSummaryRow[]> | AttendanceSummaryRow[]>(
    queryUrl,
    fetcher,
  );

  const rawList: AttendanceSummaryRow[] = useMemo(() => {
    if (!rawSummary) return [];
    if (Array.isArray(rawSummary)) return rawSummary;
    return (rawSummary as ResponseType<AttendanceSummaryRow[]>).data ?? [];
  }, [rawSummary]);

  // Filter list client-side
  const filteredList = useMemo(() => {
    return rawList.filter((item) => {
      // Department filter
      if (selectedDepartment !== "ALL") {
        if (
          String(item.department_name ?? "").toLowerCase() !==
          selectedDepartment.toLowerCase()
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "ALL") {
        const itemStatus = String(item.status ?? "").toUpperCase();
        if (statusFilter === "PRESENT" && itemStatus !== "PRESENT")
          return false;
        if (statusFilter === "LATE" && !item.is_late) return false;
        if (statusFilter === "EARLY_OUT" && !item.is_early_co) return false;
        if (statusFilter === "LEAVE" && !item.is_leave) return false;
        if (statusFilter === "ABSENT" && !item.is_absent) return false;
        if (statusFilter === "DAY_OFF" && !item.is_weekend && !item.is_holiday)
          return false;
        if (
          statusFilter === "INCOMPLETE" &&
          (item.is_missing_check_in || item.is_missing_check_out) === false
        ) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const name = String(item.employee_name ?? "").toLowerCase();
        const code = String(
          item.employee_code ?? item.employee_id ?? "",
        ).toLowerCase();
        const dept = String(item.department_name ?? "").toLowerCase();
        if (!name.includes(q) && !code.includes(q) && !dept.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [rawList, selectedDepartment, statusFilter, searchQuery]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (datePreset !== "THIS_MONTH") count++;
    if (selectedDepartment !== "ALL") count++;
    if (statusFilter !== "ALL") count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [datePreset, selectedDepartment, statusFilter, searchQuery]);

  // Calculations & Metrics Summary
  const { metrics, totalWorkHours, totalOvertimeHours } = useMemo(() => {
    let presentCount = 0;
    let lateCount = 0;
    let earlyOutCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let totalWorkSec = 0;
    let totalOvertimeSec = 0;

    for (const item of filteredList) {
      if (item.is_absent) {
        absentCount++;
      } else if (item.is_leave) {
        leaveCount++;
      } else if (item.check_in_time) {
        presentCount++;
      }

      if (item.is_late) lateCount++;
      if (item.is_early_co) earlyOutCount++;

      totalWorkSec += item.work_seconds ?? 0;
      totalOvertimeSec += item.overtime_seconds ?? 0;
    }

    const workHours = (totalWorkSec / 3600).toFixed(1);
    const otHours = (totalOvertimeSec / 3600).toFixed(1);

    const mList: MetricCardItem[] = [
      {
        id: "total_records",
        label: isId ? "Total Hari Kehadiran" : "Total Work Days",
        value: filteredList.length.toLocaleString(),
        subValue: isId ? "Rekap data" : "Summary records",
        icon: "pi-calendar",
        tone: "blue",
      },
      {
        id: "present",
        label: isId ? "Kehadiran (Hadir)" : "Present Days",
        value: presentCount.toLocaleString(),
        subValue:
          filteredList.length > 0
            ? `${((presentCount / filteredList.length) * 100).toFixed(1)}% rasio hadir`
            : "0%",
        icon: "pi-check-circle",
        tone: "emerald",
      },
      {
        id: "late",
        label: isId ? "Kasus Terlambat" : "Late Cases",
        value: lateCount.toLocaleString(),
        subValue: isId
          ? `${lateCount} telat • ${earlyOutCount} pulang awal`
          : `${lateCount} late • ${earlyOutCount} early out`,
        icon: "pi-clock",
        tone: "amber",
      },
      {
        id: "overtime",
        label: isId ? "Total Jam Lembur" : "Overtime Hours",
        value: `${otHours} Jam`,
        subValue: isId ? "Lembur terhitung" : "Total overtime",
        icon: "pi-bolt",
        tone: "indigo",
      },
      {
        id: "leave",
        label: isId ? "Cuti & Izin" : "Leaves & Permits",
        value: leaveCount.toLocaleString(),
        subValue: isId ? "Hari cuti" : "Approved leaves",
        icon: "pi-file-check",
        tone: "slate",
      },
      {
        id: "absent",
        label: isId ? "Mangkir / Alpha" : "Absent / Alpha",
        value: absentCount.toLocaleString(),
        subValue: isId ? "Tanpa keterangan" : "Unexplained absence",
        icon: "pi-times-circle",
        tone: "rose",
      },
    ];

    return {
      metrics: mList,
      totalWorkHours: workHours,
      totalOvertimeHours: otHours,
    };
  }, [filteredList, isId]);

  // Paginated view for interactive table
  const paginatedList = useMemo(() => {
    return filteredList.slice(first, first + rowsPerPage);
  }, [filteredList, first, rowsPerPage]);

  // Export handlers
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const detailRows = filteredList.map((row, index) => ({
        No: index + 1,
        Tanggal: formatDate(row.summary_date),
        NIK: row.employee_code || String(row.employee_id || ""),
        "Nama Karyawan": row.employee_name || "-",
        Departemen: row.department_name || "-",
        Shift: row.shift_name || "-",
        "Jam Masuk": row.check_in_time
          ? formatDateTimeWithSeconds(row.check_in_time)
          : "-",
        "Jam Pulang": row.check_out_time
          ? formatDateTimeWithSeconds(row.check_out_time)
          : "-",
        "Jam Kerja": ((row.work_seconds ?? 0) / 3600).toFixed(2),
        "Jam Lembur": ((row.overtime_seconds ?? 0) / 3600).toFixed(2),
        "Terlambat (Menit)": Math.round((row.late_seconds ?? 0) / 60),
        "Pulang Cepat (Menit)": Math.round((row.early_out_seconds ?? 0) / 60),
        Status: row.status || (row.is_absent ? "ABSENT" : "PRESENT"),
      }));

      const summaryRows = [
        {
          Parameter: "Laporan",
          Nilai: "Laporan Rekapitulasi Absensi (Attendance Summary)",
        },
        {
          Parameter: "Periode",
          Nilai: `${formatDate(startDate)} s/d ${formatDate(endDate)}`,
        },
        { Parameter: "Filter Departemen", Nilai: selectedDepartment },
        { Parameter: "Filter Status", Nilai: statusFilter },
        { Parameter: "Total Record Kehadiran", Nilai: filteredList.length },
        {
          Parameter: "Total Jam Kerja (Efektif)",
          Nilai: `${totalWorkHours} Jam`,
        },
        { Parameter: "Total Jam Lembur", Nilai: `${totalOvertimeHours} Jam` },
        {
          Parameter: "Tanggal Ekspor",
          Nilai: dayjs().format("DD/MM/YYYY HH:mm:ss"),
        },
      ];

      exportReportToExcel({
        filename: `laporan_rekap_absensi_${formatReportTimestamp()}`,
        sheets: [
          { sheetName: "Rekap & Parameter", data: summaryRows },
          { sheetName: "Rincian Absensi", data: detailRows },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    const rows = filteredList.map((row, index) => ({
      No: index + 1,
      Tanggal: formatDate(row.summary_date),
      NIK: row.employee_code || String(row.employee_id || ""),
      Nama_Karyawan: row.employee_name || "",
      Departemen: row.department_name || "",
      Shift: row.shift_name || "",
      Jam_Masuk: row.check_in_time
        ? formatDateTimeWithSeconds(row.check_in_time)
        : "",
      Jam_Pulang: row.check_out_time
        ? formatDateTimeWithSeconds(row.check_out_time)
        : "",
      Jam_Kerja: ((row.work_seconds ?? 0) / 3600).toFixed(2),
      Jam_Lembur: ((row.overtime_seconds ?? 0) / 3600).toFixed(2),
      Terlambat_Menit: Math.round((row.late_seconds ?? 0) / 60),
      Status: row.status || (row.is_absent ? "ABSENT" : "PRESENT"),
    }));

    exportReportToCsv({
      filename: `rekap_absensi_${formatReportTimestamp()}`,
      rows,
    });
  };

  // Status renderer
  const renderStatusTag = (row: AttendanceSummary) => {
    if (row.is_absent) return <Tag value="ABSENT" severity="danger" />;
    if (row.is_leave) return <Tag value="LEAVE" severity="info" />;
    if (row.is_weekend || row.is_holiday)
      return <Tag value="DAY OFF" severity="secondary" />;
    if (row.is_late) return <Tag value="LATE" severity="warning" />;
    if (row.is_early_co) return <Tag value="EARLY OUT" severity="warning" />;
    if (row.check_in_time) return <Tag value="PRESENT" severity="success" />;
    return <Tag value={row.status || "UNKNOWN"} severity="secondary" />;
  };

  return (
    <div className="w-full">
      {/* 1. Header Komponen */}
      <ReportHeader
        title={
          isId ? "Laporan Rekapitulasi Absensi" : "Attendance Summary Report"
        }
        subtitle={
          isId
            ? "Laporan rekapitulasi data kehadiran, jam kerja efektif, lembur, keterlambatan, dan cuti karyawan"
            : "Consolidated employee attendance recap including worked hours, overtime, lateness, and leave days"
        }
        icon="pi-calendar"
        recordCount={filteredList.length}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
                setFirst(0);
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
                setFirst(0);
              }}
              dateFormat="dd/mm/yy"
              showIcon
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Filter Departemen */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Departemen" : "Department"}
            </label>
            <Dropdown
              value={selectedDepartment}
              options={departmentOptions}
              onChange={(e) => {
                setSelectedDepartment(e.value);
                setFirst(0);
              }}
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Filter Status Kehadiran */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Status Kehadiran" : "Status Filter"}
            </label>
            <Dropdown
              value={statusFilter}
              options={[
                { label: isId ? "Semua Status" : "All Statuses", value: "ALL" },
                {
                  label: isId ? "Hadir Tepat Waktu" : "Present / On-time",
                  value: "PRESENT",
                },
                { label: isId ? "Terlambat" : "Late", value: "LATE" },
                {
                  label: isId ? "Pulang Cepat" : "Early Out",
                  value: "EARLY_OUT",
                },
                {
                  label: isId ? "Cuti & Izin" : "Leave & Permit",
                  value: "LEAVE",
                },
                {
                  label: isId ? "Mangkir / Alpha" : "Absent / Alpha",
                  value: "ABSENT",
                },
                {
                  label: isId ? "Hari Libur / Day Off" : "Day Off",
                  value: "DAY_OFF",
                },
                {
                  label: isId ? "Absensi Tidak Lengkap" : "Incomplete",
                  value: "INCOMPLETE",
                },
              ]}
              onChange={(e) => {
                setStatusFilter(e.value);
                setFirst(0);
              }}
              className="p-inputtext-sm text-xs"
            />
          </div>
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
                  ? "Cari nama karyawan, NIK, atau departemen..."
                  : "Search employee name, code, department..."
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
          <ErrorNotConnectedToApi mutateKey={queryUrl ?? ""} />
        ) : isLoading ? (
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
                  ? "Tidak ada data rekapitulasi absensi untuk parameter yang dipilih."
                  : "No attendance summary data found."
              }
              className="text-xs"
            >
              <Column
                header="No"
                body={(_, opt) => first + opt.rowIndex + 1}
                style={{ width: "3.5rem", textAlign: "center" }}
              />
              <Column
                header={isId ? "Tanggal" : "Date"}
                body={(row: AttendanceSummary) => (
                  <span className="font-mono font-medium">
                    {formatDate(row.summary_date)}
                  </span>
                )}
                style={{ width: "7.5rem" }}
              />
              <Column
                header={isId ? "NIK" : "Code"}
                body={(row: AttendanceSummaryRow) => (
                  <span className="font-mono text-slate-600">
                    {row.employee_code || String(row.employee_id || "-")}
                  </span>
                )}
                style={{ width: "6.5rem" }}
              />
              <Column
                header={isId ? "Nama Karyawan" : "Employee Name"}
                body={(row: AttendanceSummaryRow) => (
                  <span className="font-semibold text-slate-800">
                    {row.employee_name || "-"}
                  </span>
                )}
              />
              <Column
                header={isId ? "Departemen" : "Department"}
                body={(row: AttendanceSummaryRow) => (
                  <span className="text-slate-600">
                    {row.department_name || "-"}
                  </span>
                )}
                style={{ width: "9rem" }}
              />
              <Column
                header="Shift"
                body={(row: AttendanceSummaryRow) => (
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {row.shift_name || "-"}
                  </span>
                )}
                style={{ width: "8rem" }}
              />
              <Column
                header={isId ? "Masuk" : "Check-in"}
                body={(row: AttendanceSummary) =>
                  row.check_in_time ? (
                    <span className="font-mono font-medium text-slate-800">
                      {dayjs(row.check_in_time).format("HH:mm:ss")}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )
                }
                style={{ width: "6.5rem", textAlign: "center" }}
              />
              <Column
                header={isId ? "Pulang" : "Check-out"}
                body={(row: AttendanceSummary) =>
                  row.check_out_time ? (
                    <span className="font-mono font-medium text-slate-800">
                      {dayjs(row.check_out_time).format("HH:mm:ss")}
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )
                }
                style={{ width: "6.5rem", textAlign: "center" }}
              />
              <Column
                header={isId ? "Jam Kerja" : "Work Hrs"}
                body={(row: AttendanceSummaryRow) => (
                  <span className="font-mono font-semibold text-slate-700">
                    {((row.work_seconds ?? 0) / 3600).toFixed(1)} j
                  </span>
                )}
                style={{ width: "6.5rem", textAlign: "right" }}
              />
              <Column
                header={isId ? "Lembur" : "Overtime"}
                body={(row: AttendanceSummary) =>
                  row.overtime_seconds ? (
                    <span className="font-mono font-bold text-indigo-700">
                      + {((row.overtime_seconds ?? 0) / 3600).toFixed(1)} j
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )
                }
                style={{ width: "6.5rem", textAlign: "right" }}
              />
              <Column
                header={isId ? "Terlambat" : "Late"}
                body={(row: AttendanceSummary) =>
                  row.is_late ? (
                    <span className="font-bold text-rose-600">
                      {Math.round((row.late_seconds ?? 0) / 60)} mnt
                    </span>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )
                }
                style={{ width: "6.5rem", textAlign: "center" }}
              />
              <Column
                header="Status"
                body={(row: AttendanceSummary) => renderStatusTag(row)}
                style={{ width: "7.5rem", textAlign: "center" }}
              />
            </DataTable>

            <Paginator
              first={first}
              rows={rowsPerPage}
              totalRecords={filteredList.length}
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
          reportTitle="LAPORAN REKAPITULASI ABSENSI & KEHADIRAN KARYAWAN"
          reportSubtitle="Rekapitulasi Jam Kerja Efektif, Lembur, dan Kedisiplinan Kehadiran PT Hexing Technology"
          params={[
            {
              label: "Periode",
              value: `${formatDate(startDate)} s/d ${formatDate(endDate)}`,
            },
            { label: "Departemen", value: selectedDepartment },
            { label: "Filter Status", value: statusFilter },
            { label: "Total Jam Kerja", value: `${totalWorkHours} Jam` },
            { label: "Total Lembur", value: `${totalOvertimeHours} Jam` },
          ]}
          totalRecords={filteredList.length}
        />

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-300 p-1 text-center w-8">
                No
              </th>
              <th className="border border-slate-300 p-1 text-left w-20">
                Tanggal
              </th>
              <th className="border border-slate-300 p-1 text-left w-16">
                NIK
              </th>
              <th className="border border-slate-300 p-1 text-left">
                Nama Karyawan
              </th>
              <th className="border border-slate-300 p-1 text-left w-24">
                Departemen
              </th>
              <th className="border border-slate-300 p-1 text-left w-20">
                Shift
              </th>
              <th className="border border-slate-300 p-1 text-center w-16">
                Masuk
              </th>
              <th className="border border-slate-300 p-1 text-center w-16">
                Pulang
              </th>
              <th className="border border-slate-300 p-1 text-right w-16">
                Jam Kerja
              </th>
              <th className="border border-slate-300 p-1 text-right w-16">
                Lembur
              </th>
              <th className="border border-slate-300 p-1 text-center w-16">
                Telat
              </th>
              <th className="border border-slate-300 p-1 text-center w-18">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={12}
                  className="border border-slate-300 p-3 text-center text-slate-500"
                >
                  Tidak ada data rekap absensi untuk parameter yang dipilih.
                </td>
              </tr>
            ) : (
              filteredList.map((row, idx) => (
                <tr key={row.id} className="border-b border-slate-300">
                  <td className="border border-slate-300 p-1 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono">
                    {formatDate(row.summary_date)}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono">
                    {row.employee_code || String(row.employee_id || "-")}
                  </td>
                  <td className="border border-slate-300 p-1 font-semibold text-slate-900">
                    {row.employee_name || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-700">
                    {row.department_name || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-600">
                    {row.shift_name || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-mono">
                    {row.check_in_time
                      ? dayjs(row.check_in_time).format("HH:mm")
                      : "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-mono">
                    {row.check_out_time
                      ? dayjs(row.check_out_time).format("HH:mm")
                      : "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-right font-mono font-medium">
                    {((row.work_seconds ?? 0) / 3600).toFixed(1)} j
                  </td>
                  <td className="border border-slate-300 p-1 text-right font-mono font-semibold">
                    {row.overtime_seconds
                      ? `${((row.overtime_seconds ?? 0) / 3600).toFixed(1)} j`
                      : "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-mono">
                    {row.is_late
                      ? `${Math.round((row.late_seconds ?? 0) / 60)} m`
                      : "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-bold">
                    {row.is_absent
                      ? "ALPHA"
                      : row.is_leave
                        ? "CUTI"
                        : row.is_late
                          ? "TELAT"
                          : "HADIR"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredList.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td
                  colSpan={8}
                  className="border border-slate-400 p-1.5 text-right"
                >
                  TOTAL REKAPITULASI:
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono">
                  {totalWorkHours} Jam
                </td>
                <td className="border border-slate-400 p-1.5 text-right font-mono text-indigo-900">
                  {totalOvertimeHours} Jam
                </td>
                <td
                  colSpan={2}
                  className="border border-slate-400 p-1.5 text-center"
                >
                  {filteredList.length} Transaksi
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        <ReportPrintSignatures
          preparedByRole="Staff HR & Absensi"
          reviewedByRole="HR & GA Supervisor"
          approvedByRole="HR Manager"
        />
      </div>
    </div>
  );
}
