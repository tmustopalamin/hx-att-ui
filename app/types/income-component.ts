export interface IncomeComponent {
  id: number;
  code: string | null;
  name: string;
  is_taxable: boolean;
  calculation_method: number | null;
  formula_id: number | null;
  category: number | null;
  calculation_display: string | null;
  is_active: boolean;
  deleted_at: string | null;
  updated_at: string;
  row_version: number;
  calculation_method_name: string | null;
  calculation_method_code: string | null;
  assignment_mode: "EMPLOYEE" | "SYSTEM";
  is_fixed_allowance: boolean;
  include_in_bpjs_health: boolean;
  include_in_bpjs_employment: boolean;
}

export type IncomeComponentPayload = Pick<
  IncomeComponent,
  | "code"
  | "name"
  | "is_taxable"
  | "calculation_method"
  | "formula_id"
  | "category"
  | "calculation_display"
  | "is_active"
>;
