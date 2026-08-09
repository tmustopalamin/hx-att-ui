import { apiFetch, parseApiError } from "@/app/utils/api-client";
import type {
  HrAnalyticsAttentionItem,
  HrAnalyticsAttentionKind,
  HrAnalyticsFilters,
  HrAnalyticsOverview,
} from "@/app/types/hr-analytics";

type Envelope<T> = { success: boolean; data: T; message: string };

const toQueryString = (filters: HrAnalyticsFilters): string => {
  const params = new URLSearchParams();
  if (filters.departmentId) {
    params.set("department_id", String(filters.departmentId));
  }
  if (filters.branchId) {
    params.set("branch_id", String(filters.branchId));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
};

export const getHrAnalyticsOverview = (filters: HrAnalyticsFilters) =>
  apiFetch<Envelope<HrAnalyticsOverview>>(
    `/api/hr-analytics/overview${toQueryString(filters)}`,
  ).then((response) => response.data);

export const getHrAnalyticsAttention = (
  kind: HrAnalyticsAttentionKind,
  filters: HrAnalyticsFilters,
) => {
  const params = new URLSearchParams(toQueryString(filters).replace("?", ""));
  params.set("kind", kind);
  params.set("limit", "100");
  return apiFetch<Envelope<HrAnalyticsAttentionItem[]>>(
    `/api/hr-analytics/attention?${params.toString()}`,
  ).then((response) => response.data);
};

export const exportHrAnalyticsOverview = async (
  filters: HrAnalyticsFilters,
): Promise<Blob> => {
  const response = await fetch(
    `/api/hr-analytics/export${toQueryString(filters)}`,
    { credentials: "include" },
  );
  if (!response.ok) {
    throw await parseApiError(response);
  }
  return response.blob();
};
