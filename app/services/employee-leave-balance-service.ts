import { apiFetchResponse } from "@/app/utils/api-client";

import dayjs from "dayjs";
import {
  EmployeeLeaveBalance,
  EmployeeLeaveBalanceForm,
} from "../types/employee-leave-balance";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/employees";

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

const buildPayload = (data: EmployeeLeaveBalanceForm) => {
  return {
    ...data,
    period_start: data.period_start
      ? dayjs(data.period_start).format("YYYY-MM-DD")
      : null,
    period_end: data.period_end
      ? dayjs(data.period_end).format("YYYY-MM-DD")
      : null,
  };
};

export const createEmployeeLeaveBalance = async (
  data: EmployeeLeaveBalanceForm,
) => {
  const res = await apiFetchResponse(
    `${API_URL}/${data.employee_id}/leave-balance`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildPayload(data)),
    },
  );

  await ensureOk(res);
  return res.json();
};

export const updateEmployeeLeaveBalance = async (
  id: number,
  rowVersion: number,
  data: EmployeeLeaveBalanceForm,
) => {
  if (rowVersion <= -1) {
    throw new Error("rowVersion is required");
  }

  const res = await apiFetchResponse(
    `${API_URL}/${data.employee_id}/leave-balance/${id}`,
    {
      method: "PUT",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify(buildPayload(data)),
    },
  );

  await ensureOk(res);
  return res.json();
};

export const deleteEmployeeLeaveBalance = async (
  id: number,
  data: EmployeeLeaveBalance,
) => {
  if (data.row_version <= -1) {
    throw new Error("rowVersion is required");
  }

  const res = await apiFetchResponse(
    `${API_URL}/${data.employee_id}/leave-balance/${id}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(data.row_version),
      },
    },
  );

  await ensureOk(res);
  return res.json();
};

export const purgeEmployeeLeaveBalance = async (
  id: number,
  data: EmployeeLeaveBalance,
) => {
  const res = await apiFetchResponse(
    `${API_URL}/${data.employee_id}/leave-balance/${id}/purge`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  await ensureOk(res);
  return res.json();
};

export const restoreEmployeeLeaveBalance = async (
  id: number,
  data: EmployeeLeaveBalance,
) => {
  const res = await apiFetchResponse(
    `${API_URL}/${data.employee_id}/leave-balance/${id}/restore`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(data.row_version),
      },
    },
  );

  await ensureOk(res);
  return res.json();
};
