export interface EmailSettings {
  id: number;
  is_enabled: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_tls_mode: string | null;
  from_name: string | null;
  reply_to: string | null;
  subject_suffix: string | null;
  max_concurrency: number;
  worker_interval_seconds: number;
  failure_alert_threshold: number;
  secret_configured: boolean;
  row_version: number;
  updated_at: string | null;
  updated_by: number | null;
}

export interface EmailSettingsInput {
  is_enabled: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_tls_mode: string | null;
  from_name: string | null;
  reply_to: string | null;
  subject_suffix: string | null;
  max_concurrency: number;
  worker_interval_seconds: number;
  failure_alert_threshold: number;
}

export interface NotificationRule {
  id: number;
  event_code: string;
  module_code: string;
  name: string;
  description: string | null;
  in_app_enabled: boolean;
  email_enabled: boolean;
  default_priority: string;
  is_active: boolean;
  updated_at: string;
  updated_by: number | null;
  row_version: number;
}

export interface EmailTemplate {
  id: number;
  code: string;
  module_code: string;
  name: string;
  description: string | null;
  subject_template: string;
  body_html_template: string;
  body_text_template: string | null;
  is_active: boolean;
  updated_at: string;
  updated_by: number | null;
  row_version: number;
}

export type EmailTemplateInput = Omit<
  EmailTemplate,
  "id" | "updated_at" | "updated_by" | "row_version"
>;

export interface EmailDeliveryAttempt {
  id: number;
  email_outbox_id: number;
  attempt_no: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  error_code: string | null;
  error_message: string | null;
}

export interface EmailOutboxHistoryItem {
  id: number;
  notification_event_id: number | null;
  recipient_employee_id: number | null;
  to_email: string;
  to_name: string | null;
  subject: string;
  status: string;
  retry_count: number;
  max_retry: number;
  next_retry_at: string | null;
  sent_at: string | null;
  last_error: string | null;
  content_purged_at: string | null;
  created_at: string;
  updated_at: string;
  updated_by: number | null;
}

export interface EmailOutboxDetail extends EmailOutboxHistoryItem {
  body_html: string;
  body_text: string | null;
  attempts: EmailDeliveryAttempt[];
}

export interface EmailOutboxHealth {
  pending_count: number;
  processing_count: number;
  failed_count: number;
  sent_last_24h_count: number;
  oldest_pending_at: string | null;
}

export interface EmailHealth {
  settings: EmailSettings;
  outbox: EmailOutboxHealth;
}
