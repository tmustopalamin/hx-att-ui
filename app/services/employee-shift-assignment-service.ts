import { apiFetchResponse } from "@/app/utils/api-client";

import dayjs from "dayjs";
import {
  EmployeeShiftAssignment,
  EmployeeShiftAssignmentPreviewRequest,
  EmployeeShiftAssignmentPreviewResponse,
  NewEmployeeShiftAssignment,
} from "../types/employee-shift-assignment";
import { ResponseType, ResponseTypeError } from "../types/response-type";

const API_URL = "/api/employee-shift-assignment";

const parseError = async (res: Response): Promise<ResponseTypeError> => {
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

const ensureOk = async (res: Response) => {
  if (!res.ok) {
    throw await parseError(res);
  }
};

export const createEmployeeShiftAssignment = async (
  data: NewEmployeeShiftAssignment,
) => {
  const res = await apiFetchResponse(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  await ensureOk(res);
  return res.json();
};

export const previewEmployeeShiftAssignment = async (
  data: EmployeeShiftAssignmentPreviewRequest,
): Promise<ResponseType<EmployeeShiftAssignmentPreviewResponse>> => {
  const res = await apiFetchResponse(`${API_URL}/preview`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  await ensureOk(res);
  return (await res.json()) as ResponseType<EmployeeShiftAssignmentPreviewResponse>;
};

export const updateEmployeeShiftAssignment = async (
  id: number,
  rowVersion: number,
  data: EmployeeShiftAssignment,
) => {
  if (rowVersion <= -1) {
    throw new Error("rowVersion is required");
  }

  const updateData = {
    ...data,
    shift_date: data.shift_date
      ? dayjs(data.shift_date).format("YYYY-MM-DD")
      : null,
  };

  const res = await apiFetchResponse(`${API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(updateData),
  });

  await ensureOk(res);
  return res.json();
};

export const deleteEmployeeShiftAssignment = async (
  id: number,
  rowVersion: number,
) => {
  if (rowVersion <= -1) {
    throw new Error("rowVersion is required");
  }

  const res = await apiFetchResponse(`${API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  await ensureOk(res);
  return res.json();
};

export const purgeEmployeeShiftAssignment = async (id: number) => {
  const res = await apiFetchResponse(`${API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  await ensureOk(res);
  return res.json();
};

export const restoreEmployeeShiftAssignment = async (
  id: number,
  rowVersion: number,
) => {
  const res = await apiFetchResponse(`${API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  await ensureOk(res);
  return res.json();
};
