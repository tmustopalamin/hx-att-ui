export interface Formula {
    effective_date: string,
    formula: string
}

export interface SalaryComponent {
    id: number;
    code: string;
    name: string;
    component_type: string;
    calculation_type: string;
    default_amount: number;
    percentage: number;
    base_component: string;
    taxable: boolean;
    is_active: boolean;
    deleted_at: number;
    row_version: number;
    formula: Formula[];
}