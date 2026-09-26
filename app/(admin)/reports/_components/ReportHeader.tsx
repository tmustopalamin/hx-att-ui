"use client";

import React from "react";
import { Button } from "primereact/button";
import { useI18n } from "@/app/i18n";

export interface ReportHeaderProps {
  title: string;
  subtitle?: string;
  icon?: string;
  recordCount?: number;
  loading?: boolean;
  exportLoading?: boolean;
  onRefresh?: () => void;
  onExportExcel?: () => void;
  onExportCsv?: () => void;
  onPrint?: () => void;
  extraActions?: React.ReactNode;
}

export default function ReportHeader({
  title,
  subtitle,
  icon = "pi-chart-bar",
  recordCount,
  loading = false,
  exportLoading = false,
  onRefresh,
  onExportExcel,
  onExportCsv,
  onPrint,
  extraActions,
}: ReportHeaderProps) {
  const { locale } = useI18n();
  const isId = locale === "id";

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="report-screen-only mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          <i className={`pi ${icon} text-xl`} />
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              {title}
            </h1>
            {recordCount !== undefined && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                {recordCount.toLocaleString()} {isId ? "data" : "rows"}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {extraActions}

        {onRefresh && (
          <Button
            type="button"
            icon="pi pi-refresh"
            label={isId ? "Segarkan" : "Refresh"}
            severity="secondary"
            outlined
            size="small"
            onClick={onRefresh}
            loading={loading}
            className="text-xs"
          />
        )}

        {onExportCsv && (
          <Button
            type="button"
            icon="pi pi-file"
            label="CSV"
            severity="secondary"
            outlined
            size="small"
            onClick={onExportCsv}
            disabled={loading || exportLoading}
            className="text-xs"
          />
        )}

        {onExportExcel && (
          <Button
            type="button"
            icon="pi pi-file-excel"
            label="Excel"
            severity="success"
            outlined
            size="small"
            onClick={onExportExcel}
            loading={exportLoading}
            disabled={loading}
            className="text-xs"
          />
        )}

        <Button
          type="button"
          icon="pi pi-print"
          label={isId ? "Cetak Langsung" : "Print Report"}
          size="small"
          onClick={handlePrint}
          disabled={loading}
          className="text-xs"
        />
      </div>
    </div>
  );
}
