export interface IncomeComponent {
  id: number;
  code: string;
  name: string;
  is_taxable: boolean;
  calculation_method: number;
  formula_id: number | null;
  category: number;
  is_active: boolean;
  deleted_at: string;
  row_version: number;
  calculation_method_name: string;
  calculation_method_code: string;
}
