import type {
  ApiDataResponse,
  RevokeSessionsResult,
  SessionSummary,
} from "@/app/types/account-settings";
import type { Me } from "@/app/types/me";
import { apiFetch } from "@/app/utils/api-client";

export const getAccount = () => apiFetch<Me>("/api/auth/me");

export const getSessionSummary = () =>
  apiFetch<ApiDataResponse<SessionSummary>>("/api/auth/sessions");

export const revokeOtherSessions = () =>
  apiFetch<ApiDataResponse<RevokeSessionsResult>>("/api/auth/sessions/others", {
    method: "DELETE",
  });
