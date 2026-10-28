export interface EmployeeBulkImportRow {
  code: string;
  nik?: string | null;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  preferred_name?: string | null;
  birth_place: string;
  dob: string; // YYYY-MM-DD
  gender: string;
  religion?: string | null;
  marital_status?: string | null;
  phone_number?: string | null;
  personal_email?: string | null;
  work_email?: string | null;

  // Employment
  agency_name?: string | null;
  branch_name?: string | null;
  department_name?: string | null;
  position_name?: string | null;
  employment_status_name?: string | null;
  join_date?: string | null;
  supervisor?: string | null;

  // Bank & Payroll
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_account_holder?: string | null;
  base_salary?: number | string | null;
  npwp?: string | null;
  ptkp_code?: string | null;
  tax_method?: string | null;
  bpjs_ketenagakerjaan_number?: string | null;
  bpjs_kesehatan_number?: string | null;

  // UI state
  _row_number?: number;
  _is_existing?: boolean;
  _validation_errors?: string[];
}

export interface EmployeeBulkImportRowError {
  row_number: number;
  code?: string | null;
  message: string;
}

export interface EmployeeBulkUpsertResult {
  total_rows: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  errors: EmployeeBulkImportRowError[];
}
