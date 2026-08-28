"use client";
import { useI18n } from "@/app/i18n";

import { useEffect, useMemo, useState } from "react";
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
import { SelectButton } from "primereact/selectbutton";
import { Sidebar } from "primereact/sidebar";
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
import { isWhitespaceFreeIdentifier } from "@/app/utils/identifier-validation";
import {
  ACTIVE_PIPELINE_STATUSES,
  buildRecruitmentPipeline,
  COMPLETED_PIPELINE_STATUSES,
  getPipelineItemsForFilter,
  getPipelinePrimaryAction,
  getScheduledInterview,
  type PipelineFilter,
  type PipelinePrimaryAction,
  type RecruitmentPipelineItem,
} from "./recruitment-pipeline";

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
  | "candidateIntake"
  | null;
type SelectOption = { label: string; value: number };
type RecruitmentView = "pipeline" | "requisitions" | "candidates";
type IntakeMode = "new" | "existing";

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
  const { t: i18nT, tText } = useI18n();
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
    error: requisitionsError,
    mutate: reloadRequisitions,
    isValidating: loadingRequisitions,
  } = useSWR("recruitment-requisitions", getRecruitmentRequisitions);
  const {
    data: candidates = [],
    error: candidatesError,
    mutate: reloadCandidates,
  } = useSWR("recruitment-candidates", getRecruitmentCandidates);
  const {
    data: applications = [],
    error: applicationsError,
    mutate: reloadApplications,
  } = useSWR("recruitment-applications", getRecruitmentApplications);
  const {
    data: interviews = [],
    error: interviewsError,
    mutate: reloadInterviews,
  } = useSWR("recruitment-interviews", getRecruitmentInterviews);
  const {
    data: offers = [],
    error: offersError,
    mutate: reloadOffers,
  } = useSWR("recruitment-offers", getRecruitmentOffers);
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
  const {
    data: applicationActivities = [],
    error: activitiesError,
    isLoading: loadingActivities,
    mutate: reloadActivities,
  } = useSWR<RecruitmentActivity[]>(
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
  const [activeView, setActiveView] = useState<RecruitmentView>("pipeline");
  const [pipelineFilter, setPipelineFilter] =
    useState<PipelineFilter>("ACTIVE");
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [mobilePipelineStage, setMobilePipelineStage] =
    useState<ApplicationStatus>("APPLIED");
  const [selectedRequisitionId, setSelectedRequisitionId] = useState<
    number | null
  >(null);
  const [selectedPipelineApplicationId, setSelectedPipelineApplicationId] =
    useState<number | null>(null);
  const [intakeMode, setIntakeMode] = useState<IntakeMode>("new");
  const [intakeRequisitionId, setIntakeRequisitionId] = useState<number>(0);
  const [intakeCandidate, setIntakeCandidate] = useState(emptyCandidate());
  const [intakeCandidateId, setIntakeCandidateId] = useState<number>(0);
  const [intakeResumeFile, setIntakeResumeFile] = useState<File | null>(null);
  const [intakeError, setIntakeError] = useState("");
  const [intakeResumeWarning, setIntakeResumeWarning] = useState("");

  const requisitionOptions = useMemo<SelectOption[]>(
    () =>
      requisitions
        .filter((item) => item.status === "OPEN")
        .map((item) => ({
          label: i18nT("static.1v0umq8", { p0: item.code, p1: item.job_title }),
          value: item.id,
        })),
    [i18nT, requisitions],
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
    [applications, i18nT],
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
  const openRequisitions = useMemo(
    () => requisitions.filter((item) => item.status === "OPEN"),
    [requisitions],
  );
  const selectedRequisition = useMemo(
    () =>
      openRequisitions.find((item) => item.id === selectedRequisitionId) ??
      null,
    [openRequisitions, selectedRequisitionId],
  );
  const pipelineItems = useMemo(
    () =>
      buildRecruitmentPipeline(
        applications,
        candidates,
        interviews,
        offers,
        selectedRequisitionId,
      ),
    [applications, candidates, interviews, offers, selectedRequisitionId],
  );
  const visiblePipelineItems = useMemo(() => {
    const search = pipelineSearch.trim().toLowerCase();
    return getPipelineItemsForFilter(pipelineItems, pipelineFilter).filter(
      (item) => {
        if (!search) return true;
        const candidateName =
          item.candidate?.full_name || item.application.candidate_name;
        return [
          candidateName,
          item.candidate?.email,
          item.application.job_title,
          item.application.requisition_code,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(search));
      },
    );
  }, [pipelineFilter, pipelineItems, pipelineSearch]);
  const selectedPipelineItem = useMemo(
    () =>
      pipelineItems.find(
        (item) => item.application.id === selectedPipelineApplicationId,
      ) ?? null,
    [pipelineItems, selectedPipelineApplicationId],
  );
  const assignedCandidateIds = useMemo(
    () =>
      new Set(
        applications
          .filter((item) => item.job_requisition_id === intakeRequisitionId)
          .map((item) => item.candidate_id),
      ),
    [applications, intakeRequisitionId],
  );
  const intakeCandidateOptions = useMemo<SelectOption[]>(
    () =>
      candidates
        .filter(
          (item) =>
            item.status === "ACTIVE" && !assignedCandidateIds.has(item.id),
        )
        .map((item) => ({ label: item.full_name, value: item.id })),
    [assignedCandidateIds, candidates],
  );
  const selectedPipelineInterviews = selectedPipelineItem?.interviews ?? [];
  const selectedPipelineOffer = selectedPipelineItem?.offer ?? null;
  const recruitmentError =
    requisitionsError ||
    candidatesError ||
    applicationsError ||
    interviewsError ||
    offersError;

  useEffect(() => {
    if (!openRequisitions.length) {
      setSelectedRequisitionId(null);
      return;
    }
    if (openRequisitions.some((item) => item.id === selectedRequisitionId)) {
      return;
    }
    let storedId = 0;
    try {
      storedId = Number(
        window.localStorage.getItem("recruitment:selected-requisition-id"),
      );
    } catch {
      storedId = 0;
    }
    const stored = openRequisitions.find((item) => item.id === storedId);
    setSelectedRequisitionId((stored ?? openRequisitions[0]).id);
  }, [openRequisitions, selectedRequisitionId]);

  useEffect(() => {
    if (selectedRequisitionId !== null) {
      try {
        window.localStorage.setItem(
          "recruitment:selected-requisition-id",
          String(selectedRequisitionId),
        );
      } catch {
        // Ignore storage restrictions; the pipeline still works for this session.
      }
    }
  }, [selectedRequisitionId]);
  const notify = (
    severity: "success" | "error" | "warn",
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

  const resetIntake = () => {
    setIntakeMode("new");
    setIntakeRequisitionId(selectedRequisitionId ?? 0);
    setIntakeCandidate(emptyCandidate());
    setIntakeCandidateId(0);
    setIntakeResumeFile(null);
    setIntakeError("");
    setIntakeResumeWarning("");
  };

  const openIntake = (requisitionId = selectedRequisitionId ?? 0) => {
    resetIntake();
    setIntakeRequisitionId(requisitionId);
    showDialog("candidateIntake");
  };

  const submitIntake = async () => {
    setIntakeError("");
    setIntakeResumeWarning("");
    if (!intakeRequisitionId) {
      setIntakeError(tText("Select an open requisition first."));
      return;
    }
    if (intakeMode === "existing" && !intakeCandidateId) {
      setIntakeError(tText("Select a candidate first."));
      return;
    }
    if (intakeMode === "new" && !intakeCandidate.full_name.trim()) {
      setIntakeError(tText("Candidate name is required."));
      return;
    }
    if (
      intakeResumeFile &&
      (intakeResumeFile.type !== "application/pdf" ||
        intakeResumeFile.size > 10 * 1024 * 1024)
    ) {
      setIntakeError(tText("Only PDF resumes up to 10 MB are allowed."));
      return;
    }

    setSaving(true);
    let createdCandidateId = intakeMode === "new" ? 0 : intakeCandidateId;
    let resumeWarning = "";
    try {
      if (intakeMode === "new") {
        const created = await createRecruitmentCandidate({
          ...intakeCandidate,
          full_name: intakeCandidate.full_name.trim(),
          email: intakeCandidate.email.trim() || null,
          phone_number: intakeCandidate.phone_number.trim() || null,
          source: intakeCandidate.source.trim() || null,
        });
        createdCandidateId = created.id;
        setIntakeCandidateId(createdCandidateId);

        const refreshedCandidates = await reloadCandidates();
        const createdCandidate = refreshedCandidates?.find(
          (item) => item.id === createdCandidateId,
        );
        if (intakeResumeFile) {
          if (!createdCandidate) {
            resumeWarning = tText(
              "Candidate created, but the resume could not be uploaded yet.",
            );
            setIntakeResumeWarning(resumeWarning);
          } else {
            try {
              await uploadRecruitmentCandidateResume(
                createdCandidate.id,
                createdCandidate.row_version,
                intakeResumeFile,
              );
            } catch (error: unknown) {
              resumeWarning = tText(
                "Candidate created, but the resume upload failed: {p0}.",
                {
                  p0: apiErrorMessage(
                    error,
                    tText("upload it later from Talent Pool"),
                  ),
                },
              );
              setIntakeResumeWarning(resumeWarning);
            }
          }
        }
      }

      await createRecruitmentApplication({
        job_requisition_id: intakeRequisitionId,
        candidate_id: createdCandidateId,
      });
      setDialog(null);
      resetIntake();
      try {
        await refresh();
      } catch {
        notify(
          "warn",
          tText("Success"),
          tText("Application created, but the list could not be refreshed."),
        );
        return;
      }
      notify(
        resumeWarning ? "warn" : "success",
        tText("Success"),
        resumeWarning
          ? tText("Application created, but the resume needs attention.")
          : tText("Candidate added to the requisition."),
      );
    } catch (error: unknown) {
      if (createdCandidateId && intakeMode === "new") {
        setIntakeMode("existing");
        setIntakeCandidateId(createdCandidateId);
        setIntakeResumeFile(null);
        setIntakeError(
          tText(
            "Candidate was created, but the application was not. Review the error and try again.",
          ),
        );
      } else {
        setIntakeError(
          apiErrorMessage(
            error,
            tText("Unable to add the candidate to this requisition."),
          ),
        );
      }
      notify(
        "error",
        tText("Error"),
        apiErrorMessage(error, tText("Review the data and try again.")),
      );
    } finally {
      setSaving(false);
    }
  };

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

  const openPipelineApplication = (item: RecruitmentPipelineItem) => {
    setSelectedPipelineApplicationId(item.application.id);
    setActivityApplication(item.application);
  };

  const openPipelineInterview = (item: RecruitmentPipelineItem) => {
    setInterview({
      ...emptyInterview(),
      application_id: item.application.id,
    });
    showDialog("interview");
  };

  const openPipelineInterviewCompletion = (item: RecruitmentPipelineItem) => {
    const scheduledInterview = getScheduledInterview(item.interviews);
    if (!scheduledInterview) {
      openPipelineInterview(item);
      return;
    }
    setSelectedInterview(scheduledInterview);
    setCompletion({
      score: scheduledInterview.score?.toString() || "",
      feedback: scheduledInterview.feedback || "",
    });
    showDialog("completeInterview");
  };

  const openPipelineOffer = (item: RecruitmentPipelineItem) => {
    setOffer({
      ...emptyOffer(),
      application_id: item.application.id,
    });
    showDialog("offer");
  };

  const runPipelinePrimaryAction = (
    item: RecruitmentPipelineItem,
    action: PipelinePrimaryAction,
  ) => {
    if (!action) return;
    setSelectedPipelineApplicationId(item.application.id);
    switch (action) {
      case "SCREENING":
        openApplicationStatus(item.application, "SCREENING");
        break;
      case "SCHEDULE_INTERVIEW":
        openPipelineInterview(item);
        break;
      case "COMPLETE_INTERVIEW":
        openPipelineInterviewCompletion(item);
        break;
      case "CREATE_OFFER":
        openPipelineOffer(item);
        break;
      case "SEND_OFFER":
        if (item.offer) confirmOfferStatus(item.offer, "SENT");
        break;
      case "ACCEPT_OFFER":
        if (item.offer) confirmOfferStatus(item.offer, "ACCEPTED");
        break;
      case "ONBOARD":
        if (item.offer) {
          if (canCreateEmployeeFromOffer && !item.offer.linked_employee_id) {
            openQuickAddFromOffer(item.offer);
          } else {
            openLink(item.offer);
          }
        }
        break;
    }
  };

  const pipelineActionLabel = (action: PipelinePrimaryAction) => {
    switch (action) {
      case "SCREENING":
        return tText("Move to Screening");
      case "SCHEDULE_INTERVIEW":
        return tText("Schedule Interview");
      case "COMPLETE_INTERVIEW":
        return tText("Complete Interview");
      case "CREATE_OFFER":
        return tText("New Offer");
      case "SEND_OFFER":
        return tText("Send Offer");
      case "ACCEPT_OFFER":
        return tText("Accept Offer");
      case "ONBOARD":
        return tText("Start Onboarding");
      default:
        return "";
    }
  };

  const pipelineStatusLabel = (status: ApplicationStatus) => {
    const labels: Record<ApplicationStatus, string> = {
      APPLIED: tText("Applied"),
      SCREENING: tText("Screening"),
      INTERVIEW: tText("Interview"),
      OFFER: tText("Offer"),
      HIRED: tText("Hired"),
      REJECTED: tText("Rejected"),
      WITHDRAWN: tText("Withdrawn"),
    };
    return labels[status];
  };

  const renderPipelineCard = (item: RecruitmentPipelineItem) => {
    const action = getPipelinePrimaryAction(item);
    const scheduledInterview = getScheduledInterview(item.interviews);
    const candidateName =
      item.candidate?.full_name || item.application.candidate_name;
    return (
      <div
        key={item.application.id}
        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
      >
        <button
          type="button"
          className="w-full text-left"
          onClick={() => openPipelineApplication(item)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="m-0 truncate font-semibold text-slate-800">
                {candidateName}
              </p>
              <p className="m-0 mt-1 truncate text-xs text-slate-500">
                {item.application.job_title}
              </p>
            </div>
            <Tag
              value={pipelineStatusLabel(item.application.status)}
              severity={statusSeverity(item.application.status)}
            />
          </div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            {item.candidate?.email ? (
              <p className="m-0 truncate">{item.candidate.email}</p>
            ) : null}
            {item.candidate?.resume_original_file_name ? (
              <p className="m-0 flex items-center gap-1 text-emerald-600">
                <i className="pi pi-file-pdf" /> {tText("Resume available")}
              </p>
            ) : null}
            {scheduledInterview ? (
              <p className="m-0 flex items-center gap-1">
                <i className="pi pi-calendar" />{" "}
                {formatDisplayDateTime(scheduledInterview.scheduled_at)}
              </p>
            ) : null}
            {item.offer ? (
              <p className="m-0 flex items-center gap-1">
                <i className="pi pi-send" /> {tText("Offer")}:{" "}
                {item.offer.status}
              </p>
            ) : null}
          </div>
        </button>
        {canManage && action ? (
          <Button
            label={pipelineActionLabel(action)}
            icon="pi pi-arrow-right"
            size="small"
            text
            className="mt-2 px-0"
            onClick={() => runPipelinePrimaryAction(item, action)}
            disabled={saving}
          />
        ) : null}
      </div>
    );
  };

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
        {recruitmentError ? (
          <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {apiErrorMessage(
                recruitmentError,
                tText("Unable to load recruitment data."),
              )}
            </span>
            <Button
              label={tText("Retry")}
              icon="pi pi-refresh"
              outlined
              severity="danger"
              size="small"
              onClick={() => void refresh()}
            />
          </div>
        ) : null}
        <SelectButton
          value={activeView}
          options={[
            { label: tText("Pipeline"), value: "pipeline" },
            { label: i18nT("static.1244wus"), value: "requisitions" },
            { label: i18nT("static.uojsmj"), value: "candidates" },
          ]}
          optionLabel="label"
          optionValue="value"
          allowEmpty={false}
          onChange={(event) => setActiveView(event.value as RecruitmentView)}
        />

        {activeView === "pipeline" ? (
          <section className="grid gap-4">
            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)_auto_auto] md:items-end">
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {tText("Selected requisition")}
                <Dropdown
                  value={selectedRequisitionId}
                  options={requisitionOptions}
                  optionLabel="label"
                  optionValue="value"
                  placeholder={tText("Select an open requisition")}
                  className="w-full"
                  filter
                  onChange={(event) =>
                    setSelectedRequisitionId(event.value ?? null)
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {tText("Search candidates")}
                <span className="p-input-icon-left">
                  <i className="pi pi-search" />
                  <InputText
                    value={pipelineSearch}
                    placeholder={tText("Search candidates")}
                    className="w-full"
                    onChange={(event) => setPipelineSearch(event.target.value)}
                  />
                </span>
              </label>
              <SelectButton
                value={pipelineFilter}
                options={[
                  { label: tText("Active"), value: "ACTIVE" },
                  { label: tText("Completed"), value: "COMPLETED" },
                ]}
                optionLabel="label"
                optionValue="value"
                allowEmpty={false}
                onChange={(event) => {
                  const nextFilter = event.value as PipelineFilter;
                  setPipelineFilter(nextFilter);
                  setMobilePipelineStage(
                    nextFilter === "ACTIVE" ? "APPLIED" : "HIRED",
                  );
                }}
              />
              {canManage ? (
                <Button
                  label={tText("Add Candidate")}
                  icon="pi pi-user-plus"
                  size="small"
                  onClick={() => openIntake()}
                  disabled={!selectedRequisition}
                />
              ) : null}
            </div>

            {!selectedRequisition ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                <p className="m-0">
                  {openRequisitions.length
                    ? tText("Select an open requisition to view its pipeline.")
                    : tText(
                        "Create or open a requisition to start recruiting.",
                      )}
                </p>
                {canManage && !openRequisitions.length ? (
                  <Button
                    label={tText("Manage requisitions")}
                    icon="pi pi-arrow-right"
                    text
                    size="small"
                    className="mt-3"
                    onClick={() => setActiveView("requisitions")}
                  />
                ) : null}
              </div>
            ) : (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="m-0 text-lg font-semibold text-slate-800">
                      {selectedRequisition.code} —{" "}
                      {selectedRequisition.job_title}
                    </h2>
                    <p className="m-0 mt-1 text-sm text-slate-500">
                      {tText("{p0} candidates", {
                        p0: visiblePipelineItems.length,
                      })}
                    </p>
                  </div>
                  <Tag
                    value={
                      pipelineFilter === "ACTIVE"
                        ? tText("Active")
                        : tText("Completed")
                    }
                    severity={
                      pipelineFilter === "ACTIVE" ? "info" : "secondary"
                    }
                  />
                </div>
                <SelectButton
                  className="md:hidden"
                  value={mobilePipelineStage}
                  options={(pipelineFilter === "ACTIVE"
                    ? ACTIVE_PIPELINE_STATUSES
                    : COMPLETED_PIPELINE_STATUSES
                  ).map((status) => ({
                    label: pipelineStatusLabel(status),
                    value: status,
                  }))}
                  optionLabel="label"
                  optionValue="value"
                  allowEmpty={false}
                  onChange={(event) =>
                    setMobilePipelineStage(event.value as ApplicationStatus)
                  }
                />
                <div className="grid gap-4 overflow-x-auto pb-2 md:grid-cols-4">
                  {(pipelineFilter === "ACTIVE"
                    ? ACTIVE_PIPELINE_STATUSES
                    : COMPLETED_PIPELINE_STATUSES
                  ).map((status) => {
                    const stageItems = visiblePipelineItems.filter(
                      (item) => item.application.status === status,
                    );
                    return (
                      <div
                        key={status}
                        className={`min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 md:min-w-[16rem] ${
                          status !== mobilePipelineStage
                            ? "hidden md:block"
                            : ""
                        }`}
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="m-0 text-sm font-semibold text-slate-700">
                            {pipelineStatusLabel(status)}
                          </h3>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                            {stageItems.length}
                          </span>
                        </div>
                        <div className="grid gap-3">
                          {stageItems.length ? (
                            stageItems.map(renderPipelineCard)
                          ) : (
                            <p className="m-0 rounded-lg border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                              {tText("No candidates in this stage.")}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        ) : activeView === "requisitions" ? (
          <section>
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
              {canManage ? (
                <Column
                  header={i18nT("static.2wk0tb")}
                  body={requisitionActions}
                />
              ) : null}
            </DataTable>
          </section>
        ) : (
          <section>
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
          </section>
        )}
      </div>
      <Sidebar
        visible={Boolean(selectedPipelineItem)}
        position="right"
        onHide={() => {
          setSelectedPipelineApplicationId(null);
          setActivityApplication(null);
        }}
        className="!w-full sm:!w-[34rem]"
      >
        {selectedPipelineItem ? (
          <div className="flex h-full flex-col gap-5">
            <div className="border-b border-slate-200 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {selectedPipelineItem.application.requisition_code}
                  </p>
                  <h2 className="m-0 mt-1 truncate text-xl font-semibold text-slate-900">
                    {selectedPipelineItem.candidate?.full_name ||
                      selectedPipelineItem.application.candidate_name}
                  </h2>
                  <p className="m-0 mt-1 truncate text-sm text-slate-500">
                    {selectedPipelineItem.application.job_title}
                  </p>
                </div>
                <Tag
                  value={pipelineStatusLabel(
                    selectedPipelineItem.application.status,
                  )}
                  severity={statusSeverity(
                    selectedPipelineItem.application.status,
                  )}
                />
              </div>
            </div>

            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <span>{i18nT("static.inbfc7")}</span>
                <span className="truncate font-medium text-slate-800">
                  {selectedPipelineItem.candidate?.email || "-"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{i18nT("static.kb2lhr")}</span>
                <span className="truncate font-medium text-slate-800">
                  {selectedPipelineItem.candidate?.phone_number || "-"}
                </span>
              </div>
              {selectedPipelineItem.candidate?.resume_original_file_name ? (
                <Button
                  label={i18nT("static.1o765y8")}
                  icon="pi pi-file-pdf"
                  text
                  size="small"
                  className="justify-start px-0"
                  onClick={() =>
                    window.open(
                      `/api/recruitment/candidates/${selectedPipelineItem.candidate?.id}/resume`,
                      "_blank",
                    )
                  }
                />
              ) : (
                <span className="text-xs text-slate-400">
                  {tText("No resume uploaded")}
                </span>
              )}
            </div>

            {canManage && getPipelinePrimaryAction(selectedPipelineItem) ? (
              <Button
                label={pipelineActionLabel(
                  getPipelinePrimaryAction(selectedPipelineItem),
                )}
                icon="pi pi-arrow-right"
                onClick={() =>
                  runPipelinePrimaryAction(
                    selectedPipelineItem,
                    getPipelinePrimaryAction(selectedPipelineItem),
                  )
                }
                disabled={saving}
              />
            ) : null}

            <div className="flex flex-wrap gap-2">
              {canManage &&
              ["APPLIED", "SCREENING", "INTERVIEW", "OFFER"].includes(
                selectedPipelineItem.application.status,
              ) ? (
                <>
                  <Button
                    label={i18nT("static.4kf79x")}
                    text
                    severity="secondary"
                    size="small"
                    onClick={() =>
                      openApplicationStatus(
                        selectedPipelineItem.application,
                        "WITHDRAWN",
                      )
                    }
                  />
                  <Button
                    label={i18nT("static.198t1a8")}
                    text
                    severity="danger"
                    size="small"
                    onClick={() =>
                      openApplicationStatus(
                        selectedPipelineItem.application,
                        "REJECTED",
                      )
                    }
                  />
                </>
              ) : null}
            </div>

            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.jxlebp")}
                </h3>
                {canManage ? (
                  <Button
                    label={i18nT("static.1ugtb2n")}
                    icon="pi pi-plus"
                    text
                    size="small"
                    onClick={() => openPipelineInterview(selectedPipelineItem)}
                  />
                ) : null}
              </div>
              {selectedPipelineInterviews.length ? (
                selectedPipelineInterviews.map((interview) => (
                  <div
                    key={interview.id}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="m-0 text-sm font-medium text-slate-800">
                          {interview.interview_type}
                        </p>
                        <p className="m-0 mt-1 text-xs text-slate-500">
                          {formatDisplayDateTime(interview.scheduled_at)} ·{" "}
                          {interview.interviewer_name}
                        </p>
                      </div>
                      <Tag
                        value={interview.status}
                        severity={statusSeverity(interview.status)}
                      />
                    </div>
                    {interview.feedback ? (
                      <p className="m-0 mt-2 text-sm text-slate-600">
                        {interview.feedback}
                      </p>
                    ) : null}
                    {canManage && interview.status === "SCHEDULED" ? (
                      <div className="mt-2 flex gap-2">
                        <Button
                          label={i18nT("static.rcgk2q")}
                          text
                          size="small"
                          onClick={() => {
                            setSelectedInterview(interview);
                            setCompletion({
                              score: interview.score?.toString() || "",
                              feedback: interview.feedback || "",
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
                            setSelectedInterview(interview);
                            setInterviewCancellationReason("");
                            showDialog("cancelInterview");
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="m-0 text-sm text-slate-500">
                  {tText("No interviews scheduled.")}
                </p>
              )}
            </section>

            <section className="grid gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.kkuebu")}
                </h3>
                {canManage && !selectedPipelineOffer ? (
                  <Button
                    label={i18nT("static.1blyqlz")}
                    icon="pi pi-plus"
                    text
                    size="small"
                    onClick={() => openPipelineOffer(selectedPipelineItem)}
                  />
                ) : null}
              </div>
              {selectedPipelineOffer ? (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-600">
                      {selectedPipelineOffer.offered_salary
                        ? new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            maximumFractionDigits: 0,
                          }).format(
                            Number(selectedPipelineOffer.offered_salary),
                          )
                        : "-"}
                    </span>
                    <Tag
                      value={selectedPipelineOffer.status}
                      severity={statusSeverity(selectedPipelineOffer.status)}
                    />
                  </div>
                  {selectedPipelineOffer.proposed_start_date ? (
                    <p className="m-0 mt-1 text-xs text-slate-500">
                      {i18nT("static.7bl5hd")}:{" "}
                      {formatDisplayDate(
                        selectedPipelineOffer.proposed_start_date,
                      )}
                    </p>
                  ) : null}
                  {canManage ? offerActions(selectedPipelineOffer) : null}
                </div>
              ) : (
                <p className="m-0 text-sm text-slate-500">
                  {tText("No offer created yet.")}
                </p>
              )}
            </section>

            <section className="grid gap-3 pb-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {i18nT("static.yugfpb")}
                </h3>
                <Button
                  label={tText("View all")}
                  text
                  size="small"
                  onClick={() => showDialog("applicationActivity")}
                />
              </div>
              {activitiesError ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  <span>
                    {apiErrorMessage(
                      activitiesError,
                      tText("Unable to load activity."),
                    )}
                  </span>
                  <Button
                    label={tText("Retry")}
                    text
                    size="small"
                    severity="danger"
                    onClick={() => void reloadActivities()}
                  />
                </div>
              ) : loadingActivities ? (
                <p className="m-0 text-sm text-slate-500">
                  {tText("Loading...")}
                </p>
              ) : applicationActivities.length ? (
                <div className="grid gap-2">
                  {applicationActivities.slice(0, 5).map((activity) => (
                    <div
                      key={activity.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-slate-700">
                          {activity.activity_type}
                        </span>
                        <span className="text-slate-400">
                          {formatDisplayDateTime(activity.occurred_at)}
                        </span>
                      </div>
                      {activity.notes ? (
                        <p className="m-0 mt-1 text-slate-500">
                          {activity.notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="m-0 text-sm text-slate-500">
                  {tText("No activity found.")}
                </p>
              )}
            </section>
          </div>
        ) : null}
      </Sidebar>
      <Dialog
        header={i18nT("static.whgb9t")}
        visible={dialog === "requisition"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "40rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!isWhitespaceFreeIdentifier(requisition.code)) {
            notify(
              "error",
              i18nT("static.gy1qqi"),
              i18nT("validation.codeNoWhitespace"),
            );
            return;
          }
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
        header={tText("Add candidate to requisition")}
        visible={dialog === "candidateIntake"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "40rem" }}
        onHide={close}
        footer={footer(tText("Add to pipeline"), () => void submitIntake())}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {tText("Requisition")}
            <Dropdown
              value={intakeRequisitionId || null}
              options={requisitionOptions}
              optionLabel="label"
              optionValue="value"
              placeholder={tText("Select an open requisition")}
              className="w-full"
              filter
              onChange={(event) => setIntakeRequisitionId(event.value ?? 0)}
            />
          </label>
          <SelectButton
            value={intakeMode}
            options={[
              { label: tText("New candidate"), value: "new" },
              { label: tText("Existing candidate"), value: "existing" },
            ]}
            optionLabel="label"
            optionValue="value"
            allowEmpty={false}
            onChange={(event) => {
              const nextMode = event.value as IntakeMode;
              setIntakeMode(nextMode);
              if (nextMode === "new") setIntakeCandidateId(0);
              setIntakeError("");
            }}
          />
          {intakeMode === "existing" ? (
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              {i18nT("static.1vb7im2")}
              <Dropdown
                value={intakeCandidateId || null}
                options={intakeCandidateOptions}
                optionLabel="label"
                optionValue="value"
                placeholder={i18nT("static.1mlhopk")}
                className="w-full"
                filter
                onChange={(event) => setIntakeCandidateId(event.value ?? 0)}
              />
            </label>
          ) : (
            <>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {i18nT("static.4eocnj")}
                <InputText
                  value={intakeCandidate.full_name}
                  onChange={(event) =>
                    setIntakeCandidate({
                      ...intakeCandidate,
                      full_name: event.target.value,
                    })
                  }
                />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.inbfc7")}
                  <InputText
                    type="email"
                    value={intakeCandidate.email}
                    onChange={(event) =>
                      setIntakeCandidate({
                        ...intakeCandidate,
                        email: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  {i18nT("static.kb2lhr")}
                  <InputText
                    value={intakeCandidate.phone_number}
                    onChange={(event) =>
                      setIntakeCandidate({
                        ...intakeCandidate,
                        phone_number: event.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {i18nT("static.r5qyuw")}
                <InputText
                  value={intakeCandidate.source}
                  onChange={(event) =>
                    setIntakeCandidate({
                      ...intakeCandidate,
                      source: event.target.value,
                    })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium text-slate-700">
                {tText("Resume")}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="block w-full rounded-md border border-slate-300 bg-white p-2 text-sm text-slate-700"
                  onChange={(event) =>
                    setIntakeResumeFile(event.target.files?.[0] || null)
                  }
                />
                <span className="text-xs font-normal text-slate-400">
                  {tText("PDF only, maximum 10 MB")}
                </span>
              </label>
            </>
          )}
          {intakeError ? (
            <p className="m-0 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {intakeError}
            </p>
          ) : null}
          {intakeResumeWarning ? (
            <p className="m-0 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              {intakeResumeWarning}
            </p>
          ) : null}
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
