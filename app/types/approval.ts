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

export interface ApprovalActionForm {
  note: string;
}

export const defaultApprovalActionFormValue: ApprovalActionForm = {
  note: "",
};

export interface ApprovalActionPayload {
  note: string | null;
}

export interface ApprovalWorkflowSetting {
  id: number;
  code: string;
  name: string;
  module_code: string;
  approval_mode: string;
  required_steps: number;
  is_active: boolean;
  updated_at: string;
  deleted_at: string | null;
  row_version: number;
}

export interface ApprovalWorkflowSettingForm {
  id: number;
  name: string;
  required_steps: number;
  is_active: boolean;
  row_version: number;
}

export const defaultApprovalWorkflowSettingFormValue: ApprovalWorkflowSettingForm =
  {
    id: 0,
    name: "",
    required_steps: 1,
    is_active: true,
    row_version: 0,
  };
