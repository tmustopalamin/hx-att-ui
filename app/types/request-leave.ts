export interface RequestLeave {
    id: number;
    employee_id: number;
    leave_type_id: number;
    employee_leave_balance_id: number;

    leave_name?: string | null;
    approved_by?: number | null;
    approved_by_name?: string | null;

    start_date: string;
    end_date: string;
    total_days: number;

    reason: string;
    status: string;

    approved_at: string | null;

    created_at?: string;
    created_by?: number | null;
    updated_at?: string;
    updated_by?: number | null;
    deleted_at: string | null;
    deleted_by?: number | null;

    row_version: number;
}

export interface RequestLeaveForm {
    id: number;
    leave_type_id: number;
    employee_leave_balance_id: number;

    start_date: Date | null;
    end_date: Date | null;

    reason: string;
    total_days: number;

    deleted_at: string | null;
    row_version: number;
}

export const defaultRequestLeaveFormValue: RequestLeaveForm = {
    id: 0,
    leave_type_id: 0,
    employee_leave_balance_id: 0,
    start_date: null,
    end_date: null,
    reason: "",
    total_days: 0,
    deleted_at: null,
    row_version: 0,
};