export interface AttendanceSummary {
    id: number;
    employee_id: number;
    full_name: string | null;
    summary_date: Date | null;
    shift_id: number | null;
    check_in_time: Date | null;
    check_out_time: Date | null;
    status: string | null;
    work_hours: number | null;
    overtime_hours: number | null;
    shift_name: string | null;
    is_late: boolean | null;
    is_early_co: boolean | null;
    is_late_second: number | null;
    is_early_co_second: number | null;
    is_break: boolean | null;
    is_break_second: number | null;
}