export interface DeductionComponent {
    id: number;
    code: string;
    name: string;
    is_taxable: boolean;
    formula_id: number;
    calculation_method: string;
    default_frequency: string;
    is_active:boolean;
    deleted_at: string;
    row_version: number;
}