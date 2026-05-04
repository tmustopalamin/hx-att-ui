export interface ApprovalPendingItem {
    approval_request_id: number;
    approval_request_step_id: number;
    module_code: string;
    reference_id: number;
    requester_employee_id: number;
    requester_name: string | null;
    step_no: number;
    status: string;
    submitted_at: string;
    row_version: number;

    request_date: string | null;
    request_start_at: string | null;
    request_end_at: string | null;
    request_seconds: number | null;
    request_reason: string | null;
    request_status: string | null;
}

export interface ApprovalActionPayload {
    note?: string | null;
}

export interface ApprovalActionForm {
    note: string;
}

export const defaultApprovalActionFormValue: ApprovalActionForm = {
    note: '',
};