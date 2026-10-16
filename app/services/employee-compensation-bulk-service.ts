import { apiFetchResponse } from "@/app/utils/api-client";
import {
  CompensationBulkImportRow,
  CompensationBulkUpsertResult,
} from "../types/employee-compensation-bulk";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/employees/compensation/bulk-upsert";

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

export const bulkUpsertEmployeeCompensations = async (
  rows: CompensationBulkImportRow[],
): Promise<CompensationBulkUpsertResult> => {
  // Clean rows to omit UI internal flags
  const cleanedRows = rows.map((r) => {
    const clean: any = { ...r };
    delete clean._row_number;
    delete clean._is_existing;
    delete clean._resolved_type;
    delete clean._validation_errors;
    delete clean.employee_name; // visual helper, backend resolves by code
    return clean;
  });

  const res = await apiFetchResponse(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ rows: cleanedRows }),
  });

  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(
      err.message || "Gagal memproses bulk upsert komponen kompensasi",
    );
  }

  return (await res.json()) as CompensationBulkUpsertResult;
};
