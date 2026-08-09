export interface RequestLeave {
  id: number;
  employee_id: number;
  leave_type_id: number;
  employee_leave_balance_id: number | null;

  leave_name?: string | null;
  approved_by?: number | null;
  approved_by_name?: string | null;

  start_date: string;
  end_date: string;
  total_days: number;

  reason: string | null;
  status: string;

  approved_at: string | null;

  approval_request_id?: number | null;
  submitted_at?: string | null;

  created_at?: string;
  created_by?: number | null;
  updated_at?: string;
  updated_by?: number | null;
  deleted_at: string | null;
  deleted_by?: number | null;

  row_version: number;

  requires_attachment?: boolean;
  attachment_count?: number;
}

export interface RequestLeaveForm {
  id: number;
  leave_type_id: number;
  employee_leave_balance_id: number | null;

  start_date: Date | null;
  end_date: Date | null;

  reason: string;
  total_days: number;

  attachment_file: File | null;

  deleted_at: string | null;
  row_version: number;
}

export interface RequestLeaveOptionType {
  id: number;
  code: string;
  name: string;
  is_paid: boolean;
  is_deductible: boolean;
  max_days: number | null;
  requires_attachment: boolean;
  requires_reason: boolean;
  requires_approval: boolean;
}

export interface RequestLeaveOptionBalance {
  id: number;
  employee_id: number;
  leave_type_id: number;
  leave_type_name: string | null;
  period_start: string;
  period_end: string;
  opening_balance: number;
  entitlement: number;
  taken: number;
  adjustment: number;
  closing_balance: number;
  expired_balance: number;
  deleted_at: string | null;
  row_version: number;
}

export interface RequestLeaveOptions {
  leave_types: RequestLeaveOptionType[];
  balances: RequestLeaveOptionBalance[];
}

export const defaultRequestLeaveFormValue: RequestLeaveForm = {
  id: 0,
  leave_type_id: 0,
  employee_leave_balance_id: null,
  start_date: null,
  end_date: null,
  reason: "",
  total_days: 0,
  attachment_file: null,
  deleted_at: null,
  row_version: 0,
};

export interface LeaveManagementRow {
  id: number;
  employee_id: number;
  employee_code: string | null;
  employee_name: string | null;

  leave_type_id: number;
  employee_leave_balance_id: number | null;
  leave_name: string | null;

  request_no: string | null;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string | null;
  status: string;

  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_reason: string | null;

  approval_request_id: number | null;
  submitted_at: string | null;

  requires_attachment: boolean;
  attachment_count: number;

  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
  deleted_at: string | null;
  deleted_by: number | null;
  row_version: number;
}
