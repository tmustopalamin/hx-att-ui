export interface CalculationMethod {
    id: number;
    code: string;
    name: string;
    description: string;
    requires_formula: boolean;
    requires_reference_component: boolean;
    requires_attendance: boolean;
    is_active: boolean;
    deleted_at: string;
    row_version: number;
}