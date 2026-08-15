"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";

import type { RootState } from "@/store/store";
import {
  approvePayrollAdjustment,
  applyPayrollAdjustment,
  cancelPayrollAdjustment,
  createPayrollAdjustment,
  getPayrollAdjustmentOptions,
  getPayrollAdjustments,
  rejectPayrollAdjustment,
  submitPayrollAdjustment,
} from "@/app/services/payroll-batch-service";
import type {
  PayrollAdjustment,
  PayrollAdjustmentOptions,
  PayrollBatchStatus,
} from "@/app/types/payroll-batch";
import type { ResponseTypeError } from "@/app/types/response-type";

type AdjustmentAction = "submit" | "approve" | "apply" | "cancel";

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as ResponseTypeError).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Payroll adjustment could not be processed.";
};

export default function PayrollAdjustmentPanel({
  batchId,
  batchStatus,
}: {
  batchId: number;
  batchStatus: PayrollBatchStatus;
}) {
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canAdjust = permissions.includes("payroll.adjust");
  const canApprove = permissions.includes("payroll.approve");
  const { data, mutate } = useSWR<PayrollAdjustment[]>(
    `/api/payroll-batches/${batchId}/adjustments`,
    () => getPayrollAdjustments(batchId),
  );
  const { data: options } = useSWR<PayrollAdjustmentOptions>(
    `/api/payroll-batches/${batchId}/adjustment-options`,
    () => getPayrollAdjustmentOptions(batchId),
  );
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [type, setType] =
    useState<PayrollAdjustment["component_type"]>("EARNING");
  const [componentId, setComponentId] = useState<number | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PayrollAdjustment | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const employeeLabels = useMemo(
    () =>
      new Map(
        (options?.employees ?? []).map((item) => [
          item.employee_id,
          `${item.employee_code} · ${item.employee_name}`,
        ]),
      ),
    [options?.employees],
  );
  const components = useMemo(
    () =>
      type === "EARNING"
        ? (options?.income_components ?? [])
        : type === "DEDUCTION"
          ? (options?.deduction_components ?? [])
          : [],
    [options, type],
  );

  const create = async () => {
    setError(null);
    if (!employeeId || amount === null || amount === 0 || !reason.trim()) {
      setError("Employee, non-zero amount, and reason are required.");
      return;
    }
    if ((type === "EARNING" || type === "DEDUCTION") && componentId === null) {
      setError("Select a component for this adjustment type.");
      return;
    }
    try {
      await createPayrollAdjustment(batchId, {
        employee_id: employeeId,
        component_type: type,
        income_component_id: type === "EARNING" ? componentId : null,
        deduction_component_id: type === "DEDUCTION" ? componentId : null,
        amount: String(amount),
        reason: reason.trim(),
      });
      setEmployeeId(null);
      setComponentId(null);
      setAmount(null);
      setReason("");
      await mutate();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    }
  };

  const action = async (
    row: PayrollAdjustment,
    actionName: AdjustmentAction,
  ) => {
    setError(null);
    setBusyId(row.id);
    try {
      if (actionName === "submit")
        await submitPayrollAdjustment(row.id, row.row_version);
      if (actionName === "approve")
        await approvePayrollAdjustment(row.id, row.row_version);
      if (actionName === "apply")
        await applyPayrollAdjustment(row.id, row.row_version);
      if (actionName === "cancel")
        await cancelPayrollAdjustment(row.id, row.row_version);
      await mutate();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  };

  const confirmAction = (
    row: PayrollAdjustment,
    actionName: AdjustmentAction,
  ) => {
    const labels: Record<AdjustmentAction, string> = {
      submit: "Submit",
      approve: "Approve",
      apply: "Apply",
      cancel: "Cancel",
    };
    const isDanger = actionName === "cancel";
    requestActionConfirmation({
      action: labels[actionName],
      target:
        employeeLabels.get(row.employee_id) ?? `Employee #${row.employee_id}`,
      severity: isDanger
        ? "danger"
        : actionName === "apply"
          ? "warning"
          : "info",
      confirmLabel: labels[actionName],
      confirmIcon:
        actionName === "cancel"
          ? "pi pi-times"
          : actionName === "apply"
            ? "pi pi-check-circle"
            : "pi pi-check",
      description:
        actionName === "apply"
          ? "Apply this payroll adjustment?"
          : actionName === "cancel"
            ? "Cancel this payroll adjustment?"
            : `${labels[actionName]} this payroll adjustment?`,
      onAccept: () => action(row, actionName),
    });
  };

  const reject = async () => {
    if (!rejectTarget || !rejectionReason.trim()) {
      setError("A rejection reason is required.");
      return;
    }
    setError(null);
    setBusyId(rejectTarget.id);
    try {
      await rejectPayrollAdjustment(
        rejectTarget.id,
        rejectTarget.row_version,
        rejectionReason.trim(),
      );
      setRejectTarget(null);
      setRejectionReason("");
      await mutate();
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-4 p-4">
        <div>
          <h2 className="m-0 text-base font-semibold text-slate-800">
            Payroll Adjustments
          </h2>
          <p className="m-0 mt-1 text-sm text-slate-500">
            Requests can only be created and applied while the batch is
            CALCULATED.
          </p>
        </div>
        {error && <Message severity="error" text={error} />}
        {canAdjust && batchStatus === "CALCULATED" && (
          <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-6">
            <Dropdown
              value={employeeId}
              options={(options?.employees ?? []).map((item) => ({
                label: `${item.employee_code} · ${item.employee_name}`,
                value: item.employee_id,
              }))}
              placeholder="Select employee"
              filter
              className="w-full"
              onChange={(event) => setEmployeeId(event.value as number | null)}
            />
            <Dropdown
              value={type}
              options={["EARNING", "DEDUCTION", "EMPLOYER_CONTRIBUTION", "TAX"]}
              className="w-full"
              onChange={(event) => {
                setType(event.value as PayrollAdjustment["component_type"]);
                setComponentId(null);
              }}
            />
            <Dropdown
              value={componentId}
              options={components.map((item) => ({
                label: `${item.code} · ${item.name}`,
                value: item.id,
              }))}
              placeholder="Select component"
              disabled={components.length === 0}
              className="w-full"
              onChange={(event) => setComponentId(event.value as number | null)}
            />
            <InputNumber
              value={amount}
              onValueChange={(event) => setAmount(event.value ?? null)}
              placeholder="Amount"
              className="w-full"
              inputClassName="w-full"
            />
            <InputText
              value={reason}
              placeholder="Reason"
              className="w-full"
              onChange={(event) => setReason(event.target.value)}
            />
            <Button
              label="Create Draft"
              icon="pi pi-plus"
              onClick={() => void create()}
            />
          </div>
        )}
        <DataTable
          value={data ?? []}
          dataKey="id"
          size="small"
          stripedRows
          emptyMessage="No adjustment request."
        >
          <Column
            header="Employee"
            body={(row: PayrollAdjustment) =>
              employeeLabels.get(row.employee_id) ??
              `Employee #${row.employee_id}`
            }
          />
          <Column field="component_type" header="Type" />
          <Column field="amount" header="Amount" />
          <Column field="reason" header="Reason" />
          <Column
            header="Status"
            body={(row: PayrollAdjustment) => (
              <Tag
                value={row.status}
                severity={
                  row.status === "APPLIED"
                    ? "success"
                    : row.status === "REJECTED"
                      ? "danger"
                      : "warning"
                }
              />
            )}
          />
          <Column
            header="Action"
            body={(row: PayrollAdjustment) => (
              <div className="flex flex-wrap gap-1">
                {canAdjust && row.status === "DRAFT" && (
                  <>
                    <Button
                      size="small"
                      label="Submit"
                      loading={busyId === row.id}
                      onClick={() => confirmAction(row, "submit")}
                    />
                    <Button
                      size="small"
                      text
                      label="Cancel"
                      disabled={busyId === row.id}
                      onClick={() => confirmAction(row, "cancel")}
                    />
                  </>
                )}
                {canApprove && row.status === "PENDING_APPROVAL" && (
                  <>
                    <Button
                      size="small"
                      label="Approve"
                      loading={busyId === row.id}
                      onClick={() => confirmAction(row, "approve")}
                    />
                    <Button
                      size="small"
                      severity="danger"
                      outlined
                      label="Reject"
                      disabled={busyId === row.id}
                      onClick={() => {
                        setError(null);
                        setRejectTarget(row);
                      }}
                    />
                  </>
                )}
                {canAdjust && row.status === "APPROVED" && (
                  <Button
                    size="small"
                    label="Apply"
                    loading={busyId === row.id}
                    onClick={() => confirmAction(row, "apply")}
                  />
                )}
              </div>
            )}
          />
        </DataTable>
      </div>
      <Dialog
        header="Reject Payroll Adjustment"
        visible={rejectTarget !== null}
        modal
        draggable={false}
        style={{ width: "min(32rem, 95vw)" }}
        onHide={() => {
          if (busyId === null) {
            setRejectTarget(null);
            setRejectionReason("");
          }
        }}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Cancel"
              severity="secondary"
              text
              disabled={busyId !== null}
              onClick={() => setRejectTarget(null)}
            />
            <Button
              label="Reject Adjustment"
              severity="danger"
              loading={busyId === rejectTarget?.id}
              onClick={() => void reject()}
            />
          </div>
        }
      >
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">
            Rejection reason *
          </span>
          <InputTextarea
            value={rejectionReason}
            rows={4}
            autoResize
            maxLength={500}
            onChange={(event) => setRejectionReason(event.target.value)}
          />
        </label>
      </Dialog>
    </Card>
  );
}
