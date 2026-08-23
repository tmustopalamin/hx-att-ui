"use client";
import { useI18n } from "@/app/i18n";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import {
  exportHrAnalyticsOverview,
  getHrAnalyticsAttention,
  getHrAnalyticsOverview,
} from "@/app/services/hr-analytics-service";
import {
  getBranchOptions,
  getDepartmentOptions,
} from "@/app/services/employee-general-service";
import type { OptionItem } from "@/app/types/employee-general";
import type {
  HrAnalyticsAttentionItem,
  HrAnalyticsAttentionKind,
  HrAnalyticsFilters,
  HrAnalyticsOverview,
} from "@/app/types/hr-analytics";
import { showToast } from "@/store/ToastSlice";
import { useDispatch } from "react-redux";

type AnalyticsCard = {
  labelKey: string;
  key: keyof HrAnalyticsOverview;
  icon: string;
  drillDown?: HrAnalyticsAttentionKind;
};

const cards: AnalyticsCard[] = [
  {
    labelKey: "Active Employees",
    key: "active_employees",
    icon: "pi-users",
    drillDown: "active_employees",
  },
  {
    labelKey: "Open Requisitions",
    key: "open_requisitions",
    icon: "pi-briefcase",
  },
  {
    labelKey: "Active Candidates",
    key: "active_candidates",
    icon: "pi-user-plus",
  },
  {
    labelKey: "Pending Lifecycle Tasks",
    key: "pending_lifecycle_tasks",
    icon: "pi-list-check",
    drillDown: "pending_lifecycle_tasks",
  },
  {
    labelKey: "Documents Expiring (30 days)",
    key: "expiring_documents",
    icon: "pi-file-excel",
    drillDown: "expiring_documents",
  },
  {
    labelKey: "Certifications Expiring (30 days)",
    key: "expiring_certifications",
    icon: "pi-verified",
    drillDown: "expiring_certifications",
  },
  {
    labelKey: "Assigned Assets",
    key: "assigned_assets",
    icon: "pi-box",
    drillDown: "assigned_assets",
  },
  {
    labelKey: "Open Training Sessions",
    key: "open_training_sessions",
    icon: "pi-book",
  },
  {
    labelKey: "Pending Training",
    key: "pending_training_enrollments",
    icon: "pi-calendar-clock",
    drillDown: "pending_training_enrollments",
  },
  {
    labelKey: "Open Payroll Batches",
    key: "current_payroll_batches",
    icon: "pi-calculator",
  },
];

const emptyFilters: HrAnalyticsFilters = {
  departmentId: null,
  branchId: null,
};

export default function HrAnalyticsPage() {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const [filters, setFilters] = useState<HrAnalyticsFilters>(emptyFilters);
  const [selectedCard, setSelectedCard] = useState<AnalyticsCard | null>(null);
  const [exporting, setExporting] = useState(false);
  const { data: departments = [] } = useSWR<OptionItem[]>(
    "hr-analytics/departments",
    getDepartmentOptions,
  );
  const { data: branches = [] } = useSWR<OptionItem[]>(
    "hr-analytics/branches",
    getBranchOptions,
  );
  const overview = useSWR(
    ["hr-analytics-overview", filters.departmentId, filters.branchId],
    () => getHrAnalyticsOverview(filters),
  );
  const attention = useSWR<HrAnalyticsAttentionItem[]>(
    selectedCard?.drillDown
      ? [
          "hr-analytics-attention",
          selectedCard.drillDown,
          filters.departmentId,
          filters.branchId,
        ]
      : null,
    () => getHrAnalyticsAttention(selectedCard!.drillDown!, filters),
  );
  const overviewData = overview.data;

  const notify = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));

  const downloadExport = async () => {
    setExporting(true);
    try {
      const blob = await exportHrAnalyticsOverview(filters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "hr-analytics-overview.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      notify("success", i18nT("static.1shxh3k"), i18nT("static.checu6"));
    } catch {
      notify("error", i18nT("static.1ebj6tk"), i18nT("static.12qx7ok"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
                {i18nT("static.at8m4j")}{" "}
              </h1>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                {i18nT("static.1m0ttmz")}{" "}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                label={i18nT("static.8p4e4z")}
                icon="pi pi-download"
                severity="secondary"
                outlined
                size="small"
                loading={exporting}
                onClick={() => void downloadExport()}
              />
              <Button
                label={i18nT("static.28r6qc")}
                icon="pi pi-refresh"
                severity="secondary"
                outlined
                size="small"
                loading={overview.isValidating}
                onClick={() => void overview.mutate()}
              />
            </div>
          </div>

          <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1430r53")}{" "}
              <Dropdown
                value={filters.departmentId}
                options={departments}
                optionLabel="name"
                optionValue="id"
                filter
                showClear
                placeholder={i18nT("static.11cffbv")}
                className="w-full"
                onChange={(event) =>
                  setFilters({ ...filters, departmentId: event.value ?? null })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.19gzx45")}{" "}
              <Dropdown
                value={filters.branchId}
                options={branches}
                optionLabel="name"
                optionValue="id"
                filter
                showClear
                placeholder={i18nT("static.1yu8vtc")}
                className="w-full"
                onChange={(event) =>
                  setFilters({ ...filters, branchId: event.value ?? null })
                }
              />
            </label>
            <Button
              label={i18nT("static.1aeugy")}
              text
              severity="secondary"
              size="small"
              disabled={!filters.departmentId && !filters.branchId}
              onClick={() => setFilters(emptyFilters)}
            />
          </div>
          <p className="m-0 text-xs leading-5 text-slate-500">
            {i18nT("static.5uvg0d")}{" "}
          </p>

          {overview.isLoading ? (
            <div className="flex justify-center py-12">
              <ProgressSpinner style={{ width: "2rem", height: "2rem" }} />
            </div>
          ) : overview.error || !overviewData ? (
            <p className="m-0 rounded-md bg-red-50 p-4 text-sm text-red-700">
              {i18nT("static.vxu3bk")}{" "}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {cards.map((card) => (
                <button
                  key={card.key}
                  type="button"
                  className={`rounded-lg border border-slate-200 bg-slate-50 p-4 text-left transition-colors ${
                    card.drillDown
                      ? "hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      : "cursor-default"
                  }`}
                  disabled={!card.drillDown}
                  onClick={() => card.drillDown && setSelectedCard(card)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="m-0 text-sm text-slate-500">
                      {i18nT(card.labelKey)}
                    </p>
                    <i className={`pi ${card.icon} text-slate-400`} />
                  </div>
                  <p className="m-0 mt-3 text-2xl font-semibold text-slate-800">
                    {overviewData[card.key]}
                  </p>
                  {card.drillDown && (
                    <span className="mt-2 block text-xs font-medium text-blue-600">
                      {i18nT("static.5dxh2m")}{" "}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Dialog
        header={
          selectedCard
            ? i18nT(selectedCard.labelKey)
            : i18nT("Analytics details")
        }
        visible={selectedCard !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "58rem" }}
        onHide={() => setSelectedCard(null)}
        footer={
          <div className="flex justify-end">
            <Button
              label={i18nT("static.1l0xxoj")}
              text
              severity="secondary"
              onClick={() => setSelectedCard(null)}
            />
          </div>
        }
      >
        {attention.isLoading ? (
          <div className="flex justify-center py-10">
            <ProgressSpinner style={{ width: "2rem", height: "2rem" }} />
          </div>
        ) : attention.error ? (
          <p className="m-0 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {i18nT("static.1vu93fp")}{" "}
          </p>
        ) : (
          <DataTable
            value={attention.data ?? []}
            dataKey="id"
            paginator
            rows={10}
            stripedRows
            rowHover
            size="small"
            emptyMessage={i18nT("static.ex03ub")}
          >
            <Column field="primary_label" header={i18nT("static.8pkkxy")} />
            <Column field="secondary_label" header={i18nT("static.43f6md")} />
            <Column
              header={i18nT("static.vtfgln")}
              body={(row: HrAnalyticsAttentionItem) =>
                formatDisplayDate(row.due_date)
              }
            />
            <Column
              header={i18nT("static.3pd73")}
              body={(row: HrAnalyticsAttentionItem) => (
                <Tag
                  value={row.status}
                  severity={row.status === "ACTIVE" ? "success" : "warning"}
                />
              )}
            />
          </DataTable>
        )}
      </Dialog>
    </>
  );
}
