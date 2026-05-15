export interface OvertimeRequest {
    id: number;
    employee_id: number;
    employee_name?: string | null;

    overtime_date: string;
    requested_start_at: string;
    requested_end_at: string;
    requested_seconds: number;

    reason: string | null;
    status: string;

    approved_by?: number | null;
    approved_by_name?: string | null;
    approved_at?: string | null;

    rejected_by?: number | null;
    rejected_by_name?: string | null;
    rejected_at?: string | null;
    rejection_reason?: string | null;

    cancelled_by?: number | null;
    cancelled_by_name?: string | null;
    cancelled_at?: string | null;

    submitted_at?: string | null;
    approval_request_id?: number | null;

    created_at?: string;
    created_by?: number | null;
    updated_at?: string;
    updated_by?: number | null;
    deleted_at: string | null;
    deleted_by?: number | null;

    row_version: number;
}

export interface OvertimeRequestForm {
    id: number;

    overtime_date: Date | null;
    requested_start_time: string | null;
    requested_end_time: string | null;

    reason: string;

    deleted_at: string | null;
    row_version: number;
}

export const defaultOvertimeRequestFormValue: OvertimeRequestForm = {
    id: 0,
    overtime_date: null,
    requested_start_time: null,
    requested_end_time: null,
    reason: '',
    deleted_at: null,
    row_version: 0,
};