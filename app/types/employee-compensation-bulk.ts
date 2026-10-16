export type CompensationComponentType = "INCOME" | "DEDUCTION";

export interface CompensationBulkImportRow {
  code: string; // NIK Karyawan
  employee_name?: string | null;
  component_type?: string | null; // TUNJANGAN / POTONGAN
  component_name: string; // Nama atau Kode Komponen
  amount: number; // Nominal Rp
  frequency?: string | null; // Bulanan, Harian, dsb
  start_date?: string | null; // YYYY-MM-DD
  end_date?: string | null; // YYYY-MM-DD
  percentage?: number | null;
  based_on_component?: string | null;
  notes?: string | null;

  // UI state
  _row_number?: number;
  _is_existing?: boolean;
  _resolved_type?: CompensationComponentType;
  _validation_errors?: string[];
}

export interface CompensationBulkImportRowError {
  row_number: number;
  code?: string | null;
  component_name?: string | null;
  message: string;
}

export interface CompensationBulkUpsertResult {
  total_rows: number;
  created_count: number;
  updated_count: number;
  failed_count: number;
  errors: CompensationBulkImportRowError[];
}
