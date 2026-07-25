export interface Permissions {
  id: number;
  code: string;
  resource: string;
  action: string;
  label: string;
  group_name: string;
  is_active: boolean;
  deleted_at: string;
  row_version: number;
}
