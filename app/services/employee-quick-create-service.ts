import {
  QuickCreateEmployeePayload,
  QuickCreateEmployeeResult,
} from "../types/employee-quick-create";
import { ResponseType, ResponseTypeError } from "../types/response-type";

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

export const quickCreateEmployee = async (
  payload: QuickCreateEmployeePayload,
): Promise<ResponseType<QuickCreateEmployeeResult>> => {
  const res = await fetch(`${API_URL}/quick-create`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};
