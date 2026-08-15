"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Tag } from "primereact/tag";
import { useDispatch, useSelector } from "react-redux";

import {
  generatePayrollPerformanceEarnings,
  previewPayrollPerformanceEarnings,
} from "@/app/services/payroll-batch-service";
import type { PayrollPerformanceEarningPreview } from "@/app/types/payroll-batch";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";

const currency = (value: string | number | null) => {
  if (value === null) return "-";
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";
};

export default function PerformanceEarningPanel({
  batchId,
  batchStatus,
}: {
  batchId: number;
  batchStatus: string;
}) {
  const dispatch = useDispatch();
  const { mutate: mutateKey } = useSWRConfig();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canAdjust = permissions.includes("payroll.adjust");
  const [generating, setGenerating] = useState(false);
  const {
    data = [],
    mutate,
    isValidating,
  } = useSWR<PayrollPerformanceEarningPreview[]>(
    canAdjust ? `payroll-performance-earnings-${batchId}` : null,
    () => previewPayrollPerformanceEarnings(batchId),
  );
  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generatePayrollPerformanceEarnings(batchId);
      await mutate();
      await mutateKey(`/api/payroll-batches/${batchId}/adjustments`);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Performance earning generated",
          detail: `${result.created.length} adjustment(s) created. Submit them for maker-checker approval.`,
        }),
      );
    } catch {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Unable to generate",
          detail:
            "The batch must be READY and finalized performance reviews must have a matching policy.",
        }),
      );
    } finally {
      setGenerating(false);
    }
  };
  const confirmGenerate = () => {
    requestActionConfirmation({
      action: "Generate performance earnings",
      target: `Payroll batch #${batchId}`,
      severity: "warning",
      confirmLabel: "Generate",
      confirmIcon: "pi pi-bolt",
      description: "Generate payroll adjustments from finalized reviews?",
      onAccept: () => generate(),
    });
  };
  if (!canAdjust) return null;
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-800">
              Performance Earnings
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Preview finalized performance reviews before creating payroll
              adjustments.
            </p>
          </div>
          <Button
            label="Generate adjustments"
            icon="pi pi-bolt"
            size="small"
            loading={isValidating || generating}
            disabled={
              batchStatus !== "READY" ||
              data.length === 0 ||
              !data.some((row) => row.reason === null)
            }
            onClick={confirmGenerate}
          />
        </div>
        <DataTable
          value={data}
          dataKey="performance_review_id"
          size="small"
          stripedRows
          scrollable
          responsiveLayout="scroll"
          emptyMessage="No finalized performance review is eligible for this batch."
        >
          <Column field="employee_code" header="Employee ID" />
          <Column field="employee_name" header="Employee" />
          <Column
            header="Score"
            body={(row: PayrollPerformanceEarningPreview) => row.score ?? "-"}
          />
          <Column
            header="Policy"
            body={(row: PayrollPerformanceEarningPreview) =>
              row.policy_code
                ? `${row.policy_code} v${row.policy_version}`
                : "-"
            }
          />
          <Column
            header="Component"
            body={(row: PayrollPerformanceEarningPreview) =>
              row.income_component_code || "-"
            }
          />
          <Column
            header="Amount"
            body={(row: PayrollPerformanceEarningPreview) =>
              currency(row.amount)
            }
          />
          <Column
            header="Status"
            body={(row: PayrollPerformanceEarningPreview) =>
              row.reason ? (
                <Tag value={row.reason} severity="warning" />
              ) : (
                <Tag value="Eligible" severity="success" />
              )
            }
          />
        </DataTable>
        {batchStatus !== "READY" && (
          <p className="m-0 text-xs text-slate-500">
            Generation is available only while the payroll batch is READY.
            Generated adjustments follow the existing submit/approve workflow.
          </p>
        )}
      </div>
    </Card>
  );
}
