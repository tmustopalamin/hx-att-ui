export interface EmployeeShiftAssignmentBulkObj {
    employee_id: number;
    shift_rule_id: number;
    start_date: Date | null;
    end_date: Date | null;
}

export interface EmployeeShiftAssignment {
    id: number;
    employee_id: number | null;
    shift_id: number | null;
    shift_date: Date | null;
    deleted_at: string;
    row_version: number;
    is_bulk: boolean;
    bulk_data: EmployeeShiftAssignmentBulkObj[] | null
}