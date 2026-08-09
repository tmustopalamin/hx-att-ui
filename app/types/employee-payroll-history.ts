export interface EmployeePayrollResultHistory {
  id: number;
  payroll_batch_id: number;
  batch_no: string;
  period_start: string;
  period_end: string;
  batch_status: string;
  status: string;
  gross_income: string;
  employee_deduction: string;
  pph21_amount: string;
  take_home_pay: string;
  calculated_at: string | null;
}
export interface EmployeePayslipHistory {
  id: number;
  payslip_no: string;
  status: string;
  generated_at: string;
  published_at: string | null;
}
export interface EmployeePayrollAdjustmentHistory {
  id: number;
  payroll_batch_id: number;
  component_type: string;
  amount: string;
  reason: string;
  status: string;
}
export interface EmployeePayrollHistory {
  results: EmployeePayrollResultHistory[];
  payslips: EmployeePayslipHistory[];
  adjustments: EmployeePayrollAdjustmentHistory[];
}
