import dayjs from "dayjs";
import { RequestLeave } from "../types/request-leave";
import { ResponseTypeError } from "../types/response-type";

const API_URL = '/api/request-leave';

export const createRequestLeave = async (data: RequestLeave) => {
  const newData = {
    ...data,
    start_date: dayjs(data.start_date).format('YYYY-MM-DD'),
    end_date: dayjs(data.end_date).format('YYYY-MM-DD'),
    approved_by: null,
    approved_at: null,
    status: 'PENDING'
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

export const updateRequestLeave = async (id: number, rowVersion: number, data: RequestLeave) => {
  if (rowVersion <= -1)
    throw new Error('rowVersion is required');

  const updateData = {
    ...data,
    start_date: dayjs(data.start_date).format('YYYY-MM-DD'),
    end_date: dayjs(data.end_date).format('YYYY-MM-DD'),
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

export const deleteRequestLeave = async (id: number, rowVersion: number) => {
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

export const purgeRequestLeave = async (id: number) => {
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

export const restoreRequestLeave = async (id: number, rowVersion: number) => {
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

