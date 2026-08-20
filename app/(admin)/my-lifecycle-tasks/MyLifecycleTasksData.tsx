"use client";

import { useState } from "react";
import useSWR from "swr";
import { useDispatch } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";
import {
  completeEmployeeLifecycleTask,
  getEmployeeLifecycleCase,
  getMyEmployeeLifecycleTasks,
} from "@/app/services/employee-lifecycle-service";
import type {
  EmployeeLifecycleAssignedTask,
  EmployeeLifecycleEmploymentSnapshot,
} from "@/app/types/employee-lifecycle";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { showToast } from "@/store/ToastSlice";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";

const employmentChangeFields: Array<{
  key: keyof EmployeeLifecycleEmploymentSnapshot;
  label: string;
}> = [
  { key: "join_date", label: "Join Date" },
  { key: "code", label: "Employment Code" },
  { key: "agency_name", label: "Agency" },
  { key: "branch_name", label: "Branch" },
  { key: "department_name", label: "Department" },
  { key: "position_name", label: "Position" },
  { key: "employment_status_name", label: "Employment Status" },
  { key: "supervisor_name", label: "Supervisor" },
  { key: "end_date", label: "End Date" },
  { key: "probation_end_date", label: "Probation End Date" },
  { key: "confirmation_date", label: "Confirmation Date" },
  { key: "notes", label: "Notes" },
];

const displayValue = (value: string | null) => value || "-";

export default function MyLifecycleTasksData() {
  const dispatch = useDispatch();
  const [reviewTask, setReviewTask] =
    useState<EmployeeLifecycleAssignedTask | null>(null);
  const {
    data = [],
    error,
    isValidating,
    mutate,
  } = useSWR("my-employee-lifecycle-tasks", getMyEmployeeLifecycleTasks);
  const { data: lifecycleDetail, isValidating: isLoadingDetail } = useSWR(
    reviewTask
      ? `employee-lifecycle-detail-${reviewTask.lifecycle_case_id}`
      : null,
    () => getEmployeeLifecycleCase(reviewTask!.lifecycle_case_id),
  );
  const complete = async (
    task: EmployeeLifecycleAssignedTask,
  ): Promise<boolean> => {
    try {
      await completeEmployeeLifecycleTask(
        task.lifecycle_case_id,
        task.id,
        task.row_version,
        null,
      );
      await mutate();
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Task completed",
          detail: "The lifecycle checklist has been updated.",
        }),
      );
      return true;
    } catch (error: unknown) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Unable to complete task",
          detail: isResponseTypeError(error)
            ? getErrorMessage(error, "message")
            : error instanceof Error
              ? error.message
              : "Refresh the page and review the task status.",
        }),
      );
      return false;
    }
  };
  const confirmComplete = (task: EmployeeLifecycleAssignedTask) => {
    requestActionConfirmation({
      action: "Complete task",
      target: `${task.employee_name} · ${task.name}`,
      severity: "warning",
      confirmLabel: "Complete Task",
      confirmIcon: "pi pi-check",
      description: "Mark this lifecycle task as complete?",
      onAccept: async () => {
        const completed = await complete(task);
        if (completed) setReviewTask(null);
      },
    });
  };
  if (error)
    return (
      <Card className="border border-red-200">
        <p className="m-0 text-sm text-red-600">
          Unable to load assigned lifecycle tasks.
        </p>
      </Card>
    );
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
              My Lifecycle Tasks
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Review the lifecycle context before confirming work assigned to
              you.
            </p>
          </div>
          <Button
            label="Refresh"
            icon="pi pi-refresh"
            outlined
            severity="secondary"
            size="small"
            loading={isValidating}
            onClick={() => void mutate()}
          />
        </div>
        <DataTable
          value={data}
          dataKey="id"
          loading={isValidating}
          paginator
          rows={10}
          stripedRows
          rowHover
          size="small"
          emptyMessage="No lifecycle task is assigned to you."
        >
          <Column field="employee_name" header="Employee" />
          <Column
            field="lifecycle_type"
            header="Lifecycle"
            body={(row: EmployeeLifecycleAssignedTask) => (
              <Tag
                value={row.lifecycle_type.replace("_", " ")}
                severity="info"
              />
            )}
          />
          <Column field="name" header="Task" />
          <Column
            header="Owner Policy"
            body={(row: EmployeeLifecycleAssignedTask) =>
              row.assignment_source === "ROLE"
                ? `Role: ${row.assignment_role_code ?? row.owner_scope}`
                : row.assignment_source === "SUPERVISOR"
                  ? "Supervisor / Manager"
                  : row.assignment_source === "EMPLOYEE"
                    ? "Lifecycle Employee"
                    : "Manual Assignment"
            }
          />
          <Column
            field="effective_date"
            header="Effective Date"
            body={(row: EmployeeLifecycleAssignedTask) =>
              formatDisplayDate(row.effective_date)
            }
          />
          <Column
            header="Due Date"
            body={(row: EmployeeLifecycleAssignedTask) =>
              formatDisplayDate(row.due_date)
            }
          />
          <Column
            header="Action"
            body={(row: EmployeeLifecycleAssignedTask) => (
              <Button
                label="Review"
                icon="pi pi-eye"
                size="small"
                onClick={() => setReviewTask(row)}
              />
            )}
          />
        </DataTable>
      </div>
      <Dialog
        header="Lifecycle Task Review"
        visible={reviewTask !== null}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "58rem" }}
        onHide={() => setReviewTask(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label="Close"
              severity="secondary"
              outlined
              disabled={isLoadingDetail}
              onClick={() => setReviewTask(null)}
            />
            <Button
              label="Complete Task"
              icon="pi pi-check"
              disabled={!reviewTask || !lifecycleDetail || isLoadingDetail}
              onClick={() => {
                if (reviewTask) confirmComplete(reviewTask);
              }}
            />
          </div>
        }
      >
        {!reviewTask || isLoadingDetail ? (
          <p className="m-0 py-4 text-sm text-slate-500">
            Loading lifecycle details...
          </p>
        ) : lifecycleDetail ? (
          <div className="space-y-5 py-2">
            <div className="grid gap-3 rounded-lg bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="m-0 text-slate-500">Employee</p>
                <p className="mb-0 mt-1 font-medium text-slate-800">
                  {lifecycleDetail.case.employee_name}
                </p>
              </div>
              <div>
                <p className="m-0 text-slate-500">Effective Date</p>
                <p className="mb-0 mt-1 font-medium text-slate-800">
                  {formatDisplayDate(lifecycleDetail.case.effective_date)}
                </p>
              </div>
              <div>
                <p className="m-0 text-slate-500">Lifecycle</p>
                <p className="mb-0 mt-1 font-medium text-slate-800">
                  {lifecycleDetail.case.lifecycle_type.replaceAll("_", " ")}
                </p>
              </div>
              <div>
                <p className="m-0 text-slate-500">Lifecycle Owner</p>
                <p className="mb-0 mt-1 font-medium text-slate-800">
                  {lifecycleDetail.case.requested_by_name}
                </p>
              </div>
              <div>
                <p className="m-0 text-slate-500">Your Task</p>
                <p className="mb-0 mt-1 font-medium text-slate-800">
                  {reviewTask.name}
                </p>
              </div>
            </div>
            {reviewTask.description && (
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  Task Instructions
                </h2>
                <p className="mb-0 mt-1 text-sm text-slate-600">
                  {reviewTask.description}
                </p>
              </div>
            )}
            {lifecycleDetail.case.reason && (
              <div>
                <h2 className="m-0 text-base font-semibold text-slate-800">
                  Request Reason
                </h2>
                <p className="mb-0 mt-1 whitespace-pre-wrap text-sm text-slate-600">
                  {lifecycleDetail.case.reason}
                </p>
              </div>
            )}
            {(() => {
              const employmentChange = lifecycleDetail.employment_change;
              if (!employmentChange) return null;
              return (
                <div>
                  <h2 className="m-0 text-base font-semibold text-slate-800">
                    Employment Change Summary
                  </h2>
                  <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th className="px-3 py-2 font-medium">Field</th>
                          <th className="px-3 py-2 font-medium">Current</th>
                          <th className="px-3 py-2 font-medium">Proposed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employmentChangeFields.map(({ key, label }) => (
                          <tr key={key} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-700">
                              {label}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {displayValue(employmentChange.previous[key])}
                            </td>
                            <td className="px-3 py-2 text-slate-800">
                              {displayValue(employmentChange.proposed[key])}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <p className="m-0 py-4 text-sm text-red-600">
            Unable to load lifecycle details.
          </p>
        )}
      </Dialog>
    </Card>
  );
}
