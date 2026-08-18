"use client";

import { useEffect, useState } from "react";
import dayjs from "dayjs";
import useSWR from "swr";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputSwitch } from "primereact/inputswitch";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";
import { useDispatch, useSelector } from "react-redux";

import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import {
  cleanupEmailHistory,
  createEmailTemplate,
  getEmailHealth,
  getEmailHistory,
  getEmailHistoryDetail,
  getEmailSettings,
  getEmailTemplates,
  getNotificationRules,
  resendEmail,
  sendEmailTest,
  updateEmailSettings,
  updateEmailTemplate,
  updateNotificationRule,
} from "@/app/services/email-admin-service";
import type {
  EmailHealth,
  EmailOutboxDetail,
  EmailOutboxHistoryItem,
  EmailSettings,
  EmailSettingsInput,
  EmailTemplate,
  EmailTemplateInput,
  NotificationRule,
} from "@/app/types/email-admin";
import { getErrorMessage } from "@/app/utils/error-messages";
import { toPermissionSet } from "@/app/utils/permission-utils";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

type EmailTab = "overview" | "rules" | "templates" | "history";

const metricToneClasses = {
  amber: {
    card: "border-amber-200 bg-amber-50",
    label: "text-amber-700",
    value: "text-amber-800",
  },
  blue: {
    card: "border-blue-200 bg-blue-50",
    label: "text-blue-700",
    value: "text-blue-800",
  },
  rose: {
    card: "border-rose-200 bg-rose-50",
    label: "text-rose-700",
    value: "text-rose-800",
  },
  emerald: {
    card: "border-emerald-200 bg-emerald-50",
    label: "text-emerald-700",
    value: "text-emerald-800",
  },
  slate: {
    card: "border-slate-200 bg-slate-50",
    label: "text-slate-700",
    value: "text-slate-800",
  },
} as const;

const historyStatusOptions = [
  { label: "All statuses", value: undefined },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Sent", value: "SENT" },
  { label: "Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const DEFAULT_SETTINGS: EmailSettingsInput = {
  is_enabled: true,
  smtp_host: null,
  smtp_port: 587,
  smtp_tls_mode: "STARTTLS",
  from_name: null,
  reply_to: null,
  subject_suffix: " - PT. Hexing Technology",
  max_concurrency: 4,
  worker_interval_seconds: 30,
  failure_alert_threshold: 3,
};

const EMPTY_TEMPLATE: EmailTemplateInput = {
  code: "",
  module_code: "",
  name: "",
  description: null,
  subject_template: "",
  body_html_template: "",
  body_text_template: null,
  is_active: true,
};

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm") : "-";
};

const labelize = (value: string) =>
  value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const renderTemplatePreview = (
  template: string,
  values: Record<string, string>,
) =>
  Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, value),
    template,
  );

const EmailSettingsData = () => {
  const dispatch = useDispatch();
  const profilePermissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const permissionSet = toPermissionSet(profilePermissions);
  const canUpdateEmailSettings = permissionSet.has("email_template.update");
  const canUpdateNotificationRules = permissionSet.has(
    "notification_rule.update",
  );
  const canUpdateEmailTemplates = permissionSet.has("email_template.update");
  const canUpdateEmailOutbox = permissionSet.has("email_outbox.update");
  const [activeTab, setActiveTab] = useState<EmailTab>("overview");
  const [settingsDraft, setSettingsDraft] =
    useState<EmailSettingsInput>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [savingRuleId, setSavingRuleId] = useState<number | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<EmailTemplate | null>(null);
  const [templateDraft, setTemplateDraft] =
    useState<EmailTemplateInput>(EMPTY_TEMPLATE);
  const [templateDialogVisible, setTemplateDialogVisible] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [preview, setPreview] = useState<{
    subject: string;
    body_html: string;
  } | null>(null);
  const [previewingCode, setPreviewingCode] = useState<string | null>(null);
  const [selectedHistory, setSelectedHistory] =
    useState<EmailOutboxDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [resendingId, setResendingId] = useState<number | null>(null);
  const [cleanupDays, setCleanupDays] = useState(90);
  const [isCleaning, setIsCleaning] = useState(false);
  const [historyStatus, setHistoryStatus] = useState<string | undefined>();

  const settingsKey = "/api/email-settings";
  const rulesKey = "/api/notification-rules";
  const templatesKey = "/api/email-templates";
  const historyKey = `/api/email-outbox?limit=100${historyStatus ? `&status=${historyStatus}` : ""}`;
  const healthKey = "/api/email-outbox/health";

  const {
    data: settings,
    error: settingsError,
    isLoading: settingsLoading,
    isValidating: settingsValidating,
    mutate: refreshSettings,
  } = useSWR<EmailSettings>(settingsKey, getEmailSettings, {
    revalidateOnFocus: false,
  });
  const {
    data: rules,
    error: rulesError,
    isLoading: rulesLoading,
    mutate: refreshRules,
  } = useSWR<NotificationRule[]>(
    activeTab === "rules" ? rulesKey : null,
    getNotificationRules,
    {
      revalidateOnFocus: false,
    },
  );
  const {
    data: templates,
    error: templatesError,
    isLoading: templatesLoading,
    mutate: refreshTemplates,
  } = useSWR<EmailTemplate[]>(
    activeTab === "templates" ? templatesKey : null,
    getEmailTemplates,
    { revalidateOnFocus: false },
  );
  const {
    data: history,
    error: historyError,
    isLoading: historyLoading,
    mutate: refreshHistory,
  } = useSWR<EmailOutboxHistoryItem[]>(
    activeTab === "history" ? historyKey : null,
    () => getEmailHistory({ limit: 100, status: historyStatus }),
  );
  const {
    data: health,
    error: healthError,
    isLoading: healthLoading,
    isValidating: healthValidating,
    mutate: refreshHealth,
  } = useSWR<EmailHealth>(healthKey, getEmailHealth, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (!settings) return;
    setSettingsDraft({
      is_enabled: settings.is_enabled,
      smtp_host: settings.smtp_host,
      smtp_port: settings.smtp_port,
      smtp_tls_mode: settings.smtp_tls_mode ?? "STARTTLS",
      from_name: settings.from_name,
      reply_to: settings.reply_to,
      subject_suffix: settings.subject_suffix,
      max_concurrency: settings.max_concurrency,
      worker_interval_seconds: settings.worker_interval_seconds,
      failure_alert_threshold: settings.failure_alert_threshold,
    });
  }, [settings]);

  const isLoading =
    settingsLoading ||
    healthLoading ||
    (activeTab === "rules" && rulesLoading) ||
    (activeTab === "templates" && templatesLoading) ||
    (activeTab === "history" && historyLoading);
  const errorKey = settingsError
    ? settingsKey
    : healthError
      ? healthKey
      : activeTab === "rules" && rulesError
        ? rulesKey
        : activeTab === "templates" && templatesError
          ? templatesKey
          : activeTab === "history" && historyError
            ? historyKey
            : null;

  const showSuccess = (detail: string) => {
    dispatch(
      showToast({
        visible: true,
        severity: "success",
        summary: "Success",
        detail,
      }),
    );
  };

  const showError = (errorValue: unknown) => {
    dispatch(
      showToast({
        visible: true,
        severity: "error",
        summary: "Email configuration",
        detail: getErrorMessage(errorValue, "message"),
      }),
    );
  };

  const saveSettings = async () => {
    if (!canUpdateEmailSettings || !settings || isSavingSettings) return;
    try {
      setIsSavingSettings(true);
      await updateEmailSettings(settings.row_version, {
        ...settingsDraft,
        smtp_host: settingsDraft.smtp_host?.trim() || null,
        from_name: settingsDraft.from_name?.trim() || null,
        reply_to: settingsDraft.reply_to?.trim() || null,
        subject_suffix: settingsDraft.subject_suffix?.trim() || null,
        smtp_tls_mode: settingsDraft.smtp_tls_mode?.toUpperCase() || null,
      });
      await Promise.all([refreshSettings(), refreshHealth()]);
      showSuccess(
        "Email settings updated. New sends use the saved non-secret configuration.",
      );
    } catch (errorValue) {
      showError(errorValue);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const runTest = async () => {
    if (!canUpdateEmailSettings || !testEmail.trim() || isTesting) return;
    try {
      setIsTesting(true);
      await sendEmailTest(testEmail.trim());
      showSuccess("Test email sent successfully.");
    } catch (errorValue) {
      showError(errorValue);
    } finally {
      setIsTesting(false);
    }
  };

  const toggleRule = async (
    row: NotificationRule,
    field: "in_app_enabled" | "email_enabled" | "is_active",
    value: boolean,
  ) => {
    if (!canUpdateNotificationRules || savingRuleId === row.id) return;
    try {
      setSavingRuleId(row.id);
      await updateNotificationRule(row.id, row.row_version, {
        [field]: value,
      });
      await Promise.all([refreshRules(), refreshHealth()]);
      showSuccess(`${row.name} updated.`);
    } catch (errorValue) {
      showError(errorValue);
    } finally {
      setSavingRuleId(null);
    }
  };

  const openTemplate = (template?: EmailTemplate) => {
    setSelectedTemplate(template ?? null);
    setTemplateDraft(
      template
        ? {
            code: template.code,
            module_code: template.module_code,
            name: template.name,
            description: template.description,
            subject_template: template.subject_template,
            body_html_template: template.body_html_template,
            body_text_template: template.body_text_template,
            is_active: template.is_active,
          }
        : EMPTY_TEMPLATE,
    );
    setPreview(null);
    setTemplateDialogVisible(true);
  };

  const saveTemplate = async () => {
    if (!canUpdateEmailTemplates || isSavingTemplate) return;
    try {
      setIsSavingTemplate(true);
      const payload = {
        ...templateDraft,
        code: templateDraft.code.trim().toUpperCase(),
        module_code: templateDraft.module_code.trim().toUpperCase(),
        name: templateDraft.name.trim(),
        description: templateDraft.description?.trim() || null,
        body_text_template: templateDraft.body_text_template?.trim() || null,
      };
      if (selectedTemplate) {
        await updateEmailTemplate(
          selectedTemplate.id,
          selectedTemplate.row_version,
          payload,
        );
      } else {
        await createEmailTemplate(payload);
      }
      await refreshTemplates();
      setTemplateDialogVisible(false);
      showSuccess("Email template saved.");
    } catch (errorValue) {
      showError(errorValue);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const runPreview = async () => {
    if (!templateDraft.code.trim() || previewingCode) return;
    try {
      setPreviewingCode(templateDraft.code);
      const values = {
        employee_name: "Example Employee",
        action_url: "/my-payslips",
      };
      setPreview({
        subject: renderTemplatePreview(templateDraft.subject_template, values),
        body_html: renderTemplatePreview(
          templateDraft.body_html_template,
          values,
        ),
      });
    } catch (errorValue) {
      showError(errorValue);
    } finally {
      setPreviewingCode(null);
    }
  };

  const openHistoryDetail = async (row: EmailOutboxHistoryItem) => {
    try {
      setIsLoadingDetail(true);
      setSelectedHistory(await getEmailHistoryDetail(row.id));
    } catch (errorValue) {
      showError(errorValue);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const resend = async (row: EmailOutboxHistoryItem) => {
    if (
      !canUpdateEmailOutbox ||
      row.content_purged_at ||
      resendingId === row.id
    )
      return;
    try {
      setResendingId(row.id);
      await resendEmail(row.id);
      await Promise.all([refreshHistory(), refreshHealth()]);
      showSuccess(
        "A new email attempt was queued. The original history row was preserved.",
      );
    } catch (errorValue) {
      showError(errorValue);
    } finally {
      setResendingId(null);
    }
  };

  const cleanup = () => {
    if (!canUpdateEmailOutbox || isCleaning || cleanupDays < 1) return;

    const beforeDays = cleanupDays;
    requestActionConfirmation({
      action: "Purge email content",
      target: `Eligible records older than ${beforeDays} days`,
      description: `This permanently removes recipient addresses and message content from sent, failed, and cancelled outbox records older than ${beforeDays} days. Delivery status and audit metadata remain. Continue?`,
      severity: "danger",
      confirmLabel: "Purge content",
      onAccept: async () => {
        try {
          setIsCleaning(true);
          const result = await cleanupEmailHistory(beforeDays);
          await Promise.all([refreshHistory(), refreshHealth()]);
          showSuccess(
            `${result.redacted} email content record(s) purged; audit metadata remains.`,
          );
        } catch (errorValue) {
          showError(errorValue);
        } finally {
          setIsCleaning(false);
        }
      },
    });
  };

  const tabs: { key: EmailTab; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "pi-chart-bar" },
    { key: "rules", label: "Notification Rules", icon: "pi-sliders-h" },
    { key: "templates", label: "Templates", icon: "pi-file-edit" },
    { key: "history", label: "History & Retry", icon: "pi-history" },
  ];

  const statusSeverity = (status: string) => {
    if (status === "SENT") return "success" as const;
    if (status === "FAILED") return "danger" as const;
    if (status === "PROCESSING") return "info" as const;
    if (status === "CANCELLED") return "secondary" as const;
    return "warning" as const;
  };

  const failureAlertActive = Boolean(
    health &&
    health.outbox.failed_count >= health.settings.failure_alert_threshold,
  );

  const renderOverview = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          ["Pending", health?.outbox.pending_count ?? 0, "amber"],
          ["Processing", health?.outbox.processing_count ?? 0, "blue"],
          ["Failed", health?.outbox.failed_count ?? 0, "rose"],
          ["Sent / 24h", health?.outbox.sent_last_24h_count ?? 0, "emerald"],
          ["Concurrency", settings?.max_concurrency ?? 0, "slate"],
        ].map(([label, value, tone]) => (
          <div
            key={String(label)}
            className={`rounded-xl border p-4 ${metricToneClasses[tone as keyof typeof metricToneClasses].card}`}
          >
            <p
              className={`m-0 text-xs ${metricToneClasses[tone as keyof typeof metricToneClasses].label}`}
            >
              {label}
            </p>
            <p
              className={`m-0 mt-1 text-2xl font-semibold ${metricToneClasses[tone as keyof typeof metricToneClasses].value}`}
            >
              {value}
            </p>
          </div>
        ))}
      </div>

      {failureAlertActive && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
          <i className="pi pi-exclamation-triangle mt-0.5 text-rose-600" />
          <div>
            <p className="m-0 font-semibold">Email delivery needs attention</p>
            <p className="m-0 mt-1 text-sm text-rose-800">
              Failed email count has reached the configured alert threshold.
              Review the history and retry eligible messages.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)]">
        <Card className="border border-slate-200 shadow-sm">
          <div className="space-y-5 p-1">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="m-0 text-lg font-semibold text-slate-800">
                  Delivery configuration
                </h2>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  SMTP credentials stay in deployment secrets. These fields are
                  safe operational settings.
                </p>
              </div>
              <InputSwitch
                checked={settingsDraft.is_enabled}
                disabled={!canUpdateEmailSettings}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    is_enabled: Boolean(event.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-600">
                SMTP host
                <InputText
                  value={settingsDraft.smtp_host ?? ""}
                  disabled={!canUpdateEmailSettings}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      smtp_host: event.target.value,
                    }))
                  }
                  className="mt-1 w-full"
                  placeholder="smtp.gmail.com"
                />
              </label>
              <label className="text-sm text-slate-600">
                SMTP port
                <InputNumber
                  value={settingsDraft.smtp_port}
                  disabled={!canUpdateEmailSettings}
                  onValueChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      smtp_port: event.value ?? null,
                    }))
                  }
                  className="mt-1 w-full"
                  inputClassName="w-full"
                  min={1}
                  max={65535}
                />
              </label>
              <label className="text-sm text-slate-600">
                TLS mode
                <Dropdown
                  value={settingsDraft.smtp_tls_mode}
                  disabled={!canUpdateEmailSettings}
                  options={["STARTTLS", "SMTPS", "TLS", "AUTO"]}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      smtp_tls_mode: event.value,
                    }))
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="text-sm text-slate-600">
                From name
                <InputText
                  value={settingsDraft.from_name ?? ""}
                  disabled={!canUpdateEmailSettings}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      from_name: event.target.value,
                    }))
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="text-sm text-slate-600">
                Reply-to
                <InputText
                  value={settingsDraft.reply_to ?? ""}
                  disabled={!canUpdateEmailSettings}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      reply_to: event.target.value,
                    }))
                  }
                  className="mt-1 w-full"
                  placeholder="Optional"
                />
              </label>
              <label className="text-sm text-slate-600">
                Subject suffix
                <InputText
                  value={settingsDraft.subject_suffix ?? ""}
                  disabled={!canUpdateEmailSettings}
                  onChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      subject_suffix: event.target.value,
                    }))
                  }
                  className="mt-1 w-full"
                />
              </label>
              <label className="text-sm text-slate-600">
                Max concurrent sends
                <InputNumber
                  value={settingsDraft.max_concurrency}
                  disabled={!canUpdateEmailSettings}
                  onValueChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      max_concurrency: event.value ?? 4,
                    }))
                  }
                  className="mt-1 w-full"
                  inputClassName="w-full"
                  min={1}
                  max={16}
                />
              </label>
              <label className="text-sm text-slate-600">
                Worker interval (seconds)
                <InputNumber
                  value={settingsDraft.worker_interval_seconds}
                  disabled={!canUpdateEmailSettings}
                  onValueChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      worker_interval_seconds: event.value ?? 30,
                    }))
                  }
                  className="mt-1 w-full"
                  inputClassName="w-full"
                  min={5}
                  max={3600}
                />
              </label>
              <label className="text-sm text-slate-600">
                Failure alert threshold
                <InputNumber
                  value={settingsDraft.failure_alert_threshold}
                  disabled={!canUpdateEmailSettings}
                  onValueChange={(event) =>
                    setSettingsDraft((current) => ({
                      ...current,
                      failure_alert_threshold: event.value ?? 3,
                    }))
                  }
                  className="mt-1 w-full"
                  inputClassName="w-full"
                  min={1}
                  max={100}
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Deployment secret:{" "}
                {settings?.secret_configured ? "configured" : "not detected"}
              </span>
              {canUpdateEmailSettings && (
                <Button
                  label="Save settings"
                  icon="pi pi-check"
                  loading={isSavingSettings}
                  disabled={!settings || isSavingSettings}
                  onClick={saveSettings}
                  size="small"
                />
              )}
            </div>
          </div>
        </Card>

        {canUpdateEmailSettings && (
          <Card className="border border-slate-200 shadow-sm">
            <div className="space-y-4 p-1">
              <div>
                <h2 className="m-0 text-lg font-semibold text-slate-800">
                  Test delivery
                </h2>
                <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                  Sends one diagnostic message using the current secret and
                  non-secret settings.
                </p>
              </div>
              <InputText
                value={testEmail}
                onChange={(event) => setTestEmail(event.target.value)}
                className="w-full"
                placeholder="recipient@example.com"
                type="email"
              />
              <Button
                label="Send test email"
                icon="pi pi-send"
                outlined
                loading={isTesting}
                disabled={!testEmail.trim() || isTesting}
                onClick={runTest}
                className="w-full"
              />
              <p className="m-0 text-xs leading-5 text-slate-400">
                Test sends are not used for business notifications. Business
                email remains durable in outbox history.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );

  const renderRules = () => (
    <Card className="border border-slate-200 shadow-sm">
      <div className="space-y-4 p-1">
        <div>
          <h2 className="m-0 text-lg font-semibold text-slate-800">
            Notification rules
          </h2>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Existing channel choices are preserved. New rollout events start
            disabled until explicitly enabled.
          </p>
        </div>
        <DataTable
          value={rules ?? []}
          dataKey="id"
          stripedRows
          paginator
          rows={12}
          responsiveLayout="scroll"
          emptyMessage="No notification rules found."
        >
          <Column
            field="event_code"
            header="Event"
            body={(row: NotificationRule) => (
              <span className="font-medium text-slate-800">
                {labelize(row.event_code)}
              </span>
            )}
          />
          <Column
            field="module_code"
            header="Module"
            body={(row: NotificationRule) => (
              <Tag value={labelize(row.module_code)} severity="info" rounded />
            )}
          />
          <Column
            field="description"
            header="Description"
            body={(row: NotificationRule) => (
              <span className="text-sm text-slate-500">
                {row.description || "-"}
              </span>
            )}
          />
          <Column
            header="In-app"
            body={(row: NotificationRule) => (
              <InputSwitch
                checked={row.in_app_enabled}
                disabled={
                  !canUpdateNotificationRules || savingRuleId === row.id
                }
                onChange={(event) =>
                  toggleRule(row, "in_app_enabled", Boolean(event.value))
                }
              />
            )}
          />
          <Column
            header="Email"
            body={(row: NotificationRule) => (
              <InputSwitch
                checked={row.email_enabled}
                disabled={
                  !canUpdateNotificationRules || savingRuleId === row.id
                }
                onChange={(event) =>
                  toggleRule(row, "email_enabled", Boolean(event.value))
                }
              />
            )}
          />
          <Column
            header="Active"
            body={(row: NotificationRule) => (
              <InputSwitch
                checked={row.is_active}
                disabled={
                  !canUpdateNotificationRules || savingRuleId === row.id
                }
                onChange={(event) =>
                  toggleRule(row, "is_active", Boolean(event.value))
                }
              />
            )}
          />
          <Column
            field="updated_at"
            header="Updated"
            body={(row: NotificationRule) => (
              <span className="whitespace-nowrap text-sm text-slate-500">
                {formatDate(row.updated_at)}
              </span>
            )}
          />
        </DataTable>
      </div>
    </Card>
  );

  const renderTemplates = () => (
    <Card className="border border-slate-200 shadow-sm">
      <div className="space-y-4 p-1">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="m-0 text-lg font-semibold text-slate-800">
              Email templates
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Use safe placeholders such as {"{{employee_name}}"} and{" "}
              {"{{action_url}}"}.
            </p>
          </div>
          {canUpdateEmailTemplates && (
            <Button
              label="New template"
              icon="pi pi-plus"
              size="small"
              onClick={() => openTemplate()}
            />
          )}
        </div>
        <DataTable
          value={templates ?? []}
          dataKey="id"
          stripedRows
          paginator
          rows={10}
          responsiveLayout="scroll"
          emptyMessage="No email templates configured. Generic fallback email remains active."
        >
          <Column
            field="code"
            header="Code"
            body={(row: EmailTemplate) => (
              <span className="font-mono text-xs text-slate-700">
                {row.code}
              </span>
            )}
          />
          <Column field="name" header="Name" />
          <Column field="module_code" header="Module" />
          <Column
            header="Status"
            body={(row: EmailTemplate) => (
              <Tag
                value={row.is_active ? "Active" : "Inactive"}
                severity={row.is_active ? "success" : "secondary"}
                rounded
              />
            )}
          />
          <Column
            field="updated_at"
            header="Updated"
            body={(row: EmailTemplate) => formatDate(row.updated_at)}
          />
          {canUpdateEmailTemplates && (
            <Column
              header="Action"
              body={(row: EmailTemplate) => (
                <Button
                  icon="pi pi-pencil"
                  rounded
                  outlined
                  size="small"
                  tooltip="Edit template"
                  onClick={() => openTemplate(row)}
                />
              )}
            />
          )}
        </DataTable>
      </div>
    </Card>
  );

  const renderHistory = () => (
    <Card className="border border-slate-200 shadow-sm">
      <div className="space-y-4 p-1">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="m-0 text-lg font-semibold text-slate-800">
              Outgoing email history
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Every retry has an attempt record. Resend creates a new linked
              outbox row.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Dropdown
              value={historyStatus}
              options={historyStatusOptions}
              onChange={(event) => setHistoryStatus(event.value)}
              placeholder="All statuses"
              className="w-full sm:w-44"
            />
            <InputNumber
              value={cleanupDays}
              onValueChange={(event) => setCleanupDays(event.value ?? 90)}
              disabled={!canUpdateEmailOutbox}
              suffix=" days"
              min={1}
              max={3650}
              className="w-full sm:w-32"
              inputClassName="w-full"
            />
            {canUpdateEmailOutbox && (
              <Button
                label="Purge content"
                icon="pi pi-eraser"
                severity="secondary"
                outlined
                loading={isCleaning}
                onClick={cleanup}
              />
            )}
          </div>
        </div>
        <DataTable
          value={history ?? []}
          dataKey="id"
          stripedRows
          paginator
          rows={15}
          responsiveLayout="scroll"
          emptyMessage="No outgoing email history found."
        >
          <Column
            field="created_at"
            header="Created"
            body={(row: EmailOutboxHistoryItem) => (
              <span className="whitespace-nowrap text-sm">
                {formatDate(row.created_at)}
              </span>
            )}
            sortable
          />
          <Column
            field="to_email"
            header="Recipient"
            body={(row: EmailOutboxHistoryItem) => (
              <span className="text-sm">{row.to_email}</span>
            )}
          />
          <Column
            field="subject"
            header="Subject"
            body={(row: EmailOutboxHistoryItem) => (
              <span className="max-w-[20rem] truncate text-sm text-slate-700">
                {row.subject}
              </span>
            )}
          />
          <Column
            field="status"
            header="Status"
            body={(row: EmailOutboxHistoryItem) => (
              <Tag
                value={row.status}
                severity={statusSeverity(row.status)}
                rounded
              />
            )}
          />
          <Column
            header="Attempts"
            body={(row: EmailOutboxHistoryItem) =>
              `${row.retry_count}/${row.max_retry}`
            }
          />
          <Column
            field="last_error"
            header="Last error"
            body={(row: EmailOutboxHistoryItem) => (
              <span className="max-w-[16rem] truncate text-xs text-rose-700">
                {row.last_error || "-"}
              </span>
            )}
          />
          <Column
            header="Action"
            body={(row: EmailOutboxHistoryItem) => (
              <div className="flex gap-2">
                <Button
                  icon="pi pi-eye"
                  rounded
                  outlined
                  size="small"
                  tooltip="View detail"
                  onClick={() => openHistoryDetail(row)}
                />
                {canUpdateEmailOutbox && (
                  <Button
                    icon="pi pi-replay"
                    rounded
                    outlined
                    severity="warning"
                    size="small"
                    tooltip={
                      row.content_purged_at
                        ? "Content purged; resend unavailable"
                        : "Queue resend"
                    }
                    disabled={
                      !["FAILED", "SENT", "CANCELLED"].includes(row.status) ||
                      Boolean(row.content_purged_at) ||
                      resendingId === row.id
                    }
                    loading={resendingId === row.id}
                    onClick={() => resend(row)}
                  />
                )}
              </div>
            )}
          />
        </DataTable>
      </div>
    </Card>
  );

  if (isLoading) return <LoadingDataTable />;
  if (errorKey) return <ErrorNotConnectedToApi mutateKey={errorKey} />;

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="space-y-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
                <i className="pi pi-envelope text-xl" />
              </div>
              <div>
                <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
                  Email Configuration
                </h1>
                <p className="m-0 mt-1 max-w-3xl text-sm leading-6 text-slate-500">
                  Configure business email delivery, notification channels,
                  templates, and durable resend history without putting SMTP
                  work on request handlers.
                </p>
              </div>
            </div>
            <Button
              label="Refresh"
              icon="pi pi-refresh"
              severity="secondary"
              outlined
              size="small"
              loading={settingsValidating || healthValidating}
              onClick={() =>
                Promise.all([
                  refreshSettings(),
                  refreshRules(),
                  refreshTemplates(),
                  refreshHistory(),
                  refreshHealth(),
                ])
              }
            />
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${activeTab === tab.key ? "bg-white text-blue-700 shadow-sm ring-1 ring-blue-100" : "text-slate-600 hover:bg-white"}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <i className={`pi ${tab.icon}`} />
                {tab.label}
              </button>
            ))}
          </div>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "rules" && renderRules()}
          {activeTab === "templates" && renderTemplates()}
          {activeTab === "history" && renderHistory()}
        </div>
      </Card>

      <Dialog
        header={selectedTemplate ? "Edit email template" : "New email template"}
        visible={templateDialogVisible}
        onHide={() => !isSavingTemplate && setTemplateDialogVisible(false)}
        style={{ width: "min(900px, 96vw)" }}
        modal
      >
        <div className="space-y-4 pt-2">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm text-slate-600">
              Code
              <InputText
                value={templateDraft.code}
                disabled={!canUpdateEmailTemplates || Boolean(selectedTemplate)}
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    code: event.target.value,
                  }))
                }
                className="mt-1 w-full"
              />
            </label>
            <label className="text-sm text-slate-600">
              Module
              <InputText
                value={templateDraft.module_code}
                disabled={!canUpdateEmailTemplates}
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    module_code: event.target.value,
                  }))
                }
                className="mt-1 w-full"
              />
            </label>
            <label className="text-sm text-slate-600">
              Name
              <InputText
                value={templateDraft.name}
                disabled={!canUpdateEmailTemplates}
                onChange={(event) =>
                  setTemplateDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-1 w-full"
              />
            </label>
          </div>
          <label className="block text-sm text-slate-600">
            Description
            <InputText
              value={templateDraft.description ?? ""}
              disabled={!canUpdateEmailTemplates}
              onChange={(event) =>
                setTemplateDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-sm text-slate-600">
            Subject template
            <InputText
              value={templateDraft.subject_template}
              disabled={!canUpdateEmailTemplates}
              onChange={(event) =>
                setTemplateDraft((current) => ({
                  ...current,
                  subject_template: event.target.value,
                }))
              }
              className="mt-1 w-full"
            />
          </label>
          <label className="block text-sm text-slate-600">
            HTML template
            <InputTextarea
              value={templateDraft.body_html_template}
              disabled={!canUpdateEmailTemplates}
              onChange={(event) =>
                setTemplateDraft((current) => ({
                  ...current,
                  body_html_template: event.target.value,
                }))
              }
              className="mt-1 w-full font-mono text-xs"
              rows={10}
              autoResize
            />
          </label>
          <label className="block text-sm text-slate-600">
            Plain text template
            <InputTextarea
              value={templateDraft.body_text_template ?? ""}
              disabled={!canUpdateEmailTemplates}
              onChange={(event) =>
                setTemplateDraft((current) => ({
                  ...current,
                  body_text_template: event.target.value,
                }))
              }
              className="mt-1 w-full font-mono text-xs"
              rows={5}
              autoResize
            />
          </label>
          <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
            <span className="text-sm text-slate-600">Active template</span>
            <InputSwitch
              checked={templateDraft.is_active}
              disabled={!canUpdateEmailTemplates}
              onChange={(event) =>
                setTemplateDraft((current) => ({
                  ...current,
                  is_active: Boolean(event.value),
                }))
              }
            />
          </div>
          {preview && (
            <div className="space-y-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="m-0 text-sm font-medium text-blue-900">
                Preview: {preview.subject}
              </p>
              <iframe
                title="Email template preview"
                sandbox=""
                srcDoc={preview.body_html}
                className="h-64 w-full rounded border border-blue-100 bg-white"
              />
            </div>
          )}
          <div className="flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button
              label="Cancel"
              text
              severity="secondary"
              disabled={isSavingTemplate}
              onClick={() => setTemplateDialogVisible(false)}
            />
            <Button
              label="Preview"
              icon="pi pi-eye"
              outlined
              loading={previewingCode === templateDraft.code}
              onClick={runPreview}
            />
            {canUpdateEmailTemplates && (
              <Button
                label="Save template"
                icon="pi pi-check"
                loading={isSavingTemplate}
                onClick={saveTemplate}
              />
            )}
          </div>
        </div>
      </Dialog>

      <Dialog
        header="Email delivery detail"
        visible={Boolean(selectedHistory) || isLoadingDetail}
        onHide={() => !isLoadingDetail && setSelectedHistory(null)}
        style={{ width: "min(800px, 96vw)" }}
        modal
      >
        {selectedHistory && (
          <div className="space-y-4">
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-slate-500">Recipient</span>
                <p className="m-0 font-medium">{selectedHistory.to_email}</p>
              </div>
              <div>
                <span className="text-slate-500">Status</span>
                <p className="m-0">
                  <Tag
                    value={selectedHistory.status}
                    severity={statusSeverity(selectedHistory.status)}
                    rounded
                  />
                </p>
              </div>
              <div>
                <span className="text-slate-500">Subject</span>
                <p className="m-0">{selectedHistory.subject}</p>
              </div>
              <div>
                <span className="text-slate-500">Created</span>
                <p className="m-0">{formatDate(selectedHistory.created_at)}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Attempts
              </p>
              <DataTable
                value={selectedHistory.attempts}
                size="small"
                emptyMessage="No attempt records yet."
              >
                <Column field="attempt_no" header="#" />
                <Column field="status" header="Status" />
                <Column
                  field="started_at"
                  header="Started"
                  body={(row) => formatDate(row.started_at)}
                />
                <Column field="error_message" header="Error" />
              </DataTable>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="m-0 text-xs font-medium uppercase tracking-wide text-slate-500">
                HTML body
              </p>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                {selectedHistory.body_html || "[content purged]"}
              </pre>
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
};

export default EmailSettingsData;
