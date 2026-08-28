import {
  buildRecruitmentPipeline,
  getPipelineItemsForFilter,
  getPipelinePrimaryAction,
  getScheduledInterview,
} from "./recruitment-pipeline";
import type {
  RecruitmentApplication,
  RecruitmentCandidate,
  RecruitmentInterview,
  RecruitmentOffer,
} from "@/app/types/recruitment";

const application = (
  overrides: Partial<RecruitmentApplication> = {},
): RecruitmentApplication => ({
  id: 1,
  job_requisition_id: 10,
  requisition_code: "REQ-10",
  job_title: "Software Engineer",
  candidate_id: 100,
  candidate_name: "Candidate One",
  status: "APPLIED",
  applied_at: "2026-08-28T09:00:00.000Z",
  row_version: 1,
  ...overrides,
});

const candidate: RecruitmentCandidate = {
  id: 100,
  full_name: "Candidate One",
  email: "one@example.com",
  phone_number: null,
  source: "Referral",
  resume_original_file_name: "one.pdf",
  resume_mime_type: "application/pdf",
  status: "ACTIVE",
  row_version: 1,
};

const interview = (
  overrides: Partial<RecruitmentInterview> = {},
): RecruitmentInterview => ({
  id: 20,
  application_id: 1,
  candidate_name: "Candidate One",
  job_title: "Software Engineer",
  interview_type: "HR",
  scheduled_at: "2026-08-30T09:00:00.000Z",
  interviewer_employee_id: 5,
  interviewer_name: "Recruiter",
  status: "SCHEDULED",
  score: null,
  feedback: null,
  row_version: 1,
  ...overrides,
});

const offer = (
  overrides: Partial<RecruitmentOffer> = {},
): RecruitmentOffer => ({
  id: 30,
  application_id: 1,
  candidate_id: 100,
  candidate_name: "Candidate One",
  candidate_email: "one@example.com",
  candidate_phone_number: null,
  job_title: "Software Engineer",
  offered_salary: "10000000",
  proposed_start_date: "2026-09-15",
  expires_at: null,
  status: "DRAFT",
  notes: null,
  row_version: 1,
  linked_employee_id: null,
  lifecycle_case_id: null,
  onboarding_status: null,
  ...overrides,
});

describe("recruitment pipeline helpers", () => {
  it("joins application data and filters by requisition", () => {
    const items = buildRecruitmentPipeline(
      [
        application(),
        application({
          id: 2,
          job_requisition_id: 11,
          candidate_id: 101,
          candidate_name: "Candidate Two",
        }),
      ],
      [candidate],
      [interview()],
      [offer()],
      10,
    );

    expect(items).toHaveLength(1);
    expect(items[0].candidate).toEqual(candidate);
    expect(items[0].interviews).toHaveLength(1);
    expect(items[0].offer).toEqual(offer());
  });

  it("separates active and completed application stages", () => {
    const items = buildRecruitmentPipeline(
      [
        application(),
        application({ id: 2, status: "HIRED" }),
        application({ id: 3, status: "REJECTED" }),
      ],
      [candidate],
      [],
      [],
      10,
    );

    expect(getPipelineItemsForFilter(items, "ACTIVE")).toHaveLength(1);
    expect(getPipelineItemsForFilter(items, "COMPLETED")).toHaveLength(2);
  });

  it.each([
    ["APPLIED", undefined, undefined, "SCREENING"],
    ["SCREENING", undefined, undefined, "SCHEDULE_INTERVIEW"],
    ["INTERVIEW", [interview()], undefined, "COMPLETE_INTERVIEW"],
    [
      "INTERVIEW",
      [interview({ status: "COMPLETED" })],
      undefined,
      "CREATE_OFFER",
    ],
    ["OFFER", undefined, offer({ status: "DRAFT" }), "SEND_OFFER"],
    ["OFFER", undefined, offer({ status: "SENT" }), "ACCEPT_OFFER"],
    ["OFFER", undefined, offer({ status: "ACCEPTED" }), "ONBOARD"],
  ])(
    "selects the next action for %s",
    (status, interviews, itemOffer, expected) => {
      const item = buildRecruitmentPipeline(
        [application({ status: status as RecruitmentApplication["status"] })],
        [candidate],
        (interviews as RecruitmentInterview[] | undefined) ?? [],
        itemOffer ? [itemOffer as RecruitmentOffer] : [],
        10,
      )[0];

      expect(getPipelinePrimaryAction(item)).toBe(expected);
    },
  );

  it("returns the earliest scheduled interview", () => {
    const interviews = [
      interview({ id: 21, scheduled_at: "2026-09-01T09:00:00.000Z" }),
      interview({ id: 20, scheduled_at: "2026-08-30T09:00:00.000Z" }),
    ];

    expect(getScheduledInterview(interviews)?.id).toBe(20);
  });
});
