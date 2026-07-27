export interface Department {
  id: number;
  code: string;
  name: string;
  parent_id: number | null;
  is_active: boolean;
  deleted_at: string;
  row_version: number;
  parent_name?: string | null;
}
