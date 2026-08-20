export type LifecycleType = "ONBOARDING" | "EMPLOYMENT_CHANGE" | "OFFBOARDING";
export type LifecycleStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED";
export interface EmployeeLifecycleCase {
  id: number;
  employee_id: number;
  employee_name: string;
  lifecycle_type: LifecycleType;
  status: LifecycleStatus;
  effective_date: string;
  requested_by: number;
  requested_by_name: string;
  approval_request_id: number | null;
  reason: string | null;
  payload_json: Record<string, unknown>;
  approved_at: string | null;
  approved_by: number | null;
  completed_at: string | null;
  completed_by: number | null;
  cancelled_at: string | null;
  cancelled_by: number | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  row_version: number;
}
export interface EmployeeLifecycleTask {
  id: number;
  lifecycle_case_id: number;
  code: string;
  name: string;
  description: string | null;
  owner_scope: string;
  assignment_source: "EMPLOYEE" | "SUPERVISOR" | "ROLE" | "MANUAL" | null;
  assignment_role_code: string | null;
  assigned_employee_id: number | null;
  sequence_no: number;
  is_required: boolean;
  due_date: string | null;
  status: "PENDING" | "COMPLETED" | "SKIPPED";
  completed_at: string | null;
  completed_by: number | null;
  completion_note: string | null;
  row_version: number;
}
export interface EmployeeLifecycleEmploymentSnapshot {
  join_date: string | null;
  code: string | null;
  agency_name: string | null;
  branch_name: string | null;
  department_name: string | null;
  position_name: string | null;
  employment_status_name: string | null;
  supervisor_name: string | null;
  end_date: string | null;
  probation_end_date: string | null;
  confirmation_date: string | null;
  notes: string | null;
}
export interface EmployeeLifecycleEmploymentChangeDetail {
  previous: EmployeeLifecycleEmploymentSnapshot;
  proposed: EmployeeLifecycleEmploymentSnapshot;
}
export interface EmployeeLifecycleDetail {
  case: EmployeeLifecycleCase;
  tasks: EmployeeLifecycleTask[];
  employment_change: EmployeeLifecycleEmploymentChangeDetail | null;
}
export interface LifecycleApprovalDetail {
  case: EmployeeLifecycleCase;
  employment_change: EmployeeLifecycleEmploymentChangeDetail | null;
}
export interface EmployeeLifecycleAssignedTask {
  id: number;
  lifecycle_case_id: number;
  code: string;
  name: string;
  description: string | null;
  owner_scope: string;
  assignment_source: "EMPLOYEE" | "SUPERVISOR" | "ROLE" | "MANUAL" | null;
  assignment_role_code: string | null;
  employee_id: number;
  employee_name: string;
  lifecycle_type: LifecycleType;
  effective_date: string;
  due_date: string | null;
  row_version: number;
}
export interface EmploymentChangeProposal {
  join_date?: string | null;
  code?: string | null;
  agency_id?: number | null;
  branch_id?: number | null;
  department_id: number | null;
  position_id: number | null;
  employment_status_id: number | null;
  supervisor_employee_id?: number | null;
  end_date?: string | null;
  probation_end_date?: string | null;
  confirmation_date?: string | null;
  notes?: string | null;
}
export interface NewEmployeeLifecycleCase {
  employee_id: number;
  lifecycle_type: LifecycleType;
  effective_date: string;
  reason: string | null;
  payload_json: Record<string, unknown>;
}
