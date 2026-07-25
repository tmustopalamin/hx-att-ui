import dayjs from "dayjs";

import { RequestLeaveForm } from "../types/request-leave";
import { ResponseTypeError } from "../types/response-type";
import { RequestLeaveApprovalDetail } from "../types/request-leave-approval-detail";

const API_URL = "/api/request-leave";

type PreviewLeaveDaysResponse = {
  success: boolean;
  data: {
    start_date: string;
    end_date: string;
    calendar_days: number;
    weekend_days: number;
    holiday_days: number;
    total_days: number;
  };
  message: string;
};

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

const toOptionalNumber = (value: number | null | undefined): number | null => {
  const numericValue = Number(value ?? 0);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const buildPayload = (data: RequestLeaveForm) => {
  return {
    leave_type_id: Number(data.leave_type_id),
    employee_leave_balance_id: toOptionalNumber(data.employee_leave_balance_id),
    start_date: data.start_date
      ? dayjs(data.start_date).format("YYYY-MM-DD")
      : null,
    end_date: data.end_date ? dayjs(data.end_date).format("YYYY-MM-DD") : null,
    reason: (data.reason ?? "").trim(),
  };
};

const validateRowVersion = (rowVersion: number) => {
  if (rowVersion < 0 || Number.isNaN(rowVersion)) {
    throw new Error("rowVersion is required");
  }
};

export const previewRequestLeaveDays = async (
  startDate: Date | null,
  endDate: Date | null,
) => {
  if (!startDate || !endDate) {
    return {
      start_date: null,
      end_date: null,
      calendar_days: 0,
      weekend_days: 0,
      holiday_days: 0,
      total_days: 0,
    };
  }

  const res = await fetch(`${API_URL}/preview-days`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      start_date: dayjs(startDate).format("YYYY-MM-DD"),
      end_date: dayjs(endDate).format("YYYY-MM-DD"),
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  const response = (await res.json()) as PreviewLeaveDaysResponse;

  return response.data;
};

export const getPreviewWorkingDays = async (
  startDate: Date | null,
  endDate: Date | null,
) => {
  const result = await previewRequestLeaveDays(startDate, endDate);
  return result.total_days;
};

export const createRequestLeave = async (data: RequestLeaveForm) => {
  const payload = buildPayload(data);

  const res = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const updateRequestLeave = async (
  id: number,
  rowVersion: number,
  data: RequestLeaveForm,
) => {
  validateRowVersion(rowVersion);

  const payload = buildPayload(data);

  const res = await fetch(`${API_URL}/${id}`, {
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

export const submitRequestLeave = async (id: number, rowVersion: number) => {
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${id}/submit`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const deleteRequestLeave = async (id: number, rowVersion: number) => {
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const purgeRequestLeave = async (id: number) => {
  const res = await fetch(`${API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const restoreRequestLeave = async (id: number, rowVersion: number) => {
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const approveRequestLeave = async (id: number, rowVersion: number) => {
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${id}/approve`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const rejectRequestLeave = async (id: number, rowVersion: number) => {
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${id}/reject`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const getRequestLeaveApprovalDetail = async (
  requestLeaveId: number,
): Promise<RequestLeaveApprovalDetail> => {
  const res = await fetch(`${API_URL}/${requestLeaveId}/approval-detail`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};
