import { apiFetchResponse } from "@/app/utils/api-client";
import {
  BatchAttendanceResolutionRequest,
  BatchAttendanceResolutionResponse,
} from "../types/attendance-resolution";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/attendance-summary/resolve";

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

export const resolveAttendanceIncompletion = async (
  payload: BatchAttendanceResolutionRequest,
): Promise<{
  success: boolean;
  data: BatchAttendanceResolutionResponse;
  message: string;
}> => {
  const res = await apiFetchResponse(API_URL, {
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
