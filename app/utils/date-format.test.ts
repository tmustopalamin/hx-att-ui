import {
  formatCompactDate,
  formatDate,
  formatDateTime,
  formatDateTimeWithSeconds,
  formatMonth,
  formatRelativeNotificationTime,
  formatWeekday,
  formatWeekdayDate,
} from "@/app/utils/date-format";

describe("date display formatters", () => {
  const date = "2026-08-18";

  it("formats dates with Indonesian full month names", () => {
    expect(formatDate(date)).toBe("18 Agustus 2026");
    expect(formatWeekdayDate(date)).toBe("Selasa, 18 Agustus 2026");
    expect(formatWeekday(date)).toBe("Selasa");
    expect(formatCompactDate(date)).toBe("18 Agu");
    expect(formatMonth(date)).toBe("Agustus 2026");
  });

  it("formats date and datetime values without changing API input formats", () => {
    const value = "2026-08-18T14:30:45";

    expect(formatDateTime(value)).toBe("18 Agustus 2026 14:30");
    expect(formatDateTimeWithSeconds(value)).toBe("18 Agustus 2026 14:30:45");
  });

  it("returns a safe fallback for invalid values", () => {
    expect(formatDate("not-a-date")).toBe("-");
    expect(formatDate(null, "Tidak tersedia")).toBe("Tidak tersedia");
  });

  it("formats notification times relative to the supplied current time", () => {
    const now = "2026-08-18T14:35:00";

    expect(formatRelativeNotificationTime("2026-08-18T14:35:00", now)).toBe(
      "Baru saja",
    );
    expect(formatRelativeNotificationTime("2026-08-18T14:30:00", now)).toBe(
      "5 menit lalu",
    );
    expect(formatRelativeNotificationTime("2026-08-01T14:35:00", now)).toBe(
      "01 Agustus 2026",
    );
  });
});
