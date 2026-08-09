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
}

export type ComponentCategoryPayload = Pick<
  ComponentCategory,
  | "code"
  | "name"
  | "description"
  | "display_order"
  | "category_type"
  | "is_active"
>;
