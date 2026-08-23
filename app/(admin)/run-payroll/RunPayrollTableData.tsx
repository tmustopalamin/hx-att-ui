"use client";
import { useI18n } from "@/app/i18n";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
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
import { Message } from "primereact/message";

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
import type { RootState } from "@/store/store";
import PayrollPaymentDialog from "./PayrollPaymentDialog";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";
import { formatStatusLabel } from "@/app/i18n/statusLabel";

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
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const router = useRouter();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canCreate = permissions.includes("payroll.create");
  const canValidate = permissions.includes("payroll.validate");
  const canCalculate = permissions.includes("payroll.calculate");
  const canReview = permissions.includes("payroll.review");
  const canApprove = permissions.includes("payroll.approve");
  const canPost = permissions.includes("payroll.post");
  const canPay = permissions.includes("payroll.pay");
  const canExport = permissions.includes("payroll.export");
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
    mutate: refreshOptions,
  } = useSWR<PayrollBatchCreateOptions>(
    canCreate ? OPTIONS_URL : null,
    getPayrollBatchCreateOptions,
  );
  const { data: branches = [] } = useSWR(
    canCreate ? "payroll-batch-branches" : null,
    getBranchOptions,
  );
  const branchNames = useMemo(
    () => new Map(branches.map((branch) => [Number(branch.id), branch.name])),
    [branches],
  );

  const settingOptions = useMemo(
    () =>
      (options?.settings ?? []).map((setting) => ({
        label: i18nT("static.maqtcz", {
          p0: setting.name,
          p1:
            setting.branch_id === null
              ? i18nT("static.rrldxq")
              : (branchNames.get(setting.branch_id) ??
                i18nT("static.9imgeb", { p0: setting.branch_id })),
          p2: setting.code,
        }),
        value: setting.id,
      })),
    [branchNames, i18nT, options?.settings],
  );
  const regulationOptions = useMemo(
    () =>
      (options?.regulations ?? []).map((regulation) => ({
        label: i18nT("static.1cx6cam", {
          p0: regulation.code,
          p1: regulation.version,
        }),
        value: regulation.id,
      })),
    [i18nT, options?.regulations],
  );

  const toast = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));

  const showError = (error: unknown) => {
    toast("error", i18nT("static.ghd2d6"), getErrorMessage(error));
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
              summary: i18nT("static.1laurpn"),
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
    i18nT,
    visible,
  ]);

  const save = async () => {
    if (!batch.payroll_period_rule_id) {
      toast("error", i18nT("static.1laurpn"), i18nT("static.1ij1l3w"));
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
      toast("error", i18nT("static.gy1qqi"), i18nT("static.x1t6zi"));
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
      toast("success", i18nT("static.rlwlje"), i18nT("static.1ghh79v"));
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
          ? i18nT("static.7ojrng")
          : i18nT("static.mej0rw"),
        i18nT("static.btpd6d", {
          p0: result.ready_count,
          p1: result.warning_count,
          p2: result.failed_count,
        }),
      );
    } catch (error: unknown) {
      showError(error);
    } finally {
      setValidatingId(null);
    }
  };
  const confirmValidate = (row: PayrollBatch, revalidate = false) => {
    requestActionConfirmation({
      action: revalidate ? i18nT("static.1f1y0jf") : i18nT("static.58a1lq"),
      target: row.batch_no,
      severity: "warning",
      confirmLabel: revalidate
        ? i18nT("static.81yhza")
        : i18nT("static.y0kciz"),
      confirmIcon: "pi pi-check-circle",
      description: revalidate ? i18nT("static.rcv3dc") : i18nT("static.mm8zct"),
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
          i18nT("static.1jfbp5m"),
          i18nT("static.1jqrewv", {
            p0: result.calculated_count,
            p1: result.failed_count,
          }),
        );
        return;
      }
      toast(
        "success",
        i18nT("static.1byvg5y"),
        i18nT("static.1qnoqyq", { p0: result.calculated_count }),
      );
    } catch (error: unknown) {
      showError(error);
    } finally {
      setCalculatingId(null);
    }
  };
  const confirmCalculate = (row: PayrollBatch) => {
    requestActionConfirmation({
      action: i18nT("static.1fao45e"),
      target: row.batch_no,
      severity: "warning",
      confirmLabel: i18nT("static.1thvu1b"),
      confirmIcon: "pi pi-calculator",
      description: i18nT("static.1xj5ptt"),
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
      toast(
        "success",
        i18nT("static.1va3f7t"),
        i18nT("static.1h3tbug", { p0: i18nT(formatStatusLabel(status)) }),
      );
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
    const translatedLabel = i18nT(label);
    requestActionConfirmation({
      action: translatedLabel,
      target: row.batch_no,
      severity: status === "POSTED" ? "danger" : "warning",
      confirmLabel:
        status === "POSTED" ? i18nT("static.1ut2vl3") : translatedLabel,
      confirmIcon: status === "POSTED" ? "pi pi-lock" : "pi pi-check",
      description:
        status === "POSTED"
          ? i18nT("static.1to8d09")
          : i18nT("static.1p8sz63", {
              p0: i18nT(formatStatusLabel(status)),
            }),
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
      CALCULATED: { label: i18nT("static.tnr3lt"), status: "REVIEWED" },
      REVIEWED: { label: i18nT("static.15bk61o"), status: "PENDING_APPROVAL" },
      PENDING_APPROVAL: { label: i18nT("static.1s2ov2y"), status: "APPROVED" },
      APPROVED: { label: i18nT("static.1ut2vl3"), status: "POSTED" },
    } as const;
    return values[status as keyof typeof values] ?? null;
  };

  if (batchesLoading) return <LoadingDataTable />;
  if (batchError) return <ErrorNotConnectedToApi mutateKey={BATCH_URL} />;

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
                {i18nT("static.65awz")}{" "}
              </h1>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                {i18nT("static.ogvgnb")}{" "}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              label={i18nT("static.28r6qc")}
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              size="small"
              loading={isValidating}
              onClick={() => void refreshBatches()}
            />
            {canCreate && (
              <Button
                label={i18nT("static.lc5vw")}
                icon="pi pi-plus"
                size="small"
                onClick={openCreate}
              />
            )}
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
          emptyMessage={i18nT("static.u167jf")}
        >
          <Column field="batch_no" header={i18nT("static.19kijc8")} sortable />
          <Column
            header={i18nT("static.11hwh7o")}
            body={(row: PayrollBatch) =>
              `${formatDisplayDate(row.period_start)} → ${formatDisplayDate(row.period_end)}`
            }
          />
          <Column
            field="attendance_cutoff_date"
            header={i18nT("static.c9a7m3")}
            body={(row: PayrollBatch) =>
              formatDisplayDate(row.attendance_cutoff_date)
            }
          />
          <Column
            field="payroll_date"
            header={i18nT("static.wdezyy")}
            body={(row: PayrollBatch) => formatDisplayDate(row.payroll_date)}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: PayrollBatch) => (
              <Tag
                value={i18nT(formatStatusLabel(row.status))}
                severity={statusSeverity(row.status)}
              />
            )}
          />
          <Column
            field="created_at"
            header={i18nT("static.1byjss")}
            body={(row: PayrollBatch) => formatDisplayDateTime(row.created_at)}
          />
          <Column
            header={i18nT("static.2wk0tb")}
            frozen
            alignFrozen="right"
            body={(row: PayrollBatch) => {
              const next = nextTransition(row.status);
              const viewButton = (
                <Button
                  aria-label={i18nT("static.1sfkrl0", { p0: row.batch_no })}
                  icon="pi pi-eye"
                  rounded
                  text
                  severity="secondary"
                  tooltip={i18nT("static.bjwcer")}
                  tooltipOptions={{ position: "top" }}
                  onClick={() => router.push(`/run-payroll/${row.id}`)}
                />
              );
              const canRevalidate =
                canValidate &&
                [
                  "READY",
                  "CALCULATED",
                  "REVIEWED",
                  "PENDING_APPROVAL",
                  "APPROVED",
                ].includes(row.status);
              const revalidateButton = canRevalidate ? (
                <Button
                  label={i18nT("static.81yhza")}
                  icon="pi pi-refresh"
                  size="small"
                  severity="secondary"
                  outlined
                  loading={validatingId === row.id}
                  disabled={
                    validatingId !== null ||
                    calculatingId !== null ||
                    transitioningId !== null
                  }
                  onClick={() => confirmValidate(row, true)}
                />
              ) : null;
              const actionButton =
                row.status === "READY" && canCalculate ? (
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      label={i18nT("static.1thvu1b")}
                      icon="pi pi-calculator"
                      size="small"
                      loading={calculatingId === row.id}
                      disabled={calculatingId !== null || validatingId !== null}
                      onClick={() => confirmCalculate(row)}
                    />
                    {revalidateButton}
                  </div>
                ) : row.status === "READY" && canValidate ? (
                  revalidateButton
                ) : next &&
                  ((next.status === "REVIEWED" && canReview) ||
                    (next.status === "PENDING_APPROVAL" && canReview) ||
                    (next.status === "APPROVED" && canApprove) ||
                    (next.status === "POSTED" && canPost)) ? (
                  <div className="flex flex-wrap justify-end gap-1">
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
                    {revalidateButton}
                  </div>
                ) : (row.status === "DRAFT" || row.status === "FAILED") &&
                  canValidate ? (
                  <Button
                    label={i18nT("static.y0kciz")}
                    icon="pi pi-check-circle"
                    size="small"
                    severity="secondary"
                    outlined
                    loading={validatingId === row.id}
                    disabled={validatingId !== null || calculatingId !== null}
                    onClick={() => confirmValidate(row)}
                  />
                ) : revalidateButton ? (
                  revalidateButton
                ) : row.status === "POSTED" && (canPay || canExport) ? (
                  <Button
                    label={i18nT("static.958wsx")}
                    icon="pi pi-wallet"
                    size="small"
                    severity="secondary"
                    outlined
                    onClick={() => setPaymentBatch(row)}
                  />
                ) : (
                  <span className="text-sm text-slate-400">
                    {i18nT("static.j27kqw")}
                  </span>
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
        header={i18nT("static.lc5vw")}
        visible={visible}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "48rem" }}
        onHide={() => setVisible(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={i18nT("static.ew9em3")}
              severity="secondary"
              text
              disabled={saving}
              onClick={() => setVisible(false)}
            />
            <Button
              label={i18nT("static.4tz1ya")}
              icon="pi pi-check"
              loading={saving}
              disabled={
                saving ||
                optionsLoading ||
                Boolean(optionsError) ||
                settingOptions.length === 0 ||
                regulationOptions.length === 0 ||
                periodPreviewLoading ||
                !periodPreview
              }
              onClick={() => void save()}
            />
            {optionsError && (
              <Button
                label={i18nT("static.1b8ytwf")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                disabled={saving || optionsLoading}
                onClick={() => void refreshOptions()}
              />
            )}
          </div>
        }
      >
        {optionsError && (
          <Message
            severity="error"
            className="mb-3 w-full"
            text={i18nT("static.l9z567")}
          />
        )}
        {optionsLoading && (
          <Message
            severity="info"
            className="mb-3 w-full"
            text={i18nT("static.1bhe5nt")}
          />
        )}
        {!optionsLoading &&
          !optionsError &&
          canCreate &&
          (settingOptions.length === 0 || regulationOptions.length === 0) && (
            <Message
              severity="warn"
              className="mb-3 w-full"
              text={i18nT("static.1qcdffd")}
            />
          )}
        <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <Field label={i18nT("static.ymton0")}>
            <Dropdown
              value={batch.payroll_setting_id || null}
              options={settingOptions}
              placeholder={i18nT("static.dyyqos")}
              className="w-full"
              onChange={(event) =>
                setBatch((current) => ({
                  ...current,
                  payroll_setting_id: Number(event.value),
                }))
              }
            />
          </Field>
          <Field label={i18nT("static.hmvlvu")}>
            <InputText
              value={batch.batch_no}
              className="w-full"
              placeholder={i18nT("static.gy2u6r")}
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
              {i18nT("static.1q24n7e")}{" "}
            </span>
          </Field>
          <Field label={i18nT("static.cqtsae")}>
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
          <Field label={i18nT("static.s4omp8")}>
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
                    {i18nT("static.eyk46v")}{" "}
                  </p>
                  <p className="mb-0 mt-1 text-xs leading-5 text-slate-500">
                    {i18nT("static.ihxun6")}{" "}
                  </p>
                </div>
                {periodPreview && (
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {i18nT("static.wk4h3z")} {periodPreview.cutoff_day}
                  </span>
                )}
              </div>

              {periodPreviewLoading ? (
                <p className="mb-0 mt-4 text-sm text-slate-500">
                  {i18nT("static.a2he6h")}{" "}
                </p>
              ) : periodPreview ? (
                <>
                  <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
                    <div>
                      <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {i18nT("static.rctpc")}{" "}
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
                        {i18nT("static.1aquwpt")}{" "}
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
                      {i18nT("static.2nty1m")}{" "}
                      <span className="font-semibold">
                        {formatDisplayDate(batch.attendance_cutoff_date)}
                      </span>{" "}
                      {i18nT("static.1inf8vu")}{" "}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mb-0 mt-4 text-sm text-slate-500">
                  {i18nT("static.vqg0n2")}{" "}
                </p>
              )}
            </div>
          </div>
          <div className="sm:col-span-2">
            <Field label={i18nT("static.dl4mr2")}>
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
                placeholder={i18nT("static.dai7jq")}
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
              {i18nT("static.1qiig75")}{" "}
            </p>
          </div>
          <div className="sm:col-span-2">
            <Field label={i18nT("static.4f76ga")}>
              <InputText
                value={batch.notes ?? ""}
                className="w-full"
                placeholder={i18nT("Enter optional notes")}
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
        onError={(detail) => toast("error", i18nT("static.958wsx"), detail)}
        onSuccess={(detail) => toast("success", i18nT("static.958wsx"), detail)}
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
