export interface User {
  id: number;
  employee_id: number;
  username: string;
  password: string;
  email: string;
  role: string[];
  is_active: boolean;
  deleted_at: string | null;
  row_version: number;

  // tambahan untuk kebutuhan list / display
  employee_code?: string | null;
  full_name?: string;

  // tambahan sesuai perubahan backend terbaru
  must_change_password?: boolean;
  last_login_at?: string | null;
  password_changed_at?: string | null;

  // optional kalau nanti dipakai di audit/detail
  created_at?: string;
  updated_at?: string;
  created_by?: number | null;
  updated_by?: number | null;
  deleted_by?: number | null;
}
