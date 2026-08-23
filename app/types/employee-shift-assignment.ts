export interface EmployeeShiftAssignmentBulkObj {
  employee_id: number;
  shift_rule_id: number;
  start_date: Date | null;
  end_date: Date | null;
}

export interface EmployeeShiftAssignment {
  id: number;
  employee_id: number | null;
  employee_name: string | null;

  shift_id: number | null;
  shift_name: string | null;
  shift_date: Date | string | null;

  shift_rule_id?: number | null;
  source?: string | null;

  deleted_at: string | null;
  row_version: number;

  is_bulk: boolean;
  is_day_off: boolean;
  is_holiday: boolean;
  is_locked: boolean;

  bulk_data: EmployeeShiftAssignmentBulkObj[] | null;
}

export interface NewEmployeeShiftAssignment {
  employee_ids: number[];
  date_from: string;
  date_to: string | null;
  overwrite: boolean;
  row_version: number;
  preview_fingerprint?: string | null;
}

export type EmployeeShiftAssignmentPreviewStatus =
  | "READY_TO_GENERATE"
  | "ALREADY_COMPLETE"
  | "PARTIAL_CONFIGURATION"
  | "NO_ACTIVE_RULE";

export interface EmployeeShiftAssignmentPreviewRequest {
  employee_ids: number[];
  date_from: string;
  date_to: string | null;
  overwrite: boolean;
}

export interface EmployeeShiftAssignmentRulePreview {
  shift_rule_id: number;
  shift_rule_name: string | null;
  effective_from: string;
  effective_to: string | null;
}

export interface EmployeeShiftAssignmentEmployeePreview {
  employee_id: number;
  status: EmployeeShiftAssignmentPreviewStatus;
  rule_segments: EmployeeShiftAssignmentRulePreview[];
  period_days: number;
  existing_assignments: number;
  assignments_to_insert: number;
  assignments_to_update: number;
  assignments_unchanged: number;
  protected_assignments: number;
  unconfigured_days: number;
  will_process: boolean;
}

export interface EmployeeShiftAssignmentPreviewTotals {
  candidate_employees: number;
  employees_to_process: number;
  employees_skipped: number;
  assignments_to_insert: number;
  assignments_to_update: number;
  assignments_unchanged: number;
  protected_assignments: number;
  unconfigured_days: number;
}

export interface EmployeeShiftAssignmentPreviewResponse {
  fingerprint: string;
  resolved_date_to: string;
  can_apply: boolean;
  employees: EmployeeShiftAssignmentEmployeePreview[];
  totals: EmployeeShiftAssignmentPreviewTotals;
}
