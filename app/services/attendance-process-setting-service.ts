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
    | "auto_process_enabled"
    | "process_interval_minutes"
    | "lookback_days"
    | "mobile_attendance_enabled"
    | "mobile_attendance_require_photo"
    | "mobile_attendance_require_location"
    | "mobile_attendance_max_photo_bytes"
    | "mobile_attendance_max_gps_accuracy_meters"
    | "mobile_attendance_max_event_age_seconds"
    | "mobile_attendance_min_submission_interval_seconds"
    | "mobile_attendance_geofence_latitude"
    | "mobile_attendance_geofence_longitude"
    | "mobile_attendance_geofence_radius_meters"
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
      mobile_attendance_enabled: data.mobile_attendance_enabled,
      mobile_attendance_require_photo: data.mobile_attendance_require_photo,
      mobile_attendance_require_location:
        data.mobile_attendance_require_location,
      mobile_attendance_max_photo_bytes: data.mobile_attendance_max_photo_bytes,
      mobile_attendance_max_gps_accuracy_meters:
        data.mobile_attendance_max_gps_accuracy_meters,
      mobile_attendance_max_event_age_seconds:
        data.mobile_attendance_max_event_age_seconds,
      mobile_attendance_min_submission_interval_seconds:
        data.mobile_attendance_min_submission_interval_seconds,
      mobile_attendance_geofence_latitude:
        data.mobile_attendance_geofence_latitude,
      mobile_attendance_geofence_longitude:
        data.mobile_attendance_geofence_longitude,
      mobile_attendance_geofence_radius_meters:
        data.mobile_attendance_geofence_radius_meters,
    }),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};
