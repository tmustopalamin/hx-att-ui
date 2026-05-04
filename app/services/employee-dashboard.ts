export interface EmployeeDashboardResponse {
    profile: EmployeeDashboardProfile;
    today_attendance: EmployeeDashboardTodayAttendance;
    today_shift: EmployeeDashboardTodayShift;
    leave_balances: EmployeeDashboardLeaveBalance[];
    leave_summary: EmployeeDashboardRequestSummary;
    overtime_summary: EmployeeDashboardRequestSummary;
    approval_summary: EmployeeDashboardApprovalSummary;
}

export interface EmployeeDashboardProfile {
    employee_id: number;
    name: string;
    photo_url: string | null;
}

export interface EmployeeDashboardTodayAttendance {
    summary_date: string;
    status: string;
    check_in_time: string | null;
    check_out_time: string | null;
    late_seconds: number;
    early_out_seconds: number;
    work_seconds: number;
    overtime_seconds: number;
    is_late: boolean;
    is_absent: boolean;
    is_leave: boolean;
    is_missing_check_in: boolean;
    is_missing_check_out: boolean;
    is_processed: boolean;
}

export interface EmployeeDashboardTodayShift {
    shift_date: string;
    shift_id: number | null;
    shift_name: string | null;
    is_day_off: boolean;
    is_holiday: boolean;
    is_locked: boolean;
    has_shift: boolean;
}

export interface EmployeeDashboardLeaveBalance {
    id: number;
    leave_type_id: number;
    leave_type_name: string;
    period_start: string;
    period_end: string;
    entitlement: number;
    taken: number;
    adjustment: number;
    expired_balance: number;
    closing_balance: number;
}

export interface EmployeeDashboardRequestSummary {
    pending: number;
    approved_this_month: number;
    rejected_this_month: number;
    total_active: number;
}

export interface EmployeeDashboardApprovalSummary {
    pending_approval_count: number;
    pending_leave_count: number;
    pending_overtime_count: number;
    is_approver: boolean;
}