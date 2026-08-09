export interface EmployeeDocumentType {
  id: number;
  code: string;
  name: string;
  requires_expiry: boolean;
  default_expiry_reminder_days: number | null;
  is_required_on_onboarding: boolean;
  is_active: boolean;
  row_version: number;
}
export interface EmployeeDocument {
  id: number;
  employee_id: number;
  employee_name: string;
  employee_document_type_id: number;
  document_type_name: string;
  document_number: string | null;
  document_name: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  issued_date: string | null;
  expired_date: string | null;
  verification_status: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  verified_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  is_primary: boolean;
  is_active: boolean;
  row_version: number;
}
export interface EmployeeDocumentFileVersion {
  id: number;
  employee_document_id: number;
  version_number: number;
  original_file_name: string;
  mime_type: string;
  size_bytes: number;
  content_sha256: string;
  archived_at: string;
}
