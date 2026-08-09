export interface AssetCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  row_version: number;
}
export interface CompanyAsset {
  id: number;
  asset_category_id: number;
  category_name: string;
  asset_tag: string;
  name: string;
  serial_number: string | null;
  status: "AVAILABLE" | "ASSIGNED" | "REPAIR" | "RETIRED" | "LOST";
  acquired_date: string | null;
  notes: string | null;
  row_version: number;
}
export interface AssetAssignment {
  id: number;
  company_asset_id: number;
  asset_tag: string;
  asset_name: string;
  employee_id: number;
  employee_name: string;
  lifecycle_case_id: number | null;
  assigned_at: string;
  due_return_date: string | null;
  returned_at: string | null;
  status: "ASSIGNED" | "RETURNED" | "LOST";
  assignment_note: string | null;
  return_note: string | null;
  row_version: number;
}
export interface NewAssetCategory {
  code: string;
  name: string;
  description?: string | null;
}
export interface NewCompanyAsset {
  asset_category_id: number;
  asset_tag: string;
  name: string;
  serial_number?: string | null;
  acquired_date?: string | null;
  notes?: string | null;
}
export interface CompanyAssetStatusHistory {
  id: number;
  company_asset_id: number;
  previous_status: string;
  new_status: string;
  change_reason: string | null;
  changed_at: string;
  changed_by: number;
  changed_by_name: string;
}
