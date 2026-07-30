"use client";

import Link from "next/link";
import React, { useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

type MenuItem = {
  label: string;
  href: string;
  permission: string;
};

type MenuSection = {
  key: string;
  label: string;
  icon: string;
  items: MenuItem[];
};

const VerticalTabview = () => {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const employeeId = params?.id ?? "";
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const permissionSet = useMemo(() => new Set(permissions), [permissions]);

  const activeGroup = useMemo(() => {
    const segments = pathname?.split("/").filter(Boolean) ?? [];
    return segments[2] ?? "general";
  }, [pathname]);

  const sections: MenuSection[] = [
    {
      key: "general",
      label: "General",
      icon: "pi pi-user",
      items: [
        {
          label: "Personal",
          href: `/employees/${employeeId}/general/personal`,
          permission: "employee.read",
        },
        {
          label: "Employment",
          href: `/employees/${employeeId}/general/employment`,
          permission: "employee.read",
        },
        {
          label: "Education & Experience",
          href: `/employees/${employeeId}/general/education`,
          permission: "employee.read",
        },
      ],
    },
    {
      key: "time",
      label: "Time Management",
      icon: "pi pi-calendar-clock",
      items: [
        {
          label: "Attendance",
          href: `/employees/${employeeId}/time/attendance`,
          permission: "employee.read",
        },
        // {
        //   label: "Overtime",
        //   href: `/employees/${employeeId}/time/overtime`,
        // },
        {
          label: "Leave",
          href: `/employees/${employeeId}/time/leave`,
          permission: "employee-leave-balance.read",
        },
      ],
    },
    {
      key: "payroll",
      label: "Payroll",
      icon: "pi pi-money-bill",
      items: [
        {
          label: "Income Component",
          href: `/employees/${employeeId}/payroll/income-component`,
          permission: "payroll.read",
        },
        {
          label: "Deduction Component",
          href: `/employees/${employeeId}/payroll/deduction-component`,
          permission: "payroll.read",
        },
      ],
    },
  ];

  return (
    <nav
      className="flex min-w-0 flex-col gap-3"
      aria-label="Employee detail navigation"
    >
      {sections.map((section) => {
        const visibleItems = section.items.filter((item) =>
          permissionSet.has(item.permission),
        );
        if (visibleItems.length === 0) {
          return null;
        }

        const isSectionActive = activeGroup === section.key;

        return (
          <section
            key={section.key}
            className={`rounded-xl border p-2.5 transition ${
              isSectionActive
                ? "border-blue-200 bg-blue-50/50"
                : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="mb-2 flex items-center gap-2 px-1">
              <span
                className={`${section.icon} ${
                  isSectionActive ? "text-blue-600" : "text-slate-500"
                }`}
              />
              <h3 className="text-sm font-semibold text-slate-900">
                {section.label}
              </h3>
            </div>

            <div className="flex flex-col gap-1">
              {visibleItems.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`group relative flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-700 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`shrink-0 rounded-full ${
                        isActive
                          ? "h-2 w-2 bg-white"
                          : "h-1.5 w-1.5 bg-slate-300 group-hover:bg-slate-400"
                      }`}
                    />

                    <span
                      className={`min-w-0 break-words ${
                        isActive ? "font-semibold" : "font-medium"
                      }`}
                    >
                      {item.label}
                    </span>

                    {isActive && (
                      <span className="ml-auto shrink-0 pi pi-angle-right text-xs text-white" />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </nav>
  );
};

export default VerticalTabview;
