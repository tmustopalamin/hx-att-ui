export interface Role {
  id: number;
  code: string;
  name: string;
  description: string;
  is_active: boolean;
  deleted_at: string;
  row_version: number;
}
