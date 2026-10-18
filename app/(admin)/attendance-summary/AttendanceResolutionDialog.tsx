"use client";

import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Tag } from "primereact/tag";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { useDispatch } from "react-redux";

import { useI18n } from "@/app/i18n";
import { showToast } from "@/store/ToastSlice";
import { AttendanceSummary } from "@/app/types/attendance-summary";
import {
  AttendanceResolutionItem,
  BatchAttendanceResolutionRequest,
} from "@/app/types/attendance-resolution";
import { resolveAttendanceIncompletion } from "@/app/services/attendance-resolution-service";
import { formatDate } from "@/app/utils/date-format";

interface AttendanceResolutionDialogProps {
  visible: boolean;
  onHide: () => void;
  onSuccess: () => Promise<void> | void;
  availableIncompleteRows: AttendanceSummary[];
  initialRow?: AttendanceSummary | null;
  dateRangeText?: string;
}

const COMMON_REASONS = [
  "Lupa scan checkout (Shift malam)",
  "Lupa scan checkout",
  "Lupa scan checkin",
  "Koreksi supervisi / CCTV terkonfirmasi hadir",
  "Kendala teknis mesin fingerprint scanner",
  "Penugasan dinas luar / operasional lapangan",
];

export default function AttendanceResolutionDialog({
  visible,
  onHide,
  onSuccess,
  availableIncompleteRows,
  initialRow,
  dateRangeText,
}: AttendanceResolutionDialogProps) {
  const { locale } = useI18n();
  const isId = locale === "id";
  const dispatch = useDispatch();

  const [items, setItems] = useState<AttendanceResolutionItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    AttendanceResolutionItem[]
  >([]);
  const [globalReason, setGlobalReason] = useState<string>(COMMON_REASONS[0]);
  const [globalNotes, setGlobalNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Filter detected incomplete rows from parent
  const detectedIncompleteRows = useMemo(() => {
    return availableIncompleteRows.filter((row) => {
      const status = (row.status || "").toUpperCase();
      return (
        status === "INCOMPLETE" ||
        status.startsWith("INCOMPLETE_") ||
        row.is_missing_check_in ||
        row.is_missing_check_out
      );
    });
  }, [availableIncompleteRows]);

  const mapSummaryToResolutionItem = (
    row: AttendanceSummary,
  ): AttendanceResolutionItem => {
    let suggestedReason = COMMON_REASONS[0];
    if (row.is_missing_check_in && !row.is_missing_check_out) {
      suggestedReason = "Lupa scan checkin";
    } else if (!row.is_missing_check_in && row.is_missing_check_out) {
      suggestedReason = "Lupa scan checkout (Shift malam)";
    }

    const defaultCheckIn = row.scheduled_start_time
      ? dayjs(row.scheduled_start_time).format("HH:mm")
      : "08:00";
    const defaultCheckOut = row.scheduled_end_time
      ? dayjs(row.scheduled_end_time).format("HH:mm")
      : "17:00";

    return {
      key: `${row.employee_id}_${row.summary_date}`,
      employee_id: row.employee_id,
      employee_name: row.employee_name,
      shift_date: row.summary_date,
      shift_name: row.shift_name,
      scheduled_start_time: row.scheduled_start_time,
      scheduled_end_time: row.scheduled_end_time,
      current_status: row.status,
      is_missing_check_in: row.is_missing_check_in,
      is_missing_check_out: row.is_missing_check_out,
      resolution_action: "USE_SHIFT_TIME",
      check_in_time: defaultCheckIn,
      check_out_time: defaultCheckOut,
      reason: suggestedReason,
      notes: "",
    };
  };

  // Load rows when dialog opens
  useEffect(() => {
    if (!visible) {
      setValidationError(null);
      return;
    }

    if (initialRow) {
      // Single employee mode: only load this specific row
      const singleItem = mapSummaryToResolutionItem(initialRow);
      setItems([singleItem]);
      setSelectedItems([singleItem]);
      setValidationError(null);
    } else if (detectedIncompleteRows.length > 0) {
      // Bulk mode: load all detected incomplete rows
      const newItems = detectedIncompleteRows.map(mapSummaryToResolutionItem);
      setItems(newItems);
      setSelectedItems(newItems); // default select all, but user can uncheck/select 1
      setValidationError(null);
    } else {
      setItems([]);
      setSelectedItems([]);
      setValidationError(null);
    }
  }, [visible, initialRow, detectedIncompleteRows]);

  const loadFromDetectedRows = () => {
    const newItems = detectedIncompleteRows.map(mapSummaryToResolutionItem);
    setItems(newItems);
    setSelectedItems(newItems);
    setValidationError(null);
  };

  const handleApplyGlobalReason = () => {
    if (!globalReason.trim()) return;
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        reason: globalReason.trim(),
        notes: globalNotes.trim() ? globalNotes.trim() : item.notes,
      })),
    );
    setSelectedItems((prev) =>
      prev.map((item) => ({
        ...item,
        reason: globalReason.trim(),
        notes: globalNotes.trim() ? globalNotes.trim() : item.notes,
      })),
    );
  };

  const handleItemChange = <T extends keyof AttendanceResolutionItem>(
    key: string,
    field: T,
    value: AttendanceResolutionItem[T],
  ) => {
    const updateList = (list: AttendanceResolutionItem[]) =>
      list.map((item) =>
        item.key === key ? { ...item, [field]: value } : item,
      );

    setItems((prev) => updateList(prev));
    setSelectedItems((prev) => updateList(prev));
  };

  const handleRemoveItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
    setSelectedItems((prev) => prev.filter((item) => item.key !== key));
  };

  const handleSelectAll = () => {
    setSelectedItems([...items]);
  };

  const handleDeselectAll = () => {
    setSelectedItems([]);
  };

  const handleClearAll = () => {
    setItems([]);
    setSelectedItems([]);
  };

  // Submit items: either the explicitly passed targets or the selected items
  const handleSubmit = async (targets?: AttendanceResolutionItem[]) => {
    setValidationError(null);

    const itemsToSubmit = targets ?? selectedItems;

    if (itemsToSubmit.length === 0) {
      setValidationError(
        isId
          ? "Pilih minimal 1 data presensi untuk dikoreksi (centang baris yang ingin diproses)."
          : "Please select at least 1 attendance record to resolve.",
      );
      return;
    }

    // Validate reason for each selected item (fraud prevention)
    for (let i = 0; i < itemsToSubmit.length; i++) {
      const item = itemsToSubmit[i];
      if (!item.reason || !item.reason.trim()) {
        setValidationError(
          isId
            ? `Alasan wajib diisi pada baris ${item.employee_name || `ID ${item.employee_id}`} untuk mencegah fraud kehadiran.`
            : `Reason is required for ${item.employee_name || `ID ${item.employee_id}`} for audit purposes.`,
        );
        return;
      }

      if (item.resolution_action === "CUSTOM_TIME") {
        if (
          item.is_missing_check_in &&
          (!item.check_in_time || !item.check_in_time.trim())
        ) {
          setValidationError(
            isId
              ? `Jam check-in kustom wajib diisi untuk ${item.employee_name || `ID ${item.employee_id}`}.`
              : `Custom check-in time is required for ${item.employee_name || `ID ${item.employee_id}`}.`,
          );
          return;
        }
        if (
          item.is_missing_check_out &&
          (!item.check_out_time || !item.check_out_time.trim())
        ) {
          setValidationError(
            isId
              ? `Jam check-out kustom wajib diisi untuk ${item.employee_name || `ID ${item.employee_id}`}.`
              : `Custom check-out time is required for ${item.employee_name || `ID ${item.employee_id}`}.`,
          );
          return;
        }
      }
    }

    try {
      setIsSubmitting(true);

      const payload: BatchAttendanceResolutionRequest = {
        items: itemsToSubmit.map((item) => ({
          employee_id: item.employee_id,
          shift_date: item.shift_date,
          resolution_action: item.resolution_action,
          check_in_time:
            item.resolution_action === "CUSTOM_TIME" && item.check_in_time
              ? item.check_in_time.length === 5
                ? `${item.check_in_time}:00`
                : item.check_in_time
              : null,
          check_out_time:
            item.resolution_action === "CUSTOM_TIME" && item.check_out_time
              ? item.check_out_time.length === 5
                ? `${item.check_out_time}:00`
                : item.check_out_time
              : null,
          reason: item.reason.trim(),
          notes: item.notes?.trim() ? item.notes.trim() : null,
        })),
        default_reason: globalReason.trim() || undefined,
        default_notes: globalNotes.trim() || undefined,
      };

      const result = await resolveAttendanceIncompletion(payload);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: isId ? "Koreksi Berhasil" : "Resolution Successful",
          detail:
            result.message ||
            (isId
              ? `Berhasil mengoreksi ${result.data?.resolved_items_count ?? itemsToSubmit.length} data presensi.`
              : `Successfully resolved ${result.data?.resolved_items_count ?? itemsToSubmit.length} records.`),
        }),
      );

      await onSuccess();
      onHide();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : isId
              ? "Gagal memproses koreksi presensi."
              : "Failed to resolve attendance incompletion.";
      setValidationError(errMsg);
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: isId ? "Gagal Koreksi" : "Resolution Failed",
          detail: errMsg,
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerElement = (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3 pr-6">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-sm">
          <i className="pi pi-user-edit text-base" />
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-800 m-0">
            {initialRow
              ? isId
                ? `Koreksi Presensi: ${initialRow.employee_name || `Karyawan #${initialRow.employee_id}`}`
                : `Resolve Punch: ${initialRow.employee_name || `Employee #${initialRow.employee_id}`}`
              : isId
                ? "Koreksi Presensi Karyawan (Pilih Minimal 1)"
                : "Attendance Punch Resolution"}
          </h2>
          <p className="text-xs text-slate-500 m-0 mt-0.5">
            {isId
              ? "Resolusi presensi tidak lengkap agar status menjadi PRESENT dan validasi payroll lolos"
              : "Batch or single resolve missing punch records to satisfy payroll validation requirements"}
            {dateRangeText ? ` • ${dateRangeText}` : ""}
          </p>
        </div>
      </div>
    </div>
  );

  const footerElement = (
    <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Tag
          value={
            isId
              ? `${selectedItems.length} dari ${items.length} dipilih`
              : `${selectedItems.length} of ${items.length} selected`
          }
          severity={selectedItems.length > 0 ? "warning" : "secondary"}
          className="text-xs font-semibold px-2.5 py-1"
        />
        {detectedIncompleteRows.length > items.length && !initialRow && (
          <span className="text-xs text-slate-500">
            ({detectedIncompleteRows.length} {isId ? "terdeteksi" : "detected"})
          </span>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          label={isId ? "Tutup" : "Cancel"}
          icon="pi pi-times"
          outlined
          size="small"
          severity="secondary"
          disabled={isSubmitting}
          onClick={onHide}
        />
        <Button
          type="button"
          label={
            selectedItems.length <= 1
              ? isId
                ? "Simpan & Proses (1 Karyawan)"
                : "Save & Process (1 Record)"
              : isId
                ? `Simpan & Proses (${selectedItems.length} Karyawan)`
                : `Save & Process (${selectedItems.length} Records)`
          }
          icon="pi pi-check"
          size="small"
          severity="warning"
          loading={isSubmitting}
          disabled={selectedItems.length === 0 || isSubmitting}
          onClick={() => handleSubmit()}
        />
      </div>
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={headerElement}
      footer={footerElement}
      style={{ width: "95vw", maxWidth: "1050px" }}
      modal
      className="p-fluid shadow-2xl rounded-2xl"
      closable={!isSubmitting}
    >
      <div className="flex flex-col gap-4 py-2">
        {/* Anti-fraud Info Alert Banner */}
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 leading-relaxed">
          <i className="pi pi-shield text-base text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-amber-950">
              {isId
                ? "Aturan Koreksi Presensi & Audit Log HR"
                : "HR Punch Resolution Policy & Fraud Prevention"}
            </span>
            <p className="m-0 mt-1">
              {isId
                ? "Anda dapat memproses satu karyawan saja atau beberapa karyawan sekaligus. Cukup centang baris yang ingin diproses (atau klik tombol 'Proses Baris Ini'). Sistem akan mencatat log HR_RESOLUTION lengkap dengan alasan dan langsung memperbarui status presensi ke PRESENT."
                : "You can process a single employee or batch multiple. Check the rows you want to resolve and click Save. Each resolution is tracked under audit logs."}
            </p>
          </div>
        </div>

        {validationError && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <i className="pi pi-exclamation-triangle text-sm mt-0.5" />
            <div className="flex-1 font-medium">{validationError}</div>
          </div>
        )}

        {/* Global Toolbar for Fast Bulk Edits & Selection */}
        {items.length > 1 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <i className="pi pi-check-square text-slate-500" />
                  {isId ? "Pilihan Baris:" : "Row Selection:"}
                </span>
                <Button
                  type="button"
                  label={isId ? "Pilih Semua" : "Select All"}
                  size="small"
                  outlined
                  severity="secondary"
                  className="text-xs py-0.5 px-2 font-medium"
                  onClick={handleSelectAll}
                />
                <Button
                  type="button"
                  label={isId ? "Batal Pilih Semua" : "Deselect All"}
                  size="small"
                  outlined
                  severity="secondary"
                  className="text-xs py-0.5 px-2 font-medium"
                  onClick={handleDeselectAll}
                />
              </div>

              <div className="flex items-center gap-2">
                {detectedIncompleteRows.length > 0 && (
                  <Button
                    type="button"
                    label={
                      isId
                        ? `Muat Ulang (${detectedIncompleteRows.length} Terdeteksi)`
                        : `Reload (${detectedIncompleteRows.length} Detected)`
                    }
                    icon="pi pi-refresh"
                    size="small"
                    outlined
                    severity="info"
                    className="text-xs py-0.5 px-2"
                    onClick={loadFromDetectedRows}
                  />
                )}
                <Button
                  type="button"
                  label={isId ? "Kosongkan" : "Clear All"}
                  icon="pi pi-trash"
                  size="small"
                  outlined
                  severity="danger"
                  className="text-xs py-0.5 px-2"
                  onClick={handleClearAll}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end pt-2 border-t border-slate-200">
              <div className="sm:col-span-5 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  {isId ? "Pilihan Alasan Cepat" : "Quick Reason Template"}
                </label>
                <Dropdown
                  value={globalReason}
                  options={COMMON_REASONS.map((r) => ({ label: r, value: r }))}
                  onChange={(e) => setGlobalReason(e.value)}
                  editable
                  placeholder={
                    isId ? "Pilih atau ketik alasan" : "Select or type reason"
                  }
                  className="p-inputtext-sm text-xs"
                />
              </div>

              <div className="sm:col-span-4 flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  {isId
                    ? "Catatan Verifikasi (Opsional)"
                    : "Evidence / Notes (Optional)"}
                </label>
                <InputText
                  value={globalNotes}
                  onChange={(e) => setGlobalNotes(e.target.value)}
                  placeholder={
                    isId
                      ? "Contoh: CCTV OK / No. Tiket HR"
                      : "e.g. CCTV Verified"
                  }
                  className="p-inputtext-sm text-xs"
                />
              </div>

              <div className="sm:col-span-3">
                <Button
                  type="button"
                  label={isId ? "Terapkan ke Semua" : "Apply to All Rows"}
                  icon="pi pi-arrow-circle-down"
                  size="small"
                  severity="secondary"
                  disabled={items.length === 0}
                  className="w-full text-xs py-2 font-medium"
                  onClick={handleApplyGlobalReason}
                />
              </div>
            </div>
          </div>
        )}

        {/* Data Table */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-center gap-3">
            <i className="pi pi-check-circle text-4xl text-emerald-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-700 m-0">
                {isId
                  ? "Tidak Ada Presensi Tidak Lengkap dalam Antrean"
                  : "No Incomplete Attendance in Queue"}
              </h3>
              <p className="text-xs text-slate-500 m-0 mt-1 max-w-md">
                {detectedIncompleteRows.length > 0
                  ? isId
                    ? `Ditemukan ${detectedIncompleteRows.length} baris presensi tidak lengkap pada filter tanggal saat ini. Klik tombol di bawah untuk memuat.`
                    : `${detectedIncompleteRows.length} incomplete rows detected. Click below to load.`
                  : isId
                    ? "Seluruh presensi pada filter saat ini telah lengkap (Final)."
                    : "All attendance records in the current view are complete and final."}
              </p>
            </div>
            {detectedIncompleteRows.length > 0 && (
              <Button
                type="button"
                label={
                  isId
                    ? `Muat ${detectedIncompleteRows.length} Data Tidak Lengkap`
                    : `Load ${detectedIncompleteRows.length} Incomplete Records`
                }
                icon="pi pi-download"
                size="small"
                severity="warning"
                onClick={loadFromDetectedRows}
              />
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <DataTable
              value={items}
              dataKey="key"
              selectionMode="checkbox"
              selection={selectedItems}
              onSelectionChange={(e) =>
                setSelectedItems((e.value as AttendanceResolutionItem[]) || [])
              }
              size="small"
              responsiveLayout="scroll"
              className="text-xs"
              emptyMessage={isId ? "Tidak ada baris" : "No rows"}
            >
              {/* Checkbox Kolom Pemilihan */}
              <Column
                selectionMode="multiple"
                headerStyle={{ width: "3rem" }}
              />

              {/* Kolom 1: Karyawan */}
              <Column
                header={isId ? "Karyawan & Shift" : "Employee & Shift"}
                body={(rowData: AttendanceResolutionItem) => (
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-slate-800 text-xs">
                      {rowData.employee_name ||
                        `Karyawan #${rowData.employee_id}`}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      ID: {rowData.employee_id}
                    </span>
                    {rowData.shift_name && (
                      <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                        {rowData.shift_name}
                      </span>
                    )}
                  </div>
                )}
                style={{ width: "20%" }}
              />

              {/* Kolom 2: Tanggal & Masalah */}
              <Column
                header={isId ? "Tanggal & Masalah" : "Date & Issue"}
                body={(rowData: AttendanceResolutionItem) => (
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-slate-700">
                      {formatDate(rowData.shift_date)}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {rowData.is_missing_check_in && (
                        <Tag
                          value={isId ? "Lupa Masuk" : "Missing In"}
                          severity="danger"
                          className="text-[10px] py-0 px-1.5"
                        />
                      )}
                      {rowData.is_missing_check_out && (
                        <Tag
                          value={isId ? "Lupa Pulang" : "Missing Out"}
                          severity="warning"
                          className="text-[10px] py-0 px-1.5"
                        />
                      )}
                      {!rowData.is_missing_check_in &&
                        !rowData.is_missing_check_out && (
                          <Tag
                            value="INCOMPLETE"
                            severity="warning"
                            className="text-[10px] py-0 px-1.5"
                          />
                        )}
                    </div>
                  </div>
                )}
                style={{ width: "16%" }}
              />

              {/* Kolom 3: Opsi Jam */}
              <Column
                header={isId ? "Opsi Jam Punch" : "Punch Time Option"}
                body={(rowData: AttendanceResolutionItem) => {
                  return (
                    <div className="flex flex-col gap-1.5">
                      <Dropdown
                        value={rowData.resolution_action}
                        options={[
                          {
                            label: isId
                              ? "Sesuai Jadwal Shift"
                              : "Use Shift Schedule",
                            value: "USE_SHIFT_TIME",
                          },
                          {
                            label: isId ? "Waktu Kustom" : "Custom Time",
                            value: "CUSTOM_TIME",
                          },
                        ]}
                        onChange={(e) =>
                          handleItemChange(
                            rowData.key!,
                            "resolution_action",
                            e.value,
                          )
                        }
                        className="p-inputtext-sm text-xs w-full"
                      />

                      {rowData.resolution_action === "CUSTOM_TIME" && (
                        <div className="flex flex-col gap-1.5 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          {rowData.is_missing_check_in && (
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                                {isId ? "Jam Masuk:" : "In Time:"}
                              </span>
                              <input
                                type="time"
                                step="60"
                                value={rowData.check_in_time || "08:00"}
                                onChange={(e) =>
                                  handleItemChange(
                                    rowData.key!,
                                    "check_in_time",
                                    e.target.value,
                                  )
                                }
                                className="p-inputtext p-component p-inputtext-sm text-xs font-mono py-1 px-2 rounded border border-slate-300 w-24 bg-white focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          )}
                          {rowData.is_missing_check_out && (
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                                {isId ? "Jam Pulang:" : "Out Time:"}
                              </span>
                              <input
                                type="time"
                                step="60"
                                value={rowData.check_out_time || "17:00"}
                                onChange={(e) =>
                                  handleItemChange(
                                    rowData.key!,
                                    "check_out_time",
                                    e.target.value,
                                  )
                                }
                                className="p-inputtext p-component p-inputtext-sm text-xs font-mono py-1 px-2 rounded border border-slate-300 w-24 bg-white focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          )}
                          {!rowData.is_missing_check_in &&
                            !rowData.is_missing_check_out && (
                              <>
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                                    {isId ? "Jam Masuk:" : "In Time:"}
                                  </span>
                                  <input
                                    type="time"
                                    step="60"
                                    value={rowData.check_in_time || "08:00"}
                                    onChange={(e) =>
                                      handleItemChange(
                                        rowData.key!,
                                        "check_in_time",
                                        e.target.value,
                                      )
                                    }
                                    className="p-inputtext p-component p-inputtext-sm text-xs font-mono py-1 px-2 rounded border border-slate-300 w-24 bg-white focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">
                                    {isId ? "Jam Pulang:" : "Out Time:"}
                                  </span>
                                  <input
                                    type="time"
                                    step="60"
                                    value={rowData.check_out_time || "17:00"}
                                    onChange={(e) =>
                                      handleItemChange(
                                        rowData.key!,
                                        "check_out_time",
                                        e.target.value,
                                      )
                                    }
                                    className="p-inputtext p-component p-inputtext-sm text-xs font-mono py-1 px-2 rounded border border-slate-300 w-24 bg-white focus:outline-none focus:border-amber-500"
                                  />
                                </div>
                              </>
                            )}
                        </div>
                      )}
                    </div>
                  );
                }}
                style={{ width: "20%" }}
              />

              {/* Kolom 4: Alasan (Wajib / Fraud Prevention) */}
              <Column
                header={
                  <span>
                    {isId ? "Alasan Koreksi" : "Resolution Reason"}{" "}
                    <span className="text-red-500 font-bold">*</span>
                  </span>
                }
                body={(rowData: AttendanceResolutionItem) => {
                  const isBlank = !rowData.reason || !rowData.reason.trim();
                  return (
                    <div className="flex flex-col gap-1">
                      <InputText
                        value={rowData.reason}
                        onChange={(e) =>
                          handleItemChange(
                            rowData.key!,
                            "reason",
                            e.target.value,
                          )
                        }
                        placeholder={
                          isId
                            ? "Wajib diisi (alasan koreksi)"
                            : "Required reason"
                        }
                        className={`p-inputtext-sm text-xs w-full ${
                          isBlank ? "p-invalid border-red-400" : ""
                        }`}
                      />
                      <InputText
                        value={rowData.notes || ""}
                        onChange={(e) =>
                          handleItemChange(
                            rowData.key!,
                            "notes",
                            e.target.value,
                          )
                        }
                        placeholder={
                          isId ? "Catatan bukti (opsional)" : "Notes (optional)"
                        }
                        className="p-inputtext-sm text-[11px] w-full text-slate-500"
                      />
                    </div>
                  );
                }}
                style={{ width: "28%" }}
              />

              {/* Kolom 5: Aksi Per Baris */}
              <Column
                header={isId ? "Aksi" : "Action"}
                body={(rowData: AttendanceResolutionItem) => (
                  <div className="flex items-center gap-1">
                    {/* Tombol Khusus: Proses Baris Ini Saja */}
                    <Button
                      type="button"
                      icon="pi pi-bolt"
                      label={isId ? "Proses Ini Saja" : "Process Only"}
                      size="small"
                      severity="warning"
                      outlined
                      className="text-[10px] py-1 px-1.5 font-medium whitespace-nowrap"
                      loading={isSubmitting}
                      title={
                        isId
                          ? "Koreksi hanya baris karyawan ini saja tanpa memproses baris lainnya"
                          : "Resolve only this employee's punch"
                      }
                      onClick={() => handleSubmit([rowData])}
                    />

                    {/* Tombol Hapus Baris */}
                    <Button
                      type="button"
                      icon="pi pi-trash"
                      severity="danger"
                      text
                      rounded
                      size="small"
                      title={isId ? "Hapus dari daftar antrean" : "Remove item"}
                      onClick={() => handleRemoveItem(rowData.key!)}
                    />
                  </div>
                )}
                style={{ width: "13%", textAlign: "center" }}
              />
            </DataTable>
          </div>
        )}
      </div>
    </Dialog>
  );
}
