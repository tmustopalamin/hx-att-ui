import { Employee } from "./employee";

export interface RotationRule {
  sequence_no: number;
  shift_id: string;
  duration_days: number;
}

export interface EmployeeShiftRule {
  id: number;
  employee_id: number;
  shift_rule_id: number;

  effective_from: string;
  effective_to: string | null;

  is_active: boolean;
  deleted_at: string | null;
  row_version: number;

  employee_name?: string | null;
  shift_rule_name?: string | null;
}

export interface RotationRuleFromApi {
  id: number;
  rule_id: number;
  sequence_no: number;
  shift_id: number;
  duration_days: number;
}
