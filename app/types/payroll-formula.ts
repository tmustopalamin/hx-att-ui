export interface PayrollFormula {
  id: number;
  code: string | null;
  name: string;
  expression: string;
  description: string | null;
  is_active: boolean;
  deleted_at: string | null;
  row_version: number;
  version: number;
  expression_language: string;
  status: string;
  effective_from: string;
  effective_to: string | null;
  result_scale: number;
  rounding_mode: string;
  regulation_package_id: number | null;
  source_reference: string | null;
  checksum: string | null;
  updated_at: string;
}

export type PayrollFormulaPayload = Pick<
  PayrollFormula,
  "code" | "name" | "expression" | "description" | "is_active"
>;
