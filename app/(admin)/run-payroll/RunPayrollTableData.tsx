"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputText } from "primereact/inputtext";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";

import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  calculatePayrollBatch,
  createPayrollBatch,
  getPayrollBatchCreateOptions,
  validatePayrollBatch,
  transitionPayrollBatch,
} from "@/app/services/payroll-batch-service";
import type {
  NewPayrollBatch,
  PayrollBatch,
  PayrollBatchCreateOptions,
  PayrollBatchStatus,
} from "@/app/types/payroll-batch";
import type { ResponseTypeError } from "@/app/types/response-type";
import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import PayrollPaymentDialog from "./PayrollPaymentDialog";

const BATCH_URL = "/api/payroll-batches";
const OPTIONS_URL = "/api/payroll-batches/options";

const emptyBatch = (): NewPayrollBatch => ({
  payroll_setting_id: 0,
  batch_no: "",
  period_start: "",
  period_end: "",
  attendance_cutoff_date: "",
  payroll_date: "",
  notes: null,
  regulation_package_ids: [],
});

const statusSeverity = (
  status: PayrollBatchStatus,
): "secondary" | "info" | "warning" | "success" | "danger" => {
  if (status === "PAID" || status === "POSTED") return "success";
  if (status === "FAILED" || status === "CANCELLED") return "danger";
  if (status === "DRAFT") return "secondary";
  if (status === "CALCULATING" || status === "VALIDATING") return "warning";
  return "info";
};

export default function RunPayrollTableData() {
  const dispatch = useDispatch();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [calculatingId, setCalculatingId] = useState<number | null>(null);
  const [transitioningId, setTransitioningId] = useState<number | null>(null);
  const [paymentBatch, setPaymentBatch] = useState<PayrollBatch | null>(null);
  const [batch, setBatch] = useState<NewPayrollBatch>(emptyBatch);
  const {
    data: batches,
    error: batchError,
    isLoading: batchesLoading,
    isValidating,
    mutate: refreshBatches,
  } = useSWR<PayrollBatch[]>(BATCH_URL, fetcher);
  const {
    data: options,
    error: optionsError,
    isLoading: optionsLoading,
  } = useSWR<PayrollBatchCreateOptions>(
    OPTIONS_URL,
    getPayrollBatchCreateOptions,
  );

  const settingOptions = useMemo(
    () =>
      (options?.settings ?? []).map((setting) => ({
        label: `${setting.name} (${setting.code})`,
        value: setting.id,
      })),
    [options?.settings],
  );
  const regulationOptions = useMemo(
    () =>
      (options?.regulations ?? []).map((regulation) => ({
        label: `${regulation.code} · ${regulation.version}`,
        value: regulation.id,
      })),
    [options?.regulations],
  );

  const toast = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));

  const showError = (error: unknown) => {
    const detail =
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as ResponseTypeError).message === "string"
        ? (error as ResponseTypeError).message
        : "An unexpected error occurred.";
    toast("error", "Payroll", detail);
  };

  const openCreate = () => {
    setBatch(emptyBatch());
    setVisible(true);
  };

  const save = async () => {
    if (
      batch.payroll_setting_id <= 0 ||
      !batch.batch_no.trim() ||
      !batch.period_start ||
      !batch.period_end ||
      !batch.attendance_cutoff_date ||
      !batch.payroll_date ||
      batch.regulation_package_ids.length === 0
    ) {
      toast(
        "error",
        "Validation",
        "Complete all required payroll batch fields.",
      );
      return;
    }
    try {
      setSaving(true);
      await createPayrollBatch({
        ...batch,
        batch_no: batch.batch_no.trim(),
        notes: batch.notes?.trim() || null,
      });
      await refreshBatches();
      setVisible(false);
      toast(
        "success",
        "Payroll batch created",
        "Regulations were snapshotted successfully.",
      );
    } catch (error: unknown) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const validate = async (row: PayrollBatch) => {
    try {
      setValidatingId(row.id);
      const result = await validatePayrollBatch(row.id, row.row_version);
      await refreshBatches();
      toast(
        "success",
        "Payroll batch validated",
        `${result.ready_count} employees ready, ${result.warning_count} need attendance review.`,
      );
    } catch (error: unknown) {
      showError(error);
    } finally {
      setValidatingId(null);
    }
  };

  const calculate = async (row: PayrollBatch) => {
    try {
      setCalculatingId(row.id);
      const result = await calculatePayrollBatch(row.id, row.row_version);
      await refreshBatches();
      if (result.failed_count > 0) {
        toast(
          "error",
          "Payroll calculation needs review",
          `${result.calculated_count} employees calculated; ${result.failed_count} failed safely.`,
        );
        return;
      }
      toast(
        "success",
        "Payroll calculated",
        `${result.calculated_count} employee payrolls were calculated.`,
      );
    } catch (error: unknown) {
      showError(error);
    } finally {
      setCalculatingId(null);
    }
  };
  const transition = async (
    row: PayrollBatch,
    status: "REVIEWED" | "PENDING_APPROVAL" | "APPROVED" | "POSTED",
  ) => {
    try {
      setTransitioningId(row.id);
      await transitionPayrollBatch(row.id, row.row_version, status);
      await refreshBatches();
      toast("success", "Payroll updated", `Payroll moved to ${status}.`);
    } catch (error: unknown) {
      showError(error);
    } finally {
      setTransitioningId(null);
    }
  };
  const nextTransition = (
    status: PayrollBatchStatus,
  ): {
    label: string;
    status: "REVIEWED" | "PENDING_APPROVAL" | "APPROVED" | "POSTED";
  } | null => {
    const values = {
      CALCULATED: { label: "Review", status: "REVIEWED" },
      REVIEWED: { label: "Submit Approval", status: "PENDING_APPROVAL" },
      PENDING_APPROVAL: { label: "Approve", status: "APPROVED" },
      APPROVED: { label: "Post", status: "POSTED" },
    } as const;
    return values[status as keyof typeof values] ?? null;
  };

  if (batchesLoading || optionsLoading) return <LoadingDataTable />;
  if (batchError || optionsError)
    return <ErrorNotConnectedToApi mutateKey={BATCH_URL} />;

  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
              <i className="pi pi-calculator text-xl" />
            </div>
            <div>
              <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                Run Payroll
              </h1>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                Create a payroll period with immutable snapshots of the
                applicable regulations.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              size="small"
              loading={isValidating}
              onClick={() => void refreshBatches()}
            />
            <Button
              label="New Payroll Batch"
              icon="pi pi-plus"
              size="small"
              onClick={openCreate}
            />
          </div>
        </div>

        <DataTable
          value={batches ?? []}
          dataKey="id"
          paginator
          rows={10}
          stripedRows
          rowHover
          scrollable
          responsiveLayout="scroll"
          size="small"
          tableStyle={{ minWidth: "58rem" }}
          emptyMessage="No payroll batch found."
        >
          <Column field="batch_no" header="Batch No." sortable />
          <Column
            header="Period"
            body={(row: PayrollBatch) =>
              `${row.period_start} → ${row.period_end}`
            }
          />
          <Column field="attendance_cutoff_date" header="Attendance Cutoff" />
          <Column field="payroll_date" header="Payroll Date" />
          <Column
            header="Status"
            body={(row: PayrollBatch) => (
              <Tag value={row.status} severity={statusSeverity(row.status)} />
            )}
          />
          <Column field="created_at" header="Created At" />
          <Column
            header="Action"
            frozen
            alignFrozen="right"
            body={(row: PayrollBatch) => {
              const next = nextTransition(row.status);
              const viewButton = (
                <Button
                  aria-label={`View ${row.batch_no}`}
                  icon="pi pi-eye"
                  rounded
                  text
                  severity="secondary"
                  tooltip="View payroll results"
                  tooltipOptions={{ position: "top" }}
                  onClick={() => router.push(`/run-payroll/${row.id}`)}
                />
              );
              const actionButton =
                row.status === "READY" ? (
                  <Button
                    label="Calculate"
                    icon="pi pi-calculator"
                    size="small"
                    loading={calculatingId === row.id}
                    disabled={calculatingId !== null || validatingId !== null}
                    onClick={() => void calculate(row)}
                  />
                ) : next ? (
                  <Button
                    label={next.label}
                    size="small"
                    loading={transitioningId === row.id}
                    disabled={
                      transitioningId !== null ||
                      calculatingId !== null ||
                      validatingId !== null
                    }
                    onClick={() => void transition(row, next.status)}
                  />
                ) : row.status === "DRAFT" || row.status === "FAILED" ? (
                  <Button
                    label="Validate"
                    icon="pi pi-check-circle"
                    size="small"
                    severity="secondary"
                    outlined
                    loading={validatingId === row.id}
                    disabled={validatingId !== null || calculatingId !== null}
                    onClick={() => void validate(row)}
                  />
                ) : row.status === "POSTED" ? (
                  <Button
                    label="Payment"
                    icon="pi pi-wallet"
                    size="small"
                    severity="secondary"
                    outlined
                    onClick={() => setPaymentBatch(row)}
                  />
                ) : (
                  <span className="text-sm text-slate-400">Prepared</span>
                );
              return (
                <div className="flex items-center justify-end gap-1">
                  {viewButton}
                  {actionButton}
                </div>
              );
            }}
          />
        </DataTable>
      </div>

      <Dialog
        header="New Payroll Batch"
        visible={visible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "48rem" }}
        onHide={() => setVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              disabled={saving}
              onClick={() => setVisible(false)}
            />
            <Button
              label="Create Draft"
              icon="pi pi-check"
              loading={saving}
              onClick={() => void save()}
            />
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label="Payroll Setting *">
            <Dropdown
              value={batch.payroll_setting_id || null}
              options={settingOptions}
              placeholder="Select payroll setting"
              className="w-full"
              onChange={(event) =>
                setBatch((current) => ({
                  ...current,
                  payroll_setting_id: Number(event.value),
                }))
              }
            />
          </Field>
          <Field label="Batch Number *">
            <InputText
              value={batch.batch_no}
              className="w-full"
              onChange={(event) =>
                setBatch((current) => ({
                  ...current,
                  batch_no: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Period Start *">
            <InputText
              type="date"
              value={batch.period_start}
              className="w-full"
              onChange={(event) =>
                setBatch((current) => ({
                  ...current,
                  period_start: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Period End *">
            <InputText
              type="date"
              value={batch.period_end}
              className="w-full"
              onChange={(event) =>
                setBatch((current) => ({
                  ...current,
                  period_end: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Attendance Cutoff *">
            <InputText
              type="date"
              value={batch.attendance_cutoff_date}
              className="w-full"
              onChange={(event) =>
                setBatch((current) => ({
                  ...current,
                  attendance_cutoff_date: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Payroll Date *">
            <InputText
              type="date"
              value={batch.payroll_date}
              className="w-full"
              onChange={(event) =>
                setBatch((current) => ({
                  ...current,
                  payroll_date: event.target.value,
                }))
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Published Regulation Packages *">
              <MultiSelect
                value={batch.regulation_package_ids}
                options={regulationOptions}
                display="chip"
                filter
                placeholder="Select all regulations applicable to this payroll date"
                className="w-full"
                onChange={(event) =>
                  setBatch((current) => ({
                    ...current,
                    regulation_package_ids: (event.value as number[]) ?? [],
                  }))
                }
              />
            </Field>
            <p className="mb-0 mt-2 text-xs leading-5 text-slate-500">
              The server validates each package&apos;s published status and
              effective date, then stores an immutable copy in the batch.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <InputText
                value={batch.notes ?? ""}
                className="w-full"
                onChange={(event) =>
                  setBatch((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </Field>
          </div>
        </div>
      </Dialog>
      <PayrollPaymentDialog
        key={paymentBatch?.id ?? "closed"}
        batch={paymentBatch}
        visible={paymentBatch !== null}
        onHide={() => setPaymentBatch(null)}
        onSettled={() => refreshBatches()}
        onError={(detail) => toast("error", "Payment", detail)}
        onSuccess={(detail) => toast("success", "Payment", detail)}
      />
    </Card>
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
