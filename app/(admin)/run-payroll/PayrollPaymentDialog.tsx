"use client";

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
import type { ResponseTypeError } from "@/app/types/response-type";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { useDirtyFormGuard } from "@/app/_components/useDirtyFormGuard";

interface PayrollPaymentDialogProps {
  batch: PayrollBatch | null;
  visible: boolean;
  onHide: () => void;
  onSettled: () => Promise<unknown>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const formatCurrency = (value: string) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";
};

const errorMessage = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "message" in error &&
  typeof (error as ResponseTypeError).message === "string"
    ? (error as ResponseTypeError).message
    : "Payment processing could not be completed.";

export default function PayrollPaymentDialog({
  batch,
  visible,
  onHide,
  onSettled,
  onError,
  onSuccess,
}: PayrollPaymentDialogProps) {
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
  const [paymentFormTouched, setPaymentFormTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settling, setSettling] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canPay = permissions.includes("payroll.pay");
  const canExport = permissions.includes("payroll.export");
  const paymentFormDirty = visible && paymentFormTouched;
  const { confirmDiscard } = useDirtyFormGuard(
    paymentFormDirty,
    !saving && !settling && !reconciling,
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

  const settle = async () => {
    if (!paymentDetail) return;
    const items = paymentDetail.items.map((item) => ({
      payment_item_id: item.id,
      bank_reference: (references[item.id] ?? item.bank_reference ?? "").trim(),
    }));
    if (items.some((item) => !item.bank_reference)) {
      onError(
        "Enter the bank transfer reference for every payment item before confirming settlement.",
      );
      return;
    }
    try {
      setSettling(true);
      await settlePayrollPaymentBatch(
        paymentDetail.batch.id,
        paymentDetail.batch.row_version,
        { items },
      );
      await Promise.all([
        refreshPaymentDetail(),
        refreshPaymentBatches(),
        onSettled(),
      ]);
      onSuccess(
        "All payment items were settled and the payroll was marked paid.",
      );
    } catch (error: unknown) {
      onError(errorMessage(error));
    } finally {
      setSettling(false);
    }
  };
  const confirmSettle = () => {
    requestActionConfirmation({
      action: "Settle payroll payment",
      target: paymentDetail?.batch.payment_batch_no,
      severity: "danger",
      confirmLabel: "Confirm Settlement",
      confirmIcon: "pi pi-check-circle",
      description: "Settle all payment items and mark payroll as paid?",
      onAccept: () => settle(),
    });
  };

  const exportFile = async () => {
    if (!detail || !canExport) return;
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
      action: "Import bank reconciliation",
      target: file.name,
      severity: "warning",
      confirmLabel: "Import Result",
      confirmIcon: "pi pi-upload",
      description: "Import this bank reconciliation result?",
      onAccept: () => reconcileFile(file),
    });
  };

  const detail = paymentDetail;
  const isDraft = detail?.batch.status === "DRAFT";

  return (
    <Dialog
      header="Payroll Payment Settlement"
      visible={visible}
      modal
      draggable={false}
      resizable={false}
      style={{ width: "95vw", maxWidth: "72rem" }}
      onShow={() => {
        if (!paymentBatches?.length) openDraftValues();
      }}
      onHide={handleHide}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            label="Close"
            severity="secondary"
            text
            disabled={saving || settling || reconciling}
            onClick={handleHide}
          />
          {isDraft && canPay && (
            <Button
              label="Confirm Payment Settlement"
              icon="pi pi-check"
              loading={settling}
              onClick={confirmSettle}
            />
          )}
        </div>
      }
    >
      {paymentBatchesLoading ? (
        <div className="py-8 text-center text-sm text-slate-500">
          Loading payment batches...
        </div>
      ) : !paymentBatches?.length && !selectedPaymentBatchId && canPay ? (
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label="Payment Batch Number *">
            <InputText
              value={paymentBatchNo || draftValues.paymentBatchNo}
              className="w-full"
              onChange={(event) => {
                setPaymentFormTouched(true);
                setPaymentBatchNo(event.target.value);
              }}
            />
          </Field>
          <Field label="Payment Date *">
            <PrimeDatePicker
              value={paymentDate || draftValues.paymentDate}
              className="w-full"
              onValueChange={(value) => {
                setPaymentFormTouched(true);
                setPaymentDate(value);
              }}
            />
          </Field>
          <Field label="Originating Bank Code">
            <InputText
              value={bankCode}
              className="w-full"
              onChange={(event) => {
                setPaymentFormTouched(true);
                setBankCode(event.target.value.toUpperCase());
              }}
            />
          </Field>
          <div className="flex items-end">
            <Button
              label="Create Payment Batch"
              icon="pi pi-plus"
              loading={saving}
              onClick={() => void create()}
            />
          </div>
          <p className="m-0 text-xs leading-5 text-slate-500 sm:col-span-2">
            Destination accounts are read only from the encrypted payroll
            snapshot. They are never shown in full on this screen.
          </p>
        </div>
      ) : !paymentBatches?.length && !selectedPaymentBatchId && canExport ? (
        <Message
          severity="info"
          text="No payment batch exists yet. Export-only access can inspect and export existing payment batches, but cannot create one."
        />
      ) : !detail ? (
        <div className="py-8 text-center text-sm text-slate-500">
          Loading payment batch...
        </div>
      ) : (
        <div className="flex flex-col gap-4 pt-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="Payment Batch"
              value={detail.batch.payment_batch_no}
            />
            <Metric label="Payment Date" value={detail.batch.payment_date} />
            <Metric
              label="Total Items"
              value={String(detail.batch.total_items)}
            />
            <Metric
              label="Total Amount"
              value={formatCurrency(detail.batch.total_amount)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Status</span>
            <Tag
              value={detail.batch.status}
              severity={detail.batch.status === "PAID" ? "success" : "warning"}
            />
            {canExport && (
              <Button
                label="Export CSV"
                icon="pi pi-download"
                severity="secondary"
                outlined
                size="small"
                onClick={() => void exportFile()}
              />
            )}
            {canPay &&
              !isDraft &&
              detail.batch.status !== "PAID" &&
              detail.batch.status !== "CANCELLED" && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <i className="pi pi-upload" />
                  {reconciling ? "Importing..." : "Import Bank Result"}
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="sr-only"
                    disabled={reconciling}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      event.currentTarget.value = "";
                      confirmReconcileFile(file);
                    }}
                  />
                </label>
              )}
          </div>
          <DataTable
            value={detail.items}
            dataKey="id"
            size="small"
            stripedRows
            scrollable
            responsiveLayout="scroll"
            tableStyle={{ minWidth: "62rem" }}
          >
            <Column field="employee_code" header="Employee ID" />
            <Column field="employee_name" header="Employee" />
            <Column
              header="Destination Account"
              body={(row: PayrollPaymentItemDetail) =>
                `${row.bank_code ?? "-"} · ${row.bank_account_masked}`
              }
            />
            <Column field="bank_account_name" header="Account Name" />
            <Column
              header="Amount"
              body={(row: PayrollPaymentItemDetail) =>
                formatCurrency(row.amount)
              }
            />
            <Column
              header="Bank Transfer Reference"
              body={(row: PayrollPaymentItemDetail) =>
                isDraft ? (
                  <InputText
                    value={references[row.id] ?? row.bank_reference ?? ""}
                    className="w-full"
                    maxLength={100}
                    onChange={(event) => {
                      setPaymentFormTouched(true);
                      setReferences((current) => ({
                        ...current,
                        [row.id]: event.target.value,
                      }));
                    }}
                  />
                ) : (
                  (row.bank_reference ?? "-")
                )
              }
            />
          </DataTable>
          {isDraft && canPay && (
            <p className="m-0 text-xs leading-5 text-amber-700">
              Confirm only after each bank transfer has completed. This action
              publishes employee payslips and cannot be reversed.
            </p>
          )}
          {!isDraft &&
            detail.batch.status !== "PAID" &&
            detail.batch.status !== "CANCELLED" && (
              <p className="m-0 text-xs leading-5 text-slate-500">
                Upload a CSV with headers{" "}
                <code>
                  payment_item_id,status,bank_reference,failure_reason
                </code>
                . Status must be PAID or FAILED.
              </p>
            )}
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
