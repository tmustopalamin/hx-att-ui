"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import { useDispatch, useSelector } from "react-redux";
import type { Employee } from "@/app/types/employee";
import type { EmployeeEmploymentData } from "@/app/types/employee-general";
import type {
  PerformanceCycle,
  PerformanceEarningPolicy,
  PerformanceGoal,
  PerformanceReview,
} from "@/app/types/performance";
import {
  acknowledgePerformanceReview,
  createPerformanceCycle,
  createPerformanceEarningPolicy,
  createPerformanceGoal,
  createPerformanceReview,
  getPerformanceCycles,
  getPerformanceEarningPolicies,
  getPerformanceGoals,
  getPerformanceReviews,
  finalizePerformanceReview,
  submitPerformanceReview,
  updatePerformanceCycleStatus,
  updatePerformanceEarningPolicy,
  updatePerformanceEarningPolicyStatus,
  updatePerformanceGoal,
} from "@/app/services/performance-service";
import { getEmployeeEmploymentData } from "@/app/services/employee-general-service";
import { fetcher } from "@/app/utils/fetcher";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import { formatDate as formatDisplayDate } from "@/app/utils/date-format";

type DialogName =
  | "cycle"
  | "review"
  | "submit"
  | "goals"
  | "goal"
  | "updateGoal"
  | "acknowledge"
  | "policy"
  | null;
const tag = (status: string) =>
  ["OPEN", "SUBMITTED", "ACKNOWLEDGED", "FINALIZED"].includes(status)
    ? "success"
    : status === "DRAFT"
      ? "info"
      : status === "CLOSED"
        ? "warning"
        : "danger";
export default function PerformanceData() {
  const dispatch = useDispatch();
  const permissions = useSelector((s: RootState) => s.profile.permissions);
  const currentEmployeeId = useSelector(
    (s: RootState) => s.profile.employee_id,
  );
  const canManage = permissions.includes("performance.manage");
  const {
    data: cycles = [],
    mutate: reloadCycles,
    isValidating,
  } = useSWR("performance-cycles", getPerformanceCycles);
  const { data: reviews = [], mutate: reloadReviews } = useSWR(
    "performance-reviews",
    getPerformanceReviews,
  );
  const { data: policies = [], mutate: reloadPolicies } = useSWR<
    PerformanceEarningPolicy[]
  >(
    canManage ? "performance-earning-policies" : null,
    getPerformanceEarningPolicies,
  );
  const { data: departments = [] } = useSWR<
    Array<{ id: number; name: string }>
  >(canManage ? "/api/department?show_all=false" : null, fetcher);
  const { data: positions = [] } = useSWR<
    Array<{ id: number; name: string; department_id: number | null }>
  >(canManage ? "/api/position?show_all=false" : null, fetcher);
  const { data: incomeComponents = [] } = useSWR<
    Array<{ id: number; code: string; name: string; is_active: boolean }>
  >(canManage ? "/api/income-component" : null, fetcher);
  const { data: employees = [] } = useSWR<Employee[]>(
    "/api/employees/list?show_all=false",
    fetcher,
  );
  const [dialog, setDialog] = useState<DialogName>(null);
  const [saving, setSaving] = useState(false);
  const [selectedReview, setSelectedReview] =
    useState<PerformanceReview | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<PerformanceGoal | null>(
    null,
  );
  const [goalsKey, setGoalsKey] = useState<number | null>(null);
  const { data: goals = [], mutate: reloadGoals } = useSWR(
    goalsKey ? `performance-goals-${goalsKey}` : null,
    () => getPerformanceGoals(goalsKey!),
  );
  const [cycle, setCycle] = useState({
    code: "",
    name: "",
    start_date: "",
    end_date: "",
    earning_enabled: false,
  });
  const [policy, setPolicy] = useState({
    code: "",
    name: "",
    version_no: 1,
    department_id: null as number | null,
    position_id: null as number | null,
    income_component_id: null as number | null,
    effective_from: "",
    effective_to: "",
  });
  const [editingPolicyId, setEditingPolicyId] = useState<number | null>(null);
  const [policyRules, setPolicyRules] = useState<
    Array<{
      score_from: number;
      score_to: number;
      amount_mode: "FIXED" | "PERCENTAGE";
      fixed_amount: number | null;
      percentage: number | null;
    }>
  >([
    {
      score_from: 0,
      score_to: 69.99,
      amount_mode: "FIXED",
      fixed_amount: 0,
      percentage: null,
    },
    {
      score_from: 70,
      score_to: 79.99,
      amount_mode: "PERCENTAGE",
      fixed_amount: null,
      percentage: 5,
    },
    {
      score_from: 80,
      score_to: 89.99,
      amount_mode: "PERCENTAGE",
      fixed_amount: null,
      percentage: 10,
    },
    {
      score_from: 90,
      score_to: 100,
      amount_mode: "FIXED",
      fixed_amount: 2000000,
      percentage: null,
    },
  ]);
  const [review, setReview] = useState({
    performance_cycle_id: 0,
    employee_id: 0,
    reviewer_employee_id: 0,
    review_type: "MANAGER",
  });
  const [reviewerSource, setReviewerSource] = useState<"AUTO" | "MANUAL">(
    "AUTO",
  );
  const { data: selectedEmployment, error: selectedEmploymentError } =
    useSWR<EmployeeEmploymentData | null>(
      review.employee_id
        ? `performance-review-employment-${review.employee_id}`
        : null,
      () => getEmployeeEmploymentData(review.employee_id),
    );
  const [submission, setSubmission] = useState({
    overall_score: null as number | null,
    reviewer_comment: "",
  });
  const [goal, setGoal] = useState({
    title: "",
    description: "",
    weight: 0,
    target_value: "",
  });
  const [goalProgress, setGoalProgress] = useState<{
    actual_value: string;
    score: number | null;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  }>({ actual_value: "", score: null, status: "NOT_STARTED" });
  const [employeeComment, setEmployeeComment] = useState("");
  const isReviewParticipant = (row: PerformanceReview) =>
    row.employee_id === currentEmployeeId ||
    row.reviewer_employee_id === currentEmployeeId;
  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        label:
          e.full_name || [e.first_name, e.last_name].filter(Boolean).join(" "),
        value: e.id,
      })),
    [employees],
  );
  const cycleOptions = useMemo(
    () =>
      cycles
        .filter((c) => c.status === "OPEN")
        .map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
    [cycles],
  );
  const reviewerOptions = useMemo(
    () =>
      employeeOptions.filter((option) => option.value !== review.employee_id),
    [employeeOptions, review.employee_id],
  );
  useEffect(() => {
    if (
      !review.employee_id ||
      review.review_type === "PEER" ||
      reviewerSource === "MANUAL"
    ) {
      return;
    }
    if (review.review_type === "SELF") {
      setReviewerSource("AUTO");
      setReview((current) =>
        current.reviewer_employee_id === current.employee_id
          ? current
          : { ...current, reviewer_employee_id: current.employee_id },
      );
      return;
    }
    if (selectedEmployment === undefined) return;
    setReviewerSource("AUTO");
    const supervisorId = selectedEmployment?.supervisor_employee_id ?? 0;
    setReview((current) =>
      current.reviewer_employee_id === supervisorId
        ? current
        : { ...current, reviewer_employee_id: supervisorId },
    );
  }, [
    review.employee_id,
    review.review_type,
    selectedEmployment,
    reviewerSource,
  ]);
  const notify = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));
  const refresh = async () => {
    await Promise.all([reloadCycles(), reloadReviews(), reloadPolicies()]);
  };
  const close = () => {
    if (!saving) setDialog(null);
  };
  const footer = (label: string, onClick: () => void) => (
    <div className="flex justify-end gap-2">
      <Button
        label="Cancel"
        text
        severity="secondary"
        onClick={close}
        disabled={saving}
      />
      <Button
        label={label}
        icon="pi pi-check"
        loading={saving}
        onClick={onClick}
      />
    </div>
  );
  const save = async (
    action: () => Promise<unknown>,
    success: string,
    reset: () => void,
  ) => {
    setSaving(true);
    try {
      await action();
      reset();
      setDialog(null);
      await refresh();
      notify("success", "Saved", success);
    } catch (cause: unknown) {
      const message =
        typeof cause === "object" &&
        cause !== null &&
        "message" in cause &&
        typeof cause.message === "string" &&
        cause.message.trim()
          ? cause.message
          : "Review the data and refresh if it has changed.";
      notify("error", "Unable to save", message);
    } finally {
      setSaving(false);
    }
  };
  const cycleAction = async (
    row: PerformanceCycle,
    status: "OPEN" | "CLOSED",
  ) => {
    setSaving(true);
    try {
      await updatePerformanceCycleStatus(row.id, row.row_version, status);
      await reloadCycles();
      notify("success", "Updated", `Cycle is now ${status.toLowerCase()}.`);
    } catch {
      notify(
        "error",
        "Unable to update",
        "Cycle has changed or cannot use that status.",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmCycleAction = (
    row: PerformanceCycle,
    status: "OPEN" | "CLOSED",
  ) => {
    const closing = status === "CLOSED";
    requestActionConfirmation({
      action: closing ? "Close performance cycle" : "Open performance cycle",
      target: `${row.code} · ${row.name}`,
      severity: closing ? "danger" : "warning",
      confirmLabel: closing ? "Close Cycle" : "Open Cycle",
      confirmIcon: closing ? "pi pi-lock" : "pi pi-folder-open",
      description: closing
        ? "Close this performance cycle?"
        : "Open this performance cycle?",
      onAccept: () => cycleAction(row, status),
    });
  };
  const finalizeReview = async (row: PerformanceReview) => {
    setSaving(true);
    try {
      const currentReviews = await reloadReviews();
      const current = currentReviews?.find((item) => item.id === row.id) ?? row;
      await finalizePerformanceReview(current.id, current.row_version);
      await reloadReviews();
      notify("success", "Finalized", "Review is locked for payroll use.");
    } catch (cause: unknown) {
      const message =
        typeof cause === "object" &&
        cause !== null &&
        "message" in cause &&
        typeof cause.message === "string" &&
        cause.message.trim()
          ? cause.message
          : "Review must be acknowledged, have a valid score, and belong to an open cycle.";
      notify("error", "Unable to finalize", message);
    } finally {
      setSaving(false);
    }
  };
  const confirmFinalizeReview = (row: PerformanceReview) => {
    requestActionConfirmation({
      action: "Finalize performance review",
      target: `${row.employee_name} · ${row.cycle_name}`,
      severity: "danger",
      confirmLabel: "Finalize",
      confirmIcon: "pi pi-lock",
      description: "Finalize this review and lock its score?",
      onAccept: () => finalizeReview(row),
    });
  };
  const policyAction = async (
    row: PerformanceEarningPolicy,
    status: "PUBLISHED" | "RETIRED",
  ) => {
    setSaving(true);
    try {
      await updatePerformanceEarningPolicyStatus(
        row.id,
        row.row_version,
        status,
      );
      await reloadPolicies();
      notify("success", "Updated", `Policy is now ${status.toLowerCase()}.`);
    } catch {
      notify(
        "error",
        "Unable to update",
        "Policy changed, overlaps another published policy, or has invalid score rules.",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmPolicyAction = (
    row: PerformanceEarningPolicy,
    status: "PUBLISHED" | "RETIRED",
  ) => {
    const publishing = status === "PUBLISHED";
    requestActionConfirmation({
      action: publishing ? "Publish earning policy" : "Retire earning policy",
      target: `${row.code} · ${row.name}`,
      severity: publishing ? "warning" : "danger",
      confirmLabel: publishing ? "Publish" : "Retire",
      confirmIcon: publishing ? "pi pi-check-circle" : "pi pi-ban",
      description: publishing
        ? "Publish this earning policy?"
        : "Retire this earning policy?",
      onAccept: () => policyAction(row, status),
    });
  };
  const confirmSubmitReview = () => {
    if (!selectedReview) return;
    requestActionConfirmation({
      action: "Submit performance review",
      target: `${selectedReview.employee_name} · ${selectedReview.cycle_name}`,
      severity: "warning",
      confirmLabel: "Submit review",
      confirmIcon: "pi pi-send",
      description: "Submit this performance review?",
      onAccept: () =>
        save(
          () =>
            submitPerformanceReview(
              selectedReview.id,
              selectedReview.row_version,
              submission,
            ),
          "Performance review submitted.",
          () => setSelectedReview(null),
        ),
    });
  };
  const confirmAcknowledgeReview = () => {
    if (!selectedReview) return;
    requestActionConfirmation({
      action: "Acknowledge performance review",
      target: `${selectedReview.employee_name} · ${selectedReview.cycle_name}`,
      severity: "info",
      confirmLabel: "Acknowledge",
      confirmIcon: "pi pi-check",
      description: "Acknowledge this performance review?",
      onAccept: () =>
        save(
          () =>
            acknowledgePerformanceReview(
              selectedReview.id,
              selectedReview.row_version,
              employeeComment.trim() || null,
            ),
          "Performance review acknowledged.",
          () => {
            setSelectedReview(null);
            setEmployeeComment("");
          },
        ),
    });
  };
  const resetPolicy = () => {
    setEditingPolicyId(null);
    setPolicy({
      code: "",
      name: "",
      version_no: 1,
      department_id: null,
      position_id: null,
      income_component_id: null,
      effective_from: "",
      effective_to: "",
    });
    setPolicyRules([
      {
        score_from: 0,
        score_to: 69.99,
        amount_mode: "FIXED",
        fixed_amount: 0,
        percentage: null,
      },
      {
        score_from: 70,
        score_to: 79.99,
        amount_mode: "PERCENTAGE",
        fixed_amount: null,
        percentage: 5,
      },
      {
        score_from: 80,
        score_to: 89.99,
        amount_mode: "PERCENTAGE",
        fixed_amount: null,
        percentage: 10,
      },
      {
        score_from: 90,
        score_to: 100,
        amount_mode: "FIXED",
        fixed_amount: 2000000,
        percentage: null,
      },
    ]);
  };
  const editPolicy = (row: PerformanceEarningPolicy) => {
    setEditingPolicyId(row.id);
    setPolicy({
      code: row.code,
      name: row.name,
      version_no: row.version_no,
      department_id: row.department_id,
      position_id: row.position_id,
      income_component_id: row.income_component_id,
      effective_from: row.effective_from,
      effective_to: row.effective_to ?? "",
    });
    setPolicyRules(
      row.rules.map((rule) => ({
        score_from: rule.score_from,
        score_to: rule.score_to,
        amount_mode: rule.amount_mode,
        fixed_amount: rule.fixed_amount,
        percentage: rule.percentage,
      })),
    );
    setDialog("policy");
  };
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
              Performance
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Set review cycles, assign reviewers, track goals, and submit
              performance outcomes.
            </p>
          </div>
          <Button
            label="Refresh"
            outlined
            severity="secondary"
            icon="pi pi-refresh"
            size="small"
            loading={isValidating}
            onClick={() => void refresh()}
          />
        </div>
        <TabView>
          <TabPanel header="Review Cycles">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Cycle"
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => setDialog("cycle")}
                />
              )}
            </div>
            <DataTable
              value={cycles}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage="No performance cycle found."
            >
              <Column field="code" header="Code" />
              <Column field="name" header="Cycle" />
              <Column
                field="start_date"
                header="Start"
                body={(row: PerformanceCycle) =>
                  formatDisplayDate(row.start_date)
                }
              />
              <Column
                field="end_date"
                header="End"
                body={(row: PerformanceCycle) =>
                  formatDisplayDate(row.end_date)
                }
              />
              <Column
                header="Earning"
                body={(r: PerformanceCycle) =>
                  r.earning_enabled ? "Enabled" : "Off"
                }
              />
              <Column
                header="Status"
                body={(r: PerformanceCycle) => (
                  <Tag value={r.status} severity={tag(r.status)} />
                )}
              />
              {canManage && (
                <Column
                  header="Action"
                  body={(r: PerformanceCycle) => (
                    <div className="flex gap-1">
                      {r.status === "DRAFT" && (
                        <Button
                          label="Open"
                          text
                          size="small"
                          onClick={() => confirmCycleAction(r, "OPEN")}
                        />
                      )}{" "}
                      {r.status === "OPEN" && (
                        <Button
                          label="Close"
                          text
                          severity="secondary"
                          size="small"
                          onClick={() => confirmCycleAction(r, "CLOSED")}
                        />
                      )}
                    </div>
                  )}
                />
              )}
            </DataTable>
          </TabPanel>
          <TabPanel header="Reviews">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Review"
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => setDialog("review")}
                />
              )}
            </div>
            <DataTable
              value={reviews}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage="No performance review found."
            >
              <Column field="cycle_name" header="Cycle" />
              <Column field="employee_name" header="Employee" />
              <Column field="reviewer_name" header="Reviewer" />
              <Column field="review_type" header="Type" />
              <Column
                header="Score"
                body={(r: PerformanceReview) => r.overall_score ?? "-"}
              />
              <Column
                header="Status"
                body={(r: PerformanceReview) => (
                  <Tag value={r.status} severity={tag(r.status)} />
                )}
              />
              <Column
                header="Action"
                body={(r: PerformanceReview) => (
                  <div className="flex flex-wrap gap-1">
                    <Button
                      label="Goals"
                      text
                      size="small"
                      onClick={() => {
                        setSelectedReview(r);
                        setGoalsKey(r.id);
                        setDialog("goals");
                      }}
                    />
                    {r.status === "DRAFT" &&
                    r.reviewer_employee_id === currentEmployeeId ? (
                      <Button
                        label="Submit"
                        text
                        size="small"
                        onClick={() => {
                          setSelectedReview(r);
                          setSubmission({
                            overall_score: r.overall_score,
                            reviewer_comment: r.reviewer_comment || "",
                          });
                          setDialog("submit");
                        }}
                      />
                    ) : null}
                    {r.status === "SUBMITTED" &&
                    r.employee_id === currentEmployeeId ? (
                      <Button
                        label="Acknowledge"
                        text
                        size="small"
                        onClick={() => {
                          setSelectedReview(r);
                          setEmployeeComment(r.employee_comment || "");
                          setDialog("acknowledge");
                        }}
                      />
                    ) : null}
                    {canManage && r.status === "ACKNOWLEDGED" ? (
                      <Button
                        label="Finalize"
                        text
                        size="small"
                        onClick={() => confirmFinalizeReview(r)}
                      />
                    ) : null}
                  </div>
                )}
              />
            </DataTable>
          </TabPanel>
          {canManage && (
            <TabPanel header="Earning Policies">
              <div className="mb-4 flex justify-end">
                <Button
                  label="New Earning Policy"
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => setDialog("policy")}
                />
              </div>
              <DataTable
                value={policies}
                dataKey="id"
                paginator
                rows={10}
                stripedRows
                rowHover
                size="small"
                emptyMessage="No performance earning policy found."
              >
                <Column field="code" header="Code" />
                <Column field="name" header="Policy" />
                <Column
                  header="Scope"
                  body={(row: PerformanceEarningPolicy) =>
                    row.position_name || row.department_name || "-"
                  }
                />
                <Column
                  header="Component"
                  body={(row: PerformanceEarningPolicy) =>
                    `${row.income_component_code} — ${row.income_component_name}`
                  }
                />
                <Column field="version_no" header="Version" />
                <Column
                  header="Status"
                  body={(row: PerformanceEarningPolicy) => (
                    <Tag value={row.status} severity={tag(row.status)} />
                  )}
                />
                <Column
                  header="Rules"
                  body={(row: PerformanceEarningPolicy) => row.rules.length}
                />
                <Column
                  header="Action"
                  frozen
                  alignFrozen="right"
                  body={(row: PerformanceEarningPolicy) => (
                    <div className="flex gap-1">
                      {row.status === "DRAFT" && (
                        <Button
                          label="Edit"
                          text
                          size="small"
                          onClick={() => editPolicy(row)}
                        />
                      )}
                      {row.status === "DRAFT" && (
                        <Button
                          label="Publish"
                          text
                          size="small"
                          onClick={() => confirmPolicyAction(row, "PUBLISHED")}
                        />
                      )}
                      {row.status === "PUBLISHED" && (
                        <Button
                          label="Retire"
                          text
                          severity="secondary"
                          size="small"
                          onClick={() => confirmPolicyAction(row, "RETIRED")}
                        />
                      )}
                    </div>
                  )}
                />
              </DataTable>
            </TabPanel>
          )}
        </TabView>
      </div>
      <Dialog
        header="New Performance Cycle"
        visible={dialog === "cycle"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (
            !cycle.code.trim() ||
            !cycle.name.trim() ||
            !cycle.start_date ||
            !cycle.end_date
          ) {
            notify("error", "Validation", "All cycle fields are required.");
            return;
          }
          void save(
            () => createPerformanceCycle(cycle),
            "Performance cycle created as draft.",
            () =>
              setCycle({
                code: "",
                name: "",
                start_date: "",
                end_date: "",
                earning_enabled: false,
              }),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Code
            <InputText
              value={cycle.code}
              onChange={(e) => setCycle({ ...cycle, code: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Name
            <InputText
              value={cycle.name}
              onChange={(e) => setCycle({ ...cycle, name: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Start Date
            <PrimeDatePicker
              value={cycle.start_date}
              onValueChange={(value) =>
                setCycle({ ...cycle, start_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            End Date
            <PrimeDatePicker
              value={cycle.end_date}
              onValueChange={(value) => setCycle({ ...cycle, end_date: value })}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Checkbox
              inputId="performance-earning-enabled"
              checked={cycle.earning_enabled}
              onChange={(event) =>
                setCycle({ ...cycle, earning_enabled: event.checked === true })
              }
            />
            Enable performance earning for this cycle
          </label>
        </div>
      </Dialog>
      <Dialog
        header={
          editingPolicyId
            ? "Edit Performance Earning Policy"
            : "New Performance Earning Policy"
        }
        visible={dialog === "policy"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "52rem" }}
        onHide={close}
        footer={footer(editingPolicyId ? "Save Changes" : "Save Draft", () => {
          if (
            !policy.code.trim() ||
            !policy.name.trim() ||
            !policy.income_component_id ||
            !policy.effective_from ||
            (!policy.department_id && !policy.position_id) ||
            policyRules.length === 0
          ) {
            notify(
              "error",
              "Validation",
              "Scope, earning component, dates, and score rules are required.",
            );
            return;
          }
          const payload = {
            ...policy,
            effective_to: policy.effective_to || null,
            rules: policyRules,
          };
          void save(
            () =>
              editingPolicyId
                ? updatePerformanceEarningPolicy(
                    editingPolicyId,
                    policies.find((item) => item.id === editingPolicyId)
                      ?.row_version ?? 0,
                    payload,
                  )
                : createPerformanceEarningPolicy(payload),
            editingPolicyId
              ? "Performance earning policy updated."
              : "Performance earning policy created as draft.",
            resetPolicy,
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Policy Code
              <InputText
                value={policy.code}
                onChange={(event) =>
                  setPolicy({ ...policy, code: event.target.value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Name
              <InputText
                value={policy.name}
                onChange={(event) =>
                  setPolicy({ ...policy, name: event.target.value })
                }
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Department scope
              <Dropdown
                value={policy.department_id}
                options={departments.map((item) => ({
                  label: item.name,
                  value: item.id,
                }))}
                filter
                showClear
                className="w-full"
                placeholder="Optional department"
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    department_id: (event.value as number | null) ?? null,
                    position_id: null,
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Position scope
              <Dropdown
                value={policy.position_id}
                options={positions
                  .filter(
                    (item) =>
                      !policy.department_id ||
                      item.department_id === policy.department_id,
                  )
                  .map((item) => ({ label: item.name, value: item.id }))}
                filter
                showClear
                className="w-full"
                placeholder="Optional position"
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    position_id: (event.value as number | null) ?? null,
                  })
                }
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Earning component
              <Dropdown
                value={policy.income_component_id}
                options={incomeComponents
                  .filter((item) => item.is_active)
                  .map((item) => ({
                    label: `${item.code} — ${item.name}`,
                    value: item.id,
                  }))}
                filter
                className="w-full"
                placeholder="Select component"
                onChange={(event) =>
                  setPolicy({
                    ...policy,
                    income_component_id: (event.value as number | null) ?? null,
                  })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Effective from
              <PrimeDatePicker
                value={policy.effective_from}
                onValueChange={(value) =>
                  setPolicy({ ...policy, effective_from: value })
                }
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Effective to
              <PrimeDatePicker
                value={policy.effective_to}
                onValueChange={(value) =>
                  setPolicy({ ...policy, effective_to: value })
                }
              />
            </label>
          </div>
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-2">From</th>
                  <th className="p-2">To</th>
                  <th className="p-2">Mode</th>
                  <th className="p-2">Fixed amount</th>
                  <th className="p-2">Percentage</th>
                  <th className="sticky right-0 z-10 bg-slate-50 p-2 shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.35)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {policyRules.map((rule, index) => (
                  <tr
                    key={`policy-rule-${index}`}
                    className="border-t border-slate-100"
                  >
                    <td className="p-2">
                      <InputNumber
                        value={rule.score_from}
                        min={0}
                        max={100}
                        minFractionDigits={0}
                        maxFractionDigits={2}
                        onValueChange={(event) =>
                          setPolicyRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, score_from: event.value ?? 0 }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <InputNumber
                        value={rule.score_to}
                        min={0}
                        max={100}
                        minFractionDigits={0}
                        maxFractionDigits={2}
                        onValueChange={(event) =>
                          setPolicyRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, score_to: event.value ?? 0 }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <Dropdown
                        value={rule.amount_mode}
                        options={["FIXED", "PERCENTAGE"]}
                        onChange={(event) =>
                          setPolicyRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    amount_mode: event.value as
                                      "FIXED" | "PERCENTAGE",
                                    fixed_amount:
                                      event.value === "FIXED"
                                        ? (item.fixed_amount ?? 0)
                                        : null,
                                    percentage:
                                      event.value === "PERCENTAGE"
                                        ? (item.percentage ?? 0)
                                        : null,
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <InputNumber
                        value={rule.fixed_amount}
                        disabled={rule.amount_mode !== "FIXED"}
                        min={0}
                        onValueChange={(event) =>
                          setPolicyRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, fixed_amount: event.value ?? 0 }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="p-2">
                      <InputNumber
                        value={rule.percentage}
                        disabled={rule.amount_mode !== "PERCENTAGE"}
                        min={0}
                        max={100}
                        onValueChange={(event) =>
                          setPolicyRules((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, percentage: event.value ?? 0 }
                                : item,
                            ),
                          )
                        }
                      />
                    </td>
                    <td className="sticky right-0 z-10 bg-white p-2 shadow-[-4px_0_8px_-6px_rgba(15,23,42,0.35)]">
                      <Button
                        icon="pi pi-trash"
                        text
                        severity="danger"
                        aria-label="Remove score rule"
                        disabled={policyRules.length <= 1}
                        tooltip={
                          policyRules.length <= 1
                            ? "At least one score rule is required."
                            : "Remove score rule"
                        }
                        onClick={() =>
                          setPolicyRules((current) =>
                            current.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-slate-200 p-2">
              <Button
                label="Add score rule"
                icon="pi pi-plus"
                text
                size="small"
                onClick={() =>
                  setPolicyRules((current) => [
                    ...current,
                    {
                      score_from: 0,
                      score_to: 100,
                      amount_mode: "FIXED",
                      fixed_amount: 0,
                      percentage: null,
                    },
                  ])
                }
              />
            </div>
          </div>
        </div>
      </Dialog>
      <Dialog
        header="New Performance Review"
        visible={dialog === "review"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (
            !review.performance_cycle_id ||
            !review.employee_id ||
            !review.reviewer_employee_id
          ) {
            notify(
              "error",
              "Validation",
              review.review_type === "MANAGER"
                ? "Cycle and employee are required. Select the current supervisor or choose a reviewer manually."
                : "Cycle, employee, and reviewer are required.",
            );
            return;
          }
          void save(
            () => createPerformanceReview(review),
            "Performance review created.",
            () => {
              setReview({
                performance_cycle_id: 0,
                employee_id: 0,
                reviewer_employee_id: 0,
                review_type: "MANAGER",
              });
              setReviewerSource("AUTO");
            },
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Open Cycle
            <Dropdown
              value={review.performance_cycle_id || null}
              options={cycleOptions}
              filter
              placeholder="Select cycle"
              className="w-full"
              onChange={(e) =>
                setReview({
                  ...review,
                  performance_cycle_id: e.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Review Type
            <Dropdown
              value={review.review_type}
              options={[
                { label: "Manager review", value: "MANAGER" },
                { label: "Self review", value: "SELF" },
                { label: "Peer review", value: "PEER" },
              ]}
              className="w-full"
              onChange={(e) => {
                const reviewType = e.value as "MANAGER" | "SELF" | "PEER";
                setReview({
                  ...review,
                  review_type: reviewType,
                  reviewer_employee_id:
                    reviewType === "SELF" ? review.employee_id : 0,
                });
                setReviewerSource(reviewType === "PEER" ? "MANUAL" : "AUTO");
              }}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Employee
            <Dropdown
              value={review.employee_id || null}
              options={employeeOptions}
              filter
              placeholder="Select employee"
              className="w-full"
              onChange={(e) => {
                const employeeId = e.value as number;
                setReview({
                  ...review,
                  employee_id: employeeId,
                  reviewer_employee_id:
                    review.review_type === "SELF" ? employeeId : 0,
                });
                setReviewerSource(
                  review.review_type === "PEER" ? "MANUAL" : "AUTO",
                );
              }}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Reviewer
            <Dropdown
              value={review.reviewer_employee_id || null}
              options={
                review.review_type === "SELF"
                  ? employeeOptions
                  : reviewerOptions
              }
              filter
              placeholder="Select reviewer"
              className="w-full"
              disabled={!review.employee_id || review.review_type === "SELF"}
              onChange={(e) => {
                setReview({
                  ...review,
                  reviewer_employee_id: e.value as number,
                });
                setReviewerSource("MANUAL");
              }}
            />
            {review.review_type === "SELF" && (
              <span className="text-xs font-normal text-slate-500">
                Reviewer is automatically set to the selected employee.
              </span>
            )}
            {review.review_type === "MANAGER" && review.employee_id && (
              <span className="text-xs font-normal text-slate-500">
                {selectedEmploymentError
                  ? "Unable to load employment data. You can select a reviewer manually."
                  : selectedEmployment === undefined
                    ? "Loading the employee's current supervisor..."
                    : selectedEmployment?.supervisor_employee_id
                      ? reviewerSource === "AUTO"
                        ? "Reviewer was set automatically from the current supervisor. You can override it if needed."
                        : "Manual reviewer override selected."
                      : "No supervisor is configured. Select a reviewer manually or set the employee's supervisor first."}
              </span>
            )}
          </label>
        </div>
      </Dialog>
      <Dialog
        header="Submit Performance Review"
        visible={dialog === "submit"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Submit", confirmSubmitReview)}
      >
        <div className="grid gap-4 py-2">
          <p className="rounded-md bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            If this review has goals, every active goal needs a score and the
            active goal weights must total exactly 100%. The weighted score is
            calculated automatically; the overall score below is used only when
            no active goals exist.
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Overall Score{" "}
            <span className="font-normal text-slate-400">(0–100)</span>
            <InputNumber
              value={submission.overall_score}
              min={0}
              max={100}
              onValueChange={(e) =>
                setSubmission({ ...submission, overall_score: e.value ?? null })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Reviewer Comment{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              rows={4}
              autoResize
              value={submission.reviewer_comment}
              onChange={(e) =>
                setSubmission({
                  ...submission,
                  reviewer_comment: e.target.value,
                })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="Acknowledge Performance Review"
        visible={dialog === "acknowledge"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Acknowledge", confirmAcknowledgeReview)}
      >
        <div className="grid gap-4 py-2">
          <p className="m-0 text-sm text-slate-600">
            Acknowledgement confirms that the review has been received. It does
            not necessarily mean agreement with the score.
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Employee Comment
            <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              rows={4}
              autoResize
              value={employeeComment}
              onChange={(event) => setEmployeeComment(event.target.value)}
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={
          selectedReview ? `Goals — ${selectedReview.employee_name}` : "Goals"
        }
        visible={dialog === "goals"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "48rem" }}
        onHide={close}
        footer={
          <div className="flex justify-end gap-2">
            {selectedReview?.status === "DRAFT" &&
              isReviewParticipant(selectedReview) && (
                <Button
                  label="New Goal"
                  icon="pi pi-plus"
                  onClick={() => setDialog("goal")}
                />
              )}
            <Button label="Close" text severity="secondary" onClick={close} />
          </div>
        }
      >
        <DataTable
          value={goals}
          dataKey="id"
          size="small"
          stripedRows
          emptyMessage="No goal found."
        >
          <Column field="title" header="Goal" />
          <Column field="weight" header="Weight" body={(r) => `${r.weight}%`} />
          <Column
            field="target_value"
            header="Target"
            body={(r) => r.target_value || "-"}
          />
          <Column field="status" header="Status" />
          <Column
            field="actual_value"
            header="Actual"
            body={(r: PerformanceGoal) => r.actual_value || "-"}
          />
          <Column
            field="score"
            header="Score"
            body={(r: PerformanceGoal) => r.score ?? "-"}
          />
          {selectedReview?.status === "DRAFT" &&
            isReviewParticipant(selectedReview) && (
              <Column
                header="Action"
                body={(r: PerformanceGoal) => (
                  <Button
                    label="Update"
                    text
                    size="small"
                    onClick={() => {
                      setSelectedGoal(r);
                      setGoalProgress({
                        actual_value: r.actual_value || "",
                        score: r.score,
                        status:
                          r.status === "CANCELLED" ? "NOT_STARTED" : r.status,
                      });
                      setDialog("updateGoal");
                    }}
                  />
                )}
              />
            )}
        </DataTable>
      </Dialog>
      <Dialog
        header={
          selectedGoal ? `Update Goal — ${selectedGoal.title}` : "Update Goal"
        }
        visible={dialog === "updateGoal"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!selectedGoal) return;
          void save(
            () =>
              updatePerformanceGoal(selectedGoal.id, selectedGoal.row_version, {
                actual_value: goalProgress.actual_value.trim() || null,
                score: goalProgress.score,
                status: goalProgress.status,
              }),
            "Performance goal updated.",
            () => {
              setSelectedGoal(null);
              setGoalProgress({
                actual_value: "",
                score: null,
                status: "NOT_STARTED",
              });
              void reloadGoals();
            },
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Status
            <Dropdown
              value={goalProgress.status}
              options={["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]}
              className="w-full"
              onChange={(event) =>
                setGoalProgress({
                  ...goalProgress,
                  status: event.value as typeof goalProgress.status,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Actual Result
            <InputTextarea
              rows={3}
              autoResize
              value={goalProgress.actual_value}
              onChange={(event) =>
                setGoalProgress({
                  ...goalProgress,
                  actual_value: event.target.value,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Score <span className="font-normal text-slate-400">(0–100)</span>
            <InputNumber
              value={goalProgress.score}
              min={0}
              max={100}
              onValueChange={(event) =>
                setGoalProgress({
                  ...goalProgress,
                  score: event.value ?? null,
                })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="New Goal"
        visible={dialog === "goal"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!selectedReview || !goal.title.trim()) {
            notify("error", "Validation", "Goal title is required.");
            return;
          }
          void save(
            () =>
              createPerformanceGoal(selectedReview.id, {
                ...goal,
                description: goal.description || null,
                target_value: goal.target_value || null,
              }),
            "Goal created.",
            () => {
              setGoal({
                title: "",
                description: "",
                weight: 0,
                target_value: "",
              });
              setGoalsKey(selectedReview.id);
              void reloadGoals();
            },
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Goal Title
            <InputText
              value={goal.title}
              onChange={(e) => setGoal({ ...goal, title: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Weight (%)
            <InputNumber
              value={goal.weight}
              min={0}
              max={100}
              onValueChange={(e) => setGoal({ ...goal, weight: e.value ?? 0 })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Target{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              value={goal.target_value}
              onChange={(e) =>
                setGoal({ ...goal, target_value: e.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Description{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              rows={3}
              autoResize
              value={goal.description}
              onChange={(e) =>
                setGoal({ ...goal, description: e.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
    </Card>
  );
}
