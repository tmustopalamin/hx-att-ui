export interface AttendanceProcessingSetting {
  id: number;
  auto_process_enabled: boolean;
  process_interval_minutes: number;
  lookback_days: number;
  overtime_processing_mode: OvertimeProcessingMode;
  last_process_at: string | null;
  last_process_status: string | null;
  last_process_error: string | null;
  last_processed_count: number;
  updated_at: string;
  row_version: number;
}

export interface AttendanceSubmissionCommonPolicy {
  require_photo: boolean;
  require_location: boolean;
  max_photo_bytes: number;
  max_event_age_seconds: number;
  min_submission_interval_seconds: number;
  geofence_latitude: number | null;
  geofence_longitude: number | null;
  geofence_radius_meters: number | null;
}

export interface AttendanceWebPolicy {
  enabled: boolean;
  enforce_gps_accuracy: boolean;
  max_gps_accuracy_meters: number;
}

export interface AttendanceAndroidPolicy {
  enabled: boolean;
  enforce_gps_accuracy: boolean;
  max_gps_accuracy_meters: number;
  integrity_enabled: boolean;
  allow_unlicensed: boolean;
}

export interface AttendanceSubmissionPolicy {
  id: number;
  common: AttendanceSubmissionCommonPolicy;
  web: AttendanceWebPolicy;
  android: AttendanceAndroidPolicy;
  updated_at: string;
  updated_by: number | null;
  row_version: number;
}

export type UpdateAttendanceProcessingSetting = Pick<
  AttendanceProcessingSetting,
  | "auto_process_enabled"
  | "process_interval_minutes"
  | "lookback_days"
  | "overtime_processing_mode"
>;

export type OvertimeProcessingMode =
  "ACTUAL_LOGS_AND_APPROVAL" | "APPROVED_REQUEST_ONLY";

export type UpdateAttendanceSubmissionPolicy = Pick<
  AttendanceSubmissionPolicy,
  "common" | "web" | "android"
>;
