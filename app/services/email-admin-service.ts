import { apiFetch } from "@/app/utils/api-client";
import type { ResponseType } from "@/app/types/response-type";
import type {
  EmailDeliveryAttempt,
  EmailHealth,
  EmailOutboxDetail,
  EmailOutboxHistoryItem,
  EmailSettings,
  EmailSettingsInput,
  EmailTemplate,
  EmailTemplateInput,
  NotificationRule,
} from "@/app/types/email-admin";

const unwrap = <T>(response: ResponseType<T>): T => response.data;

export async function getEmailSettings(): Promise<EmailSettings> {
  return unwrap(
    await apiFetch<ResponseType<EmailSettings>>("/api/email-settings"),
  );
}

export async function updateEmailSettings(
  rowVersion: number,
  input: EmailSettingsInput,
): Promise<EmailSettings> {
  return unwrap(
    await apiFetch<ResponseType<EmailSettings>>("/api/email-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function sendEmailTest(
  toEmail: string,
): Promise<{ message: string }> {
  return unwrap(
    await apiFetch<ResponseType<{ message: string }>>(
      "/api/email-settings/test",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_email: toEmail }),
      },
    ),
  );
}

export async function getNotificationRules(): Promise<NotificationRule[]> {
  return unwrap(
    await apiFetch<ResponseType<NotificationRule[]>>("/api/notification-rules"),
  );
}

export async function updateNotificationRule(
  id: number,
  rowVersion: number,
  input: Partial<
    Pick<
      NotificationRule,
      "in_app_enabled" | "email_enabled" | "default_priority" | "is_active"
    >
  >,
): Promise<NotificationRule> {
  return unwrap(
    await apiFetch<ResponseType<NotificationRule>>(
      `/api/notification-rules/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify(input),
      },
    ),
  );
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  return unwrap(
    await apiFetch<ResponseType<EmailTemplate[]>>("/api/email-templates"),
  );
}

export async function createEmailTemplate(
  input: EmailTemplateInput,
): Promise<EmailTemplate> {
  return unwrap(
    await apiFetch<ResponseType<EmailTemplate>>("/api/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function updateEmailTemplate(
  id: number,
  rowVersion: number,
  input: EmailTemplateInput,
): Promise<EmailTemplate> {
  return unwrap(
    await apiFetch<ResponseType<EmailTemplate>>(`/api/email-templates/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify(input),
    }),
  );
}

export async function previewEmailTemplate(
  code: string,
  values: Record<string, string>,
) {
  return unwrap(
    await apiFetch<
      ResponseType<{
        code: string;
        subject: string;
        body_html: string;
        body_text: string | null;
      }>
    >(`/api/email-templates/${encodeURIComponent(code)}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    }),
  );
}

export async function getEmailHistory(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<EmailOutboxHistoryItem[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.limit !== undefined) search.set("limit", String(params.limit));
  if (params?.offset !== undefined) search.set("offset", String(params.offset));
  const suffix = search.toString() ? `?${search.toString()}` : "";

  return unwrap(
    await apiFetch<ResponseType<EmailOutboxHistoryItem[]>>(
      `/api/email-outbox${suffix}`,
    ),
  );
}

export async function getEmailHistoryDetail(
  id: number,
): Promise<EmailOutboxDetail> {
  return unwrap(
    await apiFetch<ResponseType<EmailOutboxDetail>>(`/api/email-outbox/${id}`),
  );
}

export async function resendEmail(id: number): Promise<{ id: number }> {
  return unwrap(
    await apiFetch<ResponseType<{ id: number }>>(
      `/api/email-outbox/${id}/resend`,
      {
        method: "POST",
      },
    ),
  );
}

export async function cleanupEmailHistory(beforeDays: number) {
  return unwrap(
    await apiFetch<ResponseType<{ redacted: number }>>(
      "/api/email-outbox/cleanup",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ before_days: beforeDays }),
      },
    ),
  );
}

export async function getEmailHealth(): Promise<EmailHealth> {
  return unwrap(
    await apiFetch<ResponseType<EmailHealth>>("/api/email-outbox/health"),
  );
}

export type { EmailDeliveryAttempt };
