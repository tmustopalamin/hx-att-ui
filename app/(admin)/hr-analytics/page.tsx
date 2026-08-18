"use client";

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
  label: string;
  key: keyof HrAnalyticsOverview;
  icon: string;
  drillDown?: HrAnalyticsAttentionKind;
};

const cards: AnalyticsCard[] = [
  {
    label: "Active Employees",
    key: "active_employees",
    icon: "pi-users",
    drillDown: "active_employees",
  },
  {
    label: "Open Requisitions",
    key: "open_requisitions",
    icon: "pi-briefcase",
  },
  {
    label: "Active Candidates",
    key: "active_candidates",
    icon: "pi-user-plus",
  },
  {
    label: "Pending Lifecycle Tasks",
    key: "pending_lifecycle_tasks",
    icon: "pi-list-check",
    drillDown: "pending_lifecycle_tasks",
  },
  {
    label: "Documents Expiring (30 days)",
    key: "expiring_documents",
    icon: "pi-file-excel",
    drillDown: "expiring_documents",
  },
  {
    label: "Certifications Expiring (30 days)",
    key: "expiring_certifications",
    icon: "pi-verified",
    drillDown: "expiring_certifications",
  },
  {
    label: "Assigned Assets",
    key: "assigned_assets",
    icon: "pi-box",
    drillDown: "assigned_assets",
  },
  {
    label: "Open Training Sessions",
    key: "open_training_sessions",
    icon: "pi-book",
  },
  {
    label: "Pending Training",
    key: "pending_training_enrollments",
    icon: "pi-calendar-clock",
    drillDown: "pending_training_enrollments",
  },
  {
    label: "Open Payroll Batches",
    key: "current_payroll_batches",
    icon: "pi-calculator",
  },
];

const emptyFilters: HrAnalyticsFilters = {
  departmentId: null,
  branchId: null,
};

export default function HrAnalyticsPage() {
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
      notify(
        "success",
        "Export ready",
        "HR analytics CSV has been downloaded.",
      );
    } catch {
      notify(
        "error",
        "Export failed",
        "Unable to export the current analytics view.",
      );
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
                HR Analytics
              </h1>
              <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
                Read-only workforce, compliance, lifecycle, learning, and
                payroll operational indicators.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                label="Export CSV"
                icon="pi pi-download"
                severity="secondary"
                outlined
                size="small"
                loading={exporting}
                onClick={() => void downloadExport()}
              />
              <Button
                label="Refresh"
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
              Department
              <Dropdown
                value={filters.departmentId}
                options={departments}
                optionLabel="name"
                optionValue="id"
                filter
                showClear
                placeholder="All departments"
                className="w-full"
                onChange={(event) =>
                  setFilters({ ...filters, departmentId: event.value ?? null })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Branch
              <Dropdown
                value={filters.branchId}
                options={branches}
                optionLabel="name"
                optionValue="id"
                filter
                showClear
                placeholder="All branches"
                className="w-full"
                onChange={(event) =>
                  setFilters({ ...filters, branchId: event.value ?? null })
                }
              />
            </label>
            <Button
              label="Clear"
              text
              severity="secondary"
              size="small"
              disabled={!filters.departmentId && !filters.branchId}
              onClick={() => setFilters(emptyFilters)}
            />
          </div>
          <p className="m-0 text-xs leading-5 text-slate-500">
            Department and branch filters apply to employee-related indicators.
            Company-wide recruitment, training-session, and payroll counts
            remain organization-wide.
          </p>

          {overview.isLoading ? (
            <div className="flex justify-center py-12">
              <ProgressSpinner style={{ width: "2rem", height: "2rem" }} />
            </div>
          ) : overview.error || !overviewData ? (
            <p className="m-0 rounded-md bg-red-50 p-4 text-sm text-red-700">
              Unable to load analytics. Check your permission and API
              connection.
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
                    <p className="m-0 text-sm text-slate-500">{card.label}</p>
                    <i className={`pi ${card.icon} text-slate-400`} />
                  </div>
                  <p className="m-0 mt-3 text-2xl font-semibold text-slate-800">
                    {overviewData[card.key]}
                  </p>
                  {card.drillDown && (
                    <span className="mt-2 block text-xs font-medium text-blue-600">
                      View details
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Dialog
        header={selectedCard?.label ?? "Analytics details"}
        visible={selectedCard !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "58rem" }}
        onHide={() => setSelectedCard(null)}
        footer={
          <div className="flex justify-end">
            <Button
              label="Close"
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
            Unable to load detail rows for this indicator.
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
            emptyMessage="No record requires attention."
          >
            <Column field="primary_label" header="Item" />
            <Column field="secondary_label" header="Details" />
            <Column
              header="Due Date"
              body={(row: HrAnalyticsAttentionItem) =>
                formatDisplayDate(row.due_date)
              }
            />
            <Column
              header="Status"
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
