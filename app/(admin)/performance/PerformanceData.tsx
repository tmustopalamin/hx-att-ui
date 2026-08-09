"use client";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
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
import type {
  PerformanceCycle,
  PerformanceGoal,
  PerformanceReview,
} from "@/app/types/performance";
import {
  acknowledgePerformanceReview,
  createPerformanceCycle,
  createPerformanceGoal,
  createPerformanceReview,
  getPerformanceCycles,
  getPerformanceGoals,
  getPerformanceReviews,
  submitPerformanceReview,
  updatePerformanceCycleStatus,
  updatePerformanceGoal,
} from "@/app/services/performance-service";
import { fetcher } from "@/app/utils/fetcher";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

type DialogName =
  | "cycle"
  | "review"
  | "submit"
  | "goals"
  | "goal"
  | "updateGoal"
  | "acknowledge"
  | null;
const tag = (status: string) =>
  ["OPEN", "SUBMITTED", "ACKNOWLEDGED"].includes(status)
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
  });
  const [review, setReview] = useState({
    performance_cycle_id: 0,
    employee_id: 0,
    reviewer_employee_id: 0,
    review_type: "MANAGER",
  });
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
  const notify = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));
  const refresh = async () => {
    await Promise.all([reloadCycles(), reloadReviews()]);
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
    } catch {
      notify(
        "error",
        "Unable to save",
        "Review the data and refresh if it has changed.",
      );
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
              <Column field="start_date" header="Start" />
              <Column field="end_date" header="End" />
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
                          onClick={() => void cycleAction(r, "OPEN")}
                        />
                      )}{" "}
                      {r.status === "OPEN" && (
                        <Button
                          label="Close"
                          text
                          severity="secondary"
                          size="small"
                          onClick={() => void cycleAction(r, "CLOSED")}
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
                  </div>
                )}
              />
            </DataTable>
          </TabPanel>
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
              setCycle({ code: "", name: "", start_date: "", end_date: "" }),
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
            <InputText
              type="date"
              value={cycle.start_date}
              onChange={(e) =>
                setCycle({ ...cycle, start_date: e.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            End Date
            <InputText
              type="date"
              value={cycle.end_date}
              onChange={(e) => setCycle({ ...cycle, end_date: e.target.value })}
            />
          </label>
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
              "Cycle, employee, and reviewer are required.",
            );
            return;
          }
          void save(
            () => createPerformanceReview(review),
            "Performance review created.",
            () =>
              setReview({
                performance_cycle_id: 0,
                employee_id: 0,
                reviewer_employee_id: 0,
                review_type: "MANAGER",
              }),
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
            Employee
            <Dropdown
              value={review.employee_id || null}
              options={employeeOptions}
              filter
              placeholder="Select employee"
              className="w-full"
              onChange={(e) =>
                setReview({ ...review, employee_id: e.value as number })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Reviewer
            <Dropdown
              value={review.reviewer_employee_id || null}
              options={employeeOptions}
              filter
              placeholder="Select reviewer"
              className="w-full"
              onChange={(e) =>
                setReview({
                  ...review,
                  reviewer_employee_id: e.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Review Type
            <Dropdown
              value={review.review_type}
              options={["MANAGER", "SELF", "PEER"]}
              className="w-full"
              onChange={(e) =>
                setReview({ ...review, review_type: e.value as string })
              }
            />
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
        footer={footer("Submit", () => {
          if (!selectedReview) return;
          void save(
            () =>
              submitPerformanceReview(
                selectedReview.id,
                selectedReview.row_version,
                submission,
              ),
            "Performance review submitted.",
            () => setSelectedReview(null),
          );
        })}
      >
        <div className="grid gap-4 py-2">
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
        footer={footer("Acknowledge", () => {
          if (!selectedReview) return;
          void save(
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
          );
        })}
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
