import type {
  NewPayrollBatch,
  PayrollBatch,
  PayrollBatchCalculationResult,
  PayrollBatchCreateOptions,
  PayrollBatchDetail,
  PayrollPayslip,
  NewPayrollPaymentBatch,
  PayrollPaymentBatch,
  PayrollPaymentBatchDetail,
  PayrollPaymentSettlement,
  PayrollAdjustment,
  PayrollAdjustmentOptions,
  PayrollBatchValidationResult,
  PayrollBatchSourceReadiness,
  PayrollPerformanceEarningPreview,
  PayrollPerformanceEarningGeneration,
  PayrollHolidayPositionIncentivePreview,
  PayrollHolidayPositionIncentiveGeneration,
  PayrollThrPreview,
  PayrollThrGeneration,
} from "@/app/types/payroll-batch";
import {
  apiFetchResponse,
  apiFetch,
  parseApiError,
} from "@/app/utils/api-client";

const URL = "/api/payroll-batches";

export const getPayrollBatchCreateOptions =
  (): Promise<PayrollBatchCreateOptions> => apiFetch(`${URL}/options`);

export const getPayrollBatchDetail = (
  id: number,
): Promise<PayrollBatchDetail> => apiFetch(`${URL}/${id}/detail`);

export const getPayrollBatchSourceReadiness = (
  id: number,
): Promise<PayrollBatchSourceReadiness> =>
  apiFetch(`${URL}/${id}/source-readiness`);

export const getMyPayrollPayslips = (): Promise<PayrollPayslip[]> =>
  apiFetch("/api/payroll-payslips/me");

export const getPayrollPaymentBatches = (
  payrollBatchId: number,
): Promise<PayrollPaymentBatch[]> =>
  apiFetch(`${URL}/${payrollBatchId}/payment-batches`);

export const createPayrollPaymentBatch = (
  payrollBatchId: number,
  data: NewPayrollPaymentBatch,
): Promise<PayrollPaymentBatch> =>
  apiFetch(`${URL}/${payrollBatchId}/payment-batches`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const getPayrollPaymentBatchDetail = (
  id: number,
): Promise<PayrollPaymentBatchDetail> =>
  apiFetch(`/api/payroll-payment-batches/${id}`);

export const settlePayrollPaymentBatch = (
  id: number,
  rowVersion: number,
  data: PayrollPaymentSettlement,
): Promise<PayrollPaymentBatch> =>
  apiFetch(`/api/payroll-payment-batches/${id}/settle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(data),
  });

export const exportPayrollPaymentBatch = async (id: number): Promise<Blob> => {
  const response = await apiFetchResponse(
    `/api/payroll-payment-batches/${id}/export`,
    {
      credentials: "include",
      headers: { Accept: "text/csv" },
    },
  );
  if (!response.ok) throw new Error("Payment export failed.");
  return response.blob();
};

export const exportPayrollEbupot21 = async (
  id: number,
): Promise<{ blob: Blob; filename: string }> => {
  const response = await apiFetchResponse(
    `/api/payroll-batches/${id}/export-ebupot21`,
    {
      credentials: "include",
      headers: { Accept: "text/csv" },
    },
  );
  if (!response.ok) throw new Error("e-Bupot export failed.");
  const disposition = response.headers.get("content-disposition");
  let filename = `ebupot21_batch_${id}.csv`;
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match?.[1]) filename = match[1];
  }
  const blob = await response.blob();
  return { blob, filename };
};

export const reconcilePayrollPaymentBatch = async (
  id: number,
  rowVersion: number,
  file: File,
): Promise<PayrollPaymentBatch> => {
  const response = await apiFetchResponse(
    `/api/payroll-payment-batches/${id}/reconcile`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "text/csv",
        "If-Match": String(rowVersion),
      },
      body: file,
    },
  );
  if (!response.ok) throw await parseApiError(response);
  return (await response.json()) as PayrollPaymentBatch;
};

export const getPayrollAdjustments = (
  batchId: number,
): Promise<PayrollAdjustment[]> => apiFetch(`${URL}/${batchId}/adjustments`);
export const getPayrollAdjustmentOptions = (
  batchId: number,
): Promise<PayrollAdjustmentOptions> =>
  apiFetch(`${URL}/${batchId}/adjustment-options`);
export const previewPayrollPerformanceEarnings = (
  batchId: number,
): Promise<PayrollPerformanceEarningPreview[]> =>
  apiFetch(`${URL}/${batchId}/performance-earnings/preview`);
export const generatePayrollPerformanceEarnings = (
  batchId: number,
): Promise<PayrollPerformanceEarningGeneration> =>
  apiFetch(`${URL}/${batchId}/performance-earnings/generate`, {
    method: "POST",
  });

export const previewPayrollHolidayPositionIncentives = (
  batchId: number,
): Promise<PayrollHolidayPositionIncentivePreview[]> =>
  apiFetch(`${URL}/${batchId}/holiday-position-incentives/preview`);

export const generatePayrollHolidayPositionIncentives = (
  batchId: number,
): Promise<PayrollHolidayPositionIncentiveGeneration> =>
  apiFetch(`${URL}/${batchId}/holiday-position-incentives/generate`, {
    method: "POST",
  });

export const createPayrollAdjustment = (
  batchId: number,
  data: Omit<
    PayrollAdjustment,
    "id" | "payroll_batch_id" | "status" | "created_by" | "row_version"
  >,
): Promise<PayrollAdjustment> =>
  apiFetch(`${URL}/${batchId}/adjustments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

const adjustAction = (
  id: number,
  rowVersion: number,
  action: "submit" | "approve",
): Promise<PayrollAdjustment> =>
  apiFetch(`/api/payroll-adjustments/${id}/${action}`, {
    method: "POST",
    headers: { "If-Match": String(rowVersion) },
  });

export const submitPayrollAdjustment = (id: number, rowVersion: number) =>
  adjustAction(id, rowVersion, "submit");
export const approvePayrollAdjustment = (id: number, rowVersion: number) =>
  adjustAction(id, rowVersion, "approve");
export const rejectPayrollAdjustment = (
  id: number,
  rowVersion: number,
  reason: string,
): Promise<PayrollAdjustment> =>
  apiFetch(`/api/payroll-adjustments/${id}/reject`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({ reason }),
  });
export const cancelPayrollAdjustment = (
  id: number,
  rowVersion: number,
): Promise<PayrollAdjustment> =>
  apiFetch(`/api/payroll-adjustments/${id}/cancel`, {
    method: "POST",
    headers: { "If-Match": String(rowVersion) },
  });

export const createPayrollBatch = (
  data: NewPayrollBatch,
): Promise<PayrollBatch> =>
  apiFetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const validatePayrollBatch = (
  id: number,
  rowVersion: number,
): Promise<PayrollBatchValidationResult> =>
  apiFetch(`${URL}/${id}/validate`, {
    method: "POST",
    headers: { "If-Match": String(rowVersion) },
  });

export const calculatePayrollBatch = (
  id: number,
  rowVersion: number,
): Promise<PayrollBatchCalculationResult> =>
  apiFetch(`${URL}/${id}/calculate`, {
    method: "POST",
    headers: { "If-Match": String(rowVersion) },
  });

export const transitionPayrollBatch = (
  id: number,
  rowVersion: number,
  status: "REVIEWED" | "PENDING_APPROVAL" | "APPROVED" | "POSTED",
): Promise<PayrollBatch> =>
  apiFetch(`${URL}/${id}/transition`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({ status }),
  });

export const previewPayrollThr = (
  batchId: number,
): Promise<PayrollThrPreview[]> => apiFetch(`${URL}/${batchId}/thr/preview`);

export const generatePayrollThr = (
  batchId: number,
): Promise<PayrollThrGeneration> =>
  apiFetch(`${URL}/${batchId}/thr/generate`, {
    method: "POST",
  });
