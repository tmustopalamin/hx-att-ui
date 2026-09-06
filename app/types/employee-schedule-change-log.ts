import { EmployeeScheduleChangePreviewResponse } from "./employee-schedule-change";

export interface EmployeeScheduleChangeLogSummary {
  id: number;
  occurred_at: string;
  actor_user_id: number;
  actor_employee_id: number;
  actor_name: string;
  effective_from: string;
  effective_to: string;
  target_shift_rule_id: number;
  target_shift_rule_name: string;
  attendance_conflict_policy: string;
  preview_fingerprint: string;
  employee_count: number;
  changed_row_count: number;
  rule_segments_created: number;
  rule_segments_archived: number;
  assignments_inserted: number;
  assignments_updated: number;
  assignments_archived: number;
  attendance_rows_reprocessed: number;
}

export interface EmployeeScheduleChangeLogEntry {
  id: number;
  employee_id: number;
  employee_name: string;
  shift_date: string;
  change_type: "INSERT" | "UPDATE" | "ARCHIVE" | string;
  old_shift_id: number | null;
  old_shift_name: string | null;
  new_shift_id: number | null;
  new_shift_name: string | null;
}

export interface EmployeeScheduleChangeLogDetail extends EmployeeScheduleChangeLogSummary {
  preview_snapshot: EmployeeScheduleChangePreviewResponse;
  changes: EmployeeScheduleChangeLogEntry[];
}

export interface EmployeeScheduleChangeLogPage {
  data: EmployeeScheduleChangeLogSummary[];
  page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}
