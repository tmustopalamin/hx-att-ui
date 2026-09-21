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
import type { ResponseTypeError } from "@/app/types/response-type";
import { useSelector } from "react-redux";
import type { RootState } from "@/store/store";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { useDirtyFormGuard } from "@/app/_components/useDirtyFormGuard";
import { formatStatusLabel } from "@/app/i18n/statusLabel";
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";

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
      action: i18nT("static.4e8rul"),
      target: paymentDetail?.batch?.payment_batch_no,
      severity: "danger",
      confirmLabel: i18nT("static.1mf1pgy"),
      confirmIcon: "pi pi-check-circle",
      description: i18nT("static.1e3s0gx"),
      onAccept: () => settle(),
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

  const detail = paymentDetail;
  const isDraft = detail?.batch?.status === "DRAFT";

  return (
    <Dialog
      header={i18nT("static.1cncklb")}
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
            label={i18nT("static.1l0xxoj")}
            severity="secondary"
            text
            disabled={saving || settling || reconciling}
            onClick={handleHide}
          />
          {isDraft && canPay && (
            <Button
              label={i18nT("static.a2xljk")}
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
          {i18nT("static.1dltlbh")}{" "}
        </div>
      ) : !paymentBatches?.length && !selectedPaymentBatchId && canPay ? (
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
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
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              {i18nT("static.3pd73")}
            </span>
            <Tag
              value={i18nT(formatStatusLabel(detail.batch.status))}
              severity={detail.batch.status === "PAID" ? "success" : "warning"}
            />
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
            {canPay &&
              !isDraft &&
              detail.batch.status !== "PAID" &&
              detail.batch.status !== "CANCELLED" && (
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <i className="pi pi-upload" />
                  {reconciling
                    ? i18nT("static.9bz0qi")
                    : i18nT("static.10zw6cv")}
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
            <Column field="employee_code" header={i18nT("static.1lghzb2")} />
            <Column field="employee_name" header={i18nT("static.1fak8xt")} />
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
            />
            <Column
              header={i18nT("static.127tzh3")}
              body={(row: PayrollPaymentItemDetail) =>
                isDraft ? (
                  <InputText
                    value={references[row.id] ?? row.bank_reference ?? ""}
                    className="w-full"
                    placeholder={i18nT("Enter bank transfer reference")}
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
              {i18nT("static.boyvat")}{" "}
            </p>
          )}
          {!isDraft &&
            detail.batch.status !== "PAID" &&
            detail.batch.status !== "CANCELLED" && (
              <p className="m-0 text-xs leading-5 text-slate-500">
                {i18nT("static.a6iu57")} <code>{i18nT("static.1ww8a0")} </code>
                {i18nT("static.f50zx9")}{" "}
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
