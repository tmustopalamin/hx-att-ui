import { Employee } from "./employee";

export interface RotationRule {
  sequence: number;
  shift: string;
  duration: number;
};

export interface EmployeeShiftRule {
    id: number;
    employee_id: number[] | Employee[];
    base_shift_id: number;
    is_rotation: boolean;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
    rules: RotationRule[];
}