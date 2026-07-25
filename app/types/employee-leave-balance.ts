export interface EmployeeLeaveBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  leave_type_name?: string | null;

  period_start: string;
  period_end: string;

  opening_balance: number;
  entitlement: number;
  taken: number;
  adjustment: number;
  closing_balance: number;
  expired_balance: number;

  created_at?: string;
  created_by?: number | null;
  updated_at?: string;
  updated_by?: number | null;
  deleted_at: string | null;
  deleted_by?: number | null;

  row_version: number;
}

export interface EmployeeLeaveBalanceForm {
  id: number;
  employee_id: number;
  leave_type_id: number;

  period_start: Date | null;
  period_end: Date | null;

  opening_balance: number;
  entitlement: number;
  taken: number;
  adjustment: number;
  closing_balance: number;
  expired_balance: number;

  deleted_at: string | null;
  row_version: number;
}
