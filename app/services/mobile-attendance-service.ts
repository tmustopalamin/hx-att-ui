import { apiFetchResponse } from "@/app/utils/api-client";

import { MobileAttendancePayload } from "../types/mobile-attendance";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/attendance-log/mobile";

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

export const submitMobileAttendance = async (data: MobileAttendancePayload) => {
  const res = await apiFetchResponse(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};
