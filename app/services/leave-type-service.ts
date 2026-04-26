import { LeaveType } from "../types/leave-type";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/leave-type";

type LeaveTypePayload = {
  code: string;
  name: string;
  description: string;
  is_paid: boolean;
  is_deductible: boolean;
  max_days: number | null;
  carry_forward: boolean;
  is_active: boolean;
  requires_attachment: boolean;
  requires_reason: boolean;
  requires_approval: boolean;
};

const normalizeText = (value?: string | null) => {
  return (value ?? "").trim();
};

const normalizeCode = (value?: string | null) => {
  return normalizeText(value).toUpperCase().replace(/\s+/g, "_");
};

const buildLeaveTypePayload = (data: LeaveType): LeaveTypePayload => {
  const normalizedMaxDays =
    data.max_days === null || data.max_days === undefined || Number.isNaN(Number(data.max_days))
      ? null
      : Number(data.max_days);

  return {
    code: normalizeCode(data.code),
    name: normalizeText(data.name),
    description: normalizeText(data.description),
    is_paid: !!data.is_paid,
    is_deductible: !!data.is_deductible,
    max_days: normalizedMaxDays,
    carry_forward: !!data.carry_forward,
    is_active: !!data.is_active,
    requires_attachment: !!data.requires_attachment,
    requires_reason: !!data.requires_reason,
    requires_approval: !!data.requires_approval,
  };
};

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

export const createLeaveType = async (data: LeaveType) => {
  const payload = buildLeaveTypePayload(data);

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

export const updateLeaveType = async (id: number, rowVersion: number, data: LeaveType) => {
  if (rowVersion <= 0) {
    throw new Error("rowVersion is required");
  }

  const payload = buildLeaveTypePayload(data);

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

export const deleteLeaveType = async (id: number, rowVersion: number) => {
  if (rowVersion <= 0) {
    throw new Error("rowVersion is required");
  }

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

export const purgeLeaveType = async (id: number) => {
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

export const restoreLeaveType = async (id: number, rowVersion: number) => {
  if (rowVersion <= 0) {
    throw new Error("rowVersion is required");
  }

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