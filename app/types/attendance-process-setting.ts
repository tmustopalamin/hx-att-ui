export interface AttendanceProcessSetting {
  id: number;

  auto_process_enabled: boolean;
  process_interval_minutes: number;
  lookback_days: number;

  last_process_at: string | null;
  last_process_status: string | null;
  last_process_error: string | null;
  last_processed_count: number;

  updated_at: string;
  row_version: number;
}
