"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import useSWR from "swr";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import type { AssetAssignment } from "@/app/types/company-asset";
import type { EmployeeDocument } from "@/app/types/employee-document";
import type { EmployeeLifecycleCase } from "@/app/types/employee-lifecycle";
import type { EmployeeHrDetail } from "@/app/types/employee-hr-detail";
import type { PerformanceReview } from "@/app/types/performance";
import type {
  EmployeeCertification,
  TrainingEnrollment,
} from "@/app/types/training";
import { fetcher } from "@/app/utils/fetcher";
import EmployeeDetailTableHeader from "@/app/(admin)/employees/[id]/_components/EmployeeDetailTableHeader";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

type View = "documents" | "assets" | "lifecycle" | "performance" | "learning";
const tagSeverity = (status: string) =>
  [
    "ACTIVE",
    "VERIFIED",
    "COMPLETED",
    "APPROVED",
    "RETURNED",
    "CLOSED",
  ].includes(status)
    ? "success"
    : ["REJECTED", "EXPIRED", "LOST", "CANCELLED"].includes(status)
      ? "danger"
      : "warning";

export default function EmployeeHrRecordsPanel({ view }: { view: View }) {
  const params = useParams<{ id: string }>();
  const employeeId = Number(params.id);
  const { data, isLoading } = useSWR<EmployeeHrDetail>(
    Number.isSafeInteger(employeeId) && employeeId > 0
      ? `/api/employees/${employeeId}/hr-detail`
      : null,
    fetcher,
  );
  if (view === "documents")
    return <Documents data={data?.documents} loading={isLoading} />;
  if (view === "assets")
    return <Assets data={data?.asset_assignments} loading={isLoading} />;
  if (view === "lifecycle")
    return <Lifecycle data={data?.lifecycle_cases} loading={isLoading} />;
  if (view === "performance")
    return <Performance data={data?.performance_reviews} loading={isLoading} />;
  return (
    <Learning
      enrollments={data?.training_enrollments}
      certifications={data?.certifications}
      loading={isLoading}
    />
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <EmployeeDetailTableHeader title={title} description={description} />
        {children}
      </div>
    </Card>
  );
}
function NoAccess() {
  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      You do not have permission to view this employee record.
    </p>
  );
}
function Documents({
  data,
  loading,
}: {
  data: EmployeeDocument[] | null | undefined;
  loading: boolean;
}) {
  if (data === null)
    return (
      <Section
        title="Documents"
        description="Employee document and verification record."
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title="Documents"
      description="Employee document and verification record."
    >
      <DataTable
        value={data ?? []}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        paginator
        rows={10}
        tableStyle={{ minWidth: "44rem" }}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage="No employee document is available."
      >
        <Column field="document_type_name" header="Document Type" />
        <Column
          field="document_name"
          header="Name"
          body={(row: EmployeeDocument) => row.document_name ?? "-"}
        />
        <Column
          field="expired_date"
          header="Expiry"
          body={(row: EmployeeDocument) => formatDisplayDate(row.expired_date)}
        />
        <Column
          header="Status"
          body={(row: EmployeeDocument) => (
            <Tag
              value={row.verification_status}
              severity={tagSeverity(row.verification_status)}
            />
          )}
        />
      </DataTable>
    </Section>
  );
}
function Assets({
  data,
  loading,
}: {
  data: AssetAssignment[] | null | undefined;
  loading: boolean;
}) {
  if (data === null)
    return (
      <Section title="Assets" description="Assets assigned to this employee.">
        <NoAccess />
      </Section>
    );
  return (
    <Section title="Assets" description="Assets assigned to this employee.">
      <DataTable
        value={data ?? []}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        paginator
        rows={10}
        tableStyle={{ minWidth: "44rem" }}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage="No asset assignment is available."
      >
        <Column field="asset_tag" header="Asset Tag" />
        <Column field="asset_name" header="Asset" />
        <Column
          field="assigned_at"
          header="Assigned"
          body={(row: AssetAssignment) => formatDisplayDate(row.assigned_at)}
        />
        <Column
          field="due_return_date"
          header="Due Return"
          body={(row: AssetAssignment) =>
            formatDisplayDate(row.due_return_date)
          }
        />
        <Column
          header="Status"
          body={(row: AssetAssignment) => (
            <Tag value={row.status} severity={tagSeverity(row.status)} />
          )}
        />
      </DataTable>
    </Section>
  );
}
function Lifecycle({
  data,
  loading,
}: {
  data: EmployeeLifecycleCase[] | null | undefined;
  loading: boolean;
}) {
  if (data === null)
    return (
      <Section
        title="Lifecycle"
        description="Onboarding, employment change, and offboarding history."
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title="Lifecycle"
      description="Onboarding, employment change, and offboarding history."
    >
      <DataTable
        value={data ?? []}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        paginator
        rows={10}
        tableStyle={{ minWidth: "44rem" }}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage="No lifecycle case is available."
      >
        <Column field="lifecycle_type" header="Type" />
        <Column
          field="effective_date"
          header="Effective Date"
          body={(row: EmployeeLifecycleCase) =>
            formatDisplayDate(row.effective_date)
          }
        />
        <Column
          field="reason"
          header="Reason"
          body={(row: EmployeeLifecycleCase) => row.reason ?? "-"}
        />
        <Column
          header="Status"
          body={(row: EmployeeLifecycleCase) => (
            <Tag value={row.status} severity={tagSeverity(row.status)} />
          )}
        />
      </DataTable>
    </Section>
  );
}
function Performance({
  data,
  loading,
}: {
  data: PerformanceReview[] | null | undefined;
  loading: boolean;
}) {
  if (data === null)
    return (
      <Section
        title="Performance"
        description="Performance review and KPI history."
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title="Performance"
      description="Performance review and KPI history."
    >
      <DataTable
        value={data ?? []}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        paginator
        rows={10}
        tableStyle={{ minWidth: "48rem" }}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage="No performance review is available."
      >
        <Column field="cycle_name" header="Cycle" />
        <Column field="reviewer_name" header="Reviewer" />
        <Column field="review_type" header="Type" />
        <Column
          field="overall_score"
          header="Score"
          body={(row: PerformanceReview) => row.overall_score ?? "-"}
        />
        <Column
          header="Status"
          body={(row: PerformanceReview) => (
            <Tag value={row.status} severity={tagSeverity(row.status)} />
          )}
        />
      </DataTable>
    </Section>
  );
}
function Learning({
  enrollments,
  certifications,
  loading,
}: {
  enrollments: TrainingEnrollment[] | null | undefined;
  certifications: EmployeeCertification[] | null | undefined;
  loading: boolean;
}) {
  if (enrollments === null || certifications === null)
    return (
      <Section
        title="Learning & Certification"
        description="Training enrollment and certification history."
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title="Learning & Certification"
      description="Training enrollment and certification history."
    >
      <DataTable
        value={enrollments ?? []}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        paginator
        rows={10}
        tableStyle={{ minWidth: "44rem" }}
        currentPageReportTemplate="{first} to {last} of {totalRecords}"
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage="No training enrollment is available."
      >
        <Column field="course_name" header="Course" />
        <Column field="session_code" header="Session" />
        <Column
          field="completion_date"
          header="Completed"
          body={(row: TrainingEnrollment) =>
            formatDisplayDate(row.completion_date)
          }
        />
        <Column
          field="score"
          header="Score"
          body={(row: TrainingEnrollment) => row.score ?? "-"}
        />
        <Column
          header="Status"
          body={(row: TrainingEnrollment) => (
            <Tag value={row.status} severity={tagSeverity(row.status)} />
          )}
        />
      </DataTable>
      <h2 className="m-0 text-base font-semibold text-slate-800">
        Certifications
      </h2>
      <DataTable
        value={certifications ?? []}
        loading={loading}
        stripedRows
        rowHover
        removableSort
        responsiveLayout="scroll"
        size="small"
        tableStyle={{ minWidth: "44rem" }}
        emptyMessage="No certification is available."
      >
        <Column field="certification_name" header="Certification" />
        <Column
          field="issuing_organization"
          header="Issuer"
          body={(row: EmployeeCertification) => row.issuing_organization ?? "-"}
        />
        <Column
          field="expiry_date"
          header="Expiry"
          body={(row: EmployeeCertification) =>
            formatDisplayDate(row.expiry_date)
          }
        />
        <Column
          header="Status"
          body={(row: EmployeeCertification) => (
            <Tag value={row.status} severity={tagSeverity(row.status)} />
          )}
        />
      </DataTable>
    </Section>
  );
}
