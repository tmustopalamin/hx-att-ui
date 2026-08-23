export type AttendanceConflictPolicy = "BLOCK" | "OVERWRITE_AND_REPROCESS";

export interface EmployeeScheduleChangeRequest {
  employee_ids: number[];
  shift_rule_id: number;
  effective_from: string;
  effective_to: string;
  attendance_conflict_policy: AttendanceConflictPolicy;
  generate_through?: string | null;
  preview_fingerprint?: string | null;
}

export interface EmployeeScheduleChangeTimelineSegment {
  shift_rule_id: number;
  effective_from: string;
  effective_to: string | null;
  rotation_anchor_date: string;
}

export interface EmployeeScheduleChangeConflict {
  employee_id: number | null;
  date: string | null;
  code: string;
  message: string;
}

export interface EmployeeScheduleChangeEmployeePreview {
  employee_id: number;
  schedule_through: string;
  timeline: EmployeeScheduleChangeTimelineSegment[];
  rule_segments_to_create: number;
  rule_segments_to_archive: number;
  assignments_to_insert: number;
  assignments_to_update: number;
  assignments_to_archive: number;
}

export interface EmployeeScheduleChangeTotals {
  employees: number;
  rule_segments_to_create: number;
  rule_segments_to_archive: number;
  assignments_to_insert: number;
  assignments_to_update: number;
  assignments_to_archive: number;
  attendance_rows_to_reprocess: number;
}

export interface EmployeeScheduleChangePreviewResponse {
  fingerprint: string;
  can_apply: boolean;
  employees: EmployeeScheduleChangeEmployeePreview[];
  conflicts: EmployeeScheduleChangeConflict[];
  totals: EmployeeScheduleChangeTotals;
}
