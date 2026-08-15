export interface DeductionComponent {
  id: number;
  code: string | null;
  name: string;
  is_taxable: boolean;
  formula_id: number | null;
  calculation_method: number | null;
  category: number | null;
  calculation_display: string | null;
  is_active: boolean;
  deleted_at: string | null;
  updated_at: string;
  calculation_method_name: string | null;
  assignment_mode: "EMPLOYEE" | "SYSTEM";
  row_version: number;
}

export type DeductionComponentPayload = Pick<
  DeductionComponent,
  | "code"
  | "name"
  | "is_taxable"
  | "formula_id"
  | "calculation_method"
  | "category"
  | "calculation_display"
  | "is_active"
>;
