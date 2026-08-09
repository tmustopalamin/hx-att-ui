export type RequisitionStatus = "DRAFT" | "OPEN" | "CLOSED" | "CANCELLED";
export type CandidateStatus = "ACTIVE" | "HIRED" | "ARCHIVED";
export type ApplicationStatus =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";
export type InterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED";
export type OfferStatus =
  "DRAFT" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export interface RecruitmentRequisition {
  id: number;
  code: string;
  job_title: string;
  department_id: number | null;
  department_name: string | null;
  position_id: number | null;
  position_name: string | null;
  headcount: number;
  target_start_date: string | null;
  status: RequisitionStatus;
  row_version: number;
}

export interface RecruitmentCandidate {
  id: number;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  source: string | null;
  resume_original_file_name: string | null;
  resume_mime_type: string | null;
  status: CandidateStatus;
  row_version: number;
}

export interface RecruitmentApplication {
  id: number;
  job_requisition_id: number;
  requisition_code: string;
  job_title: string;
  candidate_id: number;
  candidate_name: string;
  status: ApplicationStatus;
  applied_at: string;
  row_version: number;
}

export interface RecruitmentInterview {
  id: number;
  application_id: number;
  candidate_name: string;
  job_title: string;
  interview_type: "HR" | "USER" | "TECHNICAL" | "FINAL";
  scheduled_at: string;
  interviewer_employee_id: number;
  interviewer_name: string;
  status: InterviewStatus;
  score: number | null;
  feedback: string | null;
  row_version: number;
}

export interface RecruitmentOffer {
  id: number;
  application_id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string | null;
  candidate_phone_number: string | null;
  job_title: string;
  offered_salary: string | null;
  proposed_start_date: string | null;
  expires_at: string | null;
  status: OfferStatus;
  notes: string | null;
  row_version: number;
  linked_employee_id: number | null;
  lifecycle_case_id: number | null;
  onboarding_status: string | null;
}

export interface RecruitmentActivity {
  id: number;
  job_requisition_id: number | null;
  candidate_id: number | null;
  application_id: number | null;
  activity_type: string;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  occurred_at: string;
  actor_employee_id: number;
  actor_name: string;
}
