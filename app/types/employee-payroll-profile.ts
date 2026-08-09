export interface StatutoryProgramOption {
  id: number;
  code: string;
  name: string;
  provider: string;
}
export interface BpjsRiskClassOption {
  id: number;
  code: string;
  name: string;
}
export interface EmployeeStatutoryEnrollment {
  id: number;
  employee_id: number;
  statutory_program_id: number;
  program_code: string;
  program_name: string;
  participant_number: string | null;
  enrollment_status: string;
  effective_from: string;
  effective_to: string | null;
  bpjs_risk_class_id: number | null;
  risk_class_code: string | null;
  company_registration_number: string | null;
  notes: string | null;
  updated_at: string;
  row_version: number;
}
export interface EmployeeStatutoryWage {
  id: number;
  employee_id: number;
  program_group: string;
  wage_amount: string;
  effective_from: string;
  effective_to: string | null;
  source: string;
  notes: string | null;
  updated_at: string;
  row_version: number;
}
export interface EmployeeTaxProfile {
  id: number;
  employee_id: number;
  nik_masked: string | null;
  npwp_masked: string | null;
  ptkp_code: string;
  ter_category: string | null;
  tax_residency: string;
  tax_method: string;
  employee_tax_type: string;
  effective_from: string;
  effective_to: string | null;
  previous_employer_gross: string;
  previous_employer_tax: string;
  previous_employer_net: string;
  notes: string | null;
  updated_at: string;
  row_version: number;
}
export interface EmployeeSalaryHistory {
  id: number;
  employee_id: number;
  base_salary: string;
  currency_code: string;
  payroll_setting_id: number | null;
  payroll_setting_name: string | null;
  effective_from: string;
  effective_to: string | null;
  change_reason: string | null;
  status: string;
  updated_at: string;
  row_version: number;
}
export interface BankOption {
  id: number;
  code: string | null;
  name: string;
}
export interface EmployeeBankAccount {
  id: number;
  employee_id: number;
  bank_id: number;
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  account_holder_name: string;
  is_primary: boolean;
  is_active: boolean;
  updated_at: string;
  row_version: number;
}
export interface EmployeePayrollProfile {
  statutory_programs: StatutoryProgramOption[];
  bpjs_risk_classes: BpjsRiskClassOption[];
  enrollments: EmployeeStatutoryEnrollment[];
  statutory_wages: EmployeeStatutoryWage[];
  tax_profiles: EmployeeTaxProfile[];
  salary_history: EmployeeSalaryHistory[];
  bank_accounts: EmployeeBankAccount[];
  bank_options: BankOption[];
}

export type NewStatutoryEnrollment = Pick<
  EmployeeStatutoryEnrollment,
  | "statutory_program_id"
  | "participant_number"
  | "enrollment_status"
  | "effective_from"
  | "effective_to"
  | "bpjs_risk_class_id"
  | "company_registration_number"
  | "notes"
>;
export type NewStatutoryWage = Pick<
  EmployeeStatutoryWage,
  | "program_group"
  | "wage_amount"
  | "effective_from"
  | "effective_to"
  | "source"
  | "notes"
>;
export interface NewTaxProfile {
  nik: string | null;
  npwp: string | null;
  ptkp_code: string;
  ter_category: string | null;
  tax_residency: string;
  tax_method: string;
  employee_tax_type: string;
  effective_from: string;
  effective_to: string | null;
  previous_employer_gross: string;
  previous_employer_tax: string;
  previous_employer_net: string;
  notes: string | null;
}
export type NewSalaryHistory = Pick<
  EmployeeSalaryHistory,
  | "base_salary"
  | "currency_code"
  | "payroll_setting_id"
  | "effective_from"
  | "effective_to"
  | "change_reason"
  | "status"
>;
export type NewEmployeeBankAccount = Pick<
  EmployeeBankAccount,
  "bank_id" | "account_holder_name" | "is_primary" | "is_active"
> & { account_number: string };
export type UpdateEmployeeBankAccount = Omit<
  NewEmployeeBankAccount,
  "account_number"
> & {
  account_number?: string;
};
export type PayrollProfileSection =
  | "enrollments"
  | "statutory-wages"
  | "tax-profiles"
  | "salary-history"
  | "bank-accounts";
