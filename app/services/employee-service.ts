import dayjs from "dayjs";
import { Employee } from "../types/employee";
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

export const createEmployee = async (data: Employee) => {
  const newData = {
    ...data,
    dob: dayjs(data.dob).format("YYYY-MM-DD"),
  };

  const res = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(newData),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};

export const uploadEmployeePhoto = async (
  employeeId: number | string,
  file: File
): Promise<{
  message: string;
}> => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/${employeeId}/photo/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};

export const deleteEmployee = async (id: number, rowVersion: number) => {
  if (rowVersion <= -1) {
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
    throw await parseError(res);
  }

  return res.json();
};

export const purgeEmployee = async (id: number) => {
  const res = await fetch(`${API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};

export const restoreEmployee = async (id: number, rowVersion: number) => {
  const res = await fetch(`${API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};