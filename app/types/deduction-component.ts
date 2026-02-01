export interface DeductionComponent {
    id: number;
    code: string;
    name: string;
    is_taxable: boolean;
    formula_id: number | null;
    calculation_method: number;
    category: number;
    is_active:boolean;
    deleted_at: string;
    row_version: number;
}