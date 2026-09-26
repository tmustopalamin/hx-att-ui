import { getErrorMessage, ERROR_MESSAGES } from "./error-messages";

describe("getErrorMessage", () => {
  it("preserves detailed proration error message from API response", () => {
    const apiError = {
      code: "PAYROLL_PRORATION_SHIFT_RULE_REQUIRED",
      message:
        "Scheduled Working Days proration requires an active, complete employee shift rule for Aditya Dava Samsudin (10251) covering the full payroll period (shift rule missing coverage on 2026-08-16).",
    };

    expect(getErrorMessage(apiError)).toBe(
      "Scheduled Working Days proration requires an active, complete employee shift rule for Aditya Dava Samsudin (10251) covering the full payroll period (shift rule missing coverage on 2026-08-16).",
    );
  });

  it("preserves Indonesian proration error message from API response", () => {
    const apiError = {
      code: "PAYROLL_PRORATION_SHIFT_RULE_REQUIRED",
      message:
        "Prorasi Hari Kerja Terjadwal memerlukan shift rule lengkap untuk Aditya Dava Samsudin (10251) selama periode payroll penuh (jadwal shift belum mencakup tanggal 2026-08-16).",
    };

    expect(getErrorMessage(apiError)).toBe(
      "Prorasi Hari Kerja Terjadwal memerlukan shift rule lengkap untuk Aditya Dava Samsudin (10251) selama periode payroll penuh (jadwal shift belum mencakup tanggal 2026-08-16).",
    );
  });

  it("falls back to ERROR_MESSAGES when message is generic or empty", () => {
    const apiError = {
      code: "PAYROLL_PRORATION_SHIFT_RULE_REQUIRED",
      message: "",
    };

    expect(getErrorMessage(apiError)).toBe(
      ERROR_MESSAGES.PAYROLL_PRORATION_SHIFT_RULE_REQUIRED,
    );
  });

  it("formats PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE with employee details", () => {
    const apiError = {
      code: "PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE::Aditya Dava Samsudin (10251)",
      message: "",
    };

    expect(getErrorMessage(apiError)).toBe(
      "Data rekening bank belum lengkap untuk karyawan: Aditya Dava Samsudin (10251). Silakan lengkapi data rekening bank aktif di menu Data Karyawan sebelum membuat batch pembayaran.",
    );
  });

  it("falls back to default Indonesian message for standard PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE", () => {
    const apiError = {
      code: "PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE",
      message: "",
    };

    expect(getErrorMessage(apiError)).toBe(
      ERROR_MESSAGES.PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE,
    );
  });
});
