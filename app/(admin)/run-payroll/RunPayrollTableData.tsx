"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getBranchOptions } from "@/app/services/employee-general-service";
import { getPayrollPeriodPreview } from "@/app/services/payroll-configuration-service";
import type {
  NewPayrollBatch,
  PayrollBatch,
  PayrollBatchCreateOptions,
  PayrollBatchStatus,
} from "@/app/types/payroll-batch";
import type { PayrollPeriodPreview } from "@/app/types/payroll-configuration";
import { getErrorMessage } from "@/app/utils/error-messages";
import { fetcher } from "@/app/utils/fetcher";
import { showToast } from "@/store/ToastSlice";
import PayrollPaymentDialog from "./PayrollPaymentDialog";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";

const BATCH_URL = "/api/payroll-batches";
const OPTIONS_URL = "/api/payroll-batches/options";
const getBody = () => document.body;

const suggestBatchNumber = (
  referenceMonth: string,
  existingBatches: PayrollBatch[],
) => {
  const month = referenceMonth.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return "";

  const generatedNumberPattern = new RegExp(`^PR-${month}-(\\d+)$`, "i");
  let highestSequence = 0;

  for (const existingBatch of existingBatches) {
    const match = existingBatch.batch_no.trim().match(generatedNumberPattern);
    const sequence = match ? Number.parseInt(match[1], 10) : NaN;
    if (Number.isFinite(sequence)) {
      highestSequence = Math.max(highestSequence, sequence);
    }
  }

  return `PR-${month}-${String(highestSequence + 1).padStart(3, "0")}`;
};

const emptyBatch = (): NewPayrollBatch => ({
  payroll_setting_id: 0,
  batch_no: "",
  period_start: "",
  period_end: "",
  attendance_cutoff_date: "",
  period_reference_month: "",
  payroll_period_rule_id: null,
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
  const [batchNoManuallyEdited, setBatchNoManuallyEdited] = useState(false);
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [calculatingId, setCalculatingId] = useState<number | null>(null);
  const [transitioningId, setTransitioningId] = useState<number | null>(null);
  const [paymentBatch, setPaymentBatch] = useState<PayrollBatch | null>(null);
  const [batch, setBatch] = useState<NewPayrollBatch>(emptyBatch);
  const [periodPreview, setPeriodPreview] =
    useState<PayrollPeriodPreview | null>(null);
  const [periodPreviewLoading, setPeriodPreviewLoading] = useState(false);
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
  const { data: branches = [] } = useSWR(
    "payroll-batch-branches",
    getBranchOptions,
  );
  const branchNames = useMemo(
    () => new Map(branches.map((branch) => [Number(branch.id), branch.name])),
    [branches],
  );

  const settingOptions = useMemo(
    () =>
      (options?.settings ?? []).map((setting) => ({
        label: `${setting.name} · ${
          setting.branch_id === null
            ? "Global"
            : (branchNames.get(setting.branch_id) ??
              `Branch ${setting.branch_id}`)
        } (${setting.code})`,
        value: setting.id,
      })),
    [branchNames, options?.settings],
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
    toast("error", "Payroll", getErrorMessage(error));
  };

  const openCreate = () => {
    setBatch(emptyBatch());
    setPeriodPreview(null);
    setBatchNoManuallyEdited(false);
    setVisible(true);
  };

  useEffect(() => {
    if (
      !visible ||
      batch.payroll_setting_id <= 0 ||
      !batch.period_reference_month
    ) {
      setPeriodPreview(null);
      return;
    }
    let cancelled = false;
    setPeriodPreviewLoading(true);
    void getPayrollPeriodPreview(
      batch.payroll_setting_id,
      `${batch.period_reference_month.slice(0, 7)}-01`,
    )
      .then((preview) => {
        if (cancelled) return;
        setPeriodPreview(preview);
        setBatch((current) => ({
          ...current,
          period_start: preview.period_start,
          period_end: preview.period_end,
          attendance_cutoff_date: preview.attendance_cutoff_date,
          payroll_period_rule_id: preview.payroll_period_rule_id,
        }));
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPeriodPreview(null);
          setBatch((current) => ({
            ...current,
            period_start: "",
            period_end: "",
            attendance_cutoff_date: "",
            payroll_period_rule_id: null,
          }));
          dispatch(
            showToast({
              visible: true,
              severity: "error",
              summary: "Payroll setup",
              detail: getErrorMessage(error),
            }),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPeriodPreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    batch.payroll_setting_id,
    batch.period_reference_month,
    dispatch,
    visible,
  ]);

  const save = async () => {
    if (!batch.payroll_period_rule_id) {
      toast(
        "error",
        "Payroll setup",
        "No effective payroll period rule is configured for the selected payroll month. Add or update a rule in Payroll Configuration > General Settings.",
      );
      return;
    }
    if (
      batch.payroll_setting_id <= 0 ||
      !batch.batch_no.trim() ||
      !batch.period_start ||
      !batch.period_end ||
      !batch.attendance_cutoff_date ||
      !batch.period_reference_month ||
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
        result.failed_count > 0 ? "error" : "success",
        result.failed_count > 0
          ? "Payroll validation needs review"
          : "Payroll batch validated",
        `${result.ready_count} employees ready, ${result.warning_count} need attendance review, ${result.failed_count} failed configuration checks.`,
      );
    } catch (error: unknown) {
      showError(error);
    } finally {
      setValidatingId(null);
    }
  };
  const confirmValidate = (row: PayrollBatch) => {
    requestActionConfirmation({
      action: "Validate payroll batch",
      target: row.batch_no,
      severity: "warning",
      confirmLabel: "Validate",
      confirmIcon: "pi pi-check-circle",
      description: "Validate this payroll batch?",
      onAccept: () => validate(row),
    });
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
  const confirmCalculate = (row: PayrollBatch) => {
    requestActionConfirmation({
      action: "Calculate payroll",
      target: row.batch_no,
      severity: "warning",
      confirmLabel: "Calculate",
      confirmIcon: "pi pi-calculator",
      description: "Calculate this payroll batch?",
      onAccept: () => calculate(row),
    });
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
  const confirmTransition = (
    row: PayrollBatch,
    status: "REVIEWED" | "PENDING_APPROVAL" | "APPROVED" | "POSTED",
  ) => {
    const label =
      status === "PENDING_APPROVAL"
        ? "Submit payroll for approval"
        : status === "APPROVED"
          ? "Approve payroll"
          : status === "POSTED"
            ? "Post payroll"
            : "Mark payroll reviewed";
    requestActionConfirmation({
      action: label,
      target: row.batch_no,
      severity: status === "POSTED" ? "danger" : "warning",
      confirmLabel: status === "POSTED" ? "Post" : label,
      confirmIcon: status === "POSTED" ? "pi pi-lock" : "pi pi-check",
      description:
        status === "POSTED"
          ? "Post this payroll batch?"
          : `Move payroll to ${status.replaceAll("_", " ").toLowerCase()}?`,
      onAccept: () => transition(row, status),
    });
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
              `${formatDisplayDate(row.period_start)} → ${formatDisplayDate(row.period_end)}`
            }
          />
          <Column
            field="attendance_cutoff_date"
            header="Attendance Included Through"
            body={(row: PayrollBatch) =>
              formatDisplayDate(row.attendance_cutoff_date)
            }
          />
          <Column
            field="payroll_date"
            header="Payroll Date"
            body={(row: PayrollBatch) => formatDisplayDate(row.payroll_date)}
          />
          <Column
            header="Status"
            body={(row: PayrollBatch) => (
              <Tag value={row.status} severity={statusSeverity(row.status)} />
            )}
          />
          <Column
            field="created_at"
            header="Created At"
            body={(row: PayrollBatch) => formatDisplayDateTime(row.created_at)}
          />
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
                    onClick={() => confirmCalculate(row)}
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
                    onClick={() => confirmTransition(row, next.status)}
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
                    onClick={() => confirmValidate(row)}
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
              disabled={saving || periodPreviewLoading || !periodPreview}
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
              placeholder="Auto-generated after selecting Reference Month"
              maxLength={50}
              onChange={(event) => {
                setBatchNoManuallyEdited(true);
                setBatch((current) => ({
                  ...current,
                  batch_no: event.target.value,
                }));
              }}
            />
            <span className="text-xs leading-5 text-slate-500">
              Nomor dibuat otomatis berdasarkan Reference Month, tetapi tetap
              dapat diedit.
            </span>
          </Field>
          <Field label="Reference Month *">
            <InputText
              type="month"
              value={batch.period_reference_month.slice(0, 7)}
              className="w-full"
              onChange={(event) => {
                const referenceMonth = event.target.value
                  ? `${event.target.value}-01`
                  : "";
                setBatch((current) => ({
                  ...current,
                  batch_no: batchNoManuallyEdited
                    ? current.batch_no
                    : suggestBatchNumber(referenceMonth, batches ?? []),
                  period_reference_month: referenceMonth,
                  period_start: "",
                  period_end: "",
                  attendance_cutoff_date: "",
                  payroll_period_rule_id: null,
                }));
              }}
            />
          </Field>
          <Field label="Payroll Date *">
            <PrimeDatePicker
              value={batch.payroll_date}
              className="w-full"
              onValueChange={(value) =>
                setBatch((current) => ({ ...current, payroll_date: value }))
              }
            />
          </Field>
          <div className="sm:col-span-2" aria-live="polite">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="m-0 text-sm font-semibold text-slate-800">
                    Payroll Period Preview
                  </p>
                  <p className="mb-0 mt-1 text-xs leading-5 text-slate-500">
                    Tanggal periode ditentukan otomatis oleh payroll period
                    rule.
                  </p>
                </div>
                {periodPreview && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                    Period end day {periodPreview.cutoff_day}
                  </span>
                )}
              </div>

              {periodPreviewLoading ? (
                <p className="mb-0 mt-4 text-sm text-slate-500">
                  Calculating the configured payroll period…
                </p>
              ) : periodPreview ? (
                <>
                  <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <div>
                      <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Period Start
                      </p>
                      <p className="mb-0 mt-1 text-sm font-semibold text-slate-900">
                        {formatDisplayDate(batch.period_start)}
                      </p>
                    </div>
                    <div className="flex items-center" aria-hidden="true">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                      <span className="h-0.5 flex-1 bg-blue-300" />
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
                    </div>
                    <div className="text-right">
                      <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Period End
                      </p>
                      <p className="mb-0 mt-1 text-sm font-semibold text-slate-900">
                        {formatDisplayDate(batch.period_end)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-5 text-emerald-800">
                    <i
                      className="pi pi-check-circle mt-0.5"
                      aria-hidden="true"
                    />
                    <p className="m-0">
                      Data kehadiran sampai dan termasuk{" "}
                      <span className="font-semibold">
                        {formatDisplayDate(batch.attendance_cutoff_date)}
                      </span>{" "}
                      masuk dalam periode ini. Data setelah tanggal tersebut
                      masuk periode berikutnya.
                    </p>
                  </div>
                </>
              ) : (
                <p className="mb-0 mt-4 text-sm text-slate-500">
                  Select a payroll setting and reference month to preview the
                  configured period.
                </p>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Field label="Published Regulation Packages *">
              <MultiSelect
                value={batch.regulation_package_ids}
                options={regulationOptions}
                appendTo={getBody}
                display="chip"
                filter
                scrollHeight="10rem"
                transitionOptions={{
                  classNames: "payroll-regulation-dropdown",
                  timeout: 0,
                }}
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
