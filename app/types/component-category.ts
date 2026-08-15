export interface ComponentCategory {
  id: number;
  code: string | null;
  name: string;
  description: string | null;
  display_order: number;
  category_type: string;
  is_active: boolean;
  deleted_at: string | null;
  row_version: number;
  include_in_bpjs_health: boolean;
  include_in_bpjs_employment: boolean;
}

export type ComponentCategoryPayload = Pick<
  ComponentCategory,
  | "code"
  | "name"
  | "description"
  | "display_order"
  | "category_type"
  | "is_active"
  | "include_in_bpjs_health"
  | "include_in_bpjs_employment"
>;
