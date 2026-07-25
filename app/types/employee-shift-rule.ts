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
  is_active: boolean;
  effective_from: Date;
  effective_to: Date | null;
  deleted_at: string;
  row_version: number;
}

export interface RotationRuleFromApi {
  id: number;
  rule_id: number;
  sequence_no: number;
  shift_id: number;
  duration_days: number;
}
