import type { ResponseTypeError } from "../types/response-type";

export const ERROR_MESSAGES: Record<string, string> = {
  API_UNAVAILABLE:
    "The service is temporarily unavailable. Please try again later.",
  DatabaseError: "There is a problem with the database connection",
  DATABASE_ERROR:
    "A server error occurred. Try again; contact an administrator if it persists.",
  PINAlreadyUsed: "Pin Already Used",
  PAYROLL_BATCH_ALREADY_EXISTS:
    "A payroll batch with this number already exists. Use a different batch number.",
  PAYROLL_BATCH_STATE_INVALID:
    "This payroll batch is not in a state that allows the requested action. Refresh the batch and try again.",
  PAYROLL_EMPLOYEE_NOT_FOUND:
    "No eligible employee with active salary history was found. Configure active salary data before validating the batch.",
  PAYROLL_EMPLOYEE_NOT_READY:
    "Complete the required payroll data before calculating the batch.",
  PAYROLL_INPUT_CHANGED_REVALIDATION_REQUIRED:
    "Payroll inputs changed. Validate the batch again before calculating it.",
  PAYROLL_MAKER_CHECKER_REQUIRED:
    "This payroll requires maker-checker approval. Complete validation before continuing.",
  PAYROLL_PERIOD_CUTOFF_MISMATCH:
    "The attendance cutoff does not match the selected payroll period rule. Refresh the period preview and try again.",
  PAYROLL_PERIOD_MISMATCH:
    "The payroll dates do not match the selected period rule. Refresh the period preview and try again.",
  PAYROLL_PERIOD_OVERLAP:
    "The payroll period overlaps another active payroll batch. Adjust the period or review the existing batch.",
  PAYROLL_PERIOD_RULE_NOT_EFFECTIVE:
    "No payroll period rule is effective for the selected payroll month. Add or update an effective rule in Payroll Configuration > General Settings.",
  PAYROLL_PERIOD_RULE_NOT_FOUND:
    "No applicable payroll period rule was found. Ensure the setting is active and monthly, then add an effective rule in Payroll Configuration > General Settings.",
  PAYROLL_PERIOD_RULE_REQUIRED:
    "An effective payroll period rule is required. Add one in Payroll Configuration > General Settings before continuing.",
  PAYROLL_PERIOD_RULE_SETTING_MISMATCH:
    "The selected period rule does not belong to this payroll setting. Refresh and select the correct setting.",
  PAYROLL_PERIOD_RULE_UNSUPPORTED_FREQUENCY:
    "Payroll processing is currently monthly-only. The selected Payroll Setting must use the Monthly processing cycle.",
  PAYROLL_REGULATION_NOT_AVAILABLE:
    "Select a published regulation package that is effective on the payroll date.",
  PAYROLL_REGULATION_SNAPSHOT_REQUIRED:
    "Select at least one regulation package before creating the payroll batch.",
  PAYROLL_REGULATION_SNAPSHOT_DUPLICATE:
    "Remove duplicate regulation packages before creating the payroll batch.",
  PAYROLL_PRORATION_METHOD_INVALID:
    "Select an active proration method from Payroll Configuration > Proration Method.",
  PAYROLL_PRORATION_METHOD_IN_USE:
    "This proration method is used by an active payroll setting and cannot be retired.",
  PAYROLL_PRORATION_METHOD_SYSTEM_MANAGED:
    "System proration methods cannot be deleted.",
  PAYROLL_PRORATION_METHOD_EXISTS:
    "A fixed-divisor proration method with this divisor already exists.",
  PAYROLL_PRORATION_SHIFT_RULE_REQUIRED:
    "Scheduled Working Days proration requires an active, complete employee shift rule for the full payroll period.",
  PAYROLL_PRORATION_SCHEDULE_REQUIRED:
    "Scheduled Working Days proration could not determine the employee schedule for this payroll period.",
  PAYROLL_PRORATION_PERIOD_INVALID:
    "The payroll period is invalid for proration calculation.",
};

const FALLBACK_ERROR_MESSAGE =
  "A system error has occurred, please contact the administrator";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTransportOrParseError = (err: unknown): boolean => {
  if (err instanceof SyntaxError) {
    return true;
  }

  return (
    err instanceof TypeError && /fetch|network|load failed/i.test(err.message)
  );
};

const getErrorDetails = (err: unknown): { code: string; message: string } => {
  if (err instanceof Error) {
    return { code: "", message: err.message };
  }
  if (!isRecord(err)) {
    return { code: "", message: "" };
  }
  return {
    code: typeof err.code === "string" ? err.code : "",
    message: typeof err.message === "string" ? err.message : "",
  };
};

export function getErrorMessage(
  err: unknown,
  source: "code" | "message" = "message",
): string {
  if (isTransportOrParseError(err)) {
    return ERROR_MESSAGES.API_UNAVAILABLE;
  }

  const { code, message } = getErrorDetails(err);
  const mappedMessage = code ? ERROR_MESSAGES[code] : undefined;

  if (source === "code") {
    return mappedMessage || message || FALLBACK_ERROR_MESSAGE;
  }

  if (
    message &&
    message !== "Request failed. Please try again." &&
    message !== FALLBACK_ERROR_MESSAGE
  ) {
    return message;
  }
  return mappedMessage || message || FALLBACK_ERROR_MESSAGE;
}

export function isResponseTypeError(obj: unknown): obj is ResponseTypeError {
  return (
    isRecord(obj) &&
    typeof obj.code === "string" &&
    typeof obj.message === "string"
  );
}
