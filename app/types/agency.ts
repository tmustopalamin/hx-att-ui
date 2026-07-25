export interface Agency {
  id: number;
  code: string;
  name: string;
  address: string;
  phone_number1: string;
  phone_number2?: string | null;
  is_active: boolean;
  deleted_at?: string | null;
  row_version: number;
}
