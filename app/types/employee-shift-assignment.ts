export interface EmployeeShiftAssignmentBulkObj {
    employee_id: number;
    shift_rule_id: number;
    start_date: Date | null;
    end_date: Date | null;
}

export interface EmployeeShiftAssignment {
    id: number;
    employee_id: number | null;
    employee_name: string | null;

    shift_id: number | null;
    shift_name: string | null;
    shift_date: Date | string | null;

    shift_rule_id?: number | null;
    source?: string | null;

    deleted_at: string | null;
    row_version: number;

    is_bulk: boolean;
    is_day_off: boolean;
    is_holiday: boolean;
    is_locked: boolean;

    bulk_data: EmployeeShiftAssignmentBulkObj[] | null;
}

export interface NewEmployeeShiftAssignment {
    employee_ids: number[];
    date_from: string;
    date_to: string | null;
    overwrite: boolean;
    row_version: number;
}