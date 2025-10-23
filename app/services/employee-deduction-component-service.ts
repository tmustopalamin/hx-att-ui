import dayjs from "dayjs";
import { ResponseTypeError } from "../types/response-type";
import { EmployeeDeductionComponent } from "../types/employee-deduction-component";

const API_URL = '/api/employees';

export const createEmployeeDeductionComponent = async (data: EmployeeDeductionComponent) => {
  const newData = {
    ...data,
    start_date: dayjs(data.start_date).isValid() ? dayjs(data.start_date).format('YYYY-MM-DD') : null,
    end_date: dayjs(data.end_date).isValid() ? dayjs(data.end_date).format('YYYY-MM-DD') : null,
  }

  console.log(newData, 'adaw');

  const res = await fetch(`${API_URL}/${data.employee_id}/deduction-component`, {
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

export const updateEmployeeDeductionComponent = async (id: number, rowVersion: number, data: EmployeeDeductionComponent) => {
  if (rowVersion <= -1)
    throw new Error('rowVersion is required');

  const updateData = {
    ...data,
    start_date: dayjs(data.start_date).isValid() ? dayjs(data.start_date).format('YYYY-MM-DD') : null,
    end_date: dayjs(data.end_date).isValid() ? dayjs(data.end_date).format('YYYY-MM-DD') : null,
  }

  const res = await fetch(`${API_URL}/${data.employee_id}/deduction-component/${id}`, {
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

export const deleteEmployeeDeductionComponent = async (id: number, data: EmployeeDeductionComponent) => {
  if (data.row_version <= -1)
    throw new Error('rowVersion is required');

  const res = await fetch(`${API_URL}/${data.employee_id}/deduction-component/${id}`, {
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

export const purgeEmployeeDeductionComponent = async (id: number, data: EmployeeDeductionComponent) => {
  const res = await fetch(`${API_URL}/${data.employee_id}/deduction-component/${id}/purge`, {
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

export const restoreEmployeeDeductionComponent = async (id: number, data: EmployeeDeductionComponent) => {
  const res = await fetch(`${API_URL}/${data.employee_id}/deduction-component/${id}/restore`, {
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

