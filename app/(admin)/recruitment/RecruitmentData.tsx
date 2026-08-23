"use client";
import { useI18n } from "@/app/i18n";

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
  const { t: i18nT } = useI18n();
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
          label: i18nT("static.1v0umq8", { p0: item.code, p1: item.job_title }),
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
          label: i18nT("static.1v0umq8", {
            p0: item.candidate_name,
            p1: item.job_title,
          }),
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
      notify("success", i18nT("static.12ek4is"), success);
    } catch (error: unknown) {
      notify(
        "error",
        i18nT("static.rulhkg"),
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
        i18nT("static.miz9ao"),
        i18nT("static.18c838j", { p0: status.toLowerCase() }),
      );
    } catch {
      notify("error", i18nT("static.1yhx6qk"), i18nT("static.17n6yr4"));
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
        ? i18nT("static.1xwfim3")
        : status === "CLOSED"
          ? i18nT("static.1py01df")
          : i18nT("static.1w3q4bd"),
      target: `${row.code} · ${row.job_title}`,
      severity: cancelling || status === "CLOSED" ? "danger" : "warning",
      confirmLabel: cancelling
        ? i18nT("static.ew9em3")
        : status === "CLOSED"
          ? i18nT("static.1l0xxoj")
          : i18nT("static.n6hn1l"),
      confirmIcon: cancelling
        ? "pi pi-times"
        : status === "CLOSED"
          ? "pi pi-lock"
          : "pi pi-folder-open",
      description: cancelling
        ? i18nT("static.9wqk5y")
        : status === "CLOSED"
          ? i18nT("static.1lupgda")
          : i18nT("static.17di4kk"),
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
      notify(
        "success",
        i18nT("static.miz9ao"),
        i18nT("static.1lyzsvw", { p0: status.toLowerCase() }),
      );
    } catch {
      notify("error", i18nT("static.1yhx6qk"), i18nT("static.1g8lu4f"));
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
      action: archiving ? i18nT("static.14ow54g") : i18nT("static.1qpq5no"),
      target: row.full_name,
      severity: archiving ? "danger" : "warning",
      confirmLabel: archiving ? i18nT("static.w0suw5") : i18nT("static.ezrmxd"),
      confirmIcon: archiving ? "pi pi-folder" : "pi pi-refresh",
      description: archiving ? i18nT("static.1jq1jiv") : i18nT("static.c1t7kb"),
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
      notify(
        "success",
        i18nT("static.miz9ao"),
        i18nT("static.1tvtcwt", { p0: status.toLowerCase() }),
      );
    } catch (error: unknown) {
      notify(
        "error",
        i18nT("static.1yhx6qk"),
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
        ? i18nT("static.5jy8nj")
        : accepting
          ? i18nT("static.1bes0jj")
          : i18nT("static.pq8z9"),
      target: `${row.candidate_name} · ${row.job_title}`,
      severity: declining ? "danger" : "warning",
      confirmLabel: declining
        ? i18nT("static.oo69tl")
        : accepting
          ? i18nT("static.me22x5")
          : i18nT("static.1vatbdb"),
      confirmIcon: declining
        ? "pi pi-times"
        : accepting
          ? "pi pi-check"
          : "pi pi-send",
      description: declining
        ? i18nT("static.1luuyqa")
        : accepting
          ? i18nT("static.133qxb6")
          : i18nT("static.uug11s"),
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
        label={i18nT("static.yugfpb")}
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
          label={i18nT("static.178pk4x")}
          text
          size="small"
          onClick={() => openApplicationStatus(row, "SCREENING")}
        />
      ) : null}
      {canManage &&
      ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"].includes(row.status) ? (
        <>
          <Button
            label={i18nT("static.88y37b")}
            text
            severity="secondary"
            size="small"
            onClick={() => openApplicationStatus(row, "WITHDRAWN")}
          />
          <Button
            label={i18nT("static.1kej36u")}
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
          label={i18nT("static.n6hn1l")}
          text
          size="small"
          onClick={() => confirmRequisitionStatus(row, "OPEN")}
          disabled={saving}
        />
      ) : null}
      {row.status === "OPEN" ? (
        <Button
          label={i18nT("static.1l0xxoj")}
          text
          severity="secondary"
          size="small"
          onClick={() => confirmRequisitionStatus(row, "CLOSED")}
          disabled={saving}
        />
      ) : null}
      {row.status === "DRAFT" || row.status === "OPEN" ? (
        <Button
          label={i18nT("static.ew9em3")}
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
          label={i18nT("static.1o765y8")}
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
            row.resume_original_file_name
              ? i18nT("static.ly9tr2")
              : i18nT("static.1hpezaf")
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
          label={i18nT("static.w0suw5")}
          text
          severity="danger"
          size="small"
          disabled={saving}
          onClick={() => confirmCandidateStatus(row, "ARCHIVED")}
        />
      ) : null}
      {canManage && row.status === "ARCHIVED" ? (
        <Button
          label={i18nT("static.ezrmxd")}
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
          label={i18nT("static.1vatbdb")}
          text
          size="small"
          onClick={() => confirmOfferStatus(row, "SENT")}
          disabled={saving}
        />
      ) : null}
      {row.status === "SENT" ? (
        <>
          <Button
            label={i18nT("static.me22x5")}
            text
            size="small"
            onClick={() => confirmOfferStatus(row, "ACCEPTED")}
            disabled={saving}
          />
          <Button
            label={i18nT("static.oo69tl")}
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
          value={i18nT("static.mebeis", {
            p0: row.onboarding_status || i18nT("static.dupnej"),
          })}
          severity={statusSeverity(row.onboarding_status || "DRAFT")}
        />
      ) : null}
      {row.status === "ACCEPTED" &&
      canLinkEmployee &&
      !row.lifecycle_case_id ? (
        <>
          {canCreateEmployeeFromOffer && !row.linked_employee_id ? (
            <Button
              label={i18nT("static.m3t8um")}
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
                ? i18nT("static.16f2qwb")
                : i18nT("static.twl4am")
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
        label={i18nT("static.ew9em3")}
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
      notify("error", i18nT("static.gy1qqi"), i18nT("static.kigx71"));
      return;
    }
    requestActionConfirmation({
      action: i18nT("static.1l00exx"),
      target: `Interview #${selectedInterview.id}`,
      severity: "warning",
      confirmLabel: i18nT("static.1l00exx"),
      confirmIcon: "pi pi-check-circle",
      description: i18nT("static.1gez7cq"),
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
      notify("error", i18nT("static.gy1qqi"), i18nT("static.1svshzr"));
      return;
    }
    requestActionConfirmation({
      action: i18nT("static.1x7m3go"),
      target: `Interview #${selectedInterview.id}`,
      severity: "danger",
      confirmLabel: i18nT("static.1x7m3go"),
      confirmIcon: "pi pi-times",
      description: i18nT("static.19ueac7"),
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
              {i18nT("static.15r5kbt")}{" "}
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {i18nT("static.8wu40r")}{" "}
            </p>
          </div>
          <Button
            label={i18nT("static.28r6qc")}
            icon="pi pi-refresh"
            outlined
            severity="secondary"
            size="small"
            loading={loadingRequisitions}
            onClick={() => void refresh()}
          />
        </div>
        <TabView>
          <TabPanel header={i18nT("static.1244wus")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.whgb9t")}
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
              emptyMessage={i18nT("static.1bnqob0")}
            >
              <Column field="code" header={i18nT("static.xoaiok")} />
              <Column field="job_title" header={i18nT("static.1kwmmbm")} />
              <Column
                field="department_name"
                header={i18nT("static.1430r53")}
                body={(row: RecruitmentRequisition) =>
                  row.department_name || "-"
                }
              />
              <Column field="headcount" header={i18nT("static.13gfwzm")} />
              <Column
                field="target_start_date"
                header={i18nT("static.1oyq5tw")}
                body={(row: RecruitmentRequisition) =>
                  formatDisplayDate(row.target_start_date)
                }
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(row: RecruitmentRequisition) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              {canManage && (
                <Column
                  header={i18nT("static.2wk0tb")}
                  body={requisitionActions}
                />
              )}
            </DataTable>
          </TabPanel>
          <TabPanel header={i18nT("static.uojsmj")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.1geipt0")}
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
              emptyMessage={i18nT("static.1bdfsjf")}
            >
              <Column field="full_name" header={i18nT("static.1vb7im2")} />
              <Column
                field="email"
                header={i18nT("static.inbfc7")}
                body={(row) => row.email || "-"}
              />
              <Column
                field="phone_number"
                header={i18nT("static.kb2lhr")}
                body={(row) => row.phone_number || "-"}
              />
              <Column
                field="source"
                header={i18nT("static.r5qyuw")}
                body={(row) => row.source || "-"}
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(row) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              <Column header={i18nT("static.2wk0tb")} body={candidateActions} />
            </DataTable>
          </TabPanel>
          <TabPanel header={i18nT("static.d6g082")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.1mt9atf")}
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
              emptyMessage={i18nT("static.5s1h3e")}
            >
              <Column field="candidate_name" header={i18nT("static.1vb7im2")} />
              <Column
                field="requisition_code"
                header={i18nT("static.juyien")}
              />
              <Column field="job_title" header={i18nT("static.1kwmmbm")} />
              <Column
                header={i18nT("static.gpyu7e")}
                body={(row: RecruitmentApplication) =>
                  formatDisplayDate(row.applied_at)
                }
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(row: RecruitmentApplication) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              <Column
                header={i18nT("static.2wk0tb")}
                body={applicationActions}
              />
            </DataTable>
          </TabPanel>
          <TabPanel header={i18nT("static.jxlebp")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.1ugtb2n")}
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
              emptyMessage={i18nT("static.17e5tfp")}
            >
              <Column field="candidate_name" header={i18nT("static.1vb7im2")} />
              <Column field="job_title" header={i18nT("static.1kwmmbm")} />
              <Column field="interview_type" header={i18nT("static.1m2zofh")} />
              <Column
                header={i18nT("static.19hwlpo")}
                body={(row: RecruitmentInterview) =>
                  formatDisplayDateTime(row.scheduled_at)
                }
              />
              <Column
                field="interviewer_name"
                header={i18nT("static.1j5tv1f")}
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(row: RecruitmentInterview) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              {canManage && (
                <Column
                  header={i18nT("static.2wk0tb")}
                  body={(row: RecruitmentInterview) =>
                    row.status === "SCHEDULED" ? (
                      <div className="flex gap-1">
                        <Button
                          label={i18nT("static.rcgk2q")}
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
                          label={i18nT("static.ew9em3")}
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
          <TabPanel header={i18nT("static.kkuebu")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.1blyqlz")}
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
              emptyMessage={i18nT("static.1xin6va")}
            >
              <Column field="candidate_name" header={i18nT("static.1vb7im2")} />
              <Column field="job_title" header={i18nT("static.1kwmmbm")} />
              <Column
                header={i18nT("static.12knp7n")}
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
                header={i18nT("static.7bl5hd")}
                body={(row: RecruitmentOffer) =>
                  formatDisplayDate(row.proposed_start_date)
                }
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(row: RecruitmentOffer) => (
                  <Tag
                    value={row.status}
                    severity={statusSeverity(row.status)}
                  />
                )}
              />
              {canManage && (
                <Column header={i18nT("static.2wk0tb")} body={offerActions} />
              )}
            </DataTable>
          </TabPanel>
        </TabView>
      </div>
      <Dialog
        header={i18nT("static.whgb9t")}
        visible={dialog === "requisition"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "40rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!requisition.code.trim() || !requisition.job_title.trim()) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.1itn6i7"));
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
            {i18nT("static.xoaiok")}{" "}
            <InputText
              value={requisition.code}
              onChange={(event) =>
                setRequisition({ ...requisition, code: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1kwmmbm")}{" "}
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
            {i18nT("static.13gfwzm")}{" "}
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
            {i18nT("static.1oyq5tw")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={requisition.target_start_date}
              onValueChange={(value) =>
                setRequisition({ ...requisition, target_start_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
            {i18nT("static.sjj37t")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
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
        header={i18nT("static.1geipt0")}
        visible={dialog === "candidate"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!candidate.full_name.trim()) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.sm0pqe"));
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
            {i18nT("static.4eocnj")}{" "}
            <InputText
              value={candidate.full_name}
              onChange={(event) =>
                setCandidate({ ...candidate, full_name: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.inbfc7")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              type="email"
              value={candidate.email}
              onChange={(event) =>
                setCandidate({ ...candidate, email: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.kb2lhr")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              value={candidate.phone_number}
              onChange={(event) =>
                setCandidate({ ...candidate, phone_number: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.r5qyuw")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
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
        header={i18nT("static.1mt9atf")}
        visible={dialog === "application"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!application.job_requisition_id || !application.candidate_id) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.1auab8n"));
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
            {i18nT("static.1ayy4l5")}{" "}
            <Dropdown
              value={application.job_requisition_id || null}
              options={requisitionOptions}
              placeholder={i18nT("static.193yt1")}
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
            {i18nT("static.1vb7im2")}{" "}
            <Dropdown
              value={application.candidate_id || null}
              options={candidateOptions}
              placeholder={i18nT("static.1mlhopk")}
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
        header={i18nT("static.1ugtb2n")}
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
            notify("error", i18nT("static.gy1qqi"), i18nT("static.bb4rv2"));
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
            {i18nT("static.9mg0rp")}{" "}
            <Dropdown
              value={interview.application_id || null}
              options={activeApplicationOptions}
              placeholder={i18nT("static.e0s7j")}
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
            {i18nT("static.urgh6c")}{" "}
            <Dropdown
              value={interview.interview_type}
              options={["HR", "USER", "TECHNICAL", "FINAL"]}
              placeholder={i18nT("static.1q1rq33")}
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
            {i18nT("static.19hwlpo")}{" "}
            <PrimeDatePicker
              value={interview.scheduled_at}
              withTime
              onValueChange={(value) =>
                setInterview({ ...interview, scheduled_at: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1j5tv1f")}{" "}
            <Dropdown
              value={interview.interviewer_employee_id || null}
              options={employeeOptions}
              placeholder={i18nT("static.1izgm0n")}
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
            ? i18nT("static.ly9tr2")
            : i18nT("static.1hpezaf")
        }
        visible={dialog === "candidateResume"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Upload", () => {
          if (!resumeCandidate || !resumeFile) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.1rz0vx9"));
            return;
          }
          if (resumeFile.type !== "application/pdf") {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.1dvcrlz"));
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
            {resumeCandidate?.full_name || i18nT("static.1vb7im2")}
            {i18nT("static.15pracv")}{" "}
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
        header={i18nT("static.u0u32d")}
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
            {i18nT("static.x9tsfp")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.1pvd8ls")}{" "}
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
            {i18nT("static.detaua")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
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
        header={i18nT("static.w0a1m0")}
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
              ? i18nT("static.1v0umq8", {
                  p0: selectedInterview.candidate_name,
                  p1: formatDisplayDateTime(selectedInterview.scheduled_at),
                })
              : i18nT("static.132ntkb")}
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.egtd7y")}{" "}
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
        header={i18nT("static.1blyqlz")}
        visible={dialog === "offer"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!offer.application_id) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.1hiy68k"));
            return;
          }
          const salary = offer.offered_salary.trim();
          if (
            salary &&
            (!Number.isFinite(Number(salary)) || Number(salary) < 0)
          ) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.lk9f98"));
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
            {i18nT("static.9mg0rp")}{" "}
            <Dropdown
              value={offer.application_id || null}
              options={activeApplicationOptions}
              placeholder={i18nT("static.e0s7j")}
              className="w-full"
              filter
              onChange={(event) =>
                setOffer({ ...offer, application_id: event.value as number })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.u68b4m")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              keyfilter="num"
              value={offer.offered_salary}
              onChange={(event) =>
                setOffer({ ...offer, offered_salary: event.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.9dbw8r")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={offer.proposed_start_date}
              onValueChange={(value) =>
                setOffer({ ...offer, proposed_start_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.ajc6fo")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={offer.expires_at}
              withTime
              onValueChange={(value) =>
                setOffer({ ...offer, expires_at: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.4f76ga")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
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
        header={i18nT("static.m3cxo5", {
          p0:
            applicationTransition.status === "SCREENING"
              ? i18nT("static.exbxh1")
              : applicationTransition.status === "REJECTED"
                ? i18nT("static.198t1a8")
                : i18nT("static.4kf79x"),
        })}
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
            notify("error", i18nT("static.gy1qqi"), i18nT("static.125je4a"));
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
              ? i18nT("static.1v0umq8", {
                  p0: selectedApplication.candidate_name,
                  p1: selectedApplication.job_title,
                })
              : i18nT("static.9mg0rp")}
          </p>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.i36sl5")}{" "}
            <span className="font-normal text-slate-400">
              {applicationTransition.status === "SCREENING"
                ? i18nT("static.xpojne")
                : i18nT("static.1xw2uvg")}
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
            ? i18nT("static.p3ydyp", { p0: activityApplication.candidate_name })
            : i18nT("static.1hvxw0x")
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
              label={i18nT("static.1l0xxoj")}
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
          emptyMessage={i18nT("static.1xfs3xe")}
        >
          <Column field="activity_type" header={i18nT("static.17yt05o")} />
          <Column field="previous_status" header={i18nT("static.6s9hn9")} />
          <Column field="new_status" header={i18nT("static.iaukp0")} />
          <Column
            field="notes"
            header={i18nT("static.4f76ga")}
            body={(row: RecruitmentActivity) => row.notes || "—"}
          />
          <Column field="actor_name" header={i18nT("static.1e0unve")} />
          <Column
            header={i18nT("static.3ow3yj")}
            body={(row: RecruitmentActivity) =>
              formatDisplayDateTime(row.occurred_at)
            }
          />
        </DataTable>
      </Dialog>
      <Dialog
        header={i18nT("static.c74z87")}
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
              notify("error", i18nT("static.gy1qqi"), i18nT("static.1flvj5o"));
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
            {i18nT("static.irfkwk")} <strong>{i18nT("static.fovxks")}</strong>
            {i18nT("static.1gi2ax8")}{" "}
          </p>
          {selectedOffer ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div>
                <span className="font-semibold">{i18nT("static.19xxxs0")}</span>{" "}
                {selectedOffer.candidate_name}
              </div>
              <div>
                <span className="font-semibold">{i18nT("static.zdinq9")}</span>{" "}
                {employeeOptions.find(
                  (option) => option.value === employeeLink.employee_id,
                )?.label || i18nT("static.atd8u4")}
              </div>
              {selectedOffer.linked_employee_id ? (
                <p className="mb-0 mt-2 text-xs text-amber-700">
                  {i18nT("static.1udnfa")}{" "}
                </p>
              ) : null}
            </div>
          ) : null}
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1fak8xt")}{" "}
            <Dropdown
              value={employeeLink.employee_id || null}
              options={employeeOptions}
              placeholder={i18nT("static.1izgm0n")}
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
            {i18nT("static.1ojc17v")}{" "}
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
