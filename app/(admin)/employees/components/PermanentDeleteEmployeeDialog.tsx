"use client";

import React, { useState, useEffect } from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Password } from "primereact/password";
import { InputTextarea } from "primereact/inputtextarea";
import { useDispatch } from "react-redux";

import { showToast } from "@/store/ToastSlice";
import { permanentDeleteEmployee } from "@/app/services/employee-permanent-delete-service";
import { Employee } from "@/app/types/employee";

export const PERMANENT_DELETE_AGREEMENT_TEXT =
  "bahwa semua data terkait employee ini akan dihapus permanent dan saya mengetahui resikonya dan tidak bisa dikembalikan";

interface PermanentDeleteEmployeeDialogProps {
  visible: boolean;
  onHide: () => void;
  employee: Employee | null;
  onSuccess: () => void;
}

export default function PermanentDeleteEmployeeDialog({
  visible,
  onHide,
  employee,
  onSuccess,
}: PermanentDeleteEmployeeDialogProps) {
  const dispatch = useDispatch();

  const [isAgreed, setIsAgreed] = useState(false);
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (visible) {
      setIsAgreed(false);
      setPassword("");
      setReason("");
      setIsSubmitting(false);
    }
  }, [visible]);

  if (!employee) return null;

  const employeeFullName =
    [employee.first_name, employee.middle_name, employee.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    employee.code ||
    `ID: ${employee.id}`;

  const handleSubmit = async () => {
    if (!isAgreed) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Persetujuan Diperlukan",
          detail:
            "Harap centang persetujuan penghapusan permanen terlebih dahulu.",
        }),
      );
      return;
    }

    if (!password.trim()) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: "Password Wajib Diisi",
          detail: "Harap masukkan password login akun Anda untuk konfirmasi.",
        }),
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await permanentDeleteEmployee(employee.id, {
        password: password.trim(),
        confirmation_text: PERMANENT_DELETE_AGREEMENT_TEXT,
        reason: reason.trim() || undefined,
      });

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Penghapusan Berhasil",
          detail:
            res.message ||
            `Data karyawan ${employeeFullName} (${employee.code}) telah dicadangkan dan dihapus permanen.`,
        }),
      );

      onSuccess();
      onHide();
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Gagal Menghapus Permanen",
          detail: err.message || "Terjadi kesalahan saat menghapus data.",
        }),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      header={
        <div className="flex items-center gap-2 text-red-600 font-bold text-lg">
          <i className="pi pi-exclamation-triangle text-xl" />
          <span>Hapus Permanen Karyawan (Clean Wipe)</span>
        </div>
      }
      visible={visible}
      onHide={onHide}
      style={{ width: "560px" }}
      className="p-fluid"
      footer={
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            label="Batal"
            severity="secondary"
            text
            size="small"
            onClick={onHide}
            disabled={isSubmitting}
          />
          <Button
            type="button"
            label="Hapus Permanen Bersih"
            icon="pi pi-trash"
            severity="danger"
            size="small"
            loading={isSubmitting}
            disabled={!isAgreed || !password.trim() || isSubmitting}
            onClick={handleSubmit}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-4 text-sm pt-2">
        {/* Warning Banner */}
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-r-lg text-red-800 text-xs leading-relaxed space-y-1.5">
          <p className="font-bold text-red-900 flex items-center gap-1.5 text-sm">
            <i className="pi pi-info-circle text-red-600" />
            TINDAKAN BERISIKO TINGGI & IRREVERSIBLE
          </p>
          <p>
            Tindakan ini akan <strong>menghapus total seluruh rekaman</strong>{" "}
            terkait karyawan (data profil, kepegawaian, akun login & Casbin,
            absensi, gaji, cuti, lembur, aset, dan dokumen) dari tabel utama
            database.
          </p>
          <p className="text-red-700">
            *Seluruh data akan dicadangkan secara otomatis ke dalam snapshot
            arsip (JSONB) sebelum dihapus, untuk kebutuhan audit & forensik.
          </p>
        </div>

        {/* Employee Summary Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Karyawan yang akan Dihapus:
          </span>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-base font-bold text-slate-800 m-0">
                {employeeFullName}
              </p>
              <p className="text-xs font-mono text-slate-500 m-0 mt-0.5">
                NIK / Kode: {employee.code || "-"}
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p className="m-0 font-medium">
                {employee.department_name || "-"}
              </p>
              <p className="m-0 text-slate-500">
                {employee.position_name || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Mandatory Agreement Checkbox */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-300 bg-amber-50/50">
          <Checkbox
            inputId="agreement_checkbox"
            checked={isAgreed}
            onChange={(e) => setIsAgreed(!!e.checked)}
            className="mt-0.5"
          />
          <label
            htmlFor="agreement_checkbox"
            className="text-xs font-semibold text-amber-950 cursor-pointer select-none leading-normal"
          >
            {PERMANENT_DELETE_AGREEMENT_TEXT}
          </label>
        </div>

        {/* Password Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-700">
            Masukkan Password Login Anda* (Verifikasi Keamanan)
          </label>
          <Password
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            feedback={false}
            toggleMask
            placeholder="Password login akun Anda saat ini"
            className="w-full text-xs"
            inputClassName="w-full text-xs"
            disabled={isSubmitting}
          />
          <span className="text-[11px] text-slate-400">
            Backend akan memverifikasi password akun Anda sebelum mengeksekusi
            penghapusan.
          </span>
        </div>

        {/* Optional Reason Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-700">
            Alasan Penghapusan (Opsional - Dicatat ke log arsip)
          </label>
          <InputTextarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            autoResize
            placeholder="Contoh: Kesalahan input data saat onboarding / permintaan penghapusan data"
            className="w-full text-xs"
            disabled={isSubmitting}
          />
        </div>
      </div>
    </Dialog>
  );
}
