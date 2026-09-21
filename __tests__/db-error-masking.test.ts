import {
  isDatabaseError,
  getErrorMessage,
  ERROR_MESSAGES,
} from "@/app/utils/error-messages";

describe("Database Error Masking & Detection", () => {
  it("detects PostgreSQL / SQLx constraint violation errors", () => {
    expect(
      isDatabaseError(
        'null value in column "gender_id" of relation "employees" violates not-null constraint',
      ),
    ).toBe(true);
    expect(
      isDatabaseError(
        new Error(
          'duplicate key value violates unique constraint "employees_code_key"',
        ),
      ),
    ).toBe(true);
    expect(
      isDatabaseError({
        code: "DatabaseError",
        message: 'relation "salary_settings" does not exist',
      }),
    ).toBe(true);
    expect(
      isDatabaseError({
        code: "500",
        message: 'syntax error at or near "SELECT"',
      }),
    ).toBe(true);
  });

  it("does not flag regular business or validation errors as database errors", () => {
    expect(
      isDatabaseError({ code: "INVALID_CODE", message: "Invalid code format" }),
    ).toBe(false);
    expect(isDatabaseError(new Error("Enter a workflow name."))).toBe(false);
    expect(isDatabaseError(null)).toBe(false);
    expect(isDatabaseError(undefined)).toBe(false);
    expect(isDatabaseError("")).toBe(false);
  });

  it("masks database errors in getErrorMessage with a safe localized message", () => {
    const rawError = {
      code: "DatabaseError",
      message: 'violates foreign key constraint "fk_employee_department"',
    };

    const maskedMessage = getErrorMessage(rawError, "message");
    expect(maskedMessage).toBe(ERROR_MESSAGES.DATABASE_ERROR);
    expect(maskedMessage).not.toContain("fk_employee_department");
    expect(maskedMessage).not.toContain("foreign key");
  });

  it("allows non-database domain messages to pass through", () => {
    const domainError = {
      code: "INVALID_CODE",
      message: "Code cannot contain whitespace.",
    };

    expect(getErrorMessage(domainError, "message")).toBe(
      "Code cannot contain whitespace.",
    );
  });
});
