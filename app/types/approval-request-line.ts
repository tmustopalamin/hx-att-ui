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
