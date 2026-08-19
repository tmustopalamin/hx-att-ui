export type PositionAllowanceStatus = "DRAFT" | "PUBLISHED" | "RETIRED";

export interface PositionAllowancePolicyPosition {
  id: number;
  code: string | null;
  name: string;
  monthly_amount: string | number;
}

export interface PositionAllowancePolicyExclusion {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  reason: string;
}

export interface PositionAllowancePolicy {
  id: number;
  code: string;
  name: string;
  version_no: number;
  income_component_id: number;
  income_component_code: string | null;
  income_component_name: string;
  effective_from: string;
  effective_to: string | null;
  status: PositionAllowanceStatus;
  updated_at: string;
  deleted_at: string | null;
  row_version: number;
  positions: PositionAllowancePolicyPosition[];
  exclusions: PositionAllowancePolicyExclusion[];
}

export interface PositionAllowancePolicyPositionPayload {
  position_id: number;
  monthly_amount: number;
}

export interface PositionAllowancePolicyExclusionPayload {
  employee_id: number;
  reason: string;
}

export interface PositionAllowancePolicyPayload {
  code: string;
  name: string;
  income_component_id: number;
  effective_from: string;
  effective_to: string | null;
  positions: PositionAllowancePolicyPositionPayload[];
  exclusions: PositionAllowancePolicyExclusionPayload[];
}

export interface PositionAllowancePositionOption {
  id: number;
  code: string | null;
  name: string;
}

export interface PositionAllowanceIncomeComponentOption {
  id: number;
  code: string | null;
  name: string;
  is_taxable: boolean;
  include_in_bpjs_health: boolean;
  include_in_bpjs_employment: boolean;
}

export interface PositionAllowanceEmployeeOption {
  id: number;
  code: string;
  name: string;
}

export interface PositionAllowanceOptions {
  positions: PositionAllowancePositionOption[];
  income_components: PositionAllowanceIncomeComponentOption[];
  employees: PositionAllowanceEmployeeOption[];
}

export interface PositionAllowancePreviewRow {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  position_id: number;
  position_name: string;
  monthly_amount: string | number;
  eligible: boolean;
  exclusion_reason: string | null;
  manual_assignment_conflict: boolean;
}

export interface PositionAllowancePreview {
  reference_date: string;
  eligible_count: number;
  excluded_count: number;
  conflict_count: number;
  rows: PositionAllowancePreviewRow[];
}
