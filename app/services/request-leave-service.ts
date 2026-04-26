import dayjs from "dayjs";

import { RequestLeaveForm } from "../types/request-leave";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/request-leave";

const parseErrorResponse = async (res: Response): Promise<ResponseTypeError> => {
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

const calculateWorkingDays = (startDate: Date | null, endDate: Date | null) => {
  if (!startDate || !endDate) {
    return 0;
  }

  const start = dayjs(startDate).startOf("day");
  const end = dayjs(endDate).startOf("day");

  if (end.isBefore(start, "day")) {
    return 0;
  }

  let totalDays = 0;
  let current = start;

  while (current.isBefore(end, "day") || current.isSame(end, "day")) {
    const day = current.day(); // 0 sunday, 6 saturday
    if (day !== 0 && day !== 6) {
      totalDays += 1;
    }
    current = current.add(1, "day");
  }

  return totalDays;
};

const buildPayload = (data: RequestLeaveForm) => {
  return {
    leave_type_id: Number(data.leave_type_id),
    employee_leave_balance_id: Number(data.employee_leave_balance_id),
    start_date: data.start_date
      ? dayjs(data.start_date).format("YYYY-MM-DD")
      : null,
    end_date: data.end_date
      ? dayjs(data.end_date).format("YYYY-MM-DD")
      : null,
    reason: (data.reason ?? "").trim(),
  };
};

const validateRowVersion = (rowVersion: number) => {
  if (rowVersion < 0 || Number.isNaN(rowVersion)) {
    throw new Error("rowVersion is required");
  }
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
  data: RequestLeaveForm
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

export const getPreviewWorkingDays = (
  startDate: Date | null,
  endDate: Date | null
) => {
  return calculateWorkingDays(startDate, endDate);
};