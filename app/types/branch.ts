export interface Branch {
  id: number;
  code: string;
  name: string;
  agency_id?: number | null;
  agency_name?: string | null;
  address?: string | null;
  city_id: number;
  city_name?: string | null;
  state_id: number;
  state_name?: string | null;
  postal_code?: string | null;
  phone_number?: string | null;
  fax_number?: string | null;
  nitku_number?: string | null;
  npwp15_number: string;
  npwp16_number?: string | null;
  is_active: boolean;
  deleted_at?: string | null;
  row_version: number;
}
