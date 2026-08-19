import type {
  HolidayPositionIncentivePolicy,
  HolidayPositionIncentivePolicyPayload,
} from "@/app/types/holiday-position-incentive";
import { apiFetch } from "@/app/utils/api-client";

const URL = "/api/holiday-position-incentive-policies";

export const getHolidayPositionIncentivePolicies = (
  includeInactive = false,
): Promise<HolidayPositionIncentivePolicy[]> =>
  apiFetch(`${URL}?include_inactive=${includeInactive}`);

export const createHolidayPositionIncentivePolicy = (
  data: HolidayPositionIncentivePolicyPayload,
): Promise<HolidayPositionIncentivePolicy> =>
  apiFetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const updateHolidayPositionIncentivePolicy = (
  id: number,
  rowVersion: number,
  data: HolidayPositionIncentivePolicyPayload,
): Promise<HolidayPositionIncentivePolicy> =>
  apiFetch(`${URL}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(data),
  });
