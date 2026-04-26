import { EmployeeLeaveBalanceForm } from "@/app/types/employee-leave-balance";
import { ResponseTypeError } from "@/app/types/response-type";
import dayjs from "dayjs";

const API_URL = "/api/employees";

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

const calculateClosingBalance = (data: {
  opening_balance: number;
  entitlement: number;
  taken: number;
  adjustment: number;
  expired_balance: number;
}) => {
  return (
    Number(data.opening_balance || 0) +
    Number(data.entitlement || 0) +
    Number(data.adjustment || 0) -
    Number(data.taken || 0) -
    Number(data.expired_balance || 0)
  );
};

const buildPayload = (employeeId: number, data: EmployeeLeaveBalanceForm) => {
  return {
    id: data.id ?? 0,
    employee_id: employeeId,
    leave_type_id: Number(data.leave_type_id),
    period_start: data.period_start ? dayjs(data.period_start).format("YYYY-MM-DD") : null,
    period_end: data.period_end ? dayjs(data.period_end).format("YYYY-MM-DD") : null,
    opening_balance: Number(data.opening_balance || 0),
    entitlement: Number(data.entitlement || 0),
    taken: Number(data.taken || 0),
    adjustment: Number(data.adjustment || 0),
    closing_balance: calculateClosingBalance({
      opening_balance: Number(data.opening_balance || 0),
      entitlement: Number(data.entitlement || 0),
      taken: Number(data.taken || 0),
      adjustment: Number(data.adjustment || 0),
      expired_balance: Number(data.expired_balance || 0),
    }),
    expired_balance: Number(data.expired_balance || 0),
  };
};

export const createEmployeeLeaveBalance = async (
  employeeId: number,
  data: EmployeeLeaveBalanceForm
) => {
  const payload = buildPayload(employeeId, data);

  const res = await fetch(`${API_URL}/${employeeId}/leave-balance`, {
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

export const updateEmployeeLeaveBalance = async (
  employeeId: number,
  id: number,
  rowVersion: number,
  data: EmployeeLeaveBalanceForm
) => {
  if (rowVersion <= 0) {
    throw new Error("rowVersion is required");
  }

  const payload = buildPayload(employeeId, data);

  const res = await fetch(`${API_URL}/${employeeId}/leave-balance/${id}`, {
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

export const deleteEmployeeLeaveBalance = async (
  employeeId: number,
  id: number,
  rowVersion: number
) => {
  if (rowVersion <= 0) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${employeeId}/leave-balance/${id}`, {
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

export const purgeEmployeeLeaveBalance = async (
  employeeId: number,
  id: number
) => {
  const res = await fetch(`${API_URL}/${employeeId}/leave-balance/${id}/purge`, {
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

export const restoreEmployeeLeaveBalance = async (
  employeeId: number,
  id: number,
  rowVersion: number
) => {
  if (rowVersion <= 0) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${employeeId}/leave-balance/${id}/restore`, {
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