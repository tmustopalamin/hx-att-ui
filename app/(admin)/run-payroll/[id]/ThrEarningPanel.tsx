"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { useDispatch, useSelector } from "react-redux";

import { useI18n } from "@/app/i18n";
import {
  generatePayrollThr,
  previewPayrollThr,
} from "@/app/services/payroll-batch-service";
import type { PayrollThrPreview } from "@/app/types/payroll-batch";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { getErrorMessage } from "@/app/utils/error-messages";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const currency = (value: string | number) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return isNaN(date.getTime())
    ? dateStr
    : date.toLocaleDateString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
};

export default function ThrEarningPanel({
  batchId,
  batchStatus,
}: {
  batchId: number;
  batchStatus: string;
}) {
  const { locale } = useI18n();
  const isId = locale === "id";
  const dispatch = useDispatch();
  const { mutate: mutateKey } = useSWRConfig();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canAdjust = permissions.includes("payroll.adjust");
  const [generating, setGenerating] = useState(false);

  const previewKey = canAdjust ? `payroll-thr-preview-${batchId}` : null;
  const {
    data = [],
    error,
    mutate,
    isLoading,
    isValidating,
  } = useSWR<PayrollThrPreview[]>(previewKey, () => previewPayrollThr(batchId));

  const eligibleCount = data.filter(
    (r) => r.is_eligible && !r.existing_adjustment_status,
  ).length;

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generatePayrollThr(batchId);
      await mutate();
      await mutateKey(`/api/payroll-batches/${batchId}/adjustments`);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: isId
            ? "THR Berhasil Diterapkan"
            : "THR Successfully Applied",
          detail: isId
            ? `${result.created.length} penyesuaian THR berhasil ditambahkan.`
            : `${result.created.length} THR adjustments successfully created.`,
        }),
      );
    } catch (err) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: isId ? "Gagal Menerapkan THR" : "Failed to Apply THR",
          detail: getErrorMessage(err, "message"),
        }),
      );
    } finally {
      setGenerating(false);
    }
  };

  const confirmGenerate = () => {
    requestActionConfirmation({
      action: isId
        ? "Terapkan Tunjangan Hari Raya (THR)"
        : "Apply Holiday Allowance (THR)",
      target: `Payroll batch #${batchId}`,
      severity: "warning",
      confirmLabel: isId ? "Terapkan THR" : "Apply THR",
      confirmIcon: "pi pi-gift",
      description: isId
        ? `THR akan dihitung dan dimasukkan ke daftar penyesuaian pendapatan untuk ${eligibleCount} karyawan yang berhak sesuai Permenaker No. 6/2016.`
        : `THR will be calculated and applied to earnings adjustments for ${eligibleCount} eligible employees under Permenaker No. 6/2016.`,
      onAccept: () => generate(),
    });
  };

  if (!canAdjust) return null;
  if (error) {
    return (
      <Card className="border border-red-200 shadow-sm">
        <div
          className="flex flex-col gap-3 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div>
            <h2 className="m-0 text-base font-semibold">
              {isId ? "Gagal Memuat Data THR" : "Failed to Load THR Data"}
            </h2>
            <p className="m-0 mt-1 text-sm text-red-700">
              {getErrorMessage(error, "code")}
            </p>
          </div>
          <Button
            type="button"
            label={isId ? "Coba Lagi" : "Retry"}
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            loading={isValidating}
            onClick={() => void mutate()}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 sm:flex">
              <i className="pi pi-gift text-lg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  {isId
                    ? "Tunjangan Hari Raya (THR Keagamaan)"
                    : "Religious Holiday Allowance (THR)"}
                </h2>
                <Tag
                  value="Permenaker No. 6/2016"
                  severity="info"
                  className="text-[11px]"
                />
              </div>
              <p className="m-0 mt-1 text-xs text-slate-500">
                {isId
                  ? "Kalkulasi otomatis hak THR: masa kerja ≥ 12 bulan (1 bulan penuh), 1-12 bulan (prorata n/12), < 1 bulan (tidak berhak)."
                  : "Automatic THR calculation: tenure ≥ 12 months (100%), 1-12 months (prorated n/12), < 1 month (not eligible)."}
              </p>
            </div>
          </div>
          <Button
            label={isId ? "Hitung & Terapkan THR" : "Calculate & Apply THR"}
            icon="pi pi-gift"
            size="small"
            severity="success"
            loading={isLoading || isValidating || generating}
            disabled={
              batchStatus !== "READY" ||
              data.length === 0 ||
              eligibleCount === 0
            }
            onClick={confirmGenerate}
          />
        </div>

        <DataTable
          value={data}
          dataKey="employee_id"
          size="small"
          stripedRows
          scrollable
          responsiveLayout="scroll"
          loading={isLoading || isValidating}
          emptyMessage={
            isId
              ? "Tidak ada data karyawan dalam batch ini."
              : "No employee data in this batch."
          }
        >
          <Column
            field="employee_code"
            header={isId ? "Kode Karyawan" : "Emp Code"}
            style={{ width: "9rem" }}
          />
          <Column
            field="employee_name"
            header={isId ? "Nama Karyawan" : "Employee Name"}
            body={(row: PayrollThrPreview) => (
              <span className="font-medium text-slate-800">
                {row.employee_name}
              </span>
            )}
          />
          <Column
            header={isId ? "Tanggal Masuk" : "Join Date"}
            body={(row: PayrollThrPreview) => formatDate(row.join_date)}
            style={{ width: "9rem" }}
          />
          <Column
            header={isId ? "Masa Kerja" : "Tenure"}
            body={(row: PayrollThrPreview) => (
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800">
                  {row.tenure_months} {isId ? "bulan" : "mos"}
                </span>
                {row.tenure_days > 0 && (
                  <span className="text-[11px] text-slate-500">
                    +{row.tenure_days} {isId ? "hari" : "days"}
                  </span>
                )}
              </div>
            )}
            style={{ width: "7rem" }}
          />
          <Column
            header={isId ? "Upah Dasar THR" : "Base Wage"}
            body={(row: PayrollThrPreview) => (
              <span className="font-medium text-slate-700">
                {currency(row.thr_wage_base)}
              </span>
            )}
            style={{ width: "10rem" }}
          />
          <Column
            header={isId ? "Faktor Prorata" : "Proration"}
            body={(row: PayrollThrPreview) => {
              if (!row.is_eligible)
                return <span className="text-slate-400">0%</span>;
              if (row.tenure_months >= 12) {
                return (
                  <span className="font-semibold text-emerald-700">
                    100% (1 bln)
                  </span>
                );
              }
              const pct = (Number(row.proration_factor) * 100).toFixed(1);
              return (
                <span className="font-semibold text-blue-700">
                  {row.tenure_months}/12 ({pct}%)
                </span>
              );
            }}
            style={{ width: "9rem" }}
          />
          <Column
            header={isId ? "Estimasi THR" : "Estimated THR"}
            body={(row: PayrollThrPreview) => (
              <span
                className={`font-semibold ${
                  Number(row.amount) > 0 ? "text-slate-900" : "text-slate-400"
                }`}
              >
                {currency(row.amount)}
              </span>
            )}
            style={{ width: "10rem" }}
          />
          <Column
            header={isId ? "Status" : "Status"}
            body={(row: PayrollThrPreview) => {
              if (row.existing_adjustment_status) {
                return (
                  <Tag
                    value={
                      isId
                        ? `Diterapkan (${row.existing_adjustment_status})`
                        : `Applied (${row.existing_adjustment_status})`
                    }
                    severity="info"
                  />
                );
              }
              if (row.is_eligible) {
                return (
                  <Tag
                    value={isId ? "Berhak THR" : "Eligible"}
                    severity="success"
                  />
                );
              }
              return (
                <Tag
                  value={isId ? "Belum Berhak" : "Not Eligible"}
                  severity="secondary"
                />
              );
            }}
            style={{ width: "10rem" }}
          />
        </DataTable>

        {batchStatus !== "READY" && (
          <p className="m-0 text-xs text-slate-500">
            {isId
              ? "* THR hanya dapat diterapkan saat status batch adalah READY (sebelum kalkulasi)."
              : "* THR can only be applied when batch status is READY (prior to calculation)."}
          </p>
        )}
      </div>
    </Card>
  );
}
