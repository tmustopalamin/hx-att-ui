import { apiFetchResponse } from "@/app/utils/api-client";

import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/overtime-management";

export interface MassOvertimePayload {
  overtime_date: string;
  requested_start_at: string;
  requested_end_at: string;
  reason: string | null;
  department_id: number | null;
  position_id: number | null;
}

export interface MassOvertimeTarget {
  id: number;
  full_name: string;
  department_id: number;
  department_name: string;
  position_id: number;
  position_name: string;
  supervisor_employee_id: number | null;
  has_active_request: boolean;
  validation_error: string | null;
}

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
  if (
    rowVersion === null ||
    rowVersion === undefined ||
    Number.isNaN(Number(rowVersion)) ||
    rowVersion < 0
  ) {
    throw new Error("rowVersion is required");
  }
};

export const approveOvertimeManagement = async (
  id: number,
  rowVersion: number,
  note?: string,
) => {
  validateRowVersion(rowVersion);

  const res = await apiFetchResponse(`${API_URL}/${id}/approve`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({
      note: note?.trim() || null,
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const rejectOvertimeManagement = async (
  id: number,
  rowVersion: number,
  note: string,
) => {
  validateRowVersion(rowVersion);

  const res = await apiFetchResponse(`${API_URL}/${id}/reject`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({
      note: note.trim(),
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

const parseJson = async (res: Response) => {
  const contentType = res.headers.get("Content-Type") ?? "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return {
    success: false,
    code: String(res.status),
    message: await res.text(),
  };
};

export const previewMassOvertime = async (payload: MassOvertimePayload) => {
  const res = await apiFetchResponse(`${API_URL}/mass/preview`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw data;
  return data as MassOvertimeTarget[];
};

export const createMassOvertime = async (payload: MassOvertimePayload) => {
  const res = await apiFetchResponse(`${API_URL}/mass`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson(res);
  if (!res.ok) throw data;
  return data;
};
