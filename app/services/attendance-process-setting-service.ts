import { ResponseTypeError } from "../types/response-type";
import { AttendanceProcessSetting } from "../types/attendance-process-setting";

const API_URL = "/api/attendance-summary/auto-process-setting";

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

export const getAttendanceProcessSetting = async (): Promise<{
  success: boolean;
  data: AttendanceProcessSetting;
  message: string;
}> => {
  const res = await fetch(API_URL, {
    method: "GET",
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

export const updateAttendanceProcessSetting = async (
  data: Pick<
    AttendanceProcessSetting,
    "auto_process_enabled" | "process_interval_minutes" | "lookback_days"
  >,
): Promise<{
  success: boolean;
  data: AttendanceProcessSetting;
  message: string;
}> => {
  const res = await fetch(API_URL, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      auto_process_enabled: data.auto_process_enabled,
      process_interval_minutes: data.process_interval_minutes,
      lookback_days: data.lookback_days,
    }),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};
