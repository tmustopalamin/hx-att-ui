export type BackgroundJobStatus =
  | "QUEUED"
  | "RUNNING"
  | "RETRY_WAIT"
  | "CANCEL_REQUESTED"
  | "SUCCEEDED"
  | "PARTIAL_SUCCESS"
  | "FAILED"
  | "CANCELLED";

export interface BackgroundJobAccepted {
  job_id: number;
  status: BackgroundJobStatus | string;
  deduplicated: boolean;
  row_version: number;
}

export interface BackgroundJob {
  id: number;
  parent_job_id: number | null;
  job_type: string;
  source: "MANUAL" | "SCHEDULED" | "SYSTEM" | string;
  status: BackgroundJobStatus | string;
  target_type: string | null;
  target_id: number | null;
  display_name: string;
  dedupe_key: string | null;
  result: unknown;
  stage: string | null;
  progress_current: number;
  progress_total: number | null;
  progress_message: string | null;
  progress_percent?: number | null;
  attempt_count: number;
  max_attempts: number;
  available_at: string;
  lease_owner: string | null;
  lease_expires_at: string | null;
  heartbeat_at: string | null;
  requested_by_employee_id: number | null;
  cancel_requested_at: string | null;
  cancel_requested_by_employee_id: number | null;
  cancel_reason: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
  row_version: number;
  requester_employee_ids: number[];
}

export interface BackgroundJobEvent {
  id: number;
  job_id: number;
  event_type: string;
  stage: string | null;
  message: string | null;
  progress_current: number | null;
  progress_total: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface BackgroundJobAttempt {
  id: number;
  job_id: number;
  attempt_no: number;
  status: string;
  worker_id: string | null;
  started_at: string;
  finished_at: string | null;
  error_code: string | null;
  error_message: string | null;
  result: unknown;
}

export interface BackgroundJobDetail extends BackgroundJob {
  events: BackgroundJobEvent[];
  attempts: BackgroundJobAttempt[];
  children: BackgroundJob[];
}

export interface BackgroundJobPage {
  items: BackgroundJob[];
  total: number;
  limit: number;
  offset: number;
}

export interface BackgroundJobHealth {
  queued_count: number;
  running_count: number;
  retry_wait_count: number;
  failed_last_24h_count: number;
  oldest_queued_at: string | null;
  worker_last_seen_at: string | null;
}
