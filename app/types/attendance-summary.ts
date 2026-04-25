export interface AttendanceSummary {
    id: number;
    employee_id: number;
    employee_name: string | null;

    summary_date: string;

    employee_shift_assignment_id: number | null;
    shift_id: number | null;
    shift_name: string | null;

    scheduled_start_time: string | null;
    scheduled_end_time: string | null;
    scheduled_break_start_time: string | null;
    scheduled_break_end_time: string | null;

    check_in_time: string | null;
    check_out_time: string | null;

    status: string;

    attendance_log_count: number;
    first_log_id: number | null;
    last_log_id: number | null;

    work_seconds: number;
    break_seconds: number;
    overtime_seconds: number;
    late_seconds: number;
    early_out_seconds: number;

    is_late: boolean;
    is_early_co: boolean;
    is_break: boolean;

    is_holiday: boolean;
    is_weekend: boolean;
    is_leave: boolean;
    is_absent: boolean;
    is_unscheduled: boolean;

    is_missing_check_in: boolean;
    is_missing_check_out: boolean;

    leave_id: number | null;
    overtime_request_id: number | null;

    created_at: string | null;
    updated_at: string | null;
    row_version: number;
}