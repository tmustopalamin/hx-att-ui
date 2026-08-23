"use client";
import { useI18n } from "@/app/i18n";

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
  const { t: i18nT } = useI18n();
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
      label: i18nT("static.nov4ln"),
      icon: "pi pi-user",
      items: [
        {
          label: i18nT("static.thnxru"),
          href: `/employees/${employeeId}/overview`,
          permission: "employee.read",
        },
        {
          label: i18nT("static.umaizx"),
          href: `/employees/${employeeId}/general/personal`,
          permission: "employee.read",
        },
        {
          label: i18nT("static.1eqehn7"),
          href: `/employees/${employeeId}/general/employment`,
          permission: "employee.read",
        },
        {
          label: i18nT("static.l8lmct"),
          href: `/employees/${employeeId}/general/education`,
          permission: "employee.read",
        },
      ],
    },
    {
      key: "time",
      label: i18nT("static.1h5ak7"),
      icon: "pi pi-calendar-clock",
      items: [
        {
          label: i18nT("static.1eavko2"),
          href: `/employees/${employeeId}/time/attendance`,
          permission: "attendance-summary.read",
        },
        {
          label: i18nT("static.c4jx3y"),
          href: `/employees/${employeeId}/time/overtime`,
          permission: "overtime-management.read",
        },
        {
          label: i18nT("static.1xf0sbk"),
          href: `/employees/${employeeId}/time/leave`,
          permission: "employee-leave-balance.read",
        },
      ],
    },
    {
      key: "payroll",
      label: i18nT("static.ghd2d6"),
      icon: "pi pi-money-bill",
      items: [
        {
          label: i18nT("static.1cl2fsb"),
          href: `/employees/${employeeId}/payroll/salary-bank`,
          permission: "payroll.read",
        },
        {
          label: i18nT("static.2l50pf"),
          href: `/employees/${employeeId}/payroll/bpjs`,
          permission: "payroll.read",
        },
        {
          label: i18nT("static.j2n637"),
          href: `/employees/${employeeId}/payroll/tax`,
          permission: "payroll.read",
        },
        {
          label: i18nT("static.h9lsuk"),
          href: `/employees/${employeeId}/payroll/bank`,
          permission: "payroll.read",
        },
        {
          label: i18nT("static.1hknvql"),
          href: `/employees/${employeeId}/payroll/history`,
          permission: "payroll.read",
        },
        {
          label: i18nT("static.14pnb2x"),
          href: `/employees/${employeeId}/payroll/income-component`,
          permission: "payroll.read",
        },
        {
          label: i18nT("static.wfytj7"),
          href: `/employees/${employeeId}/payroll/deduction-component`,
          permission: "payroll.read",
        },
      ],
    },
    {
      key: "hr",
      label: i18nT("static.1gyeted"),
      icon: "pi pi-briefcase",
      items: [
        {
          label: i18nT("static.oz47lx"),
          href: `/employees/${employeeId}/hr/documents`,
          permission: "employee-document.read",
        },
        {
          label: i18nT("static.1shidso"),
          href: `/employees/${employeeId}/hr/assets`,
          permission: "asset.read",
        },
        {
          label: i18nT("static.1nvorn3"),
          href: `/employees/${employeeId}/hr/lifecycle`,
          permission: "employee-lifecycle.read",
        },
        {
          label: i18nT("static.13rkbwl"),
          href: `/employees/${employeeId}/hr/performance`,
          permission: "performance.manage",
        },
        {
          label: i18nT("static.16f81rf"),
          href: `/employees/${employeeId}/hr/learning`,
          permission: "training.manage",
        },
      ],
    },
  ];

  return (
    <nav
      className="flex min-w-0 flex-col gap-3"
      aria-label={i18nT("static.30d57w")}
    >
      {sections.map((section) => {
        const visibleItems = section.items.filter((item) =>
          permissionSet.has(item.permission),
        );
        if (visibleItems.length === 0) {
          return null;
        }

        const isSectionActive =
          section.key === "hr"
            ? visibleItems.some((item) => pathname === item.href.split("?")[0])
            : activeGroup === section.key;

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
                const isActive = pathname === item.href.split("?")[0];

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
