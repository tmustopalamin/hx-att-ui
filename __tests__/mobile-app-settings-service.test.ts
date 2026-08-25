import {
  getMobileAppSettings,
  updateMobileAppSettings,
} from "@/app/services/mobile-app-settings-service";

const createResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: {
      get: () => "application/json",
    },
    json: async () => body,
  }) as unknown as Response;

describe("mobile app settings service", () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it("loads the authenticated mobile app configuration", async () => {
    const settings = {
      id: 1,
      label: "Download Hexing HRIS Mobile",
      target_url: "https://play.google.com/store/apps/details?id=example",
      action: "link",
      is_enabled: true,
      row_version: 1,
      updated_at: "2026-08-25T00:00:00Z",
      updated_by: null,
    };

    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(createResponse({ success: true, data: settings }));

    await expect(getMobileAppSettings()).resolves.toEqual(settings);
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/mobile-app-settings",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("sends the row version when an administrator updates the link", async () => {
    const input = {
      label: "Download Hexing HRIS Mobile",
      target_url: "https://example.com/hexing-hris.apk",
      action: "download" as const,
      is_enabled: true,
    };

    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(createResponse({ success: true, data: input }));

    await updateMobileAppSettings(7, input);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/mobile-app-settings",
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
        headers: expect.objectContaining({ "If-Match": "7" }),
        body: JSON.stringify(input),
      }),
    );
  });
});
