// app/(admin)/employees/[id]/layout.tsx

"use client";

import React, { Suspense, useMemo } from "react";
import useSWR from "swr";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { useSelector } from "react-redux";

import EmployeeProfilePicture from "./EmployeeProfilePicture";
import VerticalTabview from "./VerticalTabView";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  EmployeeEmploymentData,
  EmployeePersonalData,
} from "@/app/types/employee-general";
import { fetcher } from "@/app/utils/fetcher";
import EmployeePageHeader from "../components/EmployeePageHeader";
import { RootState } from "@/store/store";

interface EmployeeLayoutProps {
  children: React.ReactNode;
}

const pageTitleMap: Record<string, string> = {
  overview: "Overview",
  personal: "Personal",
  employment: "Employment",
  education: "Education & Experience",
  attendance: "Attendance",
  overtime: "Overtime",
  leave: "Leave",
  "income-component": "Income Component",
  "deduction-component": "Deduction Component",
  "salary-bank": "Salary History",
  bpjs: "BPJS & Statutory",
  tax: "Tax Profile",
  bank: "Bank Account",
  history: "Payroll History & Payslips",
  documents: "Documents",
  assets: "Assets",
  lifecycle: "Lifecycle",
  performance: "Performance",
  learning: "Learning & Certification",
  "edit-photo": "Edit Photo",
};

const EmployeeDetailLayout = ({ children }: EmployeeLayoutProps) => {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const id = params?.id;
  const employeeId = Number(id);
  const isValidEmployeeId = Number.isSafeInteger(employeeId) && employeeId > 0;
  const canReadEmployee = useSelector((state: RootState) =>
    state.profile.permissions.includes("employee.read"),
  );

  const { data, error } = useSWR<EmployeePersonalData>(
    isValidEmployeeId && canReadEmployee
      ? `/api/employees/${employeeId}/personal-data`
      : null,
    fetcher,
  );

  const { data: employmentData, error: employmentError } =
    useSWR<EmployeeEmploymentData>(
      isValidEmployeeId && canReadEmployee
        ? `/api/employees/${employeeId}/employment-data`
        : null,
      fetcher,
    );

  const pageTitle = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const lastSegment = segments[segments.length - 1] ?? "";
    return pageTitleMap[lastSegment] ?? "Employee Detail";
  }, [pathname]);

  const employeeName = useMemo(() => {
    if (!data) return `Employee #${employeeId}`;

    return [data.first_name, data.middle_name, data.last_name]
      .filter(Boolean)
      .join(" ");
  }, [data, employeeId]);

  if (!isValidEmployeeId) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-lg font-semibold text-amber-900">
          Invalid employee ID
        </h1>
        <p className="mt-2 text-sm text-amber-800">
          The requested employee identifier is not valid.
        </p>
        <Link
          href="/employees"
          className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:underline"
        >
          Back to employees
        </Link>
      </div>
    );
  }

  if (canReadEmployee && (error || employmentError)) {
    return (
      <ErrorNotConnectedToApi
        mutateKey={`/api/employees/${employeeId}/personal-data`}
      />
    );
  }

  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <EmployeePageHeader
          title={employeeName}
          description={`${employmentData?.position_name || "Employee profile"} · ${pageTitle}`}
          icon="pi pi-user"
          actions={
            <>
              <Link href="/employees" className="w-full sm:w-auto">
                <Button
                  type="button"
                  label="Back"
                  icon="pi pi-arrow-left"
                  severity="secondary"
                  outlined
                  size="small"
                  className="w-full"
                />
              </Link>
            </>
          }
        />

        <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
            <div className="flex min-w-0 flex-col gap-4">
              {canReadEmployee && data && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex min-w-0 flex-col items-center gap-3">
                    <EmployeeProfilePicture data={data} />

                    <div className="flex w-full min-w-0 flex-col items-center text-center">
                      <h2
                        className="w-full max-w-[230px] text-center text-lg font-semibold leading-snug text-slate-900"
                        style={{ overflowWrap: "anywhere" }}
                        title={employeeName}
                      >
                        {employeeName}
                      </h2>

                      <p
                        className="mt-1 w-full max-w-[230px] truncate text-sm text-slate-500"
                        title={employmentData?.position_name || "-"}
                      >
                        {employmentData?.position_name || "-"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <VerticalTabview />
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden border-b border-slate-200 pb-4 text-sm text-slate-500">
                <span className="shrink-0 font-medium text-slate-700">
                  Employee Detail
                </span>
                <i className="pi pi-angle-right shrink-0 text-xs" />
                <span className="truncate">{pageTitle}</span>
              </div>

              <div className="employee-detail-content min-w-0 overflow-x-auto">
                <Suspense fallback={<p>Loading...</p>}>{children}</Suspense>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Card>
  );
};

export default EmployeeDetailLayout;
