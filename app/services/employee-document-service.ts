import { apiFetch } from "@/app/utils/api-client";
import type {
  EmployeeDocument,
  EmployeeDocumentFileVersion,
  EmployeeDocumentType,
} from "@/app/types/employee-document";

type Envelope<T> = { success: boolean; data: T; message: string };
const unwrap = <T>(request: Promise<Envelope<T>>): Promise<T> =>
  request.then((response) => response.data);

export const getEmployeeDocumentTypes = () =>
  unwrap(
    apiFetch<Envelope<EmployeeDocumentType[]>>("/api/employee-document-types"),
  );
export const createEmployeeDocumentType = (data: {
  code: string;
  name: string;
  requires_expiry: boolean;
  default_expiry_reminder_days: number | null;
  is_required_on_onboarding: boolean;
}) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>("/api/employee-document-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
export const getEmployeeDocuments = (employeeId?: number) =>
  unwrap(
    apiFetch<Envelope<EmployeeDocument[]>>(
      `/api/employee-documents${employeeId ? `?employee_id=${employeeId}` : ""}`,
    ),
  );
export const getEmployeeDocumentVersions = (id: number) =>
  unwrap(
    apiFetch<Envelope<EmployeeDocumentFileVersion[]>>(
      `/api/employee-documents/${id}/versions`,
    ),
  );
export const createEmployeeDocument = (data: {
  employee_id: number;
  employee_document_type_id: number;
  document_number: string | null;
  document_name: string | null;
  issued_date: string | null;
  expired_date: string | null;
  notes: string | null;
  is_primary: boolean;
}) =>
  unwrap(
    apiFetch<Envelope<{ id: number; row_version: number }>>(
      "/api/employee-documents",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      },
    ),
  );
export const updateEmployeeDocument = (
  id: number,
  rowVersion: number,
  data: {
    document_number: string | null;
    document_name: string | null;
    issued_date: string | null;
    expired_date: string | null;
    notes: string | null;
    is_primary: boolean;
  },
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/employee-documents/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify(data),
      },
    ),
  );
export const setEmployeeDocumentActive = (
  id: number,
  rowVersion: number,
  isActive: boolean,
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/employee-documents/${id}/active`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify({ is_active: isActive }),
      },
    ),
  );
export const uploadEmployeeDocumentFile = (
  id: number,
  rowVersion: number,
  file: File,
) => {
  const body = new FormData();
  body.append("file", file);
  return unwrap(
    apiFetch<Envelope<{ id: number; row_version: number }>>(
      `/api/employee-documents/${id}/file`,
      { method: "POST", headers: { "If-Match": String(rowVersion) }, body },
    ),
  );
};
export const verifyEmployeeDocument = (
  id: number,
  rowVersion: number,
  status: "VERIFIED" | "REJECTED",
  rejectionReason: string | null,
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/employee-documents/${id}/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify({ status, rejection_reason: rejectionReason }),
      },
    ),
  );
