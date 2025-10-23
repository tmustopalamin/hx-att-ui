export interface RequestLeave {
    id: number;
    employee_id: number;
    leave_type_id: number;
    employee_leave_balance_id: number;
    start_date: Date | null;
    end_date: Date | null;
    total_days: number;
    reason: string;
    status: string;
    approved_by: string;
    approved_at: Date | null;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}