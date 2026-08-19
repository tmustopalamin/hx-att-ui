import type {
  PositionAllowancePolicy,
  PositionAllowancePolicyPayload,
  PositionAllowanceOptions,
  PositionAllowancePreview,
} from "@/app/types/position-allowance";
import { apiFetch } from "@/app/utils/api-client";

const URL = "/api/position-allowance-policies";

export const getPositionAllowancePolicies = (
  includeAll = true,
): Promise<PositionAllowancePolicy[]> =>
  apiFetch(`${URL}?include_all=${includeAll}`);

export const getPositionAllowanceOptions =
  (): Promise<PositionAllowanceOptions> => apiFetch(`${URL}/options`);

export const previewPositionAllowancePolicy = (
  data: PositionAllowancePolicyPayload,
  referenceDate?: string,
): Promise<PositionAllowancePreview> =>
  apiFetch(`${URL}/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, reference_date: referenceDate ?? null }),
  });

export const createPositionAllowancePolicy = (
  data: PositionAllowancePolicyPayload,
): Promise<PositionAllowancePolicy> =>
  apiFetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updatePositionAllowancePolicy = (
  id: number,
  rowVersion: number,
  data: PositionAllowancePolicyPayload,
): Promise<PositionAllowancePolicy> =>
  apiFetch(`${URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(data),
  });

export const createPositionAllowanceVersion = (
  id: number,
  rowVersion: number,
  effectiveFrom: string,
  effectiveTo: string | null,
): Promise<PositionAllowancePolicy> =>
  apiFetch(`${URL}/${id}/versions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({
      effective_from: effectiveFrom,
      effective_to: effectiveTo,
    }),
  });

export const setPositionAllowanceStatus = (
  id: number,
  rowVersion: number,
  status: "PUBLISHED" | "RETIRED",
  effectiveTo: string | null,
): Promise<PositionAllowancePolicy> =>
  apiFetch(`${URL}/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({ status, effective_to: effectiveTo }),
  });
