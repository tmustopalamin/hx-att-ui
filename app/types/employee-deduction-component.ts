export interface EmployeeDeductionComponent {
  id: number;
  employee_id: number;
  deduction_component_master_id: number;
  amount: number;
  frequency: number | null;
  start_date: string | Date | null;
  end_date: string | Date | null;
  is_active: boolean;
  notes: string | null;
  deleted_at: string | null;
  row_version: number;
  deduction_component_name?: string | null;
}
