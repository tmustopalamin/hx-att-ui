import { apiFetch } from "@/app/utils/api-client";
import type {
  EmployeeCertification,
  TrainingCourse,
  TrainingEnrollment,
  TrainingSession,
} from "@/app/types/training";
type Envelope<T> = { success: boolean; data: T; message: string };
const unwrap = <T>(request: Promise<Envelope<T>>): Promise<T> =>
  request.then((response) => response.data);
const post = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
export const getTrainingCourses = () =>
  unwrap(apiFetch<Envelope<TrainingCourse[]>>("/api/training/courses"));
export const getTrainingSessions = () =>
  unwrap(apiFetch<Envelope<TrainingSession[]>>("/api/training/sessions"));
export const getTrainingEnrollments = () =>
  unwrap(apiFetch<Envelope<TrainingEnrollment[]>>("/api/training/enrollments"));
export const getEmployeeCertifications = () =>
  unwrap(
    apiFetch<Envelope<EmployeeCertification[]>>("/api/training/certifications"),
  );
export const createTrainingCourse = (data: Record<string, unknown>) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>("/api/training/courses", post(data)),
  );
export const updateTrainingCourseActive = (
  id: number,
  version: number,
  isActive: boolean,
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/training/courses/${id}/active`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(version),
        },
        body: JSON.stringify({ is_active: isActive }),
      },
    ),
  );
export const createTrainingSession = (data: Record<string, unknown>) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>("/api/training/sessions", post(data)),
  );
export const updateTrainingSessionStatus = (
  id: number,
  version: number,
  status: string,
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/training/sessions/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(version),
        },
        body: JSON.stringify({ status }),
      },
    ),
  );
export const createTrainingEnrollment = (data: {
  training_session_id: number;
  employee_id: number;
}) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>("/api/training/enrollments", post(data)),
  );
export const updateTrainingEnrollmentStatus = (
  id: number,
  version: number,
  data: Record<string, unknown>,
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/training/enrollments/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(version),
        },
        body: JSON.stringify(data),
      },
    ),
  );
export const createEmployeeCertification = (data: Record<string, unknown>) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>(
      "/api/training/certifications",
      post(data),
    ),
  );
export const updateEmployeeCertificationStatus = (
  id: number,
  version: number,
  status: "ACTIVE" | "REVOKED",
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/training/certifications/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(version),
        },
        body: JSON.stringify({ status }),
      },
    ),
  );
