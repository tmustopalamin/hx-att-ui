export interface TrainingCourse {
  id: number;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
  duration_hours: number | null;
  is_active: boolean;
  row_version: number;
}
export interface TrainingSession {
  id: number;
  training_course_id: number;
  course_name: string;
  code: string;
  start_at: string;
  end_at: string;
  provider_name: string | null;
  location: string | null;
  capacity: number | null;
  status: "DRAFT" | "OPEN" | "COMPLETED" | "CANCELLED";
  row_version: number;
}
export interface TrainingEnrollment {
  id: number;
  training_session_id: number;
  session_code: string;
  course_name: string;
  employee_id: number;
  employee_name: string;
  status: "ENROLLED" | "ATTENDED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  completion_date: string | null;
  score: number | null;
  row_version: number;
}
export interface EmployeeCertification {
  id: number;
  employee_id: number;
  employee_name: string;
  training_course_id: number | null;
  course_name: string | null;
  certification_name: string;
  issuing_organization: string | null;
  credential_number: string | null;
  issued_date: string | null;
  expiry_date: string | null;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  row_version: number;
}
