export interface EmployeeAttendanceLog {
  id: number;
  event_time: string;
  source_type: string;
  status: string;
  machine_name: string | null;
  processed: boolean;
}

export interface EmployeeAttendanceSummary {
  id: number;
  summary_date: string;
  shift_name: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  status: string;
  work_seconds: number;
  overtime_seconds: number;
  late_seconds: number;
  early_out_seconds: number;
  is_late: boolean;
  is_absent: boolean;
  is_leave: boolean;
  is_missing_check_in: boolean;
  is_missing_check_out: boolean;
}

export interface EmployeeLeaveRequestHistory {
  id: number;
  leave_type_name: string;
  start_date: string;
  end_date: string;
  total_days: string;
  status: string;
  reason: string | null;
  rejection_reason: string | null;
}

export interface EmployeeOvertimeRequestHistory {
  id: number;
  overtime_date: string;
  requested_start_at: string;
  requested_end_at: string;
  requested_seconds: number;
  status: string;
  reason: string | null;
  rejection_reason: string | null;
  approved_by_name: string | null;
}

export interface EmployeeTimeDetail {
  attendance_logs: EmployeeAttendanceLog[];
  attendance_summaries: EmployeeAttendanceSummary[];
  leave_requests: EmployeeLeaveRequestHistory[];
  overtime_requests: EmployeeOvertimeRequestHistory[];
}
