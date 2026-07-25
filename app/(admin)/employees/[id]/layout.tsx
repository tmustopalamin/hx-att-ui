// app/(admin)/employees/[id]/layout.tsx

"use client";

import React, { Suspense, useMemo } from "react";
import useSWR from "swr";
import { useParams, usePathname } from "next/navigation";

import EmployeeProfilePicture from "./EmployeeProfilePicture";
import VerticalTabview from "./VerticalTabView";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { Employee } from "@/app/types/employee";
import { EmploymentData } from "@/app/types/employment-data";
import { fetcher } from "@/app/utils/fetcher";

interface EmployeeLayoutProps {
  children: React.ReactNode;
}

const pageTitleMap: Record<string, string> = {
  personal: "Personal",
  employment: "Employment",
  education: "Education & Experience",
  attendance: "Attendance",
  overtime: "Overtime",
  leave: "Leave",
  "income-component": "Income Component",
  "deduction-component": "Deduction Component",
  "edit-photo": "Edit Photo",
};

const EmployeeDetailLayout = ({ children }: EmployeeLayoutProps) => {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const id = params?.id;

  const { data, error } = useSWR<Employee>(
    id ? `/api/employees/${id}/personal-data` : null,
    fetcher,
  );

  const { data: employmentData } = useSWR<EmploymentData>(
    id ? `/api/employees/${id}/employment-data` : null,
    fetcher,
  );

  const pageTitle = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    const lastSegment = segments[segments.length - 1] ?? "";
    return pageTitleMap[lastSegment] ?? "Employee Detail";
  }, [pathname]);

  const employeeName = useMemo(() => {
    if (!data) return "Employee";

    if (data.full_name && data.full_name.trim().length > 0) {
      return data.full_name;
    }

    return [data.first_name, data.middle_name, data.last_name]
      .filter(Boolean)
      .join(" ");
  }, [data]);

  if (error && id) {
    return (
      <ErrorNotConnectedToApi
        mutateKey={`/api/employees/${id}/personal-data`}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
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

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <VerticalTabview />
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-5 flex min-w-0 items-center gap-2 overflow-hidden border-b border-slate-200 pb-3 text-sm text-slate-500">
              <span className="shrink-0 font-medium text-slate-700">
                Employee Detail
              </span>
              <i className="pi pi-angle-right shrink-0 text-xs" />
              <span className="truncate">{pageTitle}</span>
            </div>

            <div className="min-w-0 overflow-x-auto">
              <Suspense fallback={<p>Loading...</p>}>{children}</Suspense>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EmployeeDetailLayout;
