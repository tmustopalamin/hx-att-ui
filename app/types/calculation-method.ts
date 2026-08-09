export interface CalculationMethod {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  requires_formula: boolean;
  requires_reference_component: boolean;
  requires_attendance: boolean;
  is_active: boolean;
  deleted_at: string | null;
  row_version: number;
}

export type CalculationMethodPayload = Pick<
  CalculationMethod,
  | "code"
  | "name"
  | "description"
  | "requires_formula"
  | "requires_reference_component"
  | "requires_attendance"
  | "is_active"
>;
