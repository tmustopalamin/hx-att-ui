export interface EmployeeIncomeComponent {
  id: number;
  employee_id: number;
  income_component_master_id: number;
  based_on_component_id: number | null;
  amount: number;
  frequency: number | null;
  start_date: string | Date | null;
  end_date: string | Date | null;
  is_active: boolean;
  percentage: number | null;
  notes: string | null;
  deleted_at: string | null;
  row_version: number;
  income_component_name?: string | null;
  is_fixed_allowance: boolean;
  include_in_bpjs_health: boolean;
  include_in_bpjs_employment: boolean;
}
