import { routeTranslationKeys } from "@/app/i18n/routes";
import { formatReportTimestamp } from "@/app/(admin)/reports/_components/report-export-utils";

describe("Reports Navigation and Utilities", () => {
  it("maps report route segments to navigation translation keys", () => {
    expect(routeTranslationKeys["reports"]).toBe("nav.reports");
    expect(routeTranslationKeys["report"]).toBe("nav.reports");
  });

  it("generates a valid formatted timestamp for report exports", () => {
    const timestamp = formatReportTimestamp();
    expect(timestamp).toMatch(/^\d{8}_\d{6}$/);
  });
});
