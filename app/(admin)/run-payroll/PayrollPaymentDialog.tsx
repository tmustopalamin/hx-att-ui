"use client";
import { useI18n } from "@/app/i18n";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Message } from "primereact/message";

import {
  createPayrollPaymentBatch,
  getPayrollPaymentBatchDetail,
  getPayrollPaymentBatches,
  settlePayrollPaymentBatch,
  exportPayrollPaymentBatch,
  reconcilePayrollPaymentBatch,
} from "@/app/services/payroll-batch-service";
import type {
  PayrollBatch,
  PayrollPaymentBatchDetail,
  PayrollPaymentItemDetail,
} from "@/app/types/payroll-batch";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { useDirtyFormGuard } from "@/app/_components/useDirtyFormGuard";
import { formatStatusLabel } from "@/app/i18n/statusLabel";
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
import { getErrorMessage } from "@/app/utils/error-messages";

interface PayrollPaymentDialogProps {
  batch: PayrollBatch | null;
  visible: boolean;
  onHide: () => void;
  onSettled: () => Promise<unknown>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const formatCurrency = (value: string | number) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";
};

const errorMessage = (error: unknown) => getErrorMessage(error);

export default function PayrollPaymentDialog({
  batch,
  visible,
  onHide,
  onSettled,
  onError,
  onSuccess,
}: PayrollPaymentDialogProps) {
  const { t: i18nT } = useI18n();
  const batchId = batch?.id ?? null;
  const paymentBatchesKey =
    visible && batchId
      ? `/api/payroll-batches/${batchId}/payment-batches`
      : null;
  const {
    data: paymentBatches,
    mutate: refreshPaymentBatches,
    isLoading: paymentBatchesLoading,
  } = useSWR(paymentBatchesKey, () =>
    getPayrollPaymentBatches(batchId as number),
  );
  const [selectedPaymentBatchId, setSelectedPaymentBatchId] = useState<
    number | null
  >(null);
  const paymentBatchId =
    selectedPaymentBatchId ?? paymentBatches?.[0]?.id ?? null;
  const { data: paymentDetail, mutate: refreshPaymentDetail } =
    useSWR<PayrollPaymentBatchDetail>(
      visible && paymentBatchId
        ? `/api/payroll-payment-batches/${paymentBatchId}`
        : null,
      () => getPayrollPaymentBatchDetail(paymentBatchId as number),
    );
  const [paymentBatchNo, setPaymentBatchNo] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [references, setReferences] = useState<Record<number, string>>({});
  const [bulkReference, setBulkReference] = useState("");
  const [settlingItemId, setSettlingItemId] = useState<number | null>(null);
  const [paymentFormTouched, setPaymentFormTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settling, setSettling] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canPay = permissions.includes("payroll.pay");
  const canExport = permissions.includes("payroll.export");

  const detail = paymentDetail;
  const canSettle =
    canPay &&
    detail?.batch != null &&
    detail.batch.status !== "PAID" &&
    detail.batch.status !== "CANCELLED";

  const paymentFormDirty = visible && paymentFormTouched;
  const { confirmDiscard } = useDirtyFormGuard(
    paymentFormDirty,
    !saving && !settling && !reconciling && settlingItemId === null,
  );

  const draftValues = useMemo(() => {
    if (!batch) return { paymentBatchNo: "", paymentDate: "" };
    return {
      paymentBatchNo: `PAY-${batch.batch_no}`.slice(0, 60),
      paymentDate: batch.payroll_date,
    };
  }, [batch]);

  const openDraftValues = () => {
    setPaymentBatchNo(draftValues.paymentBatchNo);
    setPaymentDate(draftValues.paymentDate);
    setBankCode("");
    setBulkReference("");
    setPaymentFormTouched(false);
  };

  const handleHide = () => {
    if (!paymentFormDirty) {
      onHide();
      return;
    }
    void confirmDiscard().then((discard) => {
      if (discard) onHide();
    });
  };

  const create = async () => {
    if (!batchId || !paymentBatchNo.trim() || !paymentDate) {
      onError("Payment batch number and payment date are required.");
      return;
    }
    if (
      !isWhitespaceFreeIdentifier(paymentBatchNo) ||
      !isWhitespaceFreeIdentifier(bankCode)
    ) {
      onError(i18nT("validation.codeNoWhitespace"));
      return;
    }
    try {
      setSaving(true);
      const created = await createPayrollPaymentBatch(batchId, {
        payment_batch_no: paymentBatchNo.trim(),
        payment_date: paymentDate,
        bank_code: bankCode.trim() || null,
      });
      setSelectedPaymentBatchId(created.id);
      await refreshPaymentBatches();
      onSuccess(
        "Payment batch was created from the encrypted payroll snapshot.",
      );
    } catch (error: unknown) {
      onError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const applyBulkReference = () => {
    const trimmed = bulkReference.trim();
    if (!trimmed) {
      onError("Masukkan nomor referensi transfer massal.");
      return;
    }
    if (trimmed.length > 100) {
      onError("Nomor referensi bank maksimal 100 karakter.");
      return;
    }
    if (!detail) return;
    const nextRefs = { ...references };
    let appliedCount = 0;
    for (const item of detail.items) {
      if (item.status !== "PAID") {
        nextRefs[item.id] = trimmed;
        appliedCount++;
      }
    }
    setReferences(nextRefs);
    setPaymentFormTouched(true);
    onSuccess(
      `Nomor referensi berhasil diterapkan ke ${appliedCount} item yang belum dibayar.`,
    );
  };

  const settleSingle = async (item: PayrollPaymentItemDetail) => {
    if (!detail) return;
    const bankRef = (references[item.id] ?? item.bank_reference ?? "").trim();
    if (!bankRef) {
      onError(
        `Masukkan nomor referensi transfer bank untuk ${item.employee_name}.`,
      );
      return;
    }
    if (bankRef.length > 100) {
      onError("Nomor referensi bank maksimal 100 karakter.");
      return;
    }
    try {
      setSettlingItemId(item.id);
      await settlePayrollPaymentBatch(
        detail.batch.id,
        detail.batch.row_version,
        {
          items: [
            {
              payment_item_id: item.id,
              bank_reference: bankRef,
            },
          ],
        },
      );
      setPaymentFormTouched(false);
      await Promise.all([
        refreshPaymentDetail(),
        refreshPaymentBatches(),
        onSettled(),
      ]);
      onSuccess(
        `Pembayaran untuk ${item.employee_name} (${formatCurrency(item.amount)}) berhasil diselesaikan.`,
      );
    } catch (error: unknown) {
      onError(errorMessage(error));
    } finally {
      setSettlingItemId(null);
    }
  };

  const confirmSettleSingle = (item: PayrollPaymentItemDetail) => {
    const bankRef = (references[item.id] ?? item.bank_reference ?? "").trim();
    if (!bankRef) {
      onError(
        `Masukkan nomor referensi transfer bank untuk ${item.employee_name}.`,
      );
      return;
    }
    requestActionConfirmation({
      action: "Selesaikan Pembayaran Karyawan",
      target: `${item.employee_name} (${formatCurrency(item.amount)})`,
      severity: "info",
      confirmLabel: "Bayar Sekarang",
      confirmIcon: "pi pi-check",
      description: `Selesaikan pembayaran transfer bank sebesar ${formatCurrency(item.amount)} untuk ${item.employee_name} dengan no. referensi "${bankRef}"?`,
      onAccept: () => void settleSingle(item),
    });
  };

  const settleAll = async () => {
    if (!detail) return;
    const unpaidItems = detail.items.filter((item) => item.status !== "PAID");
    if (unpaidItems.length === 0) {
      onSuccess("Semua item pembayaran sudah lunas.");
      return;
    }
    const items = unpaidItems.map((item) => ({
      payment_item_id: item.id,
      bank_reference: (references[item.id] ?? item.bank_reference ?? "").trim(),
    }));
    if (items.some((item) => !item.bank_reference)) {
      onError(
        "Masukkan nomor referensi transfer bank untuk seluruh item yang belum dibayar.",
      );
      return;
    }
    if (items.some((item) => item.bank_reference.length > 100)) {
      onError("Nomor referensi bank maksimal 100 karakter.");
      return;
    }
    try {
      setSettling(true);
      await settlePayrollPaymentBatch(
        detail.batch.id,
        detail.batch.row_version,
        { items },
      );
      setPaymentFormTouched(false);
      await Promise.all([
        refreshPaymentDetail(),
        refreshPaymentBatches(),
        onSettled(),
      ]);
      onSuccess(
        "Seluruh item pembayaran berhasil diselesaikan dan status payroll diperbarui.",
      );
    } catch (error: unknown) {
      onError(errorMessage(error));
    } finally {
      setSettling(false);
    }
  };

  const confirmSettleAll = () => {
    if (!detail) return;
    const unpaidItems = detail.items.filter((item) => item.status !== "PAID");
    if (unpaidItems.length === 0) {
      onSuccess("Semua item pembayaran sudah lunas.");
      return;
    }
    const missingRefs = unpaidItems.filter(
      (item) => !(references[item.id] ?? item.bank_reference ?? "").trim(),
    );
    if (missingRefs.length > 0) {
      onError(
        `Terdapat ${missingRefs.length} item yang belum memiliki nomor referensi bank. Silakan isi terlebih dahulu atau gunakan fitur 'Terapkan ke Semua'.`,
      );
      return;
    }
    requestActionConfirmation({
      action: i18nT("static.4e8rul"),
      target: detail.batch.payment_batch_no,
      severity: "danger",
      confirmLabel: i18nT("static.1mf1pgy"),
      confirmIcon: "pi pi-check-circle",
      description: `Selesaikan ${unpaidItems.length} item transfer gaji yang belum lunas dan tandai payroll sebagai paid?`,
      onAccept: () => void settleAll(),
    });
  };

  const exportFile = async () => {
    if (!detail?.batch || !canExport) return;
    try {
      const blob = await exportPayrollPaymentBatch(detail.batch.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${detail.batch.payment_batch_no}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      onSuccess("Payment export downloaded.");
    } catch (error: unknown) {
      onError(errorMessage(error));
    }
  };

  const reconcileFile = async (file: File | undefined) => {
    if (!detail || !file || !canPay) return;
    if (file.size > 5 * 1024 * 1024) {
      onError("Reconciliation file must be 5 MB or smaller.");
      return;
    }
    try {
      setReconciling(true);
      await reconcilePayrollPaymentBatch(
        detail.batch.id,
        detail.batch.row_version,
        file,
      );
      setPaymentFormTouched(false);
      await Promise.all([
        refreshPaymentDetail(),
        refreshPaymentBatches(),
        onSettled(),
      ]);
      onSuccess("Bank reconciliation was imported successfully.");
    } catch (error: unknown) {
      onError(errorMessage(error));
    } finally {
      setReconciling(false);
    }
  };

  const confirmReconcileFile = (file: File | undefined) => {
    if (!file) return;
    requestActionConfirmation({
      action: i18nT("static.1am9wpr"),
      target: file.name,
      severity: "warning",
      confirmLabel: i18nT("static.1qyuh6t"),
      confirmIcon: "pi pi-upload",
      description: i18nT("static.1ogxmx1"),
      onAccept: () => reconcileFile(file),
    });
  };

  return (
    <Dialog
      header={i18nT("static.1cncklb")}
      visible={visible}
      modal
      draggable={false}
      resizable={false}
      style={{ width: "95vw", maxWidth: "76rem" }}
      onShow={() => {
        if (!paymentBatches?.length) openDraftValues();
      }}
      onHide={handleHide}
      footer={
        <div className="flex w-full items-center justify-between">
          <div className="text-xs text-slate-500">
            {detail && (
              <span>
                {detail.items.filter((i) => i.status === "PAID").length} dari{" "}
                {detail.items.length} item lunas
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.1l0xxoj")}
              severity="secondary"
              text
              disabled={
                saving || settling || settlingItemId !== null || reconciling
              }
              onClick={handleHide}
            />
            {canSettle && (
              <Button
                label="Bayar Semua (Massal)"
                icon="pi pi-check-circle"
                severity="success"
                loading={settling}
                disabled={settlingItemId !== null || reconciling}
                onClick={confirmSettleAll}
              />
            )}
          </div>
        </div>
      }
    >
      {paymentBatchesLoading ? (
        <div className="py-8 text-center text-sm text-slate-500">
          {i18nT("static.1dltlbh")}{" "}
        </div>
      ) : !paymentBatches?.length && !selectedPaymentBatchId && canPay ? (
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Message
              severity="info"
              className="w-full"
              text={i18nT(
                "Pastikan seluruh karyawan penerima gaji telah memiliki rekening bank aktif di menu Data Karyawan. Batch transfer akan dibuat dari data rekening terenkripsi karyawan.",
              )}
            />
          </div>
          <Field label={i18nT("static.qzhmw0")}>
            <InputText
              value={paymentBatchNo || draftValues.paymentBatchNo}
              className="w-full"
              placeholder={i18nT("Enter payment batch number")}
              onChange={(event) => {
                setPaymentFormTouched(true);
                setPaymentBatchNo(event.target.value);
              }}
            />
          </Field>
          <Field label={i18nT("static.18a1gul")}>
            <PrimeDatePicker
              value={paymentDate || draftValues.paymentDate}
              className="w-full"
              placeholder={i18nT("Select payment date")}
              onValueChange={(value) => {
                setPaymentFormTouched(true);
                setPaymentDate(value);
              }}
            />
          </Field>
          <Field label={i18nT("static.1e7g7tl")}>
            <InputText
              value={bankCode}
              className="w-full"
              placeholder={i18nT("Enter originating bank code")}
              onChange={(event) => {
                setPaymentFormTouched(true);
                setBankCode(event.target.value.toUpperCase());
              }}
            />
          </Field>
          <div className="flex items-end">
            <Button
              label={i18nT("static.1goh4lb")}
              icon="pi pi-plus"
              loading={saving}
              onClick={() => void create()}
            />
          </div>
          <p className="m-0 text-xs leading-5 text-slate-500 sm:col-span-2">
            {i18nT("static.1q757oj")}{" "}
          </p>
        </div>
      ) : !paymentBatches?.length && !selectedPaymentBatchId && canExport ? (
        <Message severity="info" text={i18nT("static.1sgrnhx")} />
      ) : !detail ? (
        <div className="py-8 text-center text-sm text-slate-500">
          {i18nT("static.1fyhy2h")}{" "}
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          {/* Metrics summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label={i18nT("static.g0ny45")}
              value={detail.batch.payment_batch_no}
            />
            <Metric
              label={i18nT("static.1tkvpiv")}
              value={detail.batch.payment_date}
            />
            <Metric
              label={i18nT("static.1rv4xe1")}
              value={String(detail.batch.total_items)}
            />
            <Metric
              label={i18nT("static.1q8ef2b")}
              value={formatCurrency(detail.batch.total_amount)}
            />
          </div>

          {/* Status, Export & CSV upload bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600">
                {i18nT("static.3pd73")}:
              </span>
              <Tag
                value={i18nT(formatStatusLabel(detail.batch.status))}
                severity={
                  detail.batch.status === "PAID"
                    ? "success"
                    : detail.batch.status === "FAILED"
                      ? "danger"
                      : "warning"
                }
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canExport && (
                <Button
                  label={i18nT("static.8p4e4z")}
                  icon="pi pi-download"
                  severity="secondary"
                  outlined
                  size="small"
                  onClick={() => void exportFile()}
                />
              )}
              {canSettle && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100">
                  <i className="pi pi-upload" />
                  {reconciling
                    ? i18nT("static.9bz0qi")
                    : i18nT("static.10zw6cv")}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    disabled={
                      reconciling || settling || settlingItemId !== null
                    }
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      confirmReconcileFile(file);
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Bulk settlement toolbar */}
          {canSettle && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
              <div className="flex min-w-[280px] flex-1 flex-wrap items-center gap-2">
                <span className="whitespace-nowrap text-sm font-medium text-slate-700">
                  No. Referensi Massal:
                </span>
                <div className="min-w-[180px] flex-1">
                  <InputText
                    value={bulkReference}
                    placeholder="Contoh: TRF-BCA-20260925"
                    className="w-full p-inputtext-sm"
                    maxLength={100}
                    disabled={
                      settling || settlingItemId !== null || reconciling
                    }
                    onChange={(e) => setBulkReference(e.target.value)}
                  />
                </div>
                <Button
                  label="Terapkan ke Semua"
                  icon="pi pi-copy"
                  size="small"
                  severity="secondary"
                  outlined
                  disabled={
                    !bulkReference.trim() ||
                    settling ||
                    settlingItemId !== null ||
                    reconciling
                  }
                  onClick={applyBulkReference}
                  tooltip="Salin nomor referensi ini ke semua baris karyawan yang belum dibayar"
                />
              </div>
              <div>
                <Button
                  label="Bayar Semua (Massal)"
                  icon="pi pi-check-circle"
                  size="small"
                  severity="success"
                  loading={settling}
                  disabled={settlingItemId !== null || reconciling}
                  onClick={confirmSettleAll}
                />
              </div>
            </div>
          )}

          {/* Data Table */}
          <DataTable
            value={detail.items}
            dataKey="id"
            size="small"
            stripedRows
            scrollable
            responsiveLayout="scroll"
            tableStyle={{ minWidth: "68rem" }}
          >
            <Column
              field="employee_code"
              header={i18nT("static.1lghzb2")}
              style={{ width: "8rem" }}
            />
            <Column
              field="employee_name"
              header={i18nT("static.1fak8xt")}
              style={{ minWidth: "10rem" }}
            />
            <Column
              field="department_name"
              header={i18nT("static.1430r53")}
              body={(row: PayrollPaymentItemDetail) =>
                row.department_name ?? "-"
              }
            />
            <Column
              header={i18nT("static.1fv7mac")}
              body={(row: PayrollPaymentItemDetail) =>
                `${row.bank_code ?? "-"} · ${row.bank_account_masked}`
              }
            />
            <Column
              field="bank_account_name"
              header={i18nT("static.16iomzz")}
            />
            <Column
              header={i18nT("static.a2ky21")}
              body={(row: PayrollPaymentItemDetail) =>
                formatCurrency(row.amount)
              }
              style={{ width: "9rem", textAlign: "right" }}
            />
            <Column
              header="Status"
              body={(row: PayrollPaymentItemDetail) => {
                const isPaid = row.status === "PAID";
                const isFailed = row.status === "FAILED";
                return (
                  <Tag
                    value={row.status || "PENDING"}
                    severity={
                      isPaid ? "success" : isFailed ? "danger" : "warning"
                    }
                  />
                );
              }}
              style={{ width: "7rem", textAlign: "center" }}
            />
            <Column
              header={i18nT("static.127tzh3")}
              body={(row: PayrollPaymentItemDetail) => {
                const isPaid = row.status === "PAID";
                if (isPaid) {
                  return (
                    <span className="font-mono text-xs text-slate-700">
                      {row.bank_reference ?? "-"}
                    </span>
                  );
                }
                if (canSettle) {
                  return (
                    <InputText
                      value={references[row.id] ?? row.bank_reference ?? ""}
                      className="w-full p-inputtext-sm"
                      placeholder={i18nT("Enter bank transfer reference")}
                      maxLength={100}
                      disabled={
                        settling || settlingItemId === row.id || reconciling
                      }
                      onChange={(event) => {
                        setPaymentFormTouched(true);
                        setReferences((current) => ({
                          ...current,
                          [row.id]: event.target.value,
                        }));
                      }}
                    />
                  );
                }
                return row.bank_reference ?? "-";
              }}
              style={{ minWidth: "12rem" }}
            />
            {canSettle && (
              <Column
                header="Aksi"
                body={(row: PayrollPaymentItemDetail) => {
                  const isPaid = row.status === "PAID";
                  if (isPaid) {
                    return (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <i className="pi pi-check text-xs" />
                        Lunas
                      </span>
                    );
                  }
                  return (
                    <Button
                      label="Bayar"
                      icon="pi pi-check"
                      size="small"
                      severity="success"
                      outlined
                      loading={settlingItemId === row.id}
                      disabled={
                        settling || settlingItemId !== null || reconciling
                      }
                      onClick={() => confirmSettleSingle(row)}
                      tooltip="Bayar item ini saja"
                    />
                  );
                }}
                style={{ width: "6rem", textAlign: "center" }}
              />
            )}
          </DataTable>

          {/* Guide / Status info */}
          {canSettle ? (
            <div className="flex flex-col gap-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              <span className="font-semibold text-slate-700">
                Pilihan metode penyelesaian pembayaran:
              </span>
              <div>
                1. <strong>Tombol Massal:</strong> Masukkan &quot;No. Referensi
                Massal&quot;, klik &quot;Terapkan ke Semua&quot;, lalu klik
                &quot;Bayar Semua (Massal)&quot;.
              </div>
              <div>
                2. <strong>Tombol Satuan:</strong> Masukkan nomor referensi
                transfer pada baris karyawan yang diinginkan, lalu klik tombol
                &quot;Bayar&quot; di baris tersebut.
              </div>
              <div>
                3. <strong>Upload CSV:</strong> Unduh file dengan &quot;Download
                CSV&quot;, lengkapi status (PAID/FAILED) &amp; referensi
                transfer di CSV, lalu upload melalui tombol &quot;Upload CSV
                Rekonsiliasi&quot;.
              </div>
            </div>
          ) : detail.batch.status === "PAID" ? (
            <Message
              severity="success"
              text="Seluruh item pembayaran telah lunas diselesaikan. Slip gaji karyawan telah dipublikasikan secara otomatis."
            />
          ) : null}
        </div>
      )}
    </Dialog>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="m-0 text-xs font-medium text-slate-500">{label}</p>
      <p className="m-0 mt-1 truncate text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}
