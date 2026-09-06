import { apiFetchResponse, parseApiError } from "@/app/utils/api-client";

import {
  ApprovalActionPayload,
  ApprovalWorkflowSettingForm,
} from "../types/approval";
import { LifecycleApprovalDetail } from "../types/employee-lifecycle";

const API_URL = "/api/approval";

const validatePositiveInteger = (value: number, fieldName: string) => {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(
      `${fieldName} is missing or invalid. Refresh and try again.`,
    );
  }
};

const normalizeNotePayload = (note?: string | null): ApprovalActionPayload => {
  const cleanNote = (note ?? "").trim();

  return {
    note: cleanNote ? cleanNote : null,
  };
};

export const approveApprovalRequest = async (
  approvalRequestId: number,
  rowVersion: number,
  note?: string | null,
) => {
  validatePositiveInteger(approvalRequestId, "Approval request");
  validatePositiveInteger(rowVersion, "Approval version");

  const res = await apiFetchResponse(
    `${API_URL}/${approvalRequestId}/approve`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify(normalizeNotePayload(note)),
    },
  );

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res.json();
};

export const rejectApprovalRequest = async (
  approvalRequestId: number,
  rowVersion: number,
  note?: string | null,
) => {
  validatePositiveInteger(approvalRequestId, "Approval request");
  validatePositiveInteger(rowVersion, "Approval version");

  const res = await apiFetchResponse(`${API_URL}/${approvalRequestId}/reject`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(normalizeNotePayload(note)),
  });

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res.json();
};

export const getPendingLifecycleApprovalDetail = async (
  approvalRequestId: number,
): Promise<LifecycleApprovalDetail> => {
  validatePositiveInteger(approvalRequestId, "Approval request");

  const res = await apiFetchResponse(
    `${API_URL}/pending/${approvalRequestId}/lifecycle-detail`,
    { credentials: "include" },
  );

  if (!res.ok) {
    throw await parseApiError(res);
  }

  const response: { data: LifecycleApprovalDetail } = await res.json();
  return response.data;
};

export const updateApprovalWorkflowSetting = async (
  id: number,
  rowVersion: number,
  data: ApprovalWorkflowSettingForm,
) => {
  validatePositiveInteger(id, "Approval workflow");
  validatePositiveInteger(rowVersion, "Approval workflow version");

  const payload = {
    name: data.name.trim(),
    required_steps: Number(data.required_steps),
    is_active: Boolean(data.is_active),
  };

  const res = await apiFetchResponse(`${API_URL}/workflow-settings/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseApiError(res);
  }

  return res.json();
};
