import { formatApiDate, formatApiDateTime } from "@/app/utils/date-format";

describe("formatApiDate & formatApiDateTime", () => {
  it("formats valid dates safely to YYYY-MM-DD", () => {
    const date = new Date(2026, 4, 15); // May 15, 2026
    expect(formatApiDate(date)).toBe("2026-05-15");
    expect(formatApiDate("2026-09-20")).toBe("2026-09-20");
  });

  it("returns null instead of 'Invalid Date' for null, undefined, or invalid input", () => {
    expect(formatApiDate(null)).toBeNull();
    expect(formatApiDate(undefined)).toBeNull();
    expect(formatApiDate("not-a-date")).toBeNull();
    expect(formatApiDate(new Date("invalid-date-string"))).toBeNull();
  });

  it("formats valid date-time values safely", () => {
    const date = new Date(2026, 8, 20, 14, 30, 45);
    const result = formatApiDateTime(date);
    expect(result).toBe("2026-09-20 14:30:45");
  });

  it("returns null for invalid date-time input", () => {
    expect(formatApiDateTime(null)).toBeNull();
    expect(formatApiDateTime("invalid")).toBeNull();
  });
});
