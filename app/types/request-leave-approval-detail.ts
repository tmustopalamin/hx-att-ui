export interface RequestLeaveApprovalDetail {
    employee_leave_id: number;
    request_no: string | null;
    leave_status: string;

    approval_request_id: number | null;
    approval_status: string | null;
    current_step_no: number | null;
    submitted_at: string | null;
    completed_at: string | null;

    steps: RequestLeaveApprovalStep[];
    actions: RequestLeaveApprovalAction[];
}

export interface RequestLeaveApprovalStep {
    id: number;
    step_no: number;

    approver_employee_id: number;
    approver_name: string | null;

    status: string;

    acted_by: number | null;
    acted_by_name: string | null;
    acted_at: string | null;
    note: string | null;

    row_version: number;
}

export interface RequestLeaveApprovalAction {
    id: number;
    approval_request_step_id: number | null;
    step_no: number | null;

    action: string;

    actor_employee_id: number;
    actor_name: string | null;

    note: string | null;
    acted_at: string;
}