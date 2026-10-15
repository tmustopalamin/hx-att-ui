import { apiFetchResponse } from "@/app/utils/api-client";
import {
  EmployeeBulkImportRow,
  EmployeeBulkUpsertResult,
} from "../types/employee-bulk";
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
      message: "Terjadi kesalahan saat menghubungi server",
    };
  }
};

export const bulkUpsertEmployees = async (
  rows: EmployeeBulkImportRow[],
): Promise<EmployeeBulkUpsertResult> => {
  // Clean rows to omit UI internal flags
  const cleanedRows = rows.map((r) => {
    const clean = { ...r };
    delete clean._row_number;
    delete clean._is_existing;
    delete clean._validation_errors;
    return clean;
  });

  const res = await apiFetchResponse(`${API_URL}/bulk-upsert`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rows: cleanedRows }),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};
