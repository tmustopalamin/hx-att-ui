export interface AttendanceProcessSetting {
  id: number;

  auto_process_enabled: boolean;
  process_interval_minutes: number;
  lookback_days: number;
  overtime_processing_mode:
    "ACTUAL_LOGS_AND_APPROVAL" | "APPROVED_REQUEST_ONLY";

  mobile_attendance_enabled: boolean;
  mobile_attendance_require_photo: boolean;
  mobile_attendance_require_location: boolean;
  mobile_attendance_max_photo_bytes: number;
  mobile_attendance_max_gps_accuracy_meters: number;
  mobile_attendance_max_event_age_seconds: number;
  mobile_attendance_min_submission_interval_seconds: number;
  mobile_attendance_geofence_latitude: number | null;
  mobile_attendance_geofence_longitude: number | null;
  mobile_attendance_geofence_radius_meters: number | null;
  mobile_attendance_integrity_enabled: boolean;
  mobile_attendance_allow_unlicensed: boolean;

  last_process_at: string | null;
  last_process_status: string | null;
  last_process_error: string | null;
  last_processed_count: number;

  updated_at: string;
  row_version: number;
}
