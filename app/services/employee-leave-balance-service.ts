import dayjs from "dayjs";
import { EmployeeLeaveBalance } from "../types/employee-leave-balance";
import { ResponseTypeError } from "../types/response-type";

const API_URL = '/api/employees';

export const createEmployeeLeaveBalance = async (data: EmployeeLeaveBalance) => {
  const newData = {
    ...data,
    period_start: dayjs(data.period_start).format('YYYY-MM-DD'),
    period_end: dayjs(data.period_end).format('YYYY-MM-DD'),
  }

  console.log(newData, 'adaw');

  const res = await fetch(`${API_URL}/${data.employee_id}/leave-balance`, {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newData)    
  });

  const contentType = res.headers.get("Content-Type");
  if (!res.ok) {
    let errorDetail: ResponseTypeError;

    try {
      if (contentType && contentType.includes("application/json")) {
        errorDetail = (await res.json()) as ResponseTypeError;
      } else {
        errorDetail = {
          success: false,
          code: String(res.status),
          message: await res.text(),
        };
      }
    } catch {
      errorDetail = {
        success: false,
        code: String(res.status),
        message: "Unknown error",
      };
    }
    throw errorDetail;
  }

  return res.json();
}

export const updateEmployeeLeaveBalance = async (id: number, rowVersion: number, data: EmployeeLeaveBalance) => {
  if (rowVersion <= -1)
    throw new Error('rowVersion is required');

  const updateData = {
    ...data,
    period_start: dayjs(data.period_start).format('YYYY-MM-DD'),
    period_end: dayjs(data.period_end).format('YYYY-MM-DD'),
  }

  const res = await fetch(`${API_URL}/${data.employee_id}/leave-balance/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': String(rowVersion),
    },
    body: JSON.stringify(updateData)
  });
  if (!res.ok) {
      const errorData: ResponseTypeError = await res.json();
      throw errorData;
  }
  return res.json();
}

export const deleteEmployeeLeaveBalance = async (id: number, data: EmployeeLeaveBalance) => {
  if (data.row_version <= -1)
    throw new Error('rowVersion is required');

  const res = await fetch(`${API_URL}/${data.employee_id}/leave-balance/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      'If-Match': String(data.row_version),
    },
  });
  if (!res.ok) {
      const errorData: ResponseTypeError = await res.json();
      throw errorData;
  }
  return res.json();
}

export const purgeEmployeeLeaveBalance = async (id: number, data: EmployeeLeaveBalance) => {
  const res = await fetch(`${API_URL}/${data.employee_id}/leave-balance/${id}/purge`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
      const errorData: ResponseTypeError = await res.json();
      throw errorData;
  }
  return res.json();
}

export const restoreEmployeeLeaveBalance = async (id: number, data: EmployeeLeaveBalance) => {
  const res = await fetch(`${API_URL}/${data.employee_id}/leave-balance/${id}/restore`, {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      'If-Match': String(data.row_version),
    },
  });

  const contentType = res.headers.get("Content-Type");
  if (!res.ok) {
    let errorDetail: ResponseTypeError;

    try {
      if (contentType && contentType.includes("application/json")) {
        errorDetail = (await res.json()) as ResponseTypeError;
      } else {
        errorDetail = {
          success: false,
          code: String(res.status),
          message: await res.text(),
        };
      }
    } catch {
      errorDetail = {
        success: false,
        code: String(res.status),
        message: "Unknown error",
      };
    }
    throw errorDetail;
  }

  return res.json();
}

