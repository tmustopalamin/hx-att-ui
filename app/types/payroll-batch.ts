export type PayrollBatchStatus =
  | "DRAFT"
  | "VALIDATING"
  | "READY"
  | "CALCULATING"
  | "CALCULATED"
  | "REVIEWED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "POSTED"
  | "PAID"
  | "CANCELLED"
  | "FAILED";

export interface PayrollBatch {
  id: number;
  payroll_setting_id: number;
  batch_no: string;
  period_start: string;
  period_end: string;
  attendance_cutoff_date: string;
  period_reference_month: string | null;
  payroll_period_rule_id: number | null;
  payroll_date: string;
  status: PayrollBatchStatus;
  notes: string | null;
  created_at: string;
  created_by: number | null;
  updated_at: string;
  updated_by: number | null;
  row_version: number;
}

export interface PayrollBatchSettingOption {
  id: number;
  branch_id: number | null;
  code: string;
  name: string;
  currency_code: string;
}

export interface PayrollBatchRegulationOption {
  id: number;
  code: string;
  name: string;
  version: string;
  effective_from: string;
  effective_to: string | null;
}

export interface PayrollBatchCreateOptions {
  settings: PayrollBatchSettingOption[];
  regulations: PayrollBatchRegulationOption[];
}

export interface NewPayrollBatch {
  payroll_setting_id: number;
  batch_no: string;
  period_start: string;
  period_end: string;
  attendance_cutoff_date: string;
  period_reference_month: string;
  payroll_period_rule_id: number | null;
  payroll_date: string;
  notes: string | null;
  regulation_package_ids: number[];
}

export interface PayrollBatchValidationResult {
  batch: PayrollBatch;
  employee_count: number;
  ready_count: number;
  warning_count: number;
}

export interface PayrollBatchCalculationResult {
  batch: PayrollBatch;
  calculated_count: number;
  failed_count: number;
}

export interface PayrollAttendanceSnapshot {
  payroll_employee_result_id: number;
  scheduled_days: string;
  present_days: string;
  absent_days: string;
  paid_leave_days: string;
  unpaid_leave_days: string;
  approved_overtime_seconds: number;
  late_seconds: number;
  early_out_seconds: number;
  incomplete_days: string;
}

export interface PayrollComponentResult {
  id: number;
  payroll_employee_result_id: number;
  component_type: "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION" | "TAX";
  component_code: string;
  component_name: string;
  source: string;
  quantity: string | null;
  rate: string | null;
  base_amount: string | null;
  amount: string;
  taxable: boolean;
  affects_take_home_pay: boolean;
  formula_version: number | null;
  formula_expression_used: string | null;
  calculation_details_json: Record<string, unknown>;
  display_order: number;
  is_manual: boolean;
}

export interface PayrollEmployeeResultDetail {
  id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  status: string;
  base_salary: string;
  gross_income: string;
  taxable_income: string;
  non_taxable_income: string;
  employee_deduction: string;
  employer_contribution: string;
  pph21_amount: string;
  take_home_pay: string;
  company_payroll_cost: string;
  proration_factor: string;
  error_code: string | null;
  error_message: string | null;
  calculated_at: string | null;
  attendance: PayrollAttendanceSnapshot | null;
  components: PayrollComponentResult[];
}

export interface PayrollBatchDetail {
  batch: PayrollBatch;
  employee_results: PayrollEmployeeResultDetail[];
}

export interface PayrollPayslipSnapshotAmounts {
  base_salary: string | number;
  gross_income: string | number;
  taxable_income: string | number;
  non_taxable_income: string | number;
  employee_deduction: string | number;
  employer_contribution: string | number;
  pph21_amount: string | number;
  take_home_pay: string | number;
  company_payroll_cost: string | number;
  proration_factor: string | number;
}

export interface PayrollPayslipSnapshot {
  batch: {
    id: number;
    batch_no: string;
    period_start: string;
    period_end: string;
    payroll_date: string;
  };
  employee: {
    id: number;
    employee_code: string;
    employee_name: string;
  };
  amounts: PayrollPayslipSnapshotAmounts;
  attendance: Record<string, string | number>;
  components: Array<{
    component_type: string;
    component_code: string;
    component_name: string;
    source: string;
    amount: string | number;
    taxable: boolean;
    affects_take_home_pay: boolean;
    is_manual: boolean;
  }>;
  calculation_engine_version: string | null;
}

export interface PayrollPayslip {
  id: number;
  payroll_employee_result_id: number;
  employee_id: number;
  payslip_no: string;
  status: "GENERATED" | "PUBLISHED" | "REVOKED";
  generated_at: string;
  published_at: string | null;
  snapshot_json: PayrollPayslipSnapshot;
  row_version: number;
}

export interface NewPayrollPaymentBatch {
  payment_batch_no: string;
  payment_date: string;
  bank_code: string | null;
}

export interface PayrollPaymentBatch {
  id: number;
  payroll_batch_id: number;
  payment_batch_no: string;
  payment_date: string;
  bank_code: string | null;
  status:
    | "DRAFT"
    | "EXPORTED"
    | "PAID"
    | "CANCELLED"
    | "PROCESSING"
    | "PARTIALLY_PAID"
    | "FAILED";
  total_items: number;
  total_amount: string;
  processed_at: string | null;
  processed_by: number | null;
  created_at: string;
  created_by: number | null;
  row_version: number;
}

export interface PayrollPaymentItemDetail {
  id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  bank_code: string | null;
  bank_account_masked: string;
  bank_account_name: string;
  amount: string;
  status: string;
  bank_reference: string | null;
  failure_reason: string | null;
  paid_at: string | null;
}

export interface PayrollPaymentBatchDetail {
  batch: PayrollPaymentBatch;
  items: PayrollPaymentItemDetail[];
}

export interface PayrollPaymentSettlement {
  items: Array<{
    payment_item_id: number;
    bank_reference: string;
  }>;
}

export interface PayrollAdjustment {
  id: number;
  payroll_batch_id: number;
  employee_id: number;
  component_type: "EARNING" | "DEDUCTION" | "EMPLOYER_CONTRIBUTION" | "TAX";
  income_component_id: number | null;
  deduction_component_id: number | null;
  amount: string;
  reason: string;
  status:
    | "DRAFT"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "APPLIED"
    | "REJECTED"
    | "CANCELLED";
  created_by: number | null;
  row_version: number;
}
export interface PayrollAdjustmentOptions {
  employees: Array<{
    employee_id: number;
    employee_code: string;
    employee_name: string;
  }>;
  income_components: Array<{ id: number; code: string; name: string }>;
  deduction_components: Array<{ id: number; code: string; name: string }>;
}

export interface PayrollPerformanceEarningPreview {
  performance_review_id: number;
  performance_cycle_id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  score: string | number | null;
  base_salary: string | number;
  policy_id: number | null;
  policy_code: string | null;
  policy_version: number | null;
  income_component_id: number | null;
  income_component_code: string | null;
  income_component_name: string | null;
  amount_mode: string | null;
  amount: string | number | null;
  reason: string | null;
  existing_adjustment_status: string | null;
}
export interface PayrollPerformanceEarningGeneration {
  created: PayrollAdjustment[];
  skipped: PayrollPerformanceEarningPreview[];
}
