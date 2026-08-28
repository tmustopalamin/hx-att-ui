import type {
  ApplicationStatus,
  RecruitmentApplication,
  RecruitmentCandidate,
  RecruitmentInterview,
  RecruitmentOffer,
} from "@/app/types/recruitment";

export type PipelineFilter = "ACTIVE" | "COMPLETED";
export type PipelineStage =
  | "APPLIED"
  | "SCREENING"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export type PipelinePrimaryAction =
  | "SCREENING"
  | "SCHEDULE_INTERVIEW"
  | "COMPLETE_INTERVIEW"
  | "CREATE_OFFER"
  | "SEND_OFFER"
  | "ACCEPT_OFFER"
  | "ONBOARD"
  | null;

export interface RecruitmentPipelineItem {
  application: RecruitmentApplication;
  candidate: RecruitmentCandidate | null;
  interviews: RecruitmentInterview[];
  offer: RecruitmentOffer | null;
}

export const ACTIVE_PIPELINE_STATUSES: readonly ApplicationStatus[] = [
  "APPLIED",
  "SCREENING",
  "INTERVIEW",
  "OFFER",
];

export const COMPLETED_PIPELINE_STATUSES: readonly ApplicationStatus[] = [
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
];

const timestamp = (value: string | null | undefined) => {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
};

export const buildRecruitmentPipeline = (
  applications: RecruitmentApplication[],
  candidates: RecruitmentCandidate[],
  interviews: RecruitmentInterview[],
  offers: RecruitmentOffer[],
  requisitionId: number | null,
): RecruitmentPipelineItem[] => {
  const candidatesById = new Map(candidates.map((item) => [item.id, item]));
  const interviewsByApplication = new Map<number, RecruitmentInterview[]>();
  const offersByApplication = new Map<number, RecruitmentOffer>();

  interviews.forEach((interview) => {
    const current = interviewsByApplication.get(interview.application_id) ?? [];
    current.push(interview);
    interviewsByApplication.set(interview.application_id, current);
  });
  offers.forEach((offer) =>
    offersByApplication.set(offer.application_id, offer),
  );

  return applications
    .filter(
      (application) =>
        requisitionId === null ||
        application.job_requisition_id === requisitionId,
    )
    .map((application) => ({
      application,
      candidate: candidatesById.get(application.candidate_id) ?? null,
      interviews: (interviewsByApplication.get(application.id) ?? []).sort(
        (left, right) =>
          timestamp(right.scheduled_at) - timestamp(left.scheduled_at),
      ),
      offer: offersByApplication.get(application.id) ?? null,
    }))
    .sort(
      (left, right) =>
        timestamp(right.application.applied_at) -
        timestamp(left.application.applied_at),
    );
};

export const getPipelineItemsForFilter = (
  items: RecruitmentPipelineItem[],
  filter: PipelineFilter,
) => {
  const statuses =
    filter === "ACTIVE"
      ? ACTIVE_PIPELINE_STATUSES
      : COMPLETED_PIPELINE_STATUSES;
  return items.filter((item) => statuses.includes(item.application.status));
};

export const getScheduledInterview = (
  interviews: RecruitmentInterview[],
): RecruitmentInterview | null => {
  const scheduled = interviews
    .filter((interview) => interview.status === "SCHEDULED")
    .sort(
      (left, right) =>
        timestamp(left.scheduled_at) - timestamp(right.scheduled_at),
    );
  return scheduled[0] ?? null;
};

export const getPipelinePrimaryAction = (
  item: RecruitmentPipelineItem,
): PipelinePrimaryAction => {
  switch (item.application.status) {
    case "APPLIED":
      return "SCREENING";
    case "SCREENING":
      return "SCHEDULE_INTERVIEW";
    case "INTERVIEW": {
      if (getScheduledInterview(item.interviews)) return "COMPLETE_INTERVIEW";
      return item.interviews.some(
        (interview) => interview.status === "COMPLETED",
      )
        ? "CREATE_OFFER"
        : "SCHEDULE_INTERVIEW";
    }
    case "OFFER":
      if (!item.offer) return "CREATE_OFFER";
      if (item.offer.status === "DRAFT") return "SEND_OFFER";
      if (item.offer.status === "SENT") return "ACCEPT_OFFER";
      if (item.offer.status === "ACCEPTED") return "ONBOARD";
      return null;
    default:
      return null;
  }
};
