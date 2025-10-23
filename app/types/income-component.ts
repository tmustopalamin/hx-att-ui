export interface IncomeComponent {
    id: number;
    code: string;
    name: string;
    is_taxable: boolean;
    is_attendance_based: boolean;
    calculation_method: string;
    default_frequency: string;
    is_active:boolean;
    deleted_at: string;
    row_version: number;
}