export interface PayrollSetting {
  id: number;
  branch_id: number | null;
  code: string;
  name: string;
  currency_code: string;
  frequency_code: string;
  default_proration_method: string;
  attendance_cutoff_day: number | null;
  payment_day: number | null;
  rounding_mode: string;
  decimal_scale: number;
  require_maker_checker: boolean;
  allow_negative_net_pay: boolean;
  is_active: boolean;
  updated_at: string;
  row_version: number;
}

export type NewPayrollSetting = Omit<
  PayrollSetting,
  "id" | "code" | "updated_at" | "row_version"
>;

export interface PayrollPeriodRule {
  id: number;
  payroll_setting_id: number;
  cutoff_day: number;
  effective_month: string;
  notes: string | null;
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
  deleted_at: string | null;
  deleted_by: number | null;
  row_version: number;
}

export interface NewPayrollPeriodRule {
  cutoff_day: number;
  effective_month: string;
  notes: string | null;
}

export type UpdatePayrollPeriodRule = NewPayrollPeriodRule;

export interface PayrollPeriodPreview {
  payroll_setting_id: number;
  payroll_period_rule_id: number;
  cutoff_day: number;
  effective_month: string;
  period_start: string;
  period_end: string;
  attendance_cutoff_date: string;
}

export type UpdatePayrollSetting = Omit<
  PayrollSetting,
  "id" | "branch_id" | "code" | "updated_at" | "row_version"
>;

export type PayrollRegulationStatus =
  "DRAFT" | "TESTED" | "APPROVED" | "PUBLISHED" | "RETIRED";

export interface PayrollRegulationPackage {
  id: number;
  code: string;
  name: string;
  regulator: string;
  regulation_number: string | null;
  version: string;
  effective_from: string;
  effective_to: string | null;
  status: PayrollRegulationStatus;
  source_url: string | null;
  notes: string | null;
  published_at: string | null;
  published_by: number | null;
  approved_at: string | null;
  approved_by: number | null;
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
  row_version: number;
  configuration_revision: number;
}

export interface NewPayrollRegulationPackage {
  code: string;
  name: string;
  regulator: string;
  regulation_number: string | null;
  version: string;
  effective_from: string;
  effective_to: string | null;
  source_url: string | null;
  notes: string | null;
}

export type UpdatePayrollRegulationPackage = Omit<
  NewPayrollRegulationPackage,
  "code"
>;

export type RegulationValueType = "NUMERIC" | "TEXT" | "BOOLEAN" | "DATE";

export interface PayrollRegulationParameter {
  id: number;
  regulation_package_id: number;
  program_code: string;
  parameter_code: string;
  value_type: RegulationValueType;
  numeric_value: string | null;
  text_value: string | null;
  boolean_value: boolean | null;
  date_value: string | null;
  unit: string | null;
  description: string | null;
  updated_at: string;
  row_version: number;
}

export interface PayrollRegulationRateBracket {
  id: number;
  regulation_package_id: number;
  table_code: string;
  category_code: string;
  sequence_no: number;
  lower_bound: string;
  upper_bound: string | null;
  rate: string;
  fixed_amount: string;
  updated_at: string;
  row_version: number;
}

export interface PayrollRegulationTestCase {
  id: number;
  regulation_package_id: number;
  code: string;
  name: string;
  calculator_code: string;
  input_json: Record<string, unknown>;
  expected_output_json: Record<string, unknown>;
  tolerance: string;
  is_active: boolean;
  updated_at: string;
  row_version: number;
}

export type PayrollRegulationTestRunStatus = "PASSED" | "FAILED" | "ERROR";

export interface PayrollRegulationTestCaseResult {
  test_case_id: number;
  code: string;
  name: string;
  status: PayrollRegulationTestRunStatus;
  expected_output_json: unknown;
  actual_output_json: unknown | null;
  tolerance: string;
  error_message: string | null;
}

export interface PayrollRegulationTestRun {
  id: string;
  regulation_package_id: number;
  configuration_revision: number;
  status: PayrollRegulationTestRunStatus;
  total_count: number;
  passed_count: number;
  failed_count: number;
  error_count: number;
  results: PayrollRegulationTestCaseResult[];
}

export interface PayrollRegulationDetail {
  parameters: PayrollRegulationParameter[];
  rate_brackets: PayrollRegulationRateBracket[];
  test_cases: PayrollRegulationTestCase[];
}

export type SavePayrollRegulationParameter = Omit<
  PayrollRegulationParameter,
  "id" | "regulation_package_id" | "updated_at" | "row_version"
>;

export type SavePayrollRegulationRateBracket = Omit<
  PayrollRegulationRateBracket,
  "id" | "regulation_package_id" | "updated_at" | "row_version"
>;

export type SavePayrollRegulationTestCase = Omit<
  PayrollRegulationTestCase,
  "id" | "regulation_package_id" | "updated_at" | "row_version"
>;

export type PayrollComponentType = "INCOME" | "DEDUCTION";

export interface PayrollComponentMapping {
  id: number;
  component_type: PayrollComponentType;
  component_id: number;
  component_code: string;
  component_name: string;
  regulation_program: string;
  treatment_code: string;
  is_included: boolean;
  effective_from: string;
  effective_to: string | null;
  notes: string | null;
  updated_at: string;
  row_version: number;
}

export type SavePayrollComponentMapping = Pick<
  PayrollComponentMapping,
  | "component_type"
  | "component_id"
  | "regulation_program"
  | "treatment_code"
  | "is_included"
  | "effective_from"
  | "effective_to"
  | "notes"
>;

export interface PayrollComponentOption {
  component_type: PayrollComponentType;
  component_id: number;
  code: string;
  name: string;
}
