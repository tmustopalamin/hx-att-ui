"use client";
import { useI18n } from "@/app/i18n";

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
  const { t: i18nT } = useI18n();
  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      {i18nT("static.jgf376")}{" "}
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
  const { t: i18nT } = useI18n();
  if (data === null)
    return (
      <Section
        title={i18nT("static.oz47lx")}
        description={i18nT("static.1u0roaf")}
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title={i18nT("static.oz47lx")}
      description={i18nT("static.1u0roaf")}
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
        currentPageReportTemplate={i18nT("static.1kqh8lr")}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage={i18nT("static.e5o444")}
      >
        <Column field="document_type_name" header={i18nT("static.1lemy44")} />
        <Column
          field="document_name"
          header={i18nT("static.4el6o6")}
          body={(row: EmployeeDocument) => row.document_name ?? "-"}
        />
        <Column
          field="expired_date"
          header={i18nT("static.r38mzi")}
          body={(row: EmployeeDocument) => formatDisplayDate(row.expired_date)}
        />
        <Column
          header={i18nT("static.3pd73")}
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
  const { t: i18nT } = useI18n();
  if (data === null)
    return (
      <Section
        title={i18nT("static.1shidso")}
        description={i18nT("static.1qtfvq9")}
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title={i18nT("static.1shidso")}
      description={i18nT("static.1qtfvq9")}
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
        currentPageReportTemplate={i18nT("static.1kqh8lr")}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage={i18nT("static.1xj446k")}
      >
        <Column field="asset_tag" header={i18nT("static.1h07jp3")} />
        <Column field="asset_name" header={i18nT("static.108qnnf")} />
        <Column
          field="assigned_at"
          header={i18nT("static.c1fxel")}
          body={(row: AssetAssignment) => formatDisplayDate(row.assigned_at)}
        />
        <Column
          field="due_return_date"
          header={i18nT("static.hsnk6l")}
          body={(row: AssetAssignment) =>
            formatDisplayDate(row.due_return_date)
          }
        />
        <Column
          header={i18nT("static.3pd73")}
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
  const { t: i18nT } = useI18n();
  if (data === null)
    return (
      <Section
        title={i18nT("static.1nvorn3")}
        description={i18nT("static.177pkxs")}
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title={i18nT("static.1nvorn3")}
      description={i18nT("static.177pkxs")}
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
        currentPageReportTemplate={i18nT("static.1kqh8lr")}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage={i18nT("static.z019l")}
      >
        <Column field="lifecycle_type" header={i18nT("static.1m2zofh")} />
        <Column
          field="effective_date"
          header={i18nT("static.dfnnk2")}
          body={(row: EmployeeLifecycleCase) =>
            formatDisplayDate(row.effective_date)
          }
        />
        <Column
          field="reason"
          header={i18nT("static.i36sl5")}
          body={(row: EmployeeLifecycleCase) => row.reason ?? "-"}
        />
        <Column
          header={i18nT("static.3pd73")}
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
  const { t: i18nT } = useI18n();
  if (data === null)
    return (
      <Section
        title={i18nT("static.13rkbwl")}
        description={i18nT("static.zixyru")}
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title={i18nT("static.13rkbwl")}
      description={i18nT("static.zixyru")}
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
        currentPageReportTemplate={i18nT("static.1kqh8lr")}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage={i18nT("static.1ag6263")}
      >
        <Column field="cycle_name" header={i18nT("static.j0bn2p")} />
        <Column field="reviewer_name" header={i18nT("static.oz4j0a")} />
        <Column field="review_type" header={i18nT("static.1m2zofh")} />
        <Column
          field="overall_score"
          header={i18nT("static.x9tsfp")}
          body={(row: PerformanceReview) => row.overall_score ?? "-"}
        />
        <Column
          header={i18nT("static.3pd73")}
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
  const { t: i18nT } = useI18n();
  if (enrollments === null || certifications === null)
    return (
      <Section
        title={i18nT("static.16f81rf")}
        description={i18nT("static.155owss")}
      >
        <NoAccess />
      </Section>
    );
  return (
    <Section
      title={i18nT("static.16f81rf")}
      description={i18nT("static.155owss")}
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
        currentPageReportTemplate={i18nT("static.1kqh8lr")}
        paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
        emptyMessage={i18nT("static.1qa7ib")}
      >
        <Column field="course_name" header={i18nT("static.1yoky9k")} />
        <Column field="session_code" header={i18nT("static.8yh9jr")} />
        <Column
          field="completion_date"
          header={i18nT("static.1tmo59u")}
          body={(row: TrainingEnrollment) =>
            formatDisplayDate(row.completion_date)
          }
        />
        <Column
          field="score"
          header={i18nT("static.x9tsfp")}
          body={(row: TrainingEnrollment) => row.score ?? "-"}
        />
        <Column
          header={i18nT("static.3pd73")}
          body={(row: TrainingEnrollment) => (
            <Tag value={row.status} severity={tagSeverity(row.status)} />
          )}
        />
      </DataTable>
      <h2 className="m-0 text-base font-semibold text-slate-800">
        {i18nT("static.fhktvu")}{" "}
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
        emptyMessage={i18nT("static.aaj8an")}
      >
        <Column field="certification_name" header={i18nT("static.fkzzr1")} />
        <Column
          field="issuing_organization"
          header={i18nT("static.1h4z3km")}
          body={(row: EmployeeCertification) => row.issuing_organization ?? "-"}
        />
        <Column
          field="expiry_date"
          header={i18nT("static.r38mzi")}
          body={(row: EmployeeCertification) =>
            formatDisplayDate(row.expiry_date)
          }
        />
        <Column
          header={i18nT("static.3pd73")}
          body={(row: EmployeeCertification) => (
            <Tag value={row.status} severity={tagSeverity(row.status)} />
          )}
        />
      </DataTable>
    </Section>
  );
}
