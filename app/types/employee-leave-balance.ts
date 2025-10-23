export interface EmployeeLeaveBalance {
    id: number;
    employee_id: number;
    leave_type_id: number;
    period_start: Date | null;
    period_end: Date | null;
    opening_balance: number
    entitlement: number
    taken: number
    adjustment: number
    closing_balance: number
    deleted_at: string;
    row_version: number;
    expired_balance: number;
}