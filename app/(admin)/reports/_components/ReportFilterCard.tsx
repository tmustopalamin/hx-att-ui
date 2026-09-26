"use client";

import React, { useState } from "react";
import { Button } from "primereact/button";
import { useI18n } from "@/app/i18n";

export interface ReportFilterCardProps {
  children: React.ReactNode;
  activeFilterCount?: number;
  onReset?: () => void;
  collapsible?: boolean;
}

export default function ReportFilterCard({
  children,
  activeFilterCount = 0,
  onReset,
  collapsible = false,
}: ReportFilterCardProps) {
  const { locale } = useI18n();
  const isId = locale === "id";
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="report-screen-only mb-6 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <i className="pi pi-filter text-xs text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            {isId ? "Filter Laporan" : "Report Filters"}
          </span>
          {activeFilterCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              {activeFilterCount} {isId ? "aktif" : "active"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onReset && activeFilterCount > 0 && (
            <Button
              type="button"
              label={isId ? "Reset Filter" : "Reset Filters"}
              icon="pi pi-filter-slash"
              text
              severity="secondary"
              size="small"
              onClick={onReset}
              className="text-xs text-slate-500 hover:text-slate-800"
            />
          )}
          {collapsible && (
            <Button
              type="button"
              icon={`pi ${collapsed ? "pi-chevron-down" : "pi-chevron-up"}`}
              text
              rounded
              size="small"
              onClick={() => setCollapsed(!collapsed)}
            />
          )}
        </div>
      </div>

      {!collapsed && <div className="mt-3.5">{children}</div>}
    </div>
  );
}
