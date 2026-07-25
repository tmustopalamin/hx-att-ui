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

export interface CheckFingerprintPin2Result {
  exists: boolean;

  /**
   * PIN1 / Machine PIN / internal id dari mesin fingerprint.
   */
  pin: string | null;

  /**
   * PIN2 / Fingerprint User ID / custom HRIS user id.
   */
  pin2: string | null;

  /**
   * Nama user di mesin fingerprint.
   */
  name: string | null;
}

export interface CheckFingerprintPin2Response {
  success: boolean;
  data: CheckFingerprintPin2Result;
  message: string;
}

export const createEmployeeFingerprint = async (data: EmployeeFingerprint) => {
  const res = await fetch(`${API_URL}/${data.employee_id}/fingerprint`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fp_device_id: data.fp_device_id,

      // Sekarang ini berarti PIN2 / Fingerprint User ID.
      fp_pin: data.fp_pin,

      // true  = Link Existing User in Device
      // false = Create New User in Device
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
  data: EmployeeFingerprint,
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

      // Sekarang ini berarti PIN2 / Fingerprint User ID.
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
  data: EmployeeFingerprint,
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
  data: EmployeeFingerprint,
) => {
  const res = await fetch(
    `${API_URL}/${data.employee_id}/fingerprint/${id}/purge`,
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

export const restoreEmployeeFingerprint = async (
  id: number,
  data: EmployeeFingerprint,
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
    },
  );

  await ensureOk(res);
  return res.json();
};

/**
 * Check Fingerprint User ID / PIN2 in selected device.
 *
 * Endpoint lama /get-user-by-pin mencari berdasarkan PIN1.
 * Endpoint baru ini mencari berdasarkan PIN2 lewat GetAllUserInfo.
 */
export const checkPinEmployeeFingerprint = async (
  fp_device_id: number,
  fp_pin: string,
): Promise<CheckFingerprintPin2Response> => {
  const body = {
    fp_device_id,
    pin2: fp_pin,
  };

  const res = await fetch(`/api/fingerprint-scanner/check-user-pin2`, {
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
