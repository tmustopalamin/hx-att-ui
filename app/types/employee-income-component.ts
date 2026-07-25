export interface EmployeeIncomeComponent {
  id: number;
  employee_id: number;
  income_component_master_id: number;
  based_on_component_id: number;
  amount: number;
  frequency: number;
  start_date: Date | null;
  end_date: Date | null;
  is_active: boolean;
  percentage: number;
  notes: string;
  deleted_at: string;
  row_version: number;
}
