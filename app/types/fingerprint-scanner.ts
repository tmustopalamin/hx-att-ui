export interface FingerprintScanner {
  id: number;
  code: string;
  name: string;
  ip: string;
  port: string;
  password: string;

  last_pull_time?: string | null;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_error?: string | null;
  last_successful_sync_at?: string | null;
  timezone_offset_minutes?: number | null;

  auto_sync_enabled: boolean;
  sync_interval_minutes: number;

  is_active: boolean;
  deleted_at: string | null;
  row_version: number;
}
