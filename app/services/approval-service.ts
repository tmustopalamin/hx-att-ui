import {
  ApprovalActionPayload,
  ApprovalWorkflowSettingForm,
} from "../types/approval";
import { LifecycleApprovalDetail } from "../types/employee-lifecycle";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/approval";

const parseErrorResponse = async (
  res: Response,
): Promise<ResponseTypeError> => {
  const contentType = res.headers.get("Content-Type");

  try {
    if (contentType && contentType.includes("application/json")) {
      return (await res.json()) as ResponseTypeError;
    }

    return {
      success: false,
      code: String(res.status),
      message: await res.text(),
    };
  } catch {
    return {
      success: false,
      code: String(res.status),
      message: "Unknown error",
    };
  }
};

const validateRowVersion = (rowVersion: number) => {
  if (rowVersion <= 0 || Number.isNaN(rowVersion)) {
    throw new Error("rowVersion is required");
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
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${approvalRequestId}/approve`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(normalizeNotePayload(note)),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const rejectApprovalRequest = async (
  approvalRequestId: number,
  rowVersion: number,
  note?: string | null,
) => {
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${approvalRequestId}/reject`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(normalizeNotePayload(note)),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const getPendingLifecycleApprovalDetail = async (
  approvalRequestId: number,
): Promise<LifecycleApprovalDetail> => {
  const res = await fetch(
    `${API_URL}/pending/${approvalRequestId}/lifecycle-detail`,
    { credentials: "include" },
  );

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const response: { data: LifecycleApprovalDetail } = await res.json();
  return response.data;
};

export const updateApprovalWorkflowSetting = async (
  id: number,
  rowVersion: number,
  data: ApprovalWorkflowSettingForm,
) => {
  validateRowVersion(rowVersion);

  const payload = {
    name: data.name.trim(),
    required_steps: Number(data.required_steps),
    is_active: Boolean(data.is_active),
  };

  const res = await fetch(`${API_URL}/workflow-settings/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};
