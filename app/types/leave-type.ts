export interface LeaveType {
    id: number;
    code: string;
    name: string;
    description: string;
    is_paid: boolean;
    is_deductible: boolean;
    max_days: number;
    carry_forward: boolean;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}