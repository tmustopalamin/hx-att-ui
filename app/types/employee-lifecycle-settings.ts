export type LifecycleAssignmentSource =
  "EMPLOYEE" | "SUPERVISOR" | "ROLE" | "MANUAL";

export interface EmployeeLifecycleTypeSetting {
  lifecycle_type: "ONBOARDING" | "EMPLOYMENT_CHANGE" | "OFFBOARDING";
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface EmployeeLifecycleAssigneeOption {
  employee_id: number;
  name: string;
  username: string;
  role_code: string;
}

export interface EmployeeLifecycleChecklistItemSetting {
  id: number;
  checklist_template_id: number;
  code: string;
  name: string;
  description: string | null;
  owner_scope: string;
  assignment_source: LifecycleAssignmentSource;
  assignment_role_code: string | null;
  primary_assignee_employee_id: number | null;
  primary_assignee_name: string | null;
  sequence_no: number;
  is_required: boolean;
  due_offset_days: number | null;
  reminder_days_before: number | null;
  notify_on_activation: boolean;
  is_active: boolean;
  row_version: number;
}

export interface EmployeeLifecycleChecklistTemplateSetting {
  id: number;
  lifecycle_type: "ONBOARDING" | "EMPLOYMENT_CHANGE" | "OFFBOARDING";
  code: string;
  name: string;
  description: string | null;
  version_no: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  row_version: number;
  items: EmployeeLifecycleChecklistItemSetting[];
}

export interface EmployeeLifecycleSettings {
  types: EmployeeLifecycleTypeSetting[];
  templates: EmployeeLifecycleChecklistTemplateSetting[];
}

export interface EmployeeLifecycleChecklistItemInput {
  code: string;
  name: string;
  description: string | null;
  sequence_no: number;
  is_required: boolean;
  owner_scope: string;
  assignment_source: LifecycleAssignmentSource;
  assignment_role_code: string | null;
  primary_assignee_employee_id: number | null;
  due_offset_days: number | null;
  reminder_days_before: number | null;
  notify_on_activation: boolean;
  is_active: boolean;
}

export interface EmployeeLifecycleChecklistTemplateInput {
  lifecycle_type: EmployeeLifecycleChecklistTemplateSetting["lifecycle_type"];
  code: string;
  name: string;
  description: string | null;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  items: EmployeeLifecycleChecklistItemInput[];
}
