"use client";

import React from "react";

export interface MetricCardItem {
  id: string;
  label: string;
  value: string | number;
  subValue?: string;
  icon?: string;
  tone?: "blue" | "emerald" | "amber" | "rose" | "indigo" | "slate";
}

export interface ReportMetricsGridProps {
  metrics: MetricCardItem[];
}

const toneStyles = {
  blue: {
    bg: "bg-blue-50/70 border-blue-200/80 text-blue-900",
    iconBg: "bg-blue-100/80 text-blue-700",
    accent: "text-blue-700",
  },
  emerald: {
    bg: "bg-emerald-50/70 border-emerald-200/80 text-emerald-900",
    iconBg: "bg-emerald-100/80 text-emerald-700",
    accent: "text-emerald-700",
  },
  amber: {
    bg: "bg-amber-50/70 border-amber-200/80 text-amber-900",
    iconBg: "bg-amber-100/80 text-amber-700",
    accent: "text-amber-700",
  },
  rose: {
    bg: "bg-rose-50/70 border-rose-200/80 text-rose-900",
    iconBg: "bg-rose-100/80 text-rose-700",
    accent: "text-rose-700",
  },
  indigo: {
    bg: "bg-indigo-50/70 border-indigo-200/80 text-indigo-900",
    iconBg: "bg-indigo-100/80 text-indigo-700",
    accent: "text-indigo-700",
  },
  slate: {
    bg: "bg-slate-50/80 border-slate-200/90 text-slate-900",
    iconBg: "bg-slate-200/70 text-slate-700",
    accent: "text-slate-700",
  },
};

export default function ReportMetricsGrid({ metrics }: ReportMetricsGridProps) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <div className="report-screen-only mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {metrics.map((item) => {
        const tone = toneStyles[item.tone ?? "slate"];
        return (
          <div
            key={item.id}
            className={`flex flex-col justify-between rounded-xl border p-3.5 transition-shadow hover:shadow-xs ${tone.bg}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-slate-600">
                {item.label}
              </span>
              {item.icon && (
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${tone.iconBg}`}
                >
                  <i className={`pi ${item.icon} text-[11px]`} />
                </div>
              )}
            </div>

            <div className="mt-2">
              <div className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {item.value}
              </div>
              {item.subValue && (
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {item.subValue}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
