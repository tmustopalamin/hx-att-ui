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
  generatePayrollHolidayPositionIncentives,
  previewPayrollHolidayPositionIncentives,
} from "@/app/services/payroll-batch-service";
import type { PayrollHolidayPositionIncentivePreview } from "@/app/types/payroll-batch";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { getErrorMessage } from "@/app/utils/error-messages";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const currency = (value: string | number) => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount)
    : "-";
};

export default function HolidayPositionIncentivePanel({
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
  const previewKey = canAdjust
    ? `holiday-position-incentives-${batchId}`
    : null;
  const {
    data = [],
    error,
    mutate,
    isLoading,
    isValidating,
  } = useSWR<PayrollHolidayPositionIncentivePreview[]>(previewKey, () =>
    previewPayrollHolidayPositionIncentives(batchId),
  );

  const generate = async () => {
    setGenerating(true);
    try {
      const result = await generatePayrollHolidayPositionIncentives(batchId);
      await mutate();
      await mutateKey(`/api/payroll-batches/${batchId}/adjustments`);
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.156nwqb"),
          detail: i18nT("static.1xuavz6", { p0: result.created.length }),
        }),
      );
    } catch {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.14ftm3u"),
          detail: i18nT("static.vil9jw"),
        }),
      );
    } finally {
      setGenerating(false);
    }
  };

  const confirmGenerate = () => {
    requestActionConfirmation({
      action: i18nT("static.1sqqbzh"),
      target: `Payroll batch #${batchId}`,
      severity: "warning",
      confirmLabel: i18nT("static.1jb34xe"),
      confirmIcon: "pi pi-bolt",
      description: i18nT("static.88veug"),
      onAccept: () => generate(),
    });
  };

  if (!canAdjust) return null;
  if (error) {
    return (
      <Card className="border border-red-200 shadow-sm">
        <div
          className="flex flex-col gap-3 p-4 text-red-800 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <div>
            <h2 className="m-0 text-base font-semibold">
              {i18nT("static.1xkod0g")}{" "}
            </h2>
            <p className="m-0 mt-1 text-sm text-red-700">
              {getErrorMessage(error, "code")}
            </p>
          </div>
          <Button
            type="button"
            label={i18nT("static.982hh6")}
            icon="pi pi-refresh"
            severity="secondary"
            outlined
            loading={isValidating}
            onClick={() => void mutate()}
          />
        </div>
      </Card>
    );
  }
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="m-0 text-base font-semibold text-slate-800">
              {i18nT("static.1j8t3bn")}{" "}
            </h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {i18nT("static.4nyibb")}{" "}
            </p>
          </div>
          <Button
            label={i18nT("static.82anqq")}
            icon="pi pi-bolt"
            size="small"
            loading={isLoading || isValidating || generating}
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
          dataKey={(row) => `${row.employee_id}-${row.policy_id}`}
          size="small"
          stripedRows
          scrollable
          responsiveLayout="scroll"
          loading={isLoading || isValidating}
          emptyMessage={i18nT("static.1lzvvxi")}
        >
          <Column field="employee_code" header={i18nT("static.1lghzb2")} />
          <Column field="employee_name" header={i18nT("static.1fak8xt")} />
          <Column
            header={i18nT("static.t0y6r1")}
            body={(row: PayrollHolidayPositionIncentivePreview) =>
              `${row.policy_code} — ${row.policy_name}`
            }
          />
          <Column
            header={i18nT("static.1spgcl1")}
            body={(row: PayrollHolidayPositionIncentivePreview) =>
              row.eligible_dates.join(", ")
            }
            style={{ minWidth: "16rem" }}
          />
          <Column
            header={i18nT("static.pxfr8q")}
            body={(row: PayrollHolidayPositionIncentivePreview) =>
              row.eligible_day_count
            }
          />
          <Column
            header={i18nT("static.a2ky21")}
            body={(row: PayrollHolidayPositionIncentivePreview) =>
              `${currency(row.daily_amount)} × ${row.eligible_day_count} = ${currency(row.amount)}`
            }
            style={{ minWidth: "16rem" }}
          />
          <Column
            header={i18nT("static.3pd73")}
            body={(row: PayrollHolidayPositionIncentivePreview) =>
              row.reason ? (
                <Tag value={row.reason} severity="warning" />
              ) : (
                <Tag value={i18nT("static.ile4gg")} severity="success" />
              )
            }
          />
        </DataTable>
        {batchStatus !== "READY" && (
          <p className="m-0 text-xs text-slate-500">
            {i18nT("static.1j2sq29")}{" "}
          </p>
        )}
      </div>
    </Card>
  );
}
