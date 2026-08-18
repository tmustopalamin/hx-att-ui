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
  ApplicationStatus,
  RecruitmentActivity,
  RecruitmentApplication,
  RecruitmentCandidate,
  RecruitmentInterview,
  RecruitmentOffer,
  RecruitmentRequisition,
} from "@/app/types/recruitment";
import {
  completeRecruitmentInterview,
  cancelRecruitmentInterview,
  createRecruitmentApplication,
  createRecruitmentCandidate,
  createRecruitmentInterview,
  createRecruitmentOffer,
  createRecruitmentRequisition,
  getRecruitmentApplications,
  getRecruitmentApplicationActivities,
  getRecruitmentCandidates,
  getRecruitmentInterviews,
  getRecruitmentOffers,
  getRecruitmentRequisitions,
  linkAcceptedOfferEmployee,
  updateRecruitmentOfferStatus,
  updateRecruitmentApplicationStatus,
  updateRecruitmentCandidateStatus,
  uploadRecruitmentCandidateResume,
  updateRequisitionStatus,
} from "@/app/services/recruitment-service";
import { fetcher } from "@/app/utils/fetcher";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";

type DialogName =
  | "requisition"
  | "candidate"
  | "application"
  | "interview"
  | "offer"
  | "completeInterview"
  | "linkEmployee"
  | "applicationStatus"
  | "applicationActivity"
  | "cancelInterview"
  | "candidateResume"
  | null;
type SelectOption = { label: string; value: number };

const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error !== null) {
    const candidate = error as { code?: unknown; message?: unknown };
    if (typeof candidate.message === "string" && candidate.message.trim()) {
      return candidate.message;
    }
    if (typeof candidate.code === "string" && candidate.code.trim()) {
      return candidate.code;
    }
  }
  return fallback;
};

const emptyRequisition = () => ({
  code: "",
  job_title: "",
  headcount: 1,
  target_start_date: "",
  description: "",
});
const emptyCandidate = () => ({
  full_name: "",
  email: "",
  phone_number: "",
  source: "",
});
const emptyApplication = () => ({ job_requisition_id: 0, candidate_id: 0 });
const emptyInterview = () => ({
  application_id: 0,
  interview_type: "HR",
  scheduled_at: "",
  interviewer_employee_id: 0,
});
const emptyOffer = () => ({
  application_id: 0,
  offered_salary: "",
  proposed_start_date: "",
  expires_at: "",
  notes: "",
});

const statusSeverity = (
  status: string,
): "success" | "info" | "warning" | "danger" | "secondary" => {
  if (["OPEN", "ACCEPTED", "HIRED", "COMPLETED"].includes(status))
    return "success";
  if (
    [
      "DRAFT",
      "APPLIED",
      "SCREENING",
      "INTERVIEW",
      "OFFER",
      "SENT",
      "SCHEDULED",
    ].includes(status)
  )
    return "info";
  if (["CLOSED", "EXPIRED"].includes(status)) return "warning";
  if (["CANCELLED", "DECLINED", "REJECTED", "WITHDRAWN"].includes(status))
    return "danger";
  return "secondary";
};

export default function RecruitmentData() {
  const dispatch = useDispatch();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canManage = permissions.includes("recruitment.manage");
  const canLinkEmployee =
    canManage && permissions.includes("employee-lifecycle.create");
  const canCreateEmployeeFromOffer =
    canLinkEmployee && permissions.includes("employee.create");
  const {
    data: requisitions = [],
    mutate: reloadRequisitions,
    isValidating: loadingRequisitions,
  } = useSWR("recruitment-requisitions", getRecruitmentRequisitions);
  const { data: candidates = [], mutate: reloadCandidates } = useSWR(
    "recruitment-candidates",
    getRecruitmentCandidates,
  );
  const { data: applications = [], mutate: reloadApplications } = useSWR(
    "recruitment-applications",
    getRecruitmentApplications,
  );
  const { data: interviews = [], mutate: reloadInterviews } = useSWR(
    "recruitment-interviews",
    getRecruitmentInterviews,
  );
  const { data: offers = [], mutate: reloadOffers } = useSWR(
    "recruitment-offers",
    getRecruitmentOffers,
  );
  const { data: employees = [] } = useSWR<Employee[]>(
    "/api/employees/list?show_all=false",
    fetcher,
  );
  const [dialog, setDialog] = useState<DialogName>(null);
  const [saving, setSaving] = useState(false);
  const [selectedInterview, setSelectedInterview] =
    useState<RecruitmentInterview | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<RecruitmentOffer | null>(
    null,
  );
  const [selectedApplication, setSelectedApplication] =
    useState<RecruitmentApplication | null>(null);
  const [resumeCandidate, setResumeCandidate] =
    useState<RecruitmentCandidate | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [activityApplication, setActivityApplication] =
    useState<RecruitmentApplication | null>(null);
  const [applicationTransition, setApplicationTransition] = useState<{
    status: Extract<ApplicationStatus, "SCREENING" | "REJECTED" | "WITHDRAWN">;
    reason: string;
  }>({ status: "SCREENING", reason: "" });
  const { data: applicationActivities = [], isLoading: loadingActivities } =
    useSWR<RecruitmentActivity[]>(
      activityApplication
        ? `recruitment-application-activities-${activityApplication.id}`
        : null,
      () => getRecruitmentApplicationActivities(activityApplication!.id),
    );
  const [requisition, setRequisition] = useState(emptyRequisition());
  const [candidate, setCandidate] = useState(emptyCandidate());
  const [application, setApplication] = useState(emptyApplication());
  const [interview, setInterview] = useState(emptyInterview());
  const [offer, setOffer] = useState(emptyOffer());
  const [completion, setCompletion] = useState({ score: "", feedback: "" });
  const [interviewCancellationReason, setInterviewCancellationReason] =
    useState("");
  const [employeeLink, setEmployeeLink] = useState({
    employee_id: 0,
    effective_date: "",
  });

  const requisitionOptions = useMemo<SelectOption[]>(
    () =>
      requisitions
        .filter((item) => item.status === "OPEN")
        .map((item) => ({
          label: `${item.code} — ${item.job_title}`,
          value: item.id,
        })),
    [requisitions],
  );
  const candidateOptions = useMemo<SelectOption[]>(
    () =>
      candidates
        .filter((item) => item.status === "ACTIVE")
        .map((item) => ({ label: item.full_name, value: item.id })),
    [candidates],
  );
  const activeApplicationOptions = useMemo<SelectOption[]>(
    () =>
      applications
        .filter(
          (item) => !["HIRED", "REJECTED", "WITHDRAWN"].includes(item.status),
        )
        .map((item) => ({
          label: `${item.candidate_name} — ${item.job_title}`,
          value: item.id,
        })),
    [applications],
  );
  const employeeOptions = useMemo<SelectOption[]>(
    () =>
      employees.map((item) => ({
        label:
          item.full_name ||
          [item.first_name, item.last_name].filter(Boolean).join(" "),
        value: item.id,
      })),
    [employees],
  );
  const notify = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));
  const refresh = async () => {
    await Promise.all([
      reloadRequisitions(),
      reloadCandidates(),
      reloadApplications(),
      reloadInterviews(),
      reloadOffers(),
    ]);
  };
  const close = () => {
    if (!saving) setDialog(null);
  };
  const showDialog = (name: DialogName) => setDialog(name);

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
    } catch (error: unknown) {
      notify(
        "error",
        "Unable to save",
        apiErrorMessage(
          error,
          "Review the data and refresh if another user has made a change.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };
  const changeRequisitionStatus = async (
    row: RecruitmentRequisition,
    status: "OPEN" | "CLOSED" | "CANCELLED",
  ) => {
    setSaving(true);
    try {
      await updateRequisitionStatus(row.id, row.row_version, status);
      await reloadRequisitions();
      notify(
        "success",
        "Updated",
        `Requisition is now ${status.toLowerCase()}.`,
      );
    } catch {
      notify(
        "error",
        "Unable to update",
        "The requisition has changed or cannot use that status.",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmRequisitionStatus = (
    row: RecruitmentRequisition,
    status: "OPEN" | "CLOSED" | "CANCELLED",
  ) => {
    const cancelling = status === "CANCELLED";
    requestActionConfirmation({
      action: cancelling
        ? "Cancel requisition"
        : status === "CLOSED"
          ? "Close requisition"
          : "Open requisition",
      target: `${row.code} · ${row.job_title}`,
      severity: cancelling || status === "CLOSED" ? "danger" : "warning",
      confirmLabel: cancelling
        ? "Cancel"
        : status === "CLOSED"
          ? "Close"
          : "Open",
      confirmIcon: cancelling
        ? "pi pi-times"
        : status === "CLOSED"
          ? "pi pi-lock"
          : "pi pi-folder-open",
      description: cancelling
        ? "Cancel this requisition?"
        : status === "CLOSED"
          ? "Close this requisition?"
          : "Open this requisition?",
      onAccept: () => changeRequisitionStatus(row, status),
    });
  };
  const changeCandidateStatus = async (
    row: RecruitmentCandidate,
    status: "ACTIVE" | "ARCHIVED",
  ) => {
    setSaving(true);
    try {
      await updateRecruitmentCandidateStatus(row.id, row.row_version, status);
      await reloadCandidates();
      notify("success", "Updated", `Candidate is now ${status.toLowerCase()}.`);
    } catch {
      notify(
        "error",
        "Unable to update",
        "The candidate has changed or cannot use that status.",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmCandidateStatus = (
    row: RecruitmentCandidate,
    status: "ACTIVE" | "ARCHIVED",
  ) => {
    const archiving = status === "ARCHIVED";
    requestActionConfirmation({
      action: archiving ? "Archive candidate" : "Reactivate candidate",
      target: row.full_name,
      severity: archiving ? "danger" : "warning",
      confirmLabel: archiving ? "Archive" : "Reactivate",
      confirmIcon: archiving ? "pi pi-folder" : "pi pi-refresh",
      description: archiving
        ? "Archive this candidate?"
        : "Reactivate this candidate?",
      onAccept: () => changeCandidateStatus(row, status),
    });
  };
  const changeOfferStatus = async (
    row: RecruitmentOffer,
    status: "SENT" | "ACCEPTED" | "DECLINED",
  ) => {
    setSaving(true);
    try {
      await updateRecruitmentOfferStatus(row.id, row.row_version, status);
      await refresh();
      notify("success", "Updated", `Offer is now ${status.toLowerCase()}.`);
    } catch (error: unknown) {
      notify(
        "error",
        "Unable to update",
        apiErrorMessage(
          error,
          "The offer has changed or cannot use that status.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmOfferStatus = (
    row: RecruitmentOffer,
    status: "SENT" | "ACCEPTED" | "DECLINED",
  ) => {
    const declining = status === "DECLINED";
    const accepting = status === "ACCEPTED";
    requestActionConfirmation({
      action: declining
        ? "Decline offer"
        : accepting
          ? "Accept offer"
          : "Send offer",
      target: `${row.candidate_name} · ${row.job_title}`,
      severity: declining ? "danger" : "warning",
      confirmLabel: declining ? "Decline" : accepting ? "Accept" : "Send",
      confirmIcon: declining
        ? "pi pi-times"
        : accepting
          ? "pi pi-check"
          : "pi pi-send",
      description: declining
        ? "Decline this offer?"
        : accepting
          ? "Accept this offer?"
          : "Send this offer?",
      onAccept: () => changeOfferStatus(row, status),
    });
  };
  const openLink = (row: RecruitmentOffer) => {
    setSelectedOffer(row);
    setEmployeeLink({
      employee_id: row.linked_employee_id || 0,
      effective_date: row.proposed_start_date || "",
    });
    showDialog("linkEmployee");
  };
  const openQuickAddFromOffer = (row: RecruitmentOffer) => {
    const params = new URLSearchParams({
      quick_add: "1",
      candidate_name: row.candidate_name,
      candidate_email: row.candidate_email || "",
      recruitment_offer_id: String(row.id),
      recruitment_offer_row_version: String(row.row_version),
      effective_date:
        row.proposed_start_date || new Date().toISOString().slice(0, 10),
    });
    window.location.assign(`/employees?${params.toString()}`);
  };
  const openApplicationStatus = (
    row: RecruitmentApplication,
    status: Extract<ApplicationStatus, "SCREENING" | "REJECTED" | "WITHDRAWN">,
  ) => {
    setSelectedApplication(row);
    setApplicationTransition({ status, reason: "" });
    showDialog("applicationStatus");
  };
  const applicationActions = (row: RecruitmentApplication) => (
    <div className="flex flex-wrap gap-1">
      <Button
        label="History"
        icon="pi pi-history"
        text
        severity="secondary"
        size="small"
        onClick={() => {
          setActivityApplication(row);
          showDialog("applicationActivity");
        }}
      />
      {canManage && row.status === "APPLIED" ? (
        <Button
          label="Screen"
          text
          size="small"
          onClick={() => openApplicationStatus(row, "SCREENING")}
        />
      ) : null}
      {canManage &&
      ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"].includes(row.status) ? (
        <>
          <Button
            label="Withdraw"
            text
            severity="secondary"
            size="small"
            onClick={() => openApplicationStatus(row, "WITHDRAWN")}
          />
          <Button
            label="Reject"
            text
            severity="danger"
            size="small"
            onClick={() => openApplicationStatus(row, "REJECTED")}
          />
        </>
      ) : null}
    </div>
  );
  const requisitionActions = (row: RecruitmentRequisition) => (
    <div className="flex gap-1">
      {row.status === "DRAFT" ? (
        <Button
          label="Open"
          text
          size="small"
          onClick={() => confirmRequisitionStatus(row, "OPEN")}
          disabled={saving}
        />
      ) : null}
      {row.status === "OPEN" ? (
        <Button
          label="Close"
          text
          severity="secondary"
          size="small"
          onClick={() => confirmRequisitionStatus(row, "CLOSED")}
          disabled={saving}
        />
      ) : null}
      {row.status === "DRAFT" || row.status === "OPEN" ? (
        <Button
          label="Cancel"
          text
          severity="danger"
          size="small"
          onClick={() => confirmRequisitionStatus(row, "CANCELLED")}
          disabled={saving}
        />
      ) : null}
    </div>
  );
  const candidateActions = (row: RecruitmentCandidate) => (
    <div className="flex flex-wrap gap-1">
      {row.resume_original_file_name ? (
        <Button
          label="Download Resume"
          icon="pi pi-download"
          text
          severity="secondary"
          size="small"
          onClick={() =>
            window.open(
              `/api/recruitment/candidates/${row.id}/resume`,
              "_blank",
            )
          }
        />
      ) : null}
      {canManage && row.status === "ACTIVE" ? (
        <Button
          label={
            row.resume_original_file_name ? "Replace Resume" : "Upload Resume"
          }
          icon="pi pi-upload"
          text
          size="small"
          onClick={() => {
            setResumeCandidate(row);
            setResumeFile(null);
            showDialog("candidateResume");
          }}
        />
      ) : null}
      {canManage && row.status === "ACTIVE" ? (
        <Button
          label="Archive"
          text
          severity="danger"
          size="small"
          disabled={saving}
          onClick={() => confirmCandidateStatus(row, "ARCHIVED")}
        />
      ) : null}
      {canManage && row.status === "ARCHIVED" ? (
        <Button
          label="Reactivate"
          text
          size="small"
          disabled={saving}
          onClick={() => confirmCandidateStatus(row, "ACTIVE")}
        />
      ) : null}
    </div>
  );
  const offerActions = (row: RecruitmentOffer) => (
    <div className="flex flex-wrap gap-1">
      {row.status === "DRAFT" ? (
        <Button
          label="Send"
          text
          size="small"
          onClick={() => confirmOfferStatus(row, "SENT")}
          disabled={saving}
        />
      ) : null}
      {row.status === "SENT" ? (
        <>
          <Button
            label="Accept"
            text
            size="small"
            onClick={() => confirmOfferStatus(row, "ACCEPTED")}
            disabled={saving}
          />
          <Button
            label="Decline"
            text
            severity="danger"
            size="small"
            onClick={() => confirmOfferStatus(row, "DECLINED")}
            disabled={saving}
          />
        </>
      ) : null}
      {row.status === "ACCEPTED" && canLinkEmployee && row.lifecycle_case_id ? (
        <Tag
          value={`Onboarding ${row.onboarding_status || "created"}`}
          severity={statusSeverity(row.onboarding_status || "DRAFT")}
        />
      ) : null}
      {row.status === "ACCEPTED" &&
      canLinkEmployee &&
      !row.lifecycle_case_id ? (
        <>
          {canCreateEmployeeFromOffer && !row.linked_employee_id ? (
            <Button
              label="Create Employee & Onboard"
              icon="pi pi-user-plus"
              text
              size="small"
              onClick={() => openQuickAddFromOffer(row)}
              disabled={saving}
            />
          ) : null}
          <Button
            label={
              row.linked_employee_id
                ? "Resume Onboarding"
                : "Link Existing Employee"
            }
            text
            size="small"
            onClick={() => openLink(row)}
            disabled={saving}
          />
        </>
      ) : null}
    </div>
  );

  const footer = (label: string, onSave: () => void) => (
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
        onClick={onSave}
        loading={saving}
      />
    </div>
  );
  const confirmCompleteInterview = () => {
    if (!selectedInterview) return;
    const score = completion.score.trim() ? Number(completion.score) : null;
    if (
      score !== null &&
      (!Number.isFinite(score) || score < 0 || score > 100)
    ) {
      notify("error", "Validation", "Score must be between 0 and 100.");
      return;
    }
    requestActionConfirmation({
      action: "Complete interview",
      target: `Interview #${selectedInterview.id}`,
      severity: "warning",
      confirmLabel: "Complete interview",
      confirmIcon: "pi pi-check-circle",
      description: "Complete this interview?",
      onAccept: () =>
        save(
          () =>
            completeRecruitmentInterview(
              selectedInterview.id,
              selectedInterview.row_version,
              { score, feedback: completion.feedback.trim() || null },
            ),
          "Interview completed.",
          () => {
            setSelectedInterview(null);
            setCompletion({ score: "", feedback: "" });
          },
        ),
    });
  };
  const confirmCancelInterview = () => {
    const reason = interviewCancellationReason.trim();
    if (!selectedInterview || !reason) {
      notify("error", "Validation", "Cancellation reason is required.");
      return;
    }
    requestActionConfirmation({
      action: "Cancel interview",
      target: `Interview #${selectedInterview.id}`,
      severity: "danger",
      confirmLabel: "Cancel interview",
      confirmIcon: "pi pi-times",
      description: "Cancel this interview?",
      onAccept: () =>
        save(
          () =>
            cancelRecruitmentInterview(
              selectedInterview.id,
              selectedInterview.row_version,
              reason,
            ),
          "Interview cancelled.",
          () => {
            setSelectedInterview(null);
            setInterviewCancellationReason("");
          },
        ),
    });
  };
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
              Recruitment
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Manage vacancies, candidates, interviews, offers, and the hand-off
              to employee onboarding.
            </p>
          </div>
          <Button
            label="Refresh"
            icon="pi pi-refresh"
            outlined
            severity="secondary"
            size="small"
            loading={loadingRequisitions}
            onClick={() => void refresh()}
          />
        </div>
        <TabView>
          <TabPanel header="Requisitions">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Requisition"
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => showDialog("requisition")}
                />
              )}
            </div>
            <DataTable
              value={requisitions}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage="No requisition found."
            >
              <Column field="code" header="Code" />
              <Column field="job_title" header="Job Title" />
              <Column
                field="department_name"
                header="Department"
                body={(row: RecruitmentRequisition) =>
                  row.department_name || "-"
                }
              />
              <Column field="headcount" header="Headcount" />
              <Column
                field="target_start_date"
                header="Target Start"
                body={(row: RecruitmentRequisition) =>
                  formatDisplayDate(row.target_start_date)
                }
              />
              <Column
                header="Status"
                body={(row: RecruitmentRequisition) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              {canManage && (
                <Column header="Action" body={requisitionActions} />
              )}
            </DataTable>
          </TabPanel>
          <TabPanel header="Candidates">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Candidate"
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => showDialog("candidate")}
                />
              )}
            </div>
            <DataTable
              value={candidates}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage="No candidate found."
            >
              <Column field="full_name" header="Candidate" />
              <Column
                field="email"
                header="Email"
                body={(row) => row.email || "-"}
              />
              <Column
                field="phone_number"
                header="Phone"
                body={(row) => row.phone_number || "-"}
              />
              <Column
                field="source"
                header="Source"
                body={(row) => row.source || "-"}
              />
              <Column
                header="Status"
                body={(row) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              <Column header="Action" body={candidateActions} />
            </DataTable>
          </TabPanel>
          <TabPanel header="Applications">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Application"
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => showDialog("application")}
                />
              )}
            </div>
            <DataTable
              value={applications}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage="No application found."
            >
              <Column field="candidate_name" header="Candidate" />
              <Column field="requisition_code" header="Requisition" />
              <Column field="job_title" header="Job Title" />
              <Column
                header="Applied"
                body={(row: RecruitmentApplication) =>
                  formatDisplayDate(row.applied_at)
                }
              />
              <Column
                header="Status"
                body={(row: RecruitmentApplication) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              <Column header="Action" body={applicationActions} />
            </DataTable>
          </TabPanel>
          <TabPanel header="Interviews">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="Schedule Interview"
                  icon="pi pi-calendar-plus"
                  size="small"
                  onClick={() => showDialog("interview")}
                />
              )}
            </div>
            <DataTable
              value={interviews}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage="No interview found."
            >
              <Column field="candidate_name" header="Candidate" />
              <Column field="job_title" header="Job Title" />
              <Column field="interview_type" header="Type" />
              <Column
                header="Schedule"
                body={(row: RecruitmentInterview) =>
                  formatDisplayDateTime(row.scheduled_at)
                }
              />
              <Column field="interviewer_name" header="Interviewer" />
              <Column
                header="Status"
                body={(row: RecruitmentInterview) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              {canManage && (
                <Column
                  header="Action"
                  body={(row: RecruitmentInterview) =>
                    row.status === "SCHEDULED" ? (
                      <div className="flex gap-1">
                        <Button
                          label="Complete"
                          text
                          size="small"
                          onClick={() => {
                            setSelectedInterview(row);
                            setCompletion({
                              score: row.score?.toString() || "",
                              feedback: row.feedback || "",
                            });
                            showDialog("completeInterview");
                          }}
                        />
                        <Button
                          label="Cancel"
                          text
                          severity="danger"
                          size="small"
                          onClick={() => {
                            setSelectedInterview(row);
                            setInterviewCancellationReason("");
                            showDialog("cancelInterview");
                          }}
                        />
                      </div>
                    ) : null
                  }
                />
              )}
            </DataTable>
          </TabPanel>
          <TabPanel header="Offers">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Offer"
                  icon="pi pi-send"
                  size="small"
                  onClick={() => showDialog("offer")}
                />
              )}
            </div>
            <DataTable
              value={offers}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage="No offer found."
            >
              <Column field="candidate_name" header="Candidate" />
              <Column field="job_title" header="Job Title" />
              <Column
                header="Salary"
                body={(row: RecruitmentOffer) =>
                  row.offered_salary
                    ? new Intl.NumberFormat("id-ID", {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      }).format(Number(row.offered_salary))
                    : "-"
                }
              />
              <Column
                field="proposed_start_date"
                header="Start Date"
                body={(row: RecruitmentOffer) =>
                  formatDisplayDate(row.proposed_start_date)
                }
              />
              <Column
                header="Status"
                body={(row: RecruitmentOffer) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              {canManage && <Column header="Action" body={offerActions} />}
            </DataTable>
          </TabPanel>
        </TabView>
      </div>
      <Dialog
        header="New Requisition"
        visible={dialog === "requisition"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "40rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!requisition.code.trim() || !requisition.job_title.trim()) {
            notify("error", "Validation", "Code and job title are required.");
            return;
          }
          void save(
            () =>
              createRecruitmentRequisition({
                ...requisition,
                target_start_date: requisition.target_start_date || null,
                description: requisition.description || null,
              }),
            "Requisition created as draft.",
            () => setRequisition(emptyRequisition()),
          );
        })}
      >
        <div className="grid gap-4 py-2 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Code
            <InputText
              value={requisition.code}
              onChange={(event) =>
                setRequisition({ ...requisition, code: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Job Title
            <InputText
              value={requisition.job_title}
              onChange={(event) =>
                setRequisition({
                  ...requisition,
                  job_title: event.target.value,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Headcount
            <InputNumber
              value={requisition.headcount}
              min={1}
              useGrouping={false}
              onValueChange={(event) =>
                setRequisition({ ...requisition, headcount: event.value || 1 })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Target Start{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <PrimeDatePicker
              value={requisition.target_start_date}
              onValueChange={(value) =>
                setRequisition({ ...requisition, target_start_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            Description{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              rows={3}
              autoResize
              value={requisition.description}
              onChange={(event) =>
                setRequisition({
                  ...requisition,
                  description: event.target.value,
                })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="New Candidate"
        visible={dialog === "candidate"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!candidate.full_name.trim()) {
            notify("error", "Validation", "Candidate name is required.");
            return;
          }
          void save(
            () =>
              createRecruitmentCandidate({
                ...candidate,
                email: candidate.email || null,
                phone_number: candidate.phone_number || null,
                source: candidate.source || null,
              }),
            "Candidate created.",
            () => setCandidate(emptyCandidate()),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Full Name
            <InputText
              value={candidate.full_name}
              onChange={(event) =>
                setCandidate({ ...candidate, full_name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Email <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              type="email"
              value={candidate.email}
              onChange={(event) =>
                setCandidate({ ...candidate, email: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Phone <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              value={candidate.phone_number}
              onChange={(event) =>
                setCandidate({ ...candidate, phone_number: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Source{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              value={candidate.source}
              onChange={(event) =>
                setCandidate({ ...candidate, source: event.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="New Application"
        visible={dialog === "application"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!application.job_requisition_id || !application.candidate_id) {
            notify(
              "error",
              "Validation",
              "Select an open requisition and an active candidate.",
            );
            return;
          }
          void save(
            () => createRecruitmentApplication(application),
            "Application created.",
            () => setApplication(emptyApplication()),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Open Requisition
            <Dropdown
              value={application.job_requisition_id || null}
              options={requisitionOptions}
              placeholder="Select requisition"
              className="w-full"
              filter
              onChange={(event) =>
                setApplication({
                  ...application,
                  job_requisition_id: event.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Candidate
            <Dropdown
              value={application.candidate_id || null}
              options={candidateOptions}
              placeholder="Select candidate"
              className="w-full"
              filter
              onChange={(event) =>
                setApplication({
                  ...application,
                  candidate_id: event.value as number,
                })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="Schedule Interview"
        visible={dialog === "interview"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Schedule", () => {
          if (
            !interview.application_id ||
            !interview.interviewer_employee_id ||
            !interview.scheduled_at
          ) {
            notify(
              "error",
              "Validation",
              "Application, interviewer, and schedule are required.",
            );
            return;
          }
          void save(
            () =>
              createRecruitmentInterview({
                ...interview,
                scheduled_at: new Date(interview.scheduled_at).toISOString(),
              }),
            "Interview scheduled.",
            () => setInterview(emptyInterview()),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Application
            <Dropdown
              value={interview.application_id || null}
              options={activeApplicationOptions}
              placeholder="Select application"
              className="w-full"
              filter
              onChange={(event) =>
                setInterview({
                  ...interview,
                  application_id: event.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Interview Type
            <Dropdown
              value={interview.interview_type}
              options={["HR", "USER", "TECHNICAL", "FINAL"]}
              placeholder="Select type"
              className="w-full"
              onChange={(event) =>
                setInterview({
                  ...interview,
                  interview_type: event.value as string,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Schedule
            <PrimeDatePicker
              value={interview.scheduled_at}
              withTime
              onValueChange={(value) =>
                setInterview({ ...interview, scheduled_at: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Interviewer
            <Dropdown
              value={interview.interviewer_employee_id || null}
              options={employeeOptions}
              placeholder="Select employee"
              className="w-full"
              filter
              onChange={(event) =>
                setInterview({
                  ...interview,
                  interviewer_employee_id: event.value as number,
                })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={
          resumeCandidate?.resume_original_file_name
            ? "Replace Resume"
            : "Upload Resume"
        }
        visible={dialog === "candidateResume"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Upload", () => {
          if (!resumeCandidate || !resumeFile) {
            notify("error", "Validation", "Select a PDF resume first.");
            return;
          }
          if (resumeFile.type !== "application/pdf") {
            notify("error", "Validation", "Only PDF resumes are allowed.");
            return;
          }
          void save(
            () =>
              uploadRecruitmentCandidateResume(
                resumeCandidate.id,
                resumeCandidate.row_version,
                resumeFile,
              ),
            "Candidate resume uploaded to private storage.",
            () => {
              setResumeCandidate(null);
              setResumeFile(null);
            },
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <p className="m-0 text-sm text-slate-600">
            {resumeCandidate?.full_name || "Candidate"}. PDF only, maximum 10
            MB.
          </p>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="block w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700"
            onChange={(event) => setResumeFile(event.target.files?.[0] || null)}
          />
        </div>
      </Dialog>
      <Dialog
        header="Complete Interview"
        visible={dialog === "completeInterview"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Complete", confirmCompleteInterview)}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Score{" "}
            <span className="font-normal text-slate-400">
              (0–100, optional)
            </span>
            <InputNumber
              value={completion.score ? Number(completion.score) : null}
              min={0}
              max={100}
              onValueChange={(event) =>
                setCompletion({
                  ...completion,
                  score: event.value?.toString() || "",
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Feedback{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              rows={4}
              autoResize
              value={completion.feedback}
              onChange={(event) =>
                setCompletion({ ...completion, feedback: event.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="Cancel Interview"
        visible={dialog === "cancelInterview"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Cancel Interview", confirmCancelInterview)}
      >
        <div className="grid gap-4 py-2">
          <p className="m-0 text-sm text-slate-600">
            {selectedInterview
              ? `${selectedInterview.candidate_name} — ${formatDisplayDateTime(
                  selectedInterview.scheduled_at,
                )}`
              : "Scheduled interview"}
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Cancellation Reason
            <InputTextarea
              rows={4}
              autoResize
              value={interviewCancellationReason}
              onChange={(event) =>
                setInterviewCancellationReason(event.target.value)
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="New Offer"
        visible={dialog === "offer"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!offer.application_id) {
            notify("error", "Validation", "Select an application.");
            return;
          }
          const salary = offer.offered_salary.trim();
          if (
            salary &&
            (!Number.isFinite(Number(salary)) || Number(salary) < 0)
          ) {
            notify("error", "Validation", "Salary is invalid.");
            return;
          }
          void save(
            () =>
              createRecruitmentOffer({
                ...offer,
                offered_salary: salary || null,
                proposed_start_date: offer.proposed_start_date || null,
                expires_at: offer.expires_at
                  ? new Date(offer.expires_at).toISOString()
                  : null,
                notes: offer.notes || null,
              }),
            "Offer created as draft.",
            () => setOffer(emptyOffer()),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Application
            <Dropdown
              value={offer.application_id || null}
              options={activeApplicationOptions}
              placeholder="Select application"
              className="w-full"
              filter
              onChange={(event) =>
                setOffer({ ...offer, application_id: event.value as number })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Offered Salary{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              keyfilter="num"
              value={offer.offered_salary}
              onChange={(event) =>
                setOffer({ ...offer, offered_salary: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Proposed Start{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <PrimeDatePicker
              value={offer.proposed_start_date}
              onValueChange={(value) =>
                setOffer({ ...offer, proposed_start_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Offer Expiry{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <PrimeDatePicker
              value={offer.expires_at}
              withTime
              onValueChange={(value) =>
                setOffer({ ...offer, expires_at: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Notes <span className="font-normal text-slate-400">(optional)</span>
            <InputTextarea
              rows={3}
              autoResize
              value={offer.notes}
              onChange={(event) =>
                setOffer({ ...offer, notes: event.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={`${applicationTransition.status === "SCREENING" ? "Move to Screening" : applicationTransition.status === "REJECTED" ? "Reject Application" : "Withdraw Application"}`}
        visible={dialog === "applicationStatus"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Confirm", () => {
          if (!selectedApplication) return;
          const reason = applicationTransition.reason.trim();
          if (applicationTransition.status !== "SCREENING" && !reason) {
            notify(
              "error",
              "Validation",
              "Reason is required for rejection or withdrawal.",
            );
            return;
          }
          void save(
            () =>
              updateRecruitmentApplicationStatus(
                selectedApplication.id,
                selectedApplication.row_version,
                applicationTransition.status,
                reason,
              ),
            `Application moved to ${applicationTransition.status.toLowerCase()}.`,
            () => {
              setSelectedApplication(null);
              setApplicationTransition({ status: "SCREENING", reason: "" });
            },
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <p className="m-0 text-sm text-slate-600">
            {selectedApplication
              ? `${selectedApplication.candidate_name} — ${selectedApplication.job_title}`
              : "Application"}
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Reason
            <span className="font-normal text-slate-400">
              {applicationTransition.status === "SCREENING"
                ? "Optional internal note"
                : "Required for audit trail"}
            </span>
            <InputTextarea
              rows={4}
              autoResize
              value={applicationTransition.reason}
              onChange={(event) =>
                setApplicationTransition({
                  ...applicationTransition,
                  reason: event.target.value,
                })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={
          activityApplication
            ? `Application History — ${activityApplication.candidate_name}`
            : "Application History"
        }
        visible={dialog === "applicationActivity"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "62rem" }}
        onHide={() => {
          setDialog(null);
          setActivityApplication(null);
        }}
        footer={
          <div className="flex justify-end">
            <Button
              label="Close"
              text
              severity="secondary"
              onClick={() => {
                setDialog(null);
                setActivityApplication(null);
              }}
            />
          </div>
        }
      >
        <DataTable
          value={applicationActivities}
          dataKey="id"
          loading={loadingActivities}
          size="small"
          stripedRows
          rowHover
          emptyMessage="No application history found."
        >
          <Column field="activity_type" header="Activity" />
          <Column field="previous_status" header="From" />
          <Column field="new_status" header="To" />
          <Column
            field="notes"
            header="Notes"
            body={(row: RecruitmentActivity) => row.notes || "—"}
          />
          <Column field="actor_name" header="Actor" />
          <Column
            header="Occurred At"
            body={(row: RecruitmentActivity) =>
              formatDisplayDateTime(row.occurred_at)
            }
          />
        </DataTable>
      </Dialog>
      <Dialog
        header="Link Employee and Start Onboarding"
        visible={dialog === "linkEmployee"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "36rem" }}
        onHide={close}
        footer={footer(
          selectedOffer?.linked_employee_id
            ? "Resume Onboarding"
            : "Link & Create Onboarding",
          () => {
            if (
              !selectedOffer ||
              !employeeLink.employee_id ||
              !employeeLink.effective_date
            ) {
              notify(
                "error",
                "Validation",
                "Employee and effective date are required.",
              );
              return;
            }
            void save(
              () =>
                linkAcceptedOfferEmployee(
                  selectedOffer.id,
                  selectedOffer.row_version,
                  employeeLink,
                ),
              "Employee linked and onboarding case created.",
              () => {
                setSelectedOffer(null);
                setEmployeeLink({ employee_id: 0, effective_date: "" });
              },
            );
          },
        )}
      >
        <div className="grid gap-4 py-2">
          <p className="m-0 text-sm text-slate-600">
            Create the employee first from{" "}
            <strong>Employees → Quick Add Employee</strong>, then link that
            record here. This preserves the employee master as the single source
            of truth.
          </p>
          {selectedOffer ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div>
                <span className="font-semibold">Candidate:</span>{" "}
                {selectedOffer.candidate_name}
              </div>
              <div>
                <span className="font-semibold">Employee:</span>{" "}
                {employeeOptions.find(
                  (option) => option.value === employeeLink.employee_id,
                )?.label || "Select an employee"}
              </div>
              {selectedOffer.linked_employee_id ? (
                <p className="mb-0 mt-2 text-xs text-amber-700">
                  This offer is partially linked. Resume Onboarding keeps the
                  existing employee and cannot be reassigned here.
                </p>
              ) : null}
            </div>
          ) : null}
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Employee
            <Dropdown
              value={employeeLink.employee_id || null}
              options={employeeOptions}
              placeholder="Select employee"
              className="w-full"
              filter
              disabled={Boolean(selectedOffer?.linked_employee_id) || saving}
              onChange={(event) =>
                setEmployeeLink({
                  ...employeeLink,
                  employee_id: event.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Onboarding Effective Date
            <PrimeDatePicker
              value={employeeLink.effective_date}
              onValueChange={(value) =>
                setEmployeeLink({ ...employeeLink, effective_date: value })
              }
            />
          </label>
        </div>
      </Dialog>
    </Card>
  );
}
