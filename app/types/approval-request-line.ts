export interface ApprovalRequestLine {
  id: number;
  approval_request_id: number;
  step_no: number;
  position_id: number;
  approver_employee_id: number;
  status: string;
  acted_at: Date | null;
  leave_name: string;
  reason: string;
  start_date: Date | null;
  end_date: Date | null;
}

export interface ApprovalDocumentDetail {
  document_type_id: number;
  employee_name: string | null;
  employee_leave_balance_name: string | null;
  leave_type_name: string | null;
  start_date: string | null;
  end_date: string | null;
  total_days: number | null;
  reason: string | null;
  status: string;
  approved_by_name: string | null;
  approved_at: string | null;
}
