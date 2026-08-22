import { apiFetchResponse } from "@/app/utils/api-client";

import type {
  AttendanceProcessingSetting,
  AttendanceSubmissionPolicy,
  UpdateAttendanceProcessingSetting,
  UpdateAttendanceSubmissionPolicy,
} from "../types/attendance-settings";
import { ResponseTypeError } from "../types/response-type";

const PROCESSING_API_URL = "/api/attendance-settings/processing";
const POLICY_API_URL = "/api/attendance-settings/submission-policy";

const parseError = async (res: Response): Promise<ResponseTypeError> => {
  const contentType = res.headers.get("Content-Type");

  try {
    if (contentType?.includes("application/json")) {
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

const getJson = async <T>(url: string): Promise<T> => {
  const res = await apiFetchResponse(url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
};

const putJson = async <T>(
  url: string,
  data: unknown,
  rowVersion: number,
): Promise<T> => {
  const res = await apiFetchResponse(url, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<T>;
};

export const getAttendanceProcessingSetting = () =>
  getJson<{
    success: boolean;
    data: AttendanceProcessingSetting;
    message: string;
  }>(PROCESSING_API_URL);

export const updateAttendanceProcessingSetting = (
  data: UpdateAttendanceProcessingSetting,
  rowVersion: number,
) =>
  putJson<{
    success: boolean;
    data: AttendanceProcessingSetting;
    message: string;
  }>(PROCESSING_API_URL, data, rowVersion);

export const getAttendanceSubmissionPolicy = () =>
  getJson<{
    success: boolean;
    data: AttendanceSubmissionPolicy;
    message: string;
  }>(POLICY_API_URL);

export const updateAttendanceSubmissionPolicy = (
  data: UpdateAttendanceSubmissionPolicy,
  rowVersion: number,
) =>
  putJson<{
    success: boolean;
    data: AttendanceSubmissionPolicy;
    message: string;
  }>(POLICY_API_URL, data, rowVersion);
