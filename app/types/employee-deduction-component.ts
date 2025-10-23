export interface EmployeeDeductionComponent {
    id: number;
    employee_id: number;
    component_id: number;
    based_on_component_id: number;
    amount: number;
    frequency: string;
    start_date: Date | null;
    end_date: Date | null;
    is_active: boolean
    notes: string
    deleted_at: string;
    row_version: number;
}