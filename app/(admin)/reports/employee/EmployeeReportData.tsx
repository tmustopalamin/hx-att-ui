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
import { Employee } from "@/app/types/employee";
import { Department } from "@/app/types/department";
import { Branch } from "@/app/types/branch";
import { Position } from "@/app/types/position";
import { ResponseType } from "@/app/types/response-type";

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

type EmployeeRow = Employee & {
  gender_name?: string | null;
  religion_name?: string | null;
  marital_status_name?: string | null;
  employment_status_name?: string | null;
};

export default function EmployeeReportData() {
  const { locale } = useI18n();
  const isId = locale === "id";

  // Filter States
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("ALL");
  const [selectedPosition, setSelectedPosition] = useState<string>("ALL");
  const [selectedGender, setSelectedGender] = useState<string>("ALL");
  const [selectedActiveStatus, setSelectedActiveStatus] =
    useState<string>("ACTIVE");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Pagination States
  const [first, setFirst] = useState<number>(0);
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Master Data Queries
  const { data: deptData } = useSWR<ResponseType<Department[]> | Department[]>(
    "/api/department",
    fetcher,
  );
  const { data: branchData } = useSWR<ResponseType<Branch[]> | Branch[]>(
    "/api/branch",
    fetcher,
  );
  const { data: positionData } = useSWR<ResponseType<Position[]> | Position[]>(
    "/api/position",
    fetcher,
  );

  const departmentOptions = useMemo(() => {
    const list = Array.isArray(deptData)
      ? deptData
      : ((deptData as ResponseType<Department[]>)?.data ?? []);
    return [
      { label: isId ? "Semua Departemen" : "All Departments", value: "ALL" },
      ...list.map((d) => ({ label: d.name, value: d.name })),
    ];
  }, [deptData, isId]);

  const branchOptions = useMemo(() => {
    const list = Array.isArray(branchData)
      ? branchData
      : ((branchData as ResponseType<Branch[]>)?.data ?? []);
    return [
      { label: isId ? "Semua Cabang" : "All Branches", value: "ALL" },
      ...list.map((b) => ({ label: b.name, value: b.name })),
    ];
  }, [branchData, isId]);

  const positionOptions = useMemo(() => {
    const list = Array.isArray(positionData)
      ? positionData
      : ((positionData as ResponseType<Position[]>)?.data ?? []);
    return [
      { label: isId ? "Semua Jabatan" : "All Positions", value: "ALL" },
      ...list.map((p) => ({ label: p.name, value: p.name })),
    ];
  }, [positionData, isId]);

  // Main Employees Query (including soft-deleted for full historical reporting)
  const {
    data: rawEmployees,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<EmployeeRow[]>("/api/employees/list?show_all=true", fetcher);

  const allEmployees: EmployeeRow[] = useMemo(() => {
    return Array.isArray(rawEmployees) ? rawEmployees : [];
  }, [rawEmployees]);

  // Filter Employees client-side
  const filteredList = useMemo(() => {
    return allEmployees.filter((emp) => {
      // Active / Deleted Status filter
      const isDeleted = Boolean(emp.deleted_at);
      if (selectedActiveStatus === "ACTIVE" && isDeleted) return false;
      if (selectedActiveStatus === "INACTIVE" && !isDeleted) return false;

      // Branch filter
      if (selectedBranch !== "ALL") {
        if (
          String(emp.branch_name ?? "").toLowerCase() !==
          selectedBranch.toLowerCase()
        ) {
          return false;
        }
      }

      // Department filter
      if (selectedDepartment !== "ALL") {
        if (
          String(emp.department_name ?? "").toLowerCase() !==
          selectedDepartment.toLowerCase()
        ) {
          return false;
        }
      }

      // Position filter
      if (selectedPosition !== "ALL") {
        if (
          String(emp.position_name ?? "").toLowerCase() !==
          selectedPosition.toLowerCase()
        ) {
          return false;
        }
      }

      // Gender filter
      if (selectedGender !== "ALL") {
        const gName = String(emp.gender_name ?? "").toLowerCase();
        if (
          selectedGender === "MALE" &&
          !gName.includes("laki") &&
          !gName.includes("male")
        ) {
          return false;
        }
        if (
          selectedGender === "FEMALE" &&
          !gName.includes("perempuan") &&
          !gName.includes("female")
        ) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const fullName = (
          emp.full_name || `${emp.first_name} ${emp.last_name}`
        ).toLowerCase();
        const code = String(emp.code ?? emp.id).toLowerCase();
        const email = String(
          emp.work_email || emp.personal_email || "",
        ).toLowerCase();
        const phone = String(emp.phone_number || "").toLowerCase();

        if (
          !fullName.includes(q) &&
          !code.includes(q) &&
          !email.includes(q) &&
          !phone.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    allEmployees,
    selectedActiveStatus,
    selectedBranch,
    selectedDepartment,
    selectedPosition,
    selectedGender,
    searchQuery,
  ]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedActiveStatus !== "ACTIVE") count++;
    if (selectedBranch !== "ALL") count++;
    if (selectedDepartment !== "ALL") count++;
    if (selectedPosition !== "ALL") count++;
    if (selectedGender !== "ALL") count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [
    selectedActiveStatus,
    selectedBranch,
    selectedDepartment,
    selectedPosition,
    selectedGender,
    searchQuery,
  ]);

  const handleResetFilters = () => {
    setSelectedBranch("ALL");
    setSelectedDepartment("ALL");
    setSelectedPosition("ALL");
    setSelectedGender("ALL");
    setSelectedActiveStatus("ACTIVE");
    setSearchQuery("");
    setFirst(0);
  };

  // Metrics Summary
  const metrics: MetricCardItem[] = useMemo(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    let maleCount = 0;
    let femaleCount = 0;
    const deptsSet = new Set<string>();

    for (const emp of filteredList) {
      if (emp.deleted_at) {
        inactiveCount++;
      } else {
        activeCount++;
      }

      const g = String(emp.gender_name ?? "").toLowerCase();
      if (g.includes("laki") || g.includes("male")) maleCount++;
      else if (g.includes("perempuan") || g.includes("female")) femaleCount++;

      if (emp.department_name) deptsSet.add(emp.department_name);
    }

    return [
      {
        id: "total",
        label: isId ? "Total Karyawan" : "Total Employees",
        value: filteredList.length.toLocaleString(),
        subValue: isId ? "Hasil filter" : "Filtered results",
        icon: "pi-users",
        tone: "blue",
      },
      {
        id: "active",
        label: isId ? "Karyawan Aktif" : "Active Employees",
        value: activeCount.toLocaleString(),
        subValue:
          filteredList.length > 0
            ? `${((activeCount / filteredList.length) * 100).toFixed(1)}% aktif`
            : "0%",
        icon: "pi-user-check",
        tone: "emerald",
      },
      {
        id: "inactive",
        label: isId ? "Non-Aktif / Arsip" : "Archived / Inactive",
        value: inactiveCount.toLocaleString(),
        subValue: isId ? "Resigned / Terminated" : "Inactive records",
        icon: "pi-user-minus",
        tone: "rose",
      },
      {
        id: "male",
        label: isId ? "Laki-laki" : "Male Staff",
        value: maleCount.toLocaleString(),
        subValue: isId ? "Pria" : "Male headcount",
        icon: "pi-user",
        tone: "indigo",
      },
      {
        id: "female",
        label: isId ? "Perempuan" : "Female Staff",
        value: femaleCount.toLocaleString(),
        subValue: isId ? "Wanita" : "Female headcount",
        icon: "pi-heart",
        tone: "amber",
      },
      {
        id: "depts",
        label: isId ? "Departemen Terwakili" : "Departments",
        value: deptsSet.size,
        subValue: isId ? "Jumlah departemen" : "Distinct depts",
        icon: "pi-building",
        tone: "slate",
      },
    ];
  }, [filteredList, isId]);

  // Paginated list for table
  const paginatedList = useMemo(() => {
    return filteredList.slice(first, first + rowsPerPage);
  }, [filteredList, first, rowsPerPage]);

  // Export handlers
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const detailRows = filteredList.map((emp, index) => ({
        No: index + 1,
        NIK: emp.code || String(emp.id),
        "Nama Lengkap":
          emp.full_name || `${emp.first_name} ${emp.last_name}`.trim(),
        Departemen: emp.department_name || "-",
        Jabatan: emp.position_name || "-",
        Cabang: emp.branch_name || "-",
        "Jenis Kelamin": emp.gender_name || "-",
        Agama: emp.religion_name || "-",
        "Status Pernikahan": emp.marital_status_name || "-",
        "Tanggal Lahir": formatDate(emp.dob),
        "Tempat Lahir": emp.birth_place || "-",
        "No. Telepon": emp.phone_number || "-",
        "Email Kerja": emp.work_email || "-",
        "Email Pribadi": emp.personal_email || "-",
        Status: emp.deleted_at ? "NON-AKTIF" : "AKTIF",
      }));

      const summaryRows = [
        {
          Parameter: "Laporan",
          Nilai: "Laporan Data Master Karyawan (Employee Report)",
        },
        { Parameter: "Filter Cabang", Nilai: selectedBranch },
        { Parameter: "Filter Departemen", Nilai: selectedDepartment },
        { Parameter: "Filter Jabatan", Nilai: selectedPosition },
        { Parameter: "Filter Status Akun", Nilai: selectedActiveStatus },
        { Parameter: "Total Karyawan Ditemukan", Nilai: filteredList.length },
        {
          Parameter: "Tanggal Ekspor",
          Nilai: dayjs().format("DD/MM/YYYY HH:mm:ss"),
        },
      ];

      exportReportToExcel({
        filename: `laporan_karyawan_${formatReportTimestamp()}`,
        sheets: [
          { sheetName: "Parameter & Rekap", data: summaryRows },
          { sheetName: "Daftar Karyawan", data: detailRows },
        ],
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    const rows = filteredList.map((emp, index) => ({
      No: index + 1,
      NIK: emp.code || String(emp.id),
      Nama_Lengkap:
        emp.full_name || `${emp.first_name} ${emp.last_name}`.trim(),
      Departemen: emp.department_name || "",
      Jabatan: emp.position_name || "",
      Cabang: emp.branch_name || "",
      Jenis_Kelamin: emp.gender_name || "",
      No_Telepon: emp.phone_number || "",
      Email_Kerja: emp.work_email || "",
      Status: emp.deleted_at ? "INACTIVE" : "ACTIVE",
    }));

    exportReportToCsv({
      filename: `data_karyawan_${formatReportTimestamp()}`,
      rows,
    });
  };

  return (
    <div className="w-full">
      {/* 1. Header Komponen */}
      <ReportHeader
        title={isId ? "Laporan Data Karyawan" : "Employee Master Report"}
        subtitle={
          isId
            ? "Laporan komprehensif master data karyawan, penempatan cabang, departemen, jabatan, dan status kerja"
            : "Comprehensive employee records report including branch placement, department, position, and status"
        }
        icon="pi-users"
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
          {/* Cabang */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Cabang (Branch)" : "Branch"}
            </label>
            <Dropdown
              value={selectedBranch}
              options={branchOptions}
              onChange={(e) => {
                setSelectedBranch(e.value);
                setFirst(0);
              }}
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Departemen */}
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

          {/* Jabatan */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Jabatan / Posisi" : "Position"}
            </label>
            <Dropdown
              value={selectedPosition}
              options={positionOptions}
              onChange={(e) => {
                setSelectedPosition(e.value);
                setFirst(0);
              }}
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Jenis Kelamin */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Jenis Kelamin" : "Gender"}
            </label>
            <Dropdown
              value={selectedGender}
              options={[
                { label: isId ? "Semua Gender" : "All Genders", value: "ALL" },
                { label: isId ? "Laki-laki" : "Male", value: "MALE" },
                { label: isId ? "Perempuan" : "Female", value: "FEMALE" },
              ]}
              onChange={(e) => {
                setSelectedGender(e.value);
                setFirst(0);
              }}
              className="p-inputtext-sm text-xs"
            />
          </div>

          {/* Status Karyawan */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-600">
              {isId ? "Status Akun" : "Employment Status"}
            </label>
            <Dropdown
              value={selectedActiveStatus}
              options={[
                {
                  label: isId ? "Karyawan Aktif" : "Active Employees",
                  value: "ACTIVE",
                },
                {
                  label: isId ? "Semua Status" : "All (Include Archived)",
                  value: "ALL",
                },
                {
                  label: isId ? "Hanya Non-Aktif / Arsip" : "Archived Only",
                  value: "INACTIVE",
                },
              ]}
              onChange={(e) => {
                setSelectedActiveStatus(e.value);
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
                  ? "Cari nama karyawan, NIK, alamat email, no. telepon..."
                  : "Search employee name, code, email address, phone..."
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
          <ErrorNotConnectedToApi mutateKey="/api/employees/list?show_all=true" />
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
                  ? "Tidak ada data karyawan yang cocok dengan kriteria filter."
                  : "No employee records found matching filter criteria."
              }
              className="text-xs"
            >
              <Column
                header="No"
                body={(_, opt) => first + opt.rowIndex + 1}
                style={{ width: "3.5rem", textAlign: "center" }}
              />
              <Column
                header={isId ? "NIK / ID" : "Employee Code"}
                body={(row: EmployeeRow) => (
                  <span className="font-mono font-medium text-slate-800">
                    {row.code || String(row.id)}
                  </span>
                )}
                style={{ width: "7.5rem" }}
              />
              <Column
                header={isId ? "Nama Lengkap" : "Full Name"}
                body={(row: EmployeeRow) => (
                  <div>
                    <span className="font-semibold text-slate-900">
                      {row.full_name ||
                        `${row.first_name} ${row.last_name}`.trim()}
                    </span>
                    {row.work_email && (
                      <span className="block text-[11px] text-slate-500">
                        {row.work_email}
                      </span>
                    )}
                  </div>
                )}
              />
              <Column
                header={isId ? "Departemen" : "Department"}
                body={(row: EmployeeRow) => (
                  <span className="text-slate-700">
                    {row.department_name || "-"}
                  </span>
                )}
                style={{ width: "10rem" }}
              />
              <Column
                header={isId ? "Jabatan" : "Position"}
                body={(row: EmployeeRow) => (
                  <span className="font-medium text-slate-800">
                    {row.position_name || "-"}
                  </span>
                )}
                style={{ width: "10rem" }}
              />
              <Column
                header={isId ? "Cabang" : "Branch"}
                body={(row: EmployeeRow) => (
                  <span className="text-slate-600">
                    {row.branch_name || "-"}
                  </span>
                )}
                style={{ width: "9rem" }}
              />
              <Column
                header={isId ? "Gender" : "Gender"}
                body={(row: EmployeeRow) => (
                  <span className="text-slate-600">
                    {row.gender_name || "-"}
                  </span>
                )}
                style={{ width: "6.5rem" }}
              />
              <Column
                header={isId ? "No. HP" : "Phone"}
                body={(row: EmployeeRow) => (
                  <span className="font-mono text-slate-600">
                    {row.phone_number || "-"}
                  </span>
                )}
                style={{ width: "8.5rem" }}
              />
              <Column
                header="Status"
                body={(row: EmployeeRow) =>
                  row.deleted_at ? (
                    <Tag
                      value={isId ? "NON-AKTIF" : "ARCHIVED"}
                      severity="danger"
                    />
                  ) : (
                    <Tag value={isId ? "AKTIF" : "ACTIVE"} severity="success" />
                  )
                }
                style={{ width: "6.5rem", textAlign: "center" }}
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
          reportTitle="LAPORAN DATA INDUK KEPEGAWAIAN KARYAWAN"
          reportSubtitle="Dokumen Daftar Resmi Tenaga Kerja dan Penempatan Organisasi PT Hexing Technology"
          params={[
            { label: "Cabang", value: selectedBranch },
            { label: "Departemen", value: selectedDepartment },
            { label: "Jabatan", value: selectedPosition },
            { label: "Status Akun", value: selectedActiveStatus },
          ]}
          totalRecords={filteredList.length}
        />

        <table className="w-full border-collapse border border-slate-400 text-[10px]">
          <thead>
            <tr className="bg-slate-100 text-slate-800">
              <th className="border border-slate-300 p-1.5 text-center w-8">
                No
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-20">
                NIK
              </th>
              <th className="border border-slate-300 p-1.5 text-left">
                Nama Lengkap
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-28">
                Departemen
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-28">
                Jabatan
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-24">
                Cabang
              </th>
              <th className="border border-slate-300 p-1.5 text-center w-18">
                Gender
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-24">
                Kontak (HP)
              </th>
              <th className="border border-slate-300 p-1.5 text-left w-32">
                Email
              </th>
              <th className="border border-slate-300 p-1.5 text-center w-18">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="border border-slate-300 p-3 text-center text-slate-500"
                >
                  Tidak ada data karyawan yang cocok untuk kriteria cetak.
                </td>
              </tr>
            ) : (
              filteredList.map((emp, idx) => (
                <tr key={emp.id} className="border-b border-slate-300">
                  <td className="border border-slate-300 p-1 text-center font-mono">
                    {idx + 1}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono">
                    {emp.code || String(emp.id)}
                  </td>
                  <td className="border border-slate-300 p-1 font-bold text-slate-900">
                    {emp.full_name ||
                      `${emp.first_name} ${emp.last_name}`.trim()}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-800">
                    {emp.department_name || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-800">
                    {emp.position_name || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-slate-700">
                    {emp.branch_name || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center">
                    {emp.gender_name || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 font-mono">
                    {emp.phone_number || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-[9px] text-slate-700">
                    {emp.work_email || emp.personal_email || "-"}
                  </td>
                  <td className="border border-slate-300 p-1 text-center font-semibold">
                    {emp.deleted_at ? "NON-AKTIF" : "AKTIF"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {filteredList.length > 0 && (
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-900">
                <td
                  colSpan={7}
                  className="border border-slate-400 p-1.5 text-right"
                >
                  TOTAL KARYAWAN:
                </td>
                <td
                  colSpan={3}
                  className="border border-slate-400 p-1.5 text-center"
                >
                  {filteredList.length} Orang
                </td>
              </tr>
            </tfoot>
          )}
        </table>

        <ReportPrintSignatures
          preparedByRole="Staff HR & Kepegawaian"
          reviewedByRole="HR & GA Supervisor"
          approvedByRole="HR Manager"
        />
      </div>
    </div>
  );
}
