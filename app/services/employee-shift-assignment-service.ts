import dayjs from "dayjs";
import { EmployeeShiftAssignment, EmployeeShiftAssignmentBulkObj } from "../types/employee-shift-assignment";
import { ResponseTypeError } from "../types/response-type";

const API_URL = '/api/employee-shift-assignment';

export const createEmployeeShiftAssignment = async (data: EmployeeShiftAssignment) => {
  let newData = {}

  if(data.is_bulk) {
      const data_bulk = {
        ...data,
        shift_date: dayjs(data.shift_date).isValid() ? data.shift_date : dayjs().format("YYYY-MM-DD"),
        bulk_data: data.bulk_data?.map((i: EmployeeShiftAssignmentBulkObj) => ({
          ...i,
          start_date: dayjs(i.start_date).format("YYYY-MM-DD"),
          end_date: dayjs(i.end_date).format("YYYY-MM-DD")
        }))
      }
      newData = data_bulk
  }else{
    newData = {
      ...data,
      shift_date: dayjs(data.shift_date).format('YYYY-MM-DD'),
    }
  }

  const res = await fetch(API_URL, {
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

export const updateEmployeeShiftAssignment = async (id: number, rowVersion: number, data: EmployeeShiftAssignment) => {
  if (rowVersion <= -1)
    throw new Error('rowVersion is required');

  const updateData = {
    ...data,
    shift_date: dayjs(data.shift_date).format('YYYY-MM-DD'),
  }

  const res = await fetch(`${API_URL}/${id}`, {
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

export const deleteEmployeeShiftAssignment = async (id: number, rowVersion: number) => {
  if (rowVersion <= -1)
    throw new Error('rowVersion is required');

  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      'If-Match': String(rowVersion),
    },
  });
  if (!res.ok) {
      const errorData: ResponseTypeError = await res.json();
      throw errorData;
  }
  return res.json();
}

export const purgeEmployeeShiftAssignment = async (id: number) => {
  const res = await fetch(`${API_URL}/${id}/purge`, {
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

export const restoreEmployeeShiftAssignment = async (id: number, rowVersion: number) => {
  const res = await fetch(`${API_URL}/${id}/restore`, {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
      'If-Match': String(rowVersion),
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

