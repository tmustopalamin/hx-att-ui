"use client";

import { useMemo, useState } from "react";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";

import { useI18n } from "@/app/i18n";
import {
  formatWeekdayDate,
  formatDate as formatDisplayDate,
} from "@/app/utils/date-format";
import { EmployeeScheduleChangeConflict } from "@/app/types/employee-schedule-change";
import { EmployeeSelectionRow } from "./EmployeeSelectionStep";
import { Employee } from "@/app/types/employee";

type EmployeeListRow = EmployeeSelectionRow & Employee;

export interface ScheduleChangeConflictDetailsProps {
  conflicts: EmployeeScheduleChangeConflict[];
  employeeById: Map<number, EmployeeListRow>;
  canOverwrite: boolean;
  overwrite: boolean;
  onEnableOverwrite?: () => void;
  isBusy?: boolean;
}

const employeeName = (employee?: EmployeeListRow) =>
  employee?.full_name ||
  [employee?.first_name, employee?.middle_name, employee?.last_name]
    .filter(Boolean)
    .join(" ") ||
  undefined;

export const ScheduleChangeConflictDetails = ({
  conflicts,
  employeeById,
  canOverwrite,
  overwrite,
  onEnableOverwrite,
  isBusy = false,
}: ScheduleChangeConflictDetailsProps) => {
  const { locale } = useI18n();
  const isId = locale === "id";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>("ALL");

  // Summary counts
  const attendanceFinalCount = useMemo(
    () => conflicts.filter((c) => c.code === "ATTENDANCE_FINAL").length,
    [conflicts],
  );
  const protectedScheduleCount = useMemo(
    () =>
      conflicts.filter((c) => c.code === "SCHEDULE_ASSIGNMENT_PROTECTED")
        .length,
    [conflicts],
  );
  const payrollFinalCount = useMemo(
    () => conflicts.filter((c) => c.code === "PAYROLL_FINAL").length,
    [conflicts],
  );

  const uniqueEmployees = useMemo(() => {
    const ids = new Set<number>();
    conflicts.forEach((c) => {
      if (c.employee_id != null) ids.add(c.employee_id);
    });
    return ids;
  }, [conflicts]);

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    conflicts.forEach((c) => {
      if (c.date) dates.add(c.date);
    });
    return dates;
  }, [conflicts]);

  const allAreAttendanceFinal =
    conflicts.length > 0 && attendanceFinalCount === conflicts.length;
  const hasHardConflicts = protectedScheduleCount > 0 || payrollFinalCount > 0;

  // Filtered conflicts
  const filteredConflicts = useMemo(() => {
    return conflicts.filter((conflict) => {
      if (
        selectedTypeFilter !== "ALL" &&
        conflict.code !== selectedTypeFilter
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const employee = conflict.employee_id
          ? employeeById.get(conflict.employee_id)
          : undefined;
        const name = (employeeName(employee) ?? "").toLowerCase();
        const code = (employee?.code ?? "").toLowerCase();
        const dept = (employee?.department_name ?? "").toLowerCase();
        const dateStr = (conflict.date ?? "").toLowerCase();
        const message = (conflict.message ?? "").toLowerCase();
        const codeType = conflict.code.toLowerCase();

        return (
          name.includes(query) ||
          code.includes(query) ||
          dept.includes(query) ||
          dateStr.includes(query) ||
          message.includes(query) ||
          codeType.includes(query)
        );
      }
      return true;
    });
  }, [conflicts, selectedTypeFilter, searchQuery, employeeById]);

  const getConflictMeta = (code: string) => {
    switch (code) {
      case "ATTENDANCE_FINAL":
        return {
          label: isId ? "Kehadiran Final" : "Final Attendance",
          severity: "warning" as const,
          tagClass: "bg-amber-100 text-amber-800 border-amber-300",
          icon: "pi pi-calendar-times",
          reason: isId
            ? "Data ringkasan kehadiran (absensi) pada tanggal ini sudah berstatus FINAL. Sistem mencegah jadwal diubah secara sepihak agar data presensi yang sudah tercatat tidak menjadi rancu."
            : "The attendance summary record for this date is already FINAL. The system prevents silent schedule overwrites to protect verified attendance records.",
          solution: isId
            ? "Aktifkan opsi 'Timpa & Proses Ulang' (Overwrite & Reprocess) agar ringkasan kehadiran dihitung ulang sesuai jadwal baru, atau kecualikan karyawan/tanggal ini."
            : "Enable 'Overwrite and Reprocess' in the configuration step to recalculate the attendance summary under the new schedule, or exclude this employee/date.",
          canOverwrite: true,
        };
      case "SCHEDULE_ASSIGNMENT_PROTECTED":
        return {
          label: isId ? "Jadwal Terkunci / Manual" : "Schedule Protected",
          severity: "danger" as const,
          tagClass: "bg-rose-100 text-rose-800 border-rose-300",
          icon: "pi pi-lock",
          reason: isId
            ? "Jadwal harian pada tanggal ini diatur secara manual atau telah dikunci (locked) oleh administrator. Jadwal yang diproteksi tidak boleh ditimpa oleh pola rotasi massal."
            : "The daily schedule on this date was assigned manually or locked by an administrator. Protected schedules cannot be overridden by mass shift rules.",
          solution: isId
            ? "Buka kunci (unlock) jadwal harian karyawan terkait pada menu Manajemen Jadwal sebelum menerapkan perubahan massal ini."
            : "Unlock the employee's daily schedule in the Daily Schedule management menu prior to applying this mass change.",
          canOverwrite: false,
        };
      case "PAYROLL_FINAL":
        return {
          label: isId ? "Payroll Final" : "Payroll Finalized",
          severity: "danger" as const,
          tagClass: "bg-rose-100 text-rose-800 border-rose-300",
          icon: "pi pi-dollar",
          reason: isId
            ? "Tanggal ini termasuk dalam batch penggajian (payroll) yang sudah difinalisasi/ditutup. Mengubah jadwal kerja pada periode payroll final dilarang demi menjaga integritas perhitungan gaji."
            : "This date is included in a finalized payroll batch. Modifying work schedules in closed payroll periods is disallowed to maintain financial integrity.",
          solution: isId
            ? "Jadwal pada periode payroll yang sudah final tidak dapat diubah. Sesuaikan rentang tanggal efektivitas di luar periode payroll tersebut."
            : "Schedules in finalized payroll periods cannot be modified. Adjust your effective date range to exclude the finalized payroll batch.",
          canOverwrite: false,
        };
      default:
        return {
          label: code,
          severity: "danger" as const,
          tagClass: "bg-red-100 text-red-800 border-red-300",
          icon: "pi pi-exclamation-circle",
          reason: isId
            ? "Terjadi konflik integritas data pada tanggal ini."
            : "A data integrity conflict occurred on this date.",
          solution: isId
            ? "Periksa pesan sistem di bawah dan sesuaikan konfigurasi jadwal."
            : "Check the system message below and adjust your schedule configuration.",
          canOverwrite: false,
        };
    }
  };

  const formatDateLabel = (dateStr: string | null) => {
    if (!dateStr) return isId ? "Seluruh Periode" : "Entire Period";
    try {
      const weekday = formatWeekdayDate(dateStr);
      return weekday !== "-" ? weekday : formatDisplayDate(dateStr);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50/70 p-4 sm:p-5 text-slate-800 shadow-xs">
      {/* Header and Summary Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700">
            <i className="pi pi-exclamation-triangle text-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="m-0 text-base font-bold text-red-900">
                {isId
                  ? "Terdeteksi Konflik Jadwal"
                  : "Schedule Conflicts Detected"}
              </h3>
              <Tag
                severity="danger"
                value={`${conflicts.length} ${isId ? "Konflik" : "Conflicts"}`}
                rounded
                className="text-xs px-2 py-0.5"
              />
            </div>
            <p className="m-0 mt-1 text-xs text-red-700">
              {isId
                ? "Perubahan jadwal ini tidak dapat langsung diterapkan karena bentrok dengan data presensi atau pengaturan yang diproteksi."
                : "This schedule change cannot be applied directly because it conflicts with existing attendance data or protected settings."}
            </p>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 shadow-2xs">
            <span className="text-slate-500">
              {isId ? "Karyawan Terdampak:" : "Employees:"}{" "}
            </span>
            <strong className="text-slate-800">{uniqueEmployees.size}</strong>
          </div>
          {uniqueDates.size > 0 && (
            <div className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 shadow-2xs">
              <span className="text-slate-500">
                {isId ? "Tanggal Terdampak:" : "Dates:"}{" "}
              </span>
              <strong className="text-slate-800">{uniqueDates.size}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Resolution Action Banners */}
      {allAreAttendanceFinal && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 shadow-2xs">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <i className="pi pi-info-circle mt-0.5 text-amber-700 text-sm" />
              <div>
                <strong className="font-semibold text-amber-900">
                  {isId
                    ? "Semua konflik disebabkan oleh Rekapan Kehadiran Final."
                    : "All conflicts are due to Finalized Attendance Summaries."}
                </strong>
                <p className="m-0 mt-0.5 text-amber-800">
                  {isId
                    ? "Jika Anda memiliki wewenang, Anda dapat mengaktifkan opsi 'Timpa & Proses Ulang' untuk memperbarui dan merevisi ringkasan kehadiran secara otomatis."
                    : "If authorized, enable 'Overwrite and Reprocess' to recalculate and update attendance summaries automatically."}
                </p>
              </div>
            </div>

            {canOverwrite && !overwrite && onEnableOverwrite && (
              <Button
                type="button"
                icon="pi pi-sync"
                label={
                  isId
                    ? "Aktifkan Timpa & Proses Ulang"
                    : "Enable Overwrite & Reprocess"
                }
                severity="warning"
                size="small"
                loading={isBusy}
                className="shrink-0 font-medium"
                onClick={onEnableOverwrite}
              />
            )}
          </div>
          {!canOverwrite && (
            <div className="mt-2 text-red-700 font-medium">
              <i className="pi pi-lock mr-1" />
              {isId
                ? "Anda tidak memiliki izin 'attendance-summary.process' untuk menimpa data kehadiran final. Hubungi administrator."
                : "You do not have the 'attendance-summary.process' permission to overwrite finalized attendance. Please contact an administrator."}
            </div>
          )}
        </div>
      )}

      {hasHardConflicts && (
        <div className="rounded-lg border border-red-300 bg-red-100/60 p-3 text-xs text-red-900">
          <div className="flex items-start gap-2">
            <i className="pi pi-times-circle mt-0.5 text-red-700 text-sm" />
            <div>
              <strong className="font-semibold">
                {isId
                  ? "Terdapat konflik yang tidak dapat ditimpa secara otomatis."
                  : "Some conflicts cannot be automatically overwritten."}
              </strong>
              <span className="ml-1">
                {isId
                  ? "Jadwal harian yang dikunci secara manual atau periode payroll final harus disesuaikan terlebih dahulu sebelum perubahan dapat diterapkan."
                  : "Manually locked daily schedules or finalized payroll periods must be resolved or excluded before proceeding."}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar (shown when there are multiple conflicts) */}
      {conflicts.length > 2 && (
        <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setSelectedTypeFilter("ALL")}
              className={`rounded-full px-3 py-1 font-medium transition-colors ${
                selectedTypeFilter === "ALL"
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {isId ? "Semua" : "All"} ({conflicts.length})
            </button>
            {attendanceFinalCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTypeFilter("ATTENDANCE_FINAL")}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  selectedTypeFilter === "ATTENDANCE_FINAL"
                    ? "bg-amber-600 text-white"
                    : "bg-white text-amber-800 hover:bg-amber-50 border border-amber-300"
                }`}
              >
                {isId ? "Kehadiran Final" : "Final Attendance"} (
                {attendanceFinalCount})
              </button>
            )}
            {protectedScheduleCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedTypeFilter("SCHEDULE_ASSIGNMENT_PROTECTED")
                }
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  selectedTypeFilter === "SCHEDULE_ASSIGNMENT_PROTECTED"
                    ? "bg-rose-700 text-white"
                    : "bg-white text-rose-800 hover:bg-rose-50 border border-rose-300"
                }`}
              >
                {isId ? "Jadwal Terkunci" : "Protected Schedule"} (
                {protectedScheduleCount})
              </button>
            )}
            {payrollFinalCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTypeFilter("PAYROLL_FINAL")}
                className={`rounded-full px-3 py-1 font-medium transition-colors ${
                  selectedTypeFilter === "PAYROLL_FINAL"
                    ? "bg-purple-700 text-white"
                    : "bg-white text-purple-800 hover:bg-purple-50 border border-purple-300"
                }`}
              >
                {isId ? "Payroll Final" : "Payroll Final"} ({payrollFinalCount})
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="w-full sm:w-64">
            <IconField iconPosition="left" className="w-full">
              <InputIcon className="pi pi-search text-xs" />
              <InputText
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isId ? "Cari karyawan/tanggal..." : "Search employee/date..."
                }
                className="w-full text-xs py-1.5 pl-8"
              />
            </IconField>
          </div>
        </div>
      )}

      {/* Conflict Items List */}
      <div className="flex max-h-96 flex-col gap-2.5 overflow-y-auto pr-1">
        {filteredConflicts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-xs text-slate-500">
            {isId
              ? "Tidak ada konflik yang cocok dengan filter."
              : "No conflicts match the filter."}
          </div>
        ) : (
          filteredConflicts.map((conflict, index) => {
            const employee = conflict.employee_id
              ? employeeById.get(conflict.employee_id)
              : undefined;
            const empName =
              employeeName(employee) ||
              (conflict.employee_id
                ? `${isId ? "Karyawan" : "Employee"} #${conflict.employee_id}`
                : isId
                  ? "Semua Karyawan"
                  : "All Employees");
            const empCode = employee?.code;
            const empDept = [employee?.department_name, employee?.position_name]
              .filter(Boolean)
              .join(" • ");
            const meta = getConflictMeta(conflict.code);
            const dateDisplay = formatDateLabel(conflict.date);

            return (
              <div
                key={`${conflict.code}-${conflict.employee_id ?? "all"}-${conflict.date ?? "no-date"}-${index}`}
                className="rounded-lg border border-red-200 bg-white p-3.5 shadow-2xs transition-shadow hover:shadow-xs"
              >
                {/* Header Row: Employee & Conflict Type */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-xs">
                      <i className="pi pi-user" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">
                          {empName}
                        </span>
                        {empCode && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-3xs font-medium text-slate-600">
                            {empCode}
                          </span>
                        )}
                      </div>
                      {empDept && (
                        <div className="text-3xs text-slate-500">{empDept}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-2xs ${meta.tagClass}`}
                    >
                      <i className={`${meta.icon} text-xs`} />
                      <span>{meta.label}</span>
                    </span>
                    <span className="text-3xs font-mono text-slate-400">
                      ({conflict.code})
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-[14rem_minmax(0,1fr)] text-xs">
                  {/* Date information */}
                  <div className="flex items-start gap-1.5 text-slate-600">
                    <i className="pi pi-calendar mt-0.5 text-slate-400 text-xs shrink-0" />
                    <div>
                      <span className="text-3xs text-slate-500 block uppercase font-medium">
                        {isId ? "Tanggal Konflik" : "Conflict Date"}
                      </span>
                      <strong className="text-slate-800">{dateDisplay}</strong>
                    </div>
                  </div>

                  {/* Conflict reason & resolution */}
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="text-3xs text-slate-500 block uppercase font-medium">
                        {isId
                          ? "Kenapa Terjadi Konflik?"
                          : "Why Conflict Occurred?"}
                      </span>
                      <p className="m-0 mt-0.5 text-slate-700 leading-relaxed">
                        {meta.reason}
                      </p>
                      {/* Backend server message details */}
                      {conflict.message && (
                        <div className="mt-1.5 rounded border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-3xs text-slate-600">
                          <span className="font-semibold text-slate-500">
                            System detail:
                          </span>{" "}
                          {conflict.message}
                        </div>
                      )}
                    </div>

                    <div className="rounded border border-emerald-100 bg-emerald-50/60 p-2 text-emerald-900">
                      <div className="flex items-start gap-1.5">
                        <i className="pi pi-check-circle mt-0.5 text-emerald-600 text-xs shrink-0" />
                        <div>
                          <strong className="font-semibold text-3xs uppercase tracking-wide text-emerald-800 block">
                            {isId
                              ? "Solusi & Rekomendasi:"
                              : "Solution & Recommendation:"}
                          </strong>
                          <span className="leading-relaxed">
                            {meta.solution}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ScheduleChangeConflictDetails;
