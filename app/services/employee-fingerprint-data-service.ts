import { ResponseTypeError } from "../types/response-type";
import { EmployeeFingerprint } from "../types/employee-fingerprint";

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

export const createEmployeeFingerprint = async (data: EmployeeFingerprint) => {
  const res = await fetch(`${API_URL}/${data.employee_id}/fingerprint`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fp_device_id: data.fp_device_id,
      fp_pin: data.fp_pin,
      pin_already_exist: data.pin_already_exist,
      is_primary: data.is_primary,
    }),
  });

  await ensureOk(res);
  return res.json();
};

export const updateEmployeeFingerprint = async (
  id: number,
  rowVersion: number,
  data: EmployeeFingerprint
) => {
  if (rowVersion <= -1) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${data.employee_id}/fingerprint/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({
      fp_device_id: data.fp_device_id,
      fp_pin: data.fp_pin,
      pin_already_exist: data.pin_already_exist,
      is_primary: data.is_primary,
    }),
  });

  await ensureOk(res);
  return res.json();
};

export const deleteEmployeeFingerprint = async (
  id: number,
  data: EmployeeFingerprint
) => {
  if (data.row_version <= -1) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${data.employee_id}/fingerprint/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(data.row_version),
    },
  });

  await ensureOk(res);
  return res.json();
};

export const purgeEmployeeFingerprint = async (
  id: number,
  data: EmployeeFingerprint
) => {
  const res = await fetch(
    `${API_URL}/${data.employee_id}/fingerprint/${id}/purge`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  await ensureOk(res);
  return res.json();
};

export const restoreEmployeeFingerprint = async (
  id: number,
  data: EmployeeFingerprint
) => {
  const res = await fetch(
    `${API_URL}/${data.employee_id}/fingerprint/${id}/restore`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(data.row_version),
      },
    }
  );

  await ensureOk(res);
  return res.json();
};

export const checkPinEmployeeFingerprint = async (
  fp_device_id: number,
  fp_pin: string
) => {
  const body = {
    fp_device_id,
    pin: fp_pin,
  };

  const res = await fetch(`/api/fingerprint-scanner/get-user-by-pin`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  await ensureOk(res);
  return res.json();
};