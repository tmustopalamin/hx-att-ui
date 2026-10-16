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

import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import { bulkUpsertEmployeeCompensations } from "@/app/services/employee-compensation-bulk-service";
import {
  generateCompensationTemplate,
  exportCompensationsToExcel,
  parseCompensationSpreadsheet,
  MasterCompensationReferenceData,
} from "@/app/utils/employee-compensation-spreadsheet-helper";
import {
  CompensationBulkImportRow,
  CompensationBulkUpsertResult,
} from "@/app/types/employee-compensation-bulk";
import { IncomeComponent } from "@/app/types/income-component";
import { DeductionComponent } from "@/app/types/deduction-component";
import { Frequency } from "@/app/types/frequency";

export default function EmployeeCompensationImportPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference data fetchers
  const { data: employeesData } = useSWR<any[]>("/api/employees/list", fetcher);
  const { data: incomeComponentData } = useSWR<IncomeComponent[]>(
    "/api/income-component",
    fetcher,
  );
  const { data: deductionComponentData } = useSWR<DeductionComponent[]>(
    "/api/deduction-component",
    fetcher,
  );
  const { data: frequencyData } = useSWR<Frequency[]>(
    "/api/frequency",
    fetcher,
  );

  const masterReferences: MasterCompensationReferenceData = useMemo(() => {
    return {
      employees: employeesData?.map((e: any) => ({
        id: e.id,
        code: e.code,
        name: [e.first_name, e.middle_name, e.last_name]
          .filter(Boolean)
          .join(" "),
        department: e.department_name,
        position: e.position_name,
      })),
      incomeComponents: incomeComponentData
        ?.filter((c) => c.assignment_mode === "EMPLOYEE")
        ?.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          calculation_method_code: c.calculation_method_code,
          is_active: c.is_active,
        })),
      deductionComponents: deductionComponentData
        ?.filter((c) => c.assignment_mode === "EMPLOYEE")
        ?.map((c) => ({
          id: c.id,
          code: c.code,
          name: c.name,
          is_active: c.is_active,
        })),
      frequencies: frequencyData?.map((f) => ({
        id: f.id,
        code: f.code,
        name: f.name,
      })),
    };
  }, [
    employeesData,
    incomeComponentData,
    deductionComponentData,
    frequencyData,
  ]);

  // Upload & Process States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<CompensationBulkImportRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDialogVisible, setConfirmDialogVisible] = useState(false);
  const [resultDialogVisible, setResultDialogVisible] = useState(false);
  const [importResult, setImportResult] =
    useState<CompensationBulkUpsertResult | null>(null);
  const [filterMode, setFilterMode] = useState<
    "ALL" | "INCOME" | "DEDUCTION" | "VALID" | "INVALID"
  >("ALL");

  // Metrics
  const metrics = useMemo(() => {
    const total = parsedRows.length;
    const incomeCount = parsedRows.filter(
      (r) => r._resolved_type === "INCOME" || r.component_type === "TUNJANGAN",
    ).length;
    const deductionCount = parsedRows.filter(
      (r) =>
        r._resolved_type === "DEDUCTION" || r.component_type === "POTONGAN",
    ).length;
    const invalidCount = parsedRows.filter(
      (r) => r._validation_errors && r._validation_errors.length > 0,
    ).length;
    const validCount = total - invalidCount;

    return { total, incomeCount, deductionCount, validCount, invalidCount };
  }, [parsedRows]);

  const filteredRows = useMemo(() => {
    if (filterMode === "INCOME") {
      return parsedRows.filter(
        (r) =>
          r._resolved_type === "INCOME" || r.component_type === "TUNJANGAN",
      );
    }
    if (filterMode === "DEDUCTION") {
      return parsedRows.filter(
        (r) =>
          r._resolved_type === "DEDUCTION" || r.component_type === "POTONGAN",
      );
    }
    if (filterMode === "VALID") {
      return parsedRows.filter(
        (r) => !r._validation_errors || r._validation_errors.length === 0,
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
      generateCompensationTemplate(masterReferences, true);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Berhasil",
          detail: "Template Excel import kompensasi berhasil diunduh.",
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

  const handleExportSampleOrCurrent = () => {
    try {
      // Export currently loaded rows if any, otherwise sample
      const exportData =
        parsedRows.length > 0
          ? parsedRows.map((r) => ({
              code: r.code,
              employee_name: r.employee_name || undefined,
              component_type: (r._resolved_type === "DEDUCTION"
                ? "POTONGAN"
                : "TUNJANGAN") as "TUNJANGAN" | "POTONGAN",
              component_name: r.component_name,
              amount: r.amount,
              frequency: r.frequency || "Bulanan",
              start_date: r.start_date || undefined,
              end_date: r.end_date || undefined,
              percentage: r.percentage,
              based_on_component: r.based_on_component,
              notes: r.notes,
            }))
          : [
              {
                code: "EMP001",
                employee_name: "Budi Santoso",
                component_type: "TUNJANGAN" as const,
                component_name: "Tunjangan Transport",
                amount: 500000,
                frequency: "Bulanan",
                start_date: "2024-01-01",
                notes: "Tunjangan transportasi bulanan",
              },
            ];

      exportCompensationsToExcel(exportData);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Berhasil",
          detail: "Data kompensasi berhasil diekspor ke Excel.",
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
      const rows = await parseCompensationSpreadsheet(file, masterReferences);
      setParsedRows(rows);
      setFilterMode("ALL");

      const errCount = rows.filter(
        (r) => r._validation_errors && r._validation_errors.length > 0,
      ).length;

      dispatch(
        showToast({
          visible: true,
          severity: errCount > 0 ? "warn" : "success",
          summary: "File Berhasil Dibaca",
          detail: `${rows.length} baris data ditemukan.${
            errCount > 0
              ? ` (${errCount} baris memiliki catatan/peringatan)`
              : ""
          }`,
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Gagal Membaca File",
          detail:
            err.message || "Terjadi kesalahan saat memproses spreadsheet.",
        }),
      );
      setParsedRows([]);
      setSelectedFile(null);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmitImport = async () => {
    if (parsedRows.length === 0) return;

    setIsSubmitting(true);
    setConfirmDialogVisible(false);

    try {
      const result = await bulkUpsertEmployeeCompensations(parsedRows);
      setImportResult(result);
      setResultDialogVisible(true);

      dispatch(
        showToast({
          visible: true,
          severity: result.failed_count === 0 ? "success" : "warn",
          summary: "Proses Selesai",
          detail: `${result.created_count} dibuat, ${result.updated_count} diperbarui, ${result.failed_count} gagal.`,
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Gagal Mengimpor",
          detail: err.message || "Terjadi kesalahan saat menyimpan data.",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <button
              type="button"
              onClick={() => router.push("/employees")}
              className="hover:text-primary transition-colors flex items-center gap-1 font-medium"
            >
              <i className="pi pi-arrow-left text-xs" />
              Karyawan
            </button>
            <span>/</span>
            <span className="text-gray-800 font-semibold">
              Bulk Import Kompensasi
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Import Komponen Gaji Karyawan
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Tetapkan tunjangan, insentif, dan potongan karyawan secara massal
            menggunakan spreadsheet Excel (.xlsx).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            label="Impor Data Karyawan"
            icon="pi pi-users"
            severity="secondary"
            outlined
            size="small"
            onClick={() => router.push("/employees/import")}
          />
        </div>
      </div>

      {/* Action Bar Card */}
      <Card className="shadow-sm border border-gray-100 bg-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              label="Unduh Template Excel"
              icon="pi pi-download"
              severity="secondary"
              outlined
              size="small"
              onClick={handleDownloadTemplate}
              tooltip="Unduh template Excel resmi beserta panduan dan daftar referensi"
              tooltipOptions={{ position: "bottom" }}
            />

            <Button
              type="button"
              label="Ekspor Format Excel"
              icon="pi pi-file-export"
              severity="secondary"
              outlined
              size="small"
              onClick={handleExportSampleOrCurrent}
              tooltip="Ekspor data pratinjau saat ini ke file Excel"
              tooltipOptions={{ position: "bottom" }}
            />

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx,.xls"
              className="hidden"
            />

            <Button
              type="button"
              label={selectedFile ? "Ganti File Excel" : "Pilih File Excel"}
              icon="pi pi-file-excel"
              severity="info"
              size="small"
              onClick={() => fileInputRef.current?.click()}
              loading={isParsing}
            />

            {selectedFile && (
              <span className="text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded px-2.5 py-1 flex items-center gap-1.5">
                <i className="pi pi-file text-green-600" />
                {selectedFile.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {parsedRows.length > 0 && (
              <Button
                type="button"
                label="Batal / Reset"
                icon="pi pi-times"
                severity="secondary"
                text
                size="small"
                onClick={() => {
                  setParsedRows([]);
                  setSelectedFile(null);
                }}
                disabled={isSubmitting}
              />
            )}

            <Button
              type="button"
              label="Proses Impor Kompensasi"
              icon="pi pi-cloud-upload"
              severity="success"
              size="small"
              disabled={
                parsedRows.length === 0 ||
                isParsing ||
                isSubmitting ||
                metrics.invalidCount > 0
              }
              loading={isSubmitting}
              onClick={() => setConfirmDialogVisible(true)}
            />
          </div>
        </div>

        {isParsing && (
          <div className="mt-4">
            <ProgressBar mode="indeterminate" style={{ height: "6px" }} />
            <p className="text-xs text-gray-500 mt-2 text-center">
              Membaca dan memvalidasi file Excel...
            </p>
          </div>
        )}
      </Card>

      {/* KPI Metrics */}
      {parsedRows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-gray-500">
              Total Baris
            </span>
            <span className="text-2xl font-bold text-gray-800 mt-1">
              {metrics.total}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-green-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-green-700">
              Tunjangan & Insentif
            </span>
            <span className="text-2xl font-bold text-green-700 mt-1">
              {metrics.incomeCount}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-orange-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-orange-700">
              Potongan Gaji
            </span>
            <span className="text-2xl font-bold text-orange-700 mt-1">
              {metrics.deductionCount}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-medium text-blue-700">
              Siap Diproses
            </span>
            <span className="text-2xl font-bold text-blue-700 mt-1">
              {metrics.validCount}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-red-200 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
            <span className="text-xs font-medium text-red-700">
              Perlu Perbaikan
            </span>
            <span className="text-2xl font-bold text-red-700 mt-1">
              {metrics.invalidCount}
            </span>
          </div>
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 ? (
        <Card className="shadow-sm border border-gray-100 bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-gray-800">
                Pratinjau Data Impor ({filteredRows.length} baris)
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setFilterMode("ALL")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  filterMode === "ALL"
                    ? "bg-white text-gray-800 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Semua ({metrics.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("INCOME")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  filterMode === "INCOME"
                    ? "bg-white text-green-700 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Tunjangan ({metrics.incomeCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("DEDUCTION")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  filterMode === "DEDUCTION"
                    ? "bg-white text-orange-700 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Potongan ({metrics.deductionCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("VALID")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  filterMode === "VALID"
                    ? "bg-white text-blue-700 shadow-sm font-semibold"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Valid ({metrics.validCount})
              </button>
              {metrics.invalidCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterMode("INVALID")}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    filterMode === "INVALID"
                      ? "bg-white text-red-700 shadow-sm font-semibold"
                      : "text-red-600 hover:text-red-800"
                  }`}
                >
                  Error ({metrics.invalidCount})
                </button>
              )}
            </div>
          </div>

          <DataTable
            value={filteredRows}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50, 100]}
            size="small"
            stripedRows
            emptyMessage="Tidak ada baris data yang cocok dengan filter."
            responsiveLayout="scroll"
            className="text-xs"
          >
            <Column
              field="_row_number"
              header="#"
              style={{ width: "60px" }}
              body={(rowData) => (
                <span className="font-mono text-gray-500">
                  {rowData._row_number}
                </span>
              )}
            />

            <Column
              field="code"
              header="NIK"
              style={{ width: "120px" }}
              body={(rowData: CompensationBulkImportRow) => (
                <span className="font-mono font-medium text-gray-800">
                  {rowData.code}
                </span>
              )}
            />

            <Column
              field="employee_name"
              header="Nama Karyawan"
              style={{ minWidth: "160px" }}
              body={(rowData: CompensationBulkImportRow) => (
                <span className="text-gray-700">
                  {rowData.employee_name || "-"}
                </span>
              )}
            />

            <Column
              header="Tipe"
              style={{ width: "130px" }}
              body={(rowData: CompensationBulkImportRow) => {
                const isIncome =
                  rowData._resolved_type === "INCOME" ||
                  rowData.component_type === "TUNJANGAN";
                return isIncome ? (
                  <Tag
                    value="TUNJANGAN"
                    severity="success"
                    rounded
                    className="text-[10px]"
                  />
                ) : (
                  <Tag
                    value="POTONGAN"
                    severity="warning"
                    rounded
                    className="text-[10px]"
                  />
                );
              }}
            />

            <Column
              field="component_name"
              header="Nama Komponen"
              style={{ minWidth: "180px" }}
              body={(rowData: CompensationBulkImportRow) => (
                <span className="font-semibold text-gray-800">
                  {rowData.component_name}
                </span>
              )}
            />

            <Column
              field="amount"
              header="Nominal (Rp)"
              style={{ width: "140px" }}
              body={(rowData: CompensationBulkImportRow) => (
                <span className="font-mono font-semibold text-gray-900">
                  {formatCurrency(rowData.amount)}
                </span>
              )}
            />

            <Column
              field="frequency"
              header="Frekuensi"
              style={{ width: "110px" }}
              body={(rowData: CompensationBulkImportRow) => (
                <span className="text-gray-600">
                  {rowData.frequency || "Bulanan"}
                </span>
              )}
            />

            <Column
              field="start_date"
              header="Mulai Berlaku"
              style={{ width: "120px" }}
              body={(rowData: CompensationBulkImportRow) => (
                <span className="font-mono text-gray-600">
                  {rowData.start_date || "-"}
                </span>
              )}
            />

            <Column
              field="end_date"
              header="Berakhir"
              style={{ width: "120px" }}
              body={(rowData: CompensationBulkImportRow) => (
                <span className="font-mono text-gray-600">
                  {rowData.end_date || "-"}
                </span>
              )}
            />

            <Column
              field="notes"
              header="Catatan"
              style={{ minWidth: "140px" }}
              body={(rowData: CompensationBulkImportRow) => (
                <span className="text-gray-500 italic">
                  {rowData.notes || "-"}
                </span>
              )}
            />

            <Column
              header="Status Validasi"
              style={{ width: "140px" }}
              body={(rowData: CompensationBulkImportRow) => {
                const hasErrors =
                  rowData._validation_errors &&
                  rowData._validation_errors.length > 0;

                if (hasErrors) {
                  return (
                    <div className="flex items-center gap-1.5 text-red-600 font-medium">
                      <i
                        className="pi pi-exclamation-triangle cursor-pointer"
                        title={rowData._validation_errors?.join("\n")}
                      />
                      <span>Error ({rowData._validation_errors?.length})</span>
                    </div>
                  );
                }

                return (
                  <div className="flex items-center gap-1.5 text-green-600 font-medium">
                    <i className="pi pi-check-circle" />
                    <span>Valid</span>
                  </div>
                );
              }}
            />
          </DataTable>
        </Card>
      ) : (
        /* Empty State */
        <Card className="shadow-sm border border-gray-100 bg-white p-8 text-center">
          <div className="flex flex-col items-center justify-center max-w-md mx-auto py-8">
            <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <i className="pi pi-file-excel text-3xl" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Belum Ada File Kompensasi yang Dipilih
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Silakan unduh template Excel resmi terlebih dahulu, lengkapi data
              tunjangan, insentif, atau potongan karyawan, lalu unggah ke
              sistem.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                label="Unduh Template Excel"
                icon="pi pi-download"
                severity="secondary"
                outlined
                size="small"
                onClick={handleDownloadTemplate}
              />
              <Button
                type="button"
                label="Pilih File Spreadsheet"
                icon="pi pi-upload"
                severity="info"
                size="small"
                onClick={() => fileInputRef.current?.click()}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        header="Konfirmasi Impor Kompensasi"
        visible={confirmDialogVisible}
        onHide={() => setConfirmDialogVisible(false)}
        style={{ width: "450px" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label="Batal"
              severity="secondary"
              text
              size="small"
              onClick={() => setConfirmDialogVisible(false)}
              disabled={isSubmitting}
            />
            <Button
              type="button"
              label="Ya, Jalankan Impor"
              severity="success"
              icon="pi pi-check"
              size="small"
              loading={isSubmitting}
              onClick={handleSubmitImport}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3 pt-2 text-sm text-gray-700">
          <p>
            Anda akan memproses <strong>{parsedRows.length}</strong> baris
            komponen kompensasi:
          </p>
          <ul className="list-disc list-inside space-y-1 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <li>
              Tunjangan & Insentif: <strong>{metrics.incomeCount}</strong> baris
            </li>
            <li>
              Potongan Gaji: <strong>{metrics.deductionCount}</strong> baris
            </li>
          </ul>
          <p className="text-xs text-gray-500">
            *Jika karyawan sudah memiliki komponen yang aktif pada periode yang
            bersinggungan, nominal dan data akan otomatis diperbarui (upsert).
          </p>
        </div>
      </Dialog>

      {/* Result Dialog */}
      <Dialog
        header="Hasil Eksekusi Impor Kompensasi"
        visible={resultDialogVisible}
        onHide={() => {
          setResultDialogVisible(false);
          if (importResult && importResult.failed_count === 0) {
            router.push("/employees");
          }
        }}
        style={{ width: "550px" }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              label="Ke Daftar Karyawan"
              size="small"
              onClick={() => {
                setResultDialogVisible(false);
                router.push("/employees");
              }}
            />
          </div>
        }
      >
        {importResult && (
          <div className="flex flex-col gap-4 pt-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <span className="text-xs font-semibold text-green-700 block">
                  Dibuat Baru
                </span>
                <span className="text-2xl font-bold text-green-800">
                  {importResult.created_count}
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span className="text-xs font-semibold text-blue-700 block">
                  Diperbarui (Upsert)
                </span>
                <span className="text-2xl font-bold text-blue-800">
                  {importResult.updated_count}
                </span>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="text-xs font-semibold text-red-700 block">
                  Gagal
                </span>
                <span className="text-2xl font-bold text-red-800">
                  {importResult.failed_count}
                </span>
              </div>
            </div>

            {importResult.errors && importResult.errors.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-semibold text-red-700 block mb-1">
                  Rincian Baris Gagal ({importResult.errors.length}):
                </span>
                <div className="max-h-48 overflow-y-auto border border-red-100 rounded-lg bg-red-50 p-2 space-y-1.5 text-xs text-red-800">
                  {importResult.errors.map((err, i) => (
                    <div
                      key={i}
                      className="flex gap-2 border-b border-red-200/50 pb-1"
                    >
                      <span className="font-mono font-bold">
                        Baris {err.row_number}:
                      </span>
                      <span>
                        {err.code ? `[${err.code}] ` : ""}
                        {err.component_name ? `(${err.component_name}) ` : ""}
                        {err.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
