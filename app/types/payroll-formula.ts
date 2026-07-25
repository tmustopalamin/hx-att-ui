export interface PayrollFormula {
  id: number;
  code: string;
  name: string;
  expression: string;
  description: string;
  is_active: boolean;
  deleted_at: string;
  row_version: number;
}
