"use client";

import React, { useState, useMemo, useRef, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useDispatch } from "react-redux";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { ProgressBar } from "primereact/progressbar";
import { Dialog } from "primereact/dialog";
import { Menu } from "primereact/menu";
import { MenuItem } from "primereact/menuitem";

import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import { bulkUpsertEmployees } from "@/app/services/employee-bulk-service";
import {
  generateEmployeeTemplate,
  exportEmployeesToExcel,
  parseEmployeeSpreadsheet,
  MasterReferenceData,
} from "@/app/utils/employee-spreadsheet-helper";
import {
  EmployeeBulkImportRow,
  EmployeeBulkUpsertResult,
} from "@/app/types/employee-bulk";

export default function EmployeeImportPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference data fetchers
  const { data: agencyData } = useSWR<any[]>("/api/agency", fetcher);
  const { data: employeesData } = useSWR<any[]>("/api/employees/list", fetcher);
  const { data: genderData } = useSWR<any[]>("/api/gender", fetcher);
  const { data: religionData } = useSWR<any[]>("/api/religion", fetcher);
  const { data: maritalData } = useSWR<any[]>("/api/marital", fetcher);
  const { data: branchData } = useSWR<any[]>("/api/branch", fetcher);
  const { data: departmentData } = useSWR<any[]>("/api/department", fetcher);
  const { data: positionData } = useSWR<any[]>("/api/position", fetcher);
  const { data: bankData } = useSWR<any[]>("/api/bank", fetcher);
  const { data: supervisorData } = useSWR<any[]>(
    "/api/employees/supervisor-options",
    fetcher,
  );

  const existingCodes = useMemo(() => {
    const set = new Set<string>();
    if (employeesData) {
      for (const emp of employeesData) {
        if (emp.code) {
          set.add(String(emp.code).trim().toLowerCase());
        }
      }
    }
    return set;
  }, [employeesData]);

  const masterReferences: MasterReferenceData = useMemo(() => {
    return {
      agencies: agencyData?.filter((a: any) => !a.deleted_at),
      branches: branchData?.filter((b: any) => !b.deleted_at),
      departments: departmentData?.filter((d: any) => !d.deleted_at),
      positions: positionData?.filter((p: any) => !p.deleted_at),
      banks: bankData?.filter((b: any) => !b.deleted_at && b.is_active),
      genders: genderData?.filter((g: any) => g.is_active),
      religions: religionData?.filter((r: any) => r.is_active),
      maritalStatuses: maritalData?.filter((m: any) => m.is_active),
      supervisors: supervisorData?.map((s: any) => ({
        id: s.id,
        code: s.code,
        name: s.name,
      })),
    };
  }, [
    agencyData,
    branchData,
    departmentData,
    positionData,
    bankData,
    genderData,
    religionData,
    maritalData,
    supervisorData,
  ]);

  // Upload & Process States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<EmployeeBulkImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [resultDialogVisible, setResultDialogVisible] = useState(false);
  const [importResult, setImportResult] =
    useState<EmployeeBulkUpsertResult | null>(null);
  const [filterMode, setFilterMode] = useState<
    "ALL" | "CREATE" | "UPDATE" | "INVALID"
  >("ALL");

  // Metrics
  const metrics = useMemo(() => {
    const total = parsedRows.length;
    const createCount = parsedRows.filter(
      (r) =>
        !r._is_existing &&
        (!r._validation_errors || r._validation_errors.length === 0),
    ).length;
    const updateCount = parsedRows.filter(
      (r) =>
        r._is_existing &&
        (!r._validation_errors || r._validation_errors.length === 0),
    ).length;
    const invalidCount = parsedRows.filter(
      (r) => r._validation_errors && r._validation_errors.length > 0,
    ).length;

    return { total, createCount, updateCount, invalidCount };
  }, [parsedRows]);

  const filteredRows = useMemo(() => {
    if (filterMode === "CREATE") {
      return parsedRows.filter(
        (r) =>
          !r._is_existing &&
          (!r._validation_errors || r._validation_errors.length === 0),
      );
    }
    if (filterMode === "UPDATE") {
      return parsedRows.filter(
        (r) =>
          r._is_existing &&
          (!r._validation_errors || r._validation_errors.length === 0),
      );
    }
    if (filterMode === "INVALID") {
      return parsedRows.filter(
        (r) => r._validation_errors && r._validation_errors.length > 0,
      );
    }
    return parsedRows;
  }, [parsedRows, filterMode]);

  // Handlers
  const handleDownloadTemplate = () => {
    try {
      generateEmployeeTemplate(masterReferences);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Berhasil",
          detail: "Template Excel import karyawan berhasil diunduh.",
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Gagal Mengunduh",
          detail: err.message || "Gagal membuat template Excel.",
        }),
      );
    }
  };

  const handleExportExisting = () => {
    if (!employeesData || employeesData.length === 0) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Data Kosong",
          detail: "Tidak ada data karyawan yang dapat diekspor.",
        }),
      );
      return;
    }
    try {
      exportEmployeesToExcel(employeesData);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Berhasil",
          detail: `${employeesData.length} data karyawan berhasil diekspor ke Excel.`,
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Gagal Ekspor",
          detail: err.message || "Gagal mengekspor data ke Excel.",
        }),
      );
    }
  };

  const templateMenuRef = useRef<Menu>(null);

  const templateMenuItems = useMemo<MenuItem[]>(
    () => [
      {
        label: "Template Kosong",
        icon: "pi pi-download",
        command: handleDownloadTemplate,
      },
      {
        label: "Data Karyawan Saat Ini",
        icon: "pi pi-file-export",
        command: handleExportExisting,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [masterReferences, employeesData],
  );

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Format Salah",
          detail: "Harap unggah file spreadsheet Excel (.xlsx atau .xls).",
        }),
      );
      return;
    }

    setSelectedFile(file);
    setIsParsing(true);
    try {
      const rows = await parseEmployeeSpreadsheet(file, existingCodes);
      setParsedRows(rows);
      dispatch(
        showToast({
          visible: true,
          severity: "info",
          summary: "File Terbaca",
          detail: `Berhasil membaca ${rows.length} baris data karyawan dari file Excel.`,
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Gagal Membaca File",
          detail:
            err.message ||
            "Pastikan file Excel menggunakan format template yang disediakan.",
        }),
      );
      setParsedRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleResetFile = () => {
    setSelectedFile(null);
    setParsedRows([]);
    setFilterMode("ALL");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;

    const validRows = parsedRows.filter(
      (r) => !r._validation_errors || r._validation_errors.length === 0,
    );

    if (validRows.length === 0) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Data Belum Siap Disimpan",
          detail:
            "Semua baris data masih belum lengkap atau memiliki kendala. Harap lengkapi sebelum menyimpan.",
        }),
      );
      return;
    }

    setConfirmDialogVisible(false);
    setIsSubmitting(true);

    try {
      const result = await bulkUpsertEmployees(validRows);
      setImportResult(result);
      setResultDialogVisible(true);

      dispatch(
        showToast({
          visible: true,
          severity: result.failed_count === 0 ? "success" : "warn",
          summary: "Proses Penyimpanan Selesai",
          detail: `Selesai: ${result.created_count} karyawan baru ditambahkan, ${result.updated_count} diperbarui.${
            result.failed_count > 0
              ? ` (${result.failed_count} data dilewati)`
              : ""
          }`,
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Gagal Menyimpan Data",
          detail:
            err.message || "Terjadi kendala pada server saat menyimpan data.",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Top Navigation & Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            icon="pi pi-arrow-left"
            outlined
            severity="secondary"
            className="p-button-sm rounded-xl"
            onClick={() => router.push("/employees")}
            tooltip="Kembali ke Daftar Karyawan"
            tooltipOptions={{ position: "bottom" }}
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800 m-0">
              Import & Perbarui Data Karyawan (Excel)
            </h1>
            <p className="text-sm text-slate-500 m-0 mt-1">
              Tambahkan karyawan baru atau perbarui data karyawan secara
              bersamaan menggunakan file Excel.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            label="Unduh Template"
            icon="pi pi-download"
            severity="secondary"
            outlined
            size="small"
            onClick={(e) => templateMenuRef.current?.toggle(e)}
            aria-controls="template_download_menu"
            aria-haspopup
          />
          <Menu
            model={templateMenuItems}
            popup
            ref={templateMenuRef}
            id="template_download_menu"
          />

          <Button
            type="button"
            label="Import Kompensasi"
            icon="pi pi-wallet"
            severity="help"
            outlined
            size="small"
            onClick={() => router.push("/employees/compensation-import")}
            tooltip="Beralih ke import tunjangan, insentif & potongan"
            tooltipOptions={{ position: "bottom" }}
          />
        </div>
      </div>

      {/* Guidelines Section */}
      <Card className="shadow-xs border border-blue-100 bg-blue-50/40 rounded-xl">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <i className="pi pi-info-circle text-xl" />
          </div>
          <div className="flex-1 text-sm text-slate-700 leading-relaxed">
            <h3 className="font-semibold text-slate-900 m-0 mb-2">
              Panduan Pengisian File Excel:
            </h3>
            <ul className="list-disc pl-5 m-0 space-y-1.5">
              <li>
                <strong>Pembaruan Otomatis Berdasarkan NIK:</strong> Sistem
                menggunakan kolom <code>NIK / Employee Code*</code> sebagai
                pengenal utama. Jika nomor NIK sudah terdaftar, data karyawan
                tersebut akan <strong>diperbarui dengan data terbaru</strong>.
                Jika nomor NIK belum pernah ada di sistem, maka otomatis{" "}
                <strong>didaftarkan sebagai karyawan baru</strong>.
              </li>
              <li>
                <strong>Kolom Wajib Diisi (Bertanda *):</strong> Kolom{" "}
                <code>NIK / Employee Code*</code>, <code>Nama Depan*</code>,{" "}
                <code>Nama Belakang*</code>, <code>Tempat Lahir*</code>,{" "}
                <code>Tanggal Lahir*</code> (penulisan tahun-bulan-hari:{" "}
                <code>YYYY-MM-DD</code>, contoh: <code>1992-05-14</code>), dan{" "}
                <code>Jenis Kelamin*</code> (contoh: <code>Laki-laki</code> atau{" "}
                <code>Perempuan</code>).
              </li>
              <li>
                <strong>Pilihan Kata Baku / Pilihan Resmi:</strong> Untuk kolom
                Agama, Status Pernikahan, Cabang, Departemen, Jabatan, Bank, dan
                Status PTKP, harap gunakan pilihan nama yang telah disediakan di
                lembar (sheet) kedua bertajuk{" "}
                <em>"Pilihan Data & Referensi"</em> pada file template Excel.
              </li>
              <li>
                <strong>Atasan Langsung / Supervisor:</strong> Anda dapat
                mengisi NIK atau Nama Lengkap atasan pada kolom{" "}
                <code>Atasan Langsung / Supervisor</code>. Sesuai aturan sistem,
                atasan harus merupakan akun yang memiliki wewenang persetujuan
                (memiliki role <em>Superadmin</em>, <em>Admin</em>, <em>HR</em>,
                atau <em>Approver</em>). Daftar atasan yang sah dan NIK-nya
                dapat Anda lihat di sheet kedua (
                <em>"Pilihan Data & Referensi"</em>).
              </li>
              <li>
                <strong>Tips Mengubah Data Lama Lebih Cepat:</strong> Anda dapat
                menekan tombol <em>"Unduh Data Karyawan Saat Ini"</em> di kanan
                atas untuk mengambil seluruh data yang ada ke Excel, ubah data
                yang diinginkan di Excel, lalu unggah kembali tanpa perlu
                mengetik ulang dari awal.
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Upload Zone */}
      <div className="bg-white border-2 border-dashed border-slate-300 hover:border-blue-500 transition-colors rounded-2xl p-6 sm:p-10 text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx, .xls"
          className="hidden"
          onChange={handleFileChange}
        />

        {!selectedFile ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
              <i className="pi pi-file-excel text-4xl text-emerald-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800 m-0">
                Pilih atau Tarik File Excel (.xlsx / .xls) ke Sini
              </p>
              <p className="text-xs text-slate-500 m-0 mt-1">
                Ukuran maksimum file 10MB
              </p>
            </div>
            <Button
              type="button"
              label="Pilih File dari Komputer"
              icon="pi pi-upload"
              size="small"
              className="mt-2"
              onClick={() => fileInputRef.current?.click()}
            />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3 text-left">
              <i className="pi pi-file-excel text-3xl text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-800 m-0 text-sm">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-500 m-0">
                  {(selectedFile.size / 1024).toFixed(1)} KB •{" "}
                  {parsedRows.length} baris terdeteksi
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                label="Ganti File"
                icon="pi pi-refresh"
                size="small"
                outlined
                severity="secondary"
                onClick={() => fileInputRef.current?.click()}
              />
              <Button
                type="button"
                icon="pi pi-trash"
                size="small"
                outlined
                severity="danger"
                onClick={handleResetFile}
                tooltip="Hapus File"
              />
            </div>
          </div>
        )}

        {isParsing && (
          <div className="mt-4">
            <ProgressBar mode="indeterminate" style={{ height: "6px" }} />
            <p className="text-xs text-slate-500 mt-2">
              Sedang membaca dan memeriksa isi file Excel...
            </p>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {parsedRows.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                filterMode === "ALL"
                  ? "bg-blue-50 border-blue-400 ring-2 ring-blue-200"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => setFilterMode("ALL")}
            >
              <p className="text-xs font-medium text-slate-500 m-0">
                Total Baris Terbaca
              </p>
              <p className="text-2xl font-bold text-slate-800 m-0 mt-1">
                {metrics.total}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                filterMode === "UPDATE"
                  ? "bg-amber-50 border-amber-400 ring-2 ring-amber-200"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => setFilterMode("UPDATE")}
            >
              <p className="text-xs font-medium text-amber-700 m-0">
                Karyawan Lama (Akan Diperbarui)
              </p>
              <p className="text-2xl font-bold text-amber-700 m-0 mt-1">
                {metrics.updateCount}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                filterMode === "CREATE"
                  ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-200"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => setFilterMode("CREATE")}
            >
              <p className="text-xs font-medium text-emerald-700 m-0">
                Karyawan Baru (Akan Ditambahkan)
              </p>
              <p className="text-2xl font-bold text-emerald-700 m-0 mt-1">
                {metrics.createCount}
              </p>
            </div>

            <div
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                filterMode === "INVALID"
                  ? "bg-red-50 border-red-400 ring-2 ring-red-200"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
              onClick={() => setFilterMode("INVALID")}
            >
              <p className="text-xs font-medium text-red-700 m-0">
                Perlu Dilengkapi
              </p>
              <p className="text-2xl font-bold text-red-700 m-0 mt-1">
                {metrics.invalidCount}
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="text-sm text-slate-600">
              Menampilkan <strong>{filteredRows.length}</strong> dari{" "}
              <strong>{parsedRows.length}</strong> data karyawan yang terbaca.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button
                type="button"
                label="Batal"
                severity="secondary"
                outlined
                size="small"
                onClick={handleResetFile}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                label={
                  isSubmitting
                    ? "Sedang Menyimpan Data..."
                    : `Simpan Data (${metrics.createCount + metrics.updateCount} Karyawan)`
                }
                icon={isSubmitting ? "pi pi-spin pi-spinner" : "pi pi-check"}
                severity="success"
                size="small"
                disabled={
                  isSubmitting ||
                  metrics.createCount + metrics.updateCount === 0
                }
                onClick={() => setConfirmDialogVisible(true)}
              />
            </div>
          </div>

          {/* Table Preview */}
          <Card className="shadow-xs border border-slate-200 rounded-xl overflow-hidden p-0">
            <DataTable
              value={filteredRows}
              paginator
              rows={10}
              rowsPerPageOptions={[10, 25, 50]}
              stripedRows
              showGridlines
              size="small"
              emptyMessage="Tidak ada baris data yang cocok dengan pilihan filter."
              className="text-xs"
            >
              <Column
                header="Baris"
                body={(row) => row._row_number}
                style={{ width: "4rem" }}
              />

              <Column
                header="Status Tindakan"
                body={(row: EmployeeBulkImportRow) => {
                  if (
                    row._validation_errors &&
                    row._validation_errors.length > 0
                  ) {
                    return (
                      <Tag
                        value="Perlu Dilengkapi"
                        severity="danger"
                        icon="pi pi-times-circle"
                      />
                    );
                  }
                  if (row._is_existing) {
                    return (
                      <Tag
                        value="Perbarui Data"
                        severity="warning"
                        icon="pi pi-pencil"
                      />
                    );
                  }
                  return (
                    <Tag
                      value="Karyawan Baru"
                      severity="success"
                      icon="pi pi-plus"
                    />
                  );
                }}
                style={{ minWidth: "9rem" }}
              />

              <Column
                field="code"
                header="NIK / Kode Karyawan"
                sortable
                style={{ width: "9rem" }}
              />
              <Column
                header="Nama Lengkap"
                body={(row) =>
                  [row.first_name, row.middle_name, row.last_name]
                    .filter(Boolean)
                    .join(" ")
                }
                sortable
                style={{ minWidth: "12rem" }}
              />
              <Column
                field="gender"
                header="Jenis Kelamin"
                style={{ width: "8rem" }}
              />
              <Column
                field="dob"
                header="Tgl Lahir"
                style={{ width: "8rem" }}
              />
              <Column
                field="department_name"
                header="Departemen"
                style={{ minWidth: "10rem" }}
              />
              <Column
                field="position_name"
                header="Jabatan"
                style={{ minWidth: "10rem" }}
              />
              <Column
                field="supervisor"
                header="Atasan Langsung"
                style={{ minWidth: "10rem" }}
              />
              <Column
                field="bank_name"
                header="Bank"
                style={{ width: "7rem" }}
              />
              <Column
                field="bank_account_number"
                header="No. Rekening"
                style={{ width: "9rem" }}
              />
              <Column
                field="base_salary"
                header="Gaji Pokok"
                body={(row) =>
                  row.base_salary
                    ? `Rp ${Number(row.base_salary).toLocaleString("id-ID")}`
                    : "-"
                }
                style={{ width: "9rem" }}
              />

              <Column
                header="Catatan Pemeriksaan"
                body={(row: EmployeeBulkImportRow) => {
                  if (
                    row._validation_errors &&
                    row._validation_errors.length > 0
                  ) {
                    return (
                      <span className="text-red-600 font-medium text-xs">
                        {row._validation_errors.join(", ")}
                      </span>
                    );
                  }
                  return (
                    <span className="text-emerald-600 text-xs font-medium">
                      Siap Disimpan
                    </span>
                  );
                }}
                style={{ minWidth: "14rem" }}
              />
            </DataTable>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        header="Konfirmasi Penyimpanan Data Karyawan"
        visible={confirmDialogVisible}
        style={{ width: "90vw", maxWidth: "480px" }}
        onHide={() => setConfirmDialogVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Batal"
              icon="pi pi-times"
              outlined
              severity="secondary"
              onClick={() => setConfirmDialogVisible(false)}
            />
            <Button
              label="Ya, Simpan Sekarang"
              icon="pi pi-check"
              severity="success"
              onClick={handleExecuteImport}
              autoFocus
            />
          </div>
        }
      >
        <div className="flex items-start gap-3 py-2 text-slate-700">
          <i className="pi pi-question-circle text-amber-500 text-3xl shrink-0" />
          <div className="text-sm">
            <p className="m-0 font-medium">
              Apakah Anda yakin ingin menyimpan dan menerapkan data karyawan ini
              ke dalam sistem?
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600 text-xs">
              <li>
                <strong>{metrics.updateCount} data karyawan lama</strong> akan
                diperbarui informasinya.
              </li>
              <li>
                <strong>{metrics.createCount} karyawan baru</strong> akan
                didaftarkan ke sistem.
              </li>
              {metrics.invalidCount > 0 && (
                <li className="text-red-600">
                  <strong>
                    {metrics.invalidCount} baris data yang belum lengkap
                  </strong>{" "}
                  akan dilewati secara otomatis dan tidak disimpan.
                </li>
              )}
            </ul>
          </div>
        </div>
      </Dialog>

      {/* Result Dialog */}
      <Dialog
        header="Laporan Hasil Pengunggahan Data Karyawan"
        visible={resultDialogVisible}
        style={{ width: "90vw", maxWidth: "600px" }}
        onHide={() => setResultDialogVisible(false)}
        footer={
          <div className="flex justify-between items-center w-full">
            <Button
              label="Tutup"
              outlined
              severity="secondary"
              onClick={() => setResultDialogVisible(false)}
            />
            <Button
              label="Kembali ke Halaman Karyawan"
              icon="pi pi-arrow-left"
              onClick={() => router.push("/employees")}
            />
          </div>
        }
      >
        {importResult && (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <p className="text-xs text-emerald-700 m-0">
                  Karyawan Baru Ditambahkan
                </p>
                <p className="text-2xl font-bold text-emerald-800 m-0 mt-1">
                  {importResult.created_count}
                </p>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-700 m-0">
                  Data Karyawan Diperbarui
                </p>
                <p className="text-2xl font-bold text-amber-800 m-0 mt-1">
                  {importResult.updated_count}
                </p>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-xs text-red-700 m-0">
                  Dilewati / Belum Lengkap
                </p>
                <p className="text-2xl font-bold text-red-800 m-0 mt-1">
                  {importResult.failed_count}
                </p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-red-700 m-0">
                  Rincian Baris yang Memerlukan Perbaikan:
                </h4>
                <div className="max-h-48 overflow-y-auto border border-red-200 rounded-xl bg-red-50/50 p-2 text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-red-200 text-red-800">
                        <th className="p-1">Baris</th>
                        <th className="p-1">NIK / Kode</th>
                        <th className="p-1">Keterangan Kendala</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importResult.errors.map((err, i) => (
                        <tr
                          key={i}
                          className="border-b border-red-100 last:border-0"
                        >
                          <td className="p-1 font-semibold">
                            {err.row_number}
                          </td>
                          <td className="p-1">{err.code || "-"}</td>
                          <td className="p-1 text-red-700">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
