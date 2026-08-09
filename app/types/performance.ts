export interface PerformanceCycle {
  id: number;
  code: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
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
  status: "DRAFT" | "SUBMITTED" | "ACKNOWLEDGED" | "CANCELLED";
  overall_score: number | null;
  reviewer_comment: string | null;
  employee_comment: string | null;
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
