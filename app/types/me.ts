export interface Me {
  user_id: number;
  employee_id: number;
  email: string;
  username: string;
  name: string;
  role: string[];
  permissions: string[];
  photo_url: string;
  must_change_password: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
}
