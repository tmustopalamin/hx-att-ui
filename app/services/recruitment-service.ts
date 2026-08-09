import { apiFetch } from "@/app/utils/api-client";
import type {
  RecruitmentActivity,
  RecruitmentApplication,
  RecruitmentCandidate,
  RecruitmentInterview,
  RecruitmentOffer,
  RecruitmentRequisition,
} from "@/app/types/recruitment";

type Envelope<T> = { success: boolean; data: T; message: string };
type IdResponse = { id: number };

const unwrap = <T>(request: Promise<Envelope<T>>): Promise<T> =>
  request.then((response) => response.data);
const json = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});

export const getRecruitmentRequisitions = () =>
  unwrap(
    apiFetch<Envelope<RecruitmentRequisition[]>>(
      "/api/recruitment/requisitions",
    ),
  );
export const getRecruitmentCandidates = () =>
  unwrap(
    apiFetch<Envelope<RecruitmentCandidate[]>>("/api/recruitment/candidates"),
  );
export const getRecruitmentApplications = () =>
  unwrap(
    apiFetch<Envelope<RecruitmentApplication[]>>(
      "/api/recruitment/applications",
    ),
  );
export const getRecruitmentApplicationActivities = (id: number) =>
  unwrap(
    apiFetch<Envelope<RecruitmentActivity[]>>(
      `/api/recruitment/applications/${id}/activities`,
    ),
  );
export const getRecruitmentInterviews = () =>
  unwrap(
    apiFetch<Envelope<RecruitmentInterview[]>>("/api/recruitment/interviews"),
  );
export const getRecruitmentOffers = () =>
  unwrap(apiFetch<Envelope<RecruitmentOffer[]>>("/api/recruitment/offers"));

export const createRecruitmentRequisition = (data: Record<string, unknown>) =>
  unwrap(
    apiFetch<Envelope<IdResponse>>("/api/recruitment/requisitions", json(data)),
  );
export const createRecruitmentCandidate = (data: Record<string, unknown>) =>
  unwrap(
    apiFetch<Envelope<IdResponse>>("/api/recruitment/candidates", json(data)),
  );
export const updateRecruitmentCandidateStatus = (
  id: number,
  rowVersion: number,
  status: "ACTIVE" | "ARCHIVED",
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/recruitment/candidates/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify({ status }),
      },
    ),
  );
export const uploadRecruitmentCandidateResume = (
  id: number,
  rowVersion: number,
  file: File,
) => {
  const body = new FormData();
  body.append("file", file);
  return unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/recruitment/candidates/${id}/resume`,
      {
        method: "POST",
        headers: { "If-Match": String(rowVersion) },
        body,
      },
    ),
  );
};
export const createRecruitmentApplication = (data: {
  job_requisition_id: number;
  candidate_id: number;
}) =>
  unwrap(
    apiFetch<Envelope<IdResponse>>("/api/recruitment/applications", json(data)),
  );
export const updateRecruitmentApplicationStatus = (
  id: number,
  rowVersion: number,
  status: "SCREENING" | "REJECTED" | "WITHDRAWN",
  reason?: string,
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/recruitment/applications/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify({ status, reason: reason || null }),
      },
    ),
  );
export const createRecruitmentInterview = (data: {
  application_id: number;
  interview_type: string;
  scheduled_at: string;
  interviewer_employee_id: number;
}) =>
  unwrap(
    apiFetch<Envelope<IdResponse>>("/api/recruitment/interviews", json(data)),
  );
export const createRecruitmentOffer = (data: Record<string, unknown>) =>
  unwrap(apiFetch<Envelope<IdResponse>>("/api/recruitment/offers", json(data)));
export const updateRequisitionStatus = (
  id: number,
  rowVersion: number,
  status: string,
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/recruitment/requisitions/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify({ status }),
      },
    ),
  );
export const completeRecruitmentInterview = (
  id: number,
  rowVersion: number,
  data: { score: number | null; feedback: string | null },
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/recruitment/interviews/${id}/complete`,
      {
        ...json(data),
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
      },
    ),
  );
export const cancelRecruitmentInterview = (
  id: number,
  rowVersion: number,
  reason: string,
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/recruitment/interviews/${id}/cancel`,
      {
        ...json({ reason }),
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
      },
    ),
  );
export const updateRecruitmentOfferStatus = (
  id: number,
  rowVersion: number,
  status: string,
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/recruitment/offers/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify({ status }),
      },
    ),
  );
export const linkAcceptedOfferEmployee = (
  id: number,
  rowVersion: number,
  data: { employee_id: number; effective_date: string },
) =>
  unwrap(
    apiFetch<Envelope<{ lifecycle_case_id: number; already_linked: boolean }>>(
      `/api/recruitment/offers/${id}/link-employee`,
      {
        ...json(data),
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
      },
    ),
  );
