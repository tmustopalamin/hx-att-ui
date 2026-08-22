import { updateAttendanceSubmissionPolicy } from "@/app/services/attendance-settings-service";
import type { UpdateAttendanceSubmissionPolicy } from "@/app/types/attendance-settings";

const createResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: {
      get: () => "application/json",
    },
    json: async () => body,
  }) as unknown as Response;

describe("attendance settings service", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("sends independent GPS accuracy enforcement flags per channel", async () => {
    const policy: UpdateAttendanceSubmissionPolicy = {
      common: {
        require_photo: true,
        require_location: true,
        max_photo_bytes: 5 * 1_048_576,
        max_event_age_seconds: 300,
        min_submission_interval_seconds: 60,
        geofence_latitude: null,
        geofence_longitude: null,
        geofence_radius_meters: null,
      },
      web: {
        enabled: true,
        enforce_gps_accuracy: false,
        max_gps_accuracy_meters: 100,
      },
      android: {
        enabled: true,
        enforce_gps_accuracy: true,
        max_gps_accuracy_meters: 100,
        integrity_enabled: false,
        allow_unlicensed: true,
      },
    };

    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(createResponse({ success: true, data: policy }));

    await updateAttendanceSubmissionPolicy(policy, 7);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/attendance-settings/submission-policy",
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
        headers: expect.objectContaining({ "If-Match": "7" }),
        body: JSON.stringify(policy),
      }),
    );
  });
});
