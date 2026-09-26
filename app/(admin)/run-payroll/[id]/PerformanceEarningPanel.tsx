"use client";
import { useI18n } from "@/app/i18n";

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
  const { t: i18nT } = useI18n();
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
          summary: i18nT("static.1y0t24y"),
          detail: i18nT("static.1xuavz6", { p0: result.created.length }),
        }),
      );
    } catch {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.14ftm3u"),
          detail: i18nT("static.x1xcjq"),
        }),
      );
    } finally {
      setGenerating(false);
    }
  };
  const confirmGenerate = () => {
    requestActionConfirmation({
      action: i18nT("static.1qpi0rr"),
      target: `Payroll batch #${batchId}`,
      severity: "warning",
      confirmLabel: i18nT("static.1jb34xe"),
      confirmIcon: "pi pi-bolt",
      description: i18nT("static.rpazr7"),
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
              {i18nT("static.16f5xkc")}{" "}
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {i18nT("static.1dcdath")}{" "}
            </p>
          </div>
          <Button
            label={i18nT("static.82anqq")}
            icon="pi pi-bolt"
            size="small"
            loading={isValidating || generating}
            disabled={
              batchStatus !== "READY" ||
              data.length === 0 ||
              !data.some((row) => row.reason === null)
            }
            tooltip={
              batchStatus !== "READY" ? i18nT("static.1j2sq29") : undefined
            }
            tooltipOptions={{ position: "left" }}
            onClick={confirmGenerate}
          />
        </div>
        {batchStatus !== "READY" && (
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <i className="pi pi-info-circle text-sm text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{i18nT("static.1j2sq29")}</span>
            </div>
          </div>
        )}
        <DataTable
          value={data}
          dataKey="performance_review_id"
          size="small"
          stripedRows
          scrollable
          responsiveLayout="scroll"
          emptyMessage={i18nT("static.xcsjyq")}
        >
          <Column field="employee_code" header={i18nT("static.1lghzb2")} />
          <Column field="employee_name" header={i18nT("static.1fak8xt")} />
          <Column
            header={i18nT("static.x9tsfp")}
            body={(row: PayrollPerformanceEarningPreview) => row.score ?? "-"}
          />
          <Column
            header={i18nT("static.1g6zau7")}
            body={(row: PayrollPerformanceEarningPreview) =>
              row.policy_code
                ? `${row.policy_code} v${row.policy_version}`
                : "-"
            }
          />
          <Column
            header={i18nT("static.bvqo3k")}
            body={(row: PayrollPerformanceEarningPreview) =>
              row.income_component_code || "-"
            }
          />
          <Column
            header={i18nT("static.a2ky21")}
            body={(row: PayrollPerformanceEarningPreview) =>
              currency(row.amount)
            }
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: PayrollPerformanceEarningPreview) => {
              if (!row.reason) {
                return (
                  <Tag value={i18nT("static.ile4gg")} severity="success" />
                );
              }
              if (row.reason.startsWith("ALREADY_GENERATED_")) {
                return (
                  <Tag
                    value={row.reason.replace(
                      "ALREADY_GENERATED_",
                      "GENERATED: ",
                    )}
                    severity="info"
                  />
                );
              }
              return <Tag value={row.reason} severity="warning" />;
            }}
          />
        </DataTable>
      </div>
    </Card>
  );
}
