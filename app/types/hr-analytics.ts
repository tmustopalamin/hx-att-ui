export interface HrAnalyticsOverview {
  active_employees: number;
  open_requisitions: number;
  active_candidates: number;
  pending_lifecycle_tasks: number;
  expiring_documents: number;
  expiring_certifications: number;
  assigned_assets: number;
  open_training_sessions: number;
  pending_training_enrollments: number;
  current_payroll_batches: number;
}

export interface HrAnalyticsFilters {
  departmentId: number | null;
  branchId: number | null;
}

export type HrAnalyticsAttentionKind =
  | "active_employees"
  | "pending_lifecycle_tasks"
  | "expiring_documents"
  | "expiring_certifications"
  | "assigned_assets"
  | "pending_training_enrollments";

export interface HrAnalyticsAttentionItem {
  id: number;
  employee_id: number | null;
  primary_label: string;
  secondary_label: string;
  due_date: string | null;
  status: string;
}
