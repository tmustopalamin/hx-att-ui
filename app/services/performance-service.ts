import { apiFetch } from "@/app/utils/api-client";
import type {
  PerformanceCycle,
  PerformanceGoal,
  PerformanceReview,
  PerformanceEarningPolicy,
} from "@/app/types/performance";
type Envelope<T> = { success: boolean; data: T; message: string };
const unwrap = <T>(request: Promise<Envelope<T>>): Promise<T> =>
  request.then((response) => response.data);
const post = (data: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
export const getPerformanceCycles = () =>
  unwrap(apiFetch<Envelope<PerformanceCycle[]>>("/api/performance/cycles"));
export const getPerformanceReviews = () =>
  unwrap(apiFetch<Envelope<PerformanceReview[]>>("/api/performance/reviews"));
export const getPerformanceGoals = (id: number) =>
  unwrap(
    apiFetch<Envelope<PerformanceGoal[]>>(
      `/api/performance/reviews/${id}/goals`,
    ),
  );
export const createPerformanceCycle = (data: Record<string, unknown>) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>("/api/performance/cycles", post(data)),
  );
export const finalizePerformanceReview = (id: number, version: number) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/performance/reviews/${id}/finalize`,
      {
        ...post({}),
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(version),
        },
      },
    ),
  );
export const getPerformanceEarningPolicies = () =>
  unwrap(
    apiFetch<Envelope<PerformanceEarningPolicy[]>>(
      "/api/performance/earning-policies",
    ),
  );
export const createPerformanceEarningPolicy = (data: Record<string, unknown>) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>(
      "/api/performance/earning-policies",
      post(data),
    ),
  );
export const updatePerformanceEarningPolicy = (
  id: number,
  version: number,
  data: Record<string, unknown>,
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/performance/earning-policies/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(version),
        },
        body: JSON.stringify(data),
      },
    ),
  );
export const updatePerformanceEarningPolicyStatus = (
  id: number,
  version: number,
  status: "PUBLISHED" | "RETIRED",
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/performance/earning-policies/${id}/status`,
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
export const updatePerformanceCycleStatus = (
  id: number,
  version: number,
  status: string,
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/performance/cycles/${id}/status`,
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
export const createPerformanceReview = (data: Record<string, unknown>) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>("/api/performance/reviews", post(data)),
  );
export const submitPerformanceReview = (
  id: number,
  version: number,
  data: Record<string, unknown>,
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/performance/reviews/${id}/submit`,
      {
        ...post(data),
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(version),
        },
      },
    ),
  );
export const acknowledgePerformanceReview = (
  id: number,
  version: number,
  employeeComment: string | null,
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/performance/reviews/${id}/acknowledge`,
      {
        ...post({ employee_comment: employeeComment }),
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(version),
        },
      },
    ),
  );
export const createPerformanceGoal = (
  id: number,
  data: Record<string, unknown>,
) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>(
      `/api/performance/reviews/${id}/goals`,
      post(data),
    ),
  );
export const updatePerformanceGoal = (
  id: number,
  version: number,
  data: {
    actual_value: string | null;
    score: number | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  },
) =>
  unwrap(
    apiFetch<Envelope<{ row_version: number }>>(
      `/api/performance/goals/${id}`,
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
