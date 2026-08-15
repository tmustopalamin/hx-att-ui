export interface PerformanceCycle {
  id: number;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
  earning_enabled: boolean;
  row_version: number;
}
export interface PerformanceReview {
  id: number;
  performance_cycle_id: number;
  cycle_name: string;
  employee_id: number;
  employee_name: string;
  reviewer_employee_id: number;
  reviewer_name: string;
  review_type: "SELF" | "MANAGER" | "PEER";
  status: "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "FINALIZED" | "CANCELLED";
  overall_score: number | null;
  reviewer_comment: string | null;
  employee_comment: string | null;
  finalized_at: string | null;
  finalized_by: number | null;
  row_version: number;
}
export interface PerformanceGoal {
  id: number;
  performance_review_id: number;
  title: string;
  description: string | null;
  weight: number;
  target_value: string | null;
  actual_value: string | null;
  score: number | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  row_version: number;
}

export type PerformanceEarningPolicyStatus = "DRAFT" | "PUBLISHED" | "RETIRED";
export type PerformanceEarningAmountMode = "FIXED" | "PERCENTAGE";
export interface PerformanceEarningRule {
  id: number;
  performance_earning_policy_id: number;
  score_from: number;
  score_to: number;
  amount_mode: PerformanceEarningAmountMode;
  fixed_amount: number | null;
  percentage: number | null;
  row_version: number;
}
export interface PerformanceEarningPolicy {
  id: number;
  code: string;
  name: string;
  version_no: number;
  department_id: number | null;
  department_name: string | null;
  position_id: number | null;
  position_name: string | null;
  income_component_id: number;
  income_component_code: string;
  income_component_name: string;
  effective_from: string;
  effective_to: string | null;
  status: PerformanceEarningPolicyStatus;
  row_version: number;
  rules: PerformanceEarningRule[];
}
