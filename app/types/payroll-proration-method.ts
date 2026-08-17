export type PayrollProrationBasis =
  "SCHEDULED_DAYS" | "CALENDAR_DAYS" | "FIXED_DIVISOR" | "NONE";

export interface PayrollProrationMethod {
  id: number;
  code: string;
  name: string;
  description: string;
  basis_code: PayrollProrationBasis;
  fixed_divisor_days: number | null;
  display_order: number;
  is_system: boolean;
  is_active: boolean;
  updated_at: string;
  deleted_at: string | null;
  row_version: number;
}

export interface NewPayrollProrationMethod {
  name: string;
  description: string;
  fixed_divisor_days: number;
  is_active: boolean;
}

export type UpdatePayrollProrationMethod = Pick<
  PayrollProrationMethod,
  "name" | "description" | "is_active"
>;
