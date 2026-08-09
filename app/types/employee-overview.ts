export interface PayrollReadiness {
  ready: boolean;
  missing: string[];
}
export interface EmployeeLeaveBalanceOverview {
  id: number;
  leave_type_name: string | null;
  period_start: string;
  period_end: string;
  closing_balance: number;
}
export interface EmployeePayslipOverview {
  id: number;
  payslip_no: string;
  status: string;
  generated_at: string;
  published_at: string | null;
}
export interface EmployeeOverview {
  payroll_readiness: PayrollReadiness | null;
  leave_balances: EmployeeLeaveBalanceOverview[] | null;
  payslips: EmployeePayslipOverview[] | null;
}
