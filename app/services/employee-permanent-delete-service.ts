import { apiFetchResponse } from "../utils/api-client";
import { ResponseType, ResponseTypeError } from "../types/response-type";

export interface PermanentDeleteEmployeePayload {
  password: string;
  confirmation_text: string;
  reason?: string;
}

export interface PermanentDeleteEmployeeResult {
  success: boolean;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  archive_id: number;
  message: string;
}

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
      message: "Terjadi kesalahan saat menghubungi server",
    };
  }
};

export const permanentDeleteEmployee = async (
  employeeId: number,
  payload: PermanentDeleteEmployeePayload,
): Promise<ResponseType<PermanentDeleteEmployeeResult>> => {
  const res = await apiFetchResponse(
    `/api/employees/${employeeId}/permanent-delete`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(
      err.message || "Gagal melakukan penghapusan permanen karyawan",
    );
  }

  return (await res.json()) as ResponseType<PermanentDeleteEmployeeResult>;
};
