import { apiFetch } from "@/app/utils/api-client";
import { ResponseType } from "@/app/types/response-type";
import {
  BackgroundJob,
  BackgroundJobAccepted,
  BackgroundJobDetail,
  BackgroundJobHealth,
  BackgroundJobPage,
} from "@/app/types/background-job";

const API_URL = "/api/background-jobs";

export interface BackgroundJobQuery {
  scope?: "mine" | "all";
  status?: string;
  job_type?: string;
  source?: string;
  limit?: number;
  offset?: number;
}

const queryString = (query?: BackgroundJobQuery) => {
  const params = new URLSearchParams();

  if (query?.scope) params.set("scope", query.scope);
  if (query?.status) params.set("status", query.status);
  if (query?.job_type) params.set("job_type", query.job_type);
  if (query?.source) params.set("source", query.source);
  if (query?.limit !== undefined) params.set("limit", String(query.limit));
  if (query?.offset !== undefined) params.set("offset", String(query.offset));

  const value = params.toString();
  return value ? `?${value}` : "";
};

export const getBackgroundJobs = async (
  query?: BackgroundJobQuery,
): Promise<BackgroundJobPage> => {
  const response = await apiFetch<ResponseType<BackgroundJobPage>>(
    `${API_URL}${queryString(query)}`,
  );
  return response.data;
};

export const getBackgroundJobDetail = async (
  id: number,
): Promise<BackgroundJobDetail> => {
  const response = await apiFetch<ResponseType<BackgroundJobDetail>>(
    `${API_URL}/${id}`,
  );
  return response.data;
};

export const getBackgroundJobHealth =
  async (): Promise<BackgroundJobHealth> => {
    const response = await apiFetch<ResponseType<BackgroundJobHealth>>(
      `${API_URL}/health`,
    );
    return response.data;
  };

export const cancelBackgroundJob = async (
  id: number,
  rowVersion: number,
  reason: string,
): Promise<BackgroundJob> => {
  const response = await apiFetch<ResponseType<BackgroundJob>>(
    `${API_URL}/${id}/cancel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify({ reason: reason.trim() }),
    },
  );
  return response.data;
};

export type { BackgroundJob, BackgroundJobAccepted };
