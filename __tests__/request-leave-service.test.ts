import {
  getRequestLeaveOptions,
  previewRequestLeaveDays,
} from "@/app/services/request-leave-service";

const createResponse = (body: unknown, ok = true) =>
  ({
    ok,
    status: ok ? 200 : 400,
    headers: {
      get: () => "application/json",
    },
    json: async () => body,
    text: async () => JSON.stringify(body),
  }) as unknown as Response;

describe("request leave service", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("loads leave types and employee balances from the options endpoint", async () => {
    const options = {
      leave_types: [
        {
          id: 1,
          code: "ANNUAL",
          name: "Annual Leave",
          is_paid: true,
          is_deductible: true,
          max_days: 12,
          requires_attachment: false,
          requires_reason: false,
          requires_approval: true,
        },
      ],
      balances: [],
    };

    jest.mocked(global.fetch).mockResolvedValueOnce(createResponse(options));

    await expect(getRequestLeaveOptions()).resolves.toEqual(options);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/request-leave/options",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );
  });

  it("uses the backend holiday-aware preview instead of a local day count", async () => {
    const preview = {
      start_date: "2026-08-10",
      end_date: "2026-08-14",
      calendar_days: 5,
      weekend_days: 0,
      holiday_days: 1,
      total_days: 4,
    };

    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(createResponse({ success: true, data: preview }));

    await expect(
      previewRequestLeaveDays(new Date("2026-08-10"), new Date("2026-08-14")),
    ).resolves.toEqual(preview);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/request-leave/preview-days",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({
          start_date: "2026-08-10",
          end_date: "2026-08-14",
        }),
      }),
    );
  });
});
