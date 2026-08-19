export interface HolidayPositionIncentivePosition {
  id: number;
  code: string | null;
  name: string;
}

export interface HolidayPositionIncentivePolicy {
  id: number;
  code: string;
  name: string;
  income_component_id: number;
  income_component_code: string | null;
  income_component_name: string;
  daily_amount: string | number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  updated_at: string;
  deleted_at: string | null;
  row_version: number;
  positions: HolidayPositionIncentivePosition[];
}

export interface HolidayPositionIncentivePolicyPayload {
  code: string;
  name: string;
  income_component_id: number;
  daily_amount: number;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  position_ids: number[];
}
