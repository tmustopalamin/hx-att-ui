export interface LeaveType {
  id: number;
  code: string;
  name: string;
  description: string;
  is_paid: boolean;
  is_deductible: boolean;
  max_days: number | null;
  carry_forward: boolean;
  is_active: boolean;
  deleted_at: string | null;
  row_version: number;

  requires_attachment: boolean;
  requires_reason: boolean;
  requires_approval: boolean;
}
