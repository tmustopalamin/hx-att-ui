"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";

import { useI18n } from "@/app/i18n";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";
import {
  normalizePermissionCode,
  toPermissionSet,
} from "@/app/utils/permission-utils";
import type { RootState } from "@/store/store";
import type {
  MyProfileAssetAssignment,
  MyProfileCertification,
  MyProfileDocument,
  MyProfileHrRecords,
  MyProfileTrainingEnrollment,
} from "@/app/types/my-profile-hr-records";

type RetryableProps = {
  error?: unknown;
  onRetry: () => void;
};

type SnapshotProps = RetryableProps & {
  data?: MyProfileHrRecords;
  isLoading: boolean;
};

type RecordsProps = RetryableProps & {
  data?: MyProfileHrRecords;
  isLoading: boolean;
};

type QuickLink = {
  href: string;
  label: string;
  icon: string;
  permission?: string;
};

const formatStatusLabel = (status?: string | null) => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();

  if (!normalized) return "Unknown";

  return normalized
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

const documentStatusSeverity = (
  status?: string | null,
): "success" | "warning" | "danger" => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "VERIFIED") return "success";
  if (normalized === "REJECTED" || normalized === "EXPIRED") return "danger";
  return "warning";
};

const trainingStatusSeverity = (
  status?: string | null,
): "success" | "info" | "danger" => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "COMPLETED") return "success";
  if (normalized === "CANCELLED" || normalized === "NO_SHOW") return "danger";
  return "info";
};

const certificationStatusSeverity = (
  status?: string | null,
): "success" | "danger" | "warning" => {
  const normalized = String(status ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "ACTIVE") return "success";
  if (normalized === "EXPIRED" || normalized === "REVOKED") return "danger";
  return "warning";
};

const getDateOnlyTime = (value?: string | null) => {
  if (!value) return null;

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;

  return Date.UTC(year, month - 1, day);
};

const getTodayTime = () => {
  const today = new Date();
  return Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
};

const isDocumentAttentionRequired = (row: MyProfileDocument) => {
  const status = row.verification_status.trim().toUpperCase();
  if (["PENDING", "REJECTED", "EXPIRED"].includes(status)) return true;

  const expiryTime = getDateOnlyTime(row.expired_date);
  if (expiryTime === null) return false;

  const thirtyDaysFromToday = getTodayTime() + 30 * 24 * 60 * 60 * 1000;
  return expiryTime <= thirtyDaysFromToday;
};

const displayValue = (value: string | number | null | undefined) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const RecordsError = ({ onRetry }: { onRetry: () => void }) => {
  const { t: i18nT, tText } = useI18n();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
      <span>{i18nT("static.l397t7")} </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100"
      >
        <i className="pi pi-refresh text-xs" />
        {tText("Retry")}
      </button>
    </div>
  );
};

export function MyProfileHrSnapshot({
  data,
  isLoading,
  error,
  onRetry,
}: SnapshotProps) {
  const { tText } = useI18n();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const permissionSet = useMemo(
    () => toPermissionSet(permissions),
    [permissions],
  );

  const attentionDocumentCount =
    data?.documents?.filter(isDocumentAttentionRequired)?.length ?? 0;
  const assignedAssetCount = data?.asset_assignments?.length ?? 0;
  const activeTrainingCount =
    data?.training_enrollments?.filter((row) =>
      ["ENROLLED", "ATTENDED"].includes((row.status ?? "").toUpperCase()),
    )?.length ?? 0;
  const activeCertificationCount =
    data?.certifications?.filter(
      (row) => (row.status ?? "").toUpperCase() === "ACTIVE",
    )?.length ?? 0;
  const pendingTaskCount = data?.pending_lifecycle_task_count ?? 0;

  const quickLinks: QuickLink[] = [
    {
      href: "/my-attendance/attendance-history",
      label: tText("Attendance History"),
      icon: "pi-history",
    },
    {
      href: "/request-leave",
      label: tText("Request Leave"),
      icon: "pi-calendar",
      permission: "request-leave.read",
    },
    {
      href: "/overtime/request",
      label: tText("Overtime Request"),
      icon: "pi-clock",
      permission: "overtime.read",
    },
    {
      href: "/my-payslips",
      label: tText("My Payslips"),
      icon: "pi-wallet",
      permission: "payroll-payslip.self",
    },
    {
      href: "/my-lifecycle-tasks",
      label: tText("My Lifecycle Tasks"),
      icon: "pi-list-check",
    },
  ].filter(
    (link) =>
      !link.permission ||
      permissionSet.has(normalizePermissionCode(link.permission)),
  );

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {tText("HR Snapshot")}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {tText("A quick view of your current HR records and actions.")}
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          <i className="pi pi-eye text-xs" />
          {tText("Read-only")}
        </span>
      </div>

      {error ? (
        <div className="mt-4">
          <RecordsError onRetry={onRetry} />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard
            icon="pi pi-file-check"
            label={tText("Documents to review")}
            value={isLoading ? "..." : attentionDocumentCount}
            detail={tText("Expired, pending, or rejected")}
            tone="amber"
          />
          <SnapshotCard
            icon="pi pi-box"
            label={tText("Assigned assets")}
            value={isLoading ? "..." : assignedAssetCount}
            detail={tText("Currently assigned to you")}
            tone="blue"
          />
          <SnapshotCard
            icon="pi pi-book"
            label={tText("Learning")}
            value={
              isLoading
                ? "..."
                : `${activeTrainingCount} ${tText("Training")} · ${activeCertificationCount} ${tText("Certification")}`
            }
            detail={tText("In progress and active")}
            tone="violet"
          />
          <SnapshotCard
            icon="pi pi-list-check"
            label={tText("Pending lifecycle tasks")}
            value={isLoading ? "..." : pendingTaskCount}
            detail={tText("Tasks assigned to you")}
            tone="green"
          />
        </div>
      )}

      {quickLinks.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {tText("Quick links")}
          </div>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <i className={`pi ${link.icon} text-xs`} />
                {link.label}
                <i className="pi pi-arrow-up-right text-[0.6rem]" />
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SnapshotCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: string;
  label: string;
  value: string | number;
  detail: string;
  tone: "amber" | "blue" | "violet" | "green";
}) {
  const toneClasses = {
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    blue: "border-blue-100 bg-blue-50 text-blue-900",
    violet: "border-violet-100 bg-violet-50 text-violet-900",
    green: "border-emerald-100 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold">
        <i className={`${icon} text-sm`} />
        <span>{label}</span>
      </div>
      <div className="mt-2 break-words text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs opacity-75">{detail}</div>
    </div>
  );
}

export function MyProfileHrRecords({
  data,
  isLoading,
  error,
  onRetry,
}: RecordsProps) {
  const { t: i18nT, tText } = useI18n();

  if (error && !data) {
    return (
      <div>
        <RecordsError onRetry={onRetry} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {error ? <RecordsError onRetry={onRetry} /> : null}

      <RecordsSection
        title={tText("Documents")}
        description={tText(
          "Your active employee documents and verification status.",
        )}
      >
        <DataTable
          value={data?.documents ?? []}
          dataKey="id"
          loading={isLoading}
          stripedRows
          rowHover
          removableSort
          responsiveLayout="scroll"
          size="small"
          paginator
          rows={5}
          tableStyle={{ minWidth: "38rem" }}
          emptyMessage={tText("No documents available.")}
        >
          <Column field="document_type_name" header={tText("Type")} />
          <Column
            field="document_name"
            header={tText("Name")}
            body={(row: MyProfileDocument) => displayValue(row.document_name)}
          />
          <Column
            field="expired_date"
            header={tText("Expiry date")}
            body={(row: MyProfileDocument) =>
              formatDisplayDate(row.expired_date)
            }
          />
          <Column
            header={tText("Status")}
            body={(row: MyProfileDocument) => (
              <Tag
                value={tText(formatStatusLabel(row.verification_status))}
                severity={documentStatusSeverity(row.verification_status)}
              />
            )}
          />
        </DataTable>
      </RecordsSection>

      <RecordsSection
        title={tText("Assigned Assets")}
        description={tText("Company assets currently assigned to you.")}
      >
        <DataTable
          value={data?.asset_assignments ?? []}
          dataKey="id"
          loading={isLoading}
          stripedRows
          rowHover
          removableSort
          responsiveLayout="scroll"
          size="small"
          paginator
          rows={5}
          tableStyle={{ minWidth: "34rem" }}
          emptyMessage={tText("No assigned assets.")}
        >
          <Column field="asset_tag" header={tText("Asset tag")} />
          <Column field="asset_name" header={tText("Asset")} />
          <Column
            field="assigned_at"
            header={tText("Assigned at")}
            body={(row: MyProfileAssetAssignment) =>
              formatDisplayDateTime(row.assigned_at)
            }
          />
          <Column
            field="due_return_date"
            header={tText("Due return date")}
            body={(row: MyProfileAssetAssignment) =>
              formatDisplayDate(row.due_return_date)
            }
          />
          <Column
            header={tText("Status")}
            body={(row: MyProfileAssetAssignment) => (
              <Tag
                value={tText(formatStatusLabel(row.status))}
                severity="info"
              />
            )}
          />
        </DataTable>
      </RecordsSection>

      <RecordsSection
        title={tText("Training")}
        description={tText(
          "Your training enrollment history, excluding cancelled records.",
        )}
      >
        <DataTable
          value={data?.training_enrollments ?? []}
          dataKey="id"
          loading={isLoading}
          stripedRows
          rowHover
          removableSort
          responsiveLayout="scroll"
          size="small"
          paginator
          rows={5}
          tableStyle={{ minWidth: "38rem" }}
          emptyMessage={tText("No training records available.")}
        >
          <Column field="session_code" header={tText("Session")} />
          <Column field="course_name" header={tText("Course")} />
          <Column
            header={tText("Status")}
            body={(row: MyProfileTrainingEnrollment) => (
              <Tag
                value={tText(formatStatusLabel(row.status))}
                severity={trainingStatusSeverity(row.status)}
              />
            )}
          />
          <Column
            field="completion_date"
            header={tText("Completion date")}
            body={(row: MyProfileTrainingEnrollment) =>
              formatDisplayDate(row.completion_date)
            }
          />
          <Column
            field="score"
            header={tText("Score")}
            body={(row: MyProfileTrainingEnrollment) => displayValue(row.score)}
          />
        </DataTable>
      </RecordsSection>

      <RecordsSection
        title={tText("Certifications")}
        description={tText(
          "Your current and historical certification records.",
        )}
      >
        <DataTable
          value={data?.certifications ?? []}
          dataKey="id"
          loading={isLoading}
          stripedRows
          rowHover
          removableSort
          responsiveLayout="scroll"
          size="small"
          paginator
          rows={5}
          tableStyle={{ minWidth: "42rem" }}
          emptyMessage={tText("No certification records available.")}
        >
          <Column field="certification_name" header={tText("Certification")} />
          <Column
            field="course_name"
            header={tText("Course")}
            body={(row: MyProfileCertification) =>
              displayValue(row.course_name)
            }
          />
          <Column
            field="issuing_organization"
            header={tText("Issuer")}
            body={(row: MyProfileCertification) =>
              displayValue(row.issuing_organization)
            }
          />
          <Column
            field="expiry_date"
            header={tText("Expiry date")}
            body={(row: MyProfileCertification) =>
              formatDisplayDate(row.expiry_date)
            }
          />
          <Column
            header={tText("Status")}
            body={(row: MyProfileCertification) => (
              <Tag
                value={tText(formatStatusLabel(row.status))}
                severity={certificationStatusSeverity(row.status)}
              />
            )}
          />
        </DataTable>
      </RecordsSection>

      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                {tText("Lifecycle tasks")}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {tText(
                  "Review tasks assigned to you from employee lifecycle processes.",
                )}
              </p>
            </div>
            <Tag
              value={`${data?.pending_lifecycle_task_count ?? 0} ${tText("Pending")}`}
              severity={
                (data?.pending_lifecycle_task_count ?? 0) > 0
                  ? "warning"
                  : "success"
              }
            />
          </div>
          <Link
            href="/my-lifecycle-tasks"
            className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-blue-700 hover:underline"
          >
            {i18nT("static.n6hn1l")}
            <i className="pi pi-arrow-right text-xs" />
          </Link>
        </div>
      </Card>
    </div>
  );
}

function RecordsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {children}
      </div>
    </Card>
  );
}
