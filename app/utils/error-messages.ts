import type { ResponseTypeError } from "../types/response-type";

export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CODE:
    "Code cannot contain whitespace. Use underscore (_) as a separator.",
  API_UNAVAILABLE:
    "The service is temporarily unavailable. Please try again later.",
  SESSION_REFRESH_RETRY:
    "Your session is being refreshed. Please retry the request.",
  APPROVAL_CHAIN_NOT_CONFIGURED:
    "The approval chain is incomplete. Assign an active supervisor/manager with an active Employee and Approver account for every required level, or reduce the required approval steps.",
  ApprovalChainNotConfigured:
    "The approval chain is incomplete. Assign an active supervisor/manager with an active Employee and Approver account for every required level, or reduce the required approval steps.",
  WORKFLOW_NOT_FOUND:
    "No active approval workflow is configured for this request type. Ask an administrator to activate it in Approval Settings.",
  INVALID_STATUS:
    "This approval is no longer pending or was changed by another user. Refresh the inbox and review its latest status.",
  InvalidStatus:
    "This request is no longer in a state that allows this action. Refresh and review its latest status.",
  REQUEST_NOT_FOUND:
    "This approval request no longer exists. Refresh the inbox to remove the outdated item.",
  STEP_NOT_FOUND:
    "This approval step is no longer active. Refresh the inbox and review the latest approval step.",
  PERMISSION_DENIED:
    "You are not the active approver for this request, or your approval permission has changed. Refresh the inbox; contact an administrator if this is unexpected.",
  PermissionDenied:
    "You do not have permission to perform this action. Contact an administrator if this is unexpected.",
  VALIDATION_ERROR:
    "The approval action could not be validated. Review the request and note, refresh the latest data, then try again.",
  ValidationError:
    "Some submitted data is invalid. Review the highlighted fields and try again.",
  APPROVAL_NOTE_TOO_LONG:
    "The approval note is too long. Shorten it to 1,000 characters or fewer.",
  REJECTION_REASON_REQUIRED:
    "Enter a rejection reason so the requester knows what must be corrected.",
  APPROVAL_WORKFLOW_NAME_REQUIRED: "Enter a workflow name.",
  APPROVAL_WORKFLOW_NAME_TOO_LONG:
    "The workflow name is too long. Shorten it to 100 characters or fewer.",
  APPROVAL_REQUIRED_STEPS_INVALID:
    "Required approval steps must be a whole number from 0 to 10.",
  PreconditionFailed:
    "This data changed while you were editing it. Refresh the latest data and try again.",
  SUPERVISOR_SELF_REFERENCE:
    "An employee cannot be their own supervisor. Select another eligible approver.",
  SupervisorSelfReference:
    "An employee cannot be their own supervisor. Select another eligible approver.",
  SUPERVISOR_NOT_ELIGIBLE:
    "The selected supervisor is inactive or does not have an active user account with both Employee and Approver roles. Update the account or select another supervisor.",
  SupervisorNotEligible:
    "The selected supervisor is inactive or does not have an active user account with both Employee and Approver roles. Update the account or select another supervisor.",
  SUPERVISOR_HIERARCHY_CYCLE:
    "This supervisor assignment would create a reporting loop. Review the supervisor hierarchy and select a manager outside the employee's reporting chain.",
  SupervisorHierarchyCycle:
    "This supervisor assignment would create a reporting loop. Review the supervisor hierarchy and select a manager outside the employee's reporting chain.",
  EmploymentChangeRequired:
    "Employment assignments must be changed through Employee Lifecycle > Employment Change so the change can be reviewed and approved.",
  DatabaseError:
    "A server error occurred. Try again; contact an administrator if it persists.",
  DATABASE_ERROR:
    "A server error occurred. Try again; contact an administrator if it persists.",
  SCHEDULE_CHANGE_INVALID_REQUEST:
    "The schedule change request is invalid. Review the selected employees, Shift Rule, and effective dates, then try again.",
  SCHEDULE_CHANGE_NOT_FOUND:
    "The selected employee or Shift Rule is no longer available. Refresh the data and select an active record.",
  SCHEDULE_CHANGE_INVALID_CONFIGURATION:
    "The schedule configuration is invalid. Review Settings > Shift, Settings > Shift Rule, or Settings > Employee Schedule > Rules, then try again.",
  SCHEDULE_CHANGE_DATA_INTEGRITY:
    "The schedule configuration contains an internal data error. Contact your system administrator.",
  SCHEDULE_CHANGE_CONFLICT:
    "The schedule change has conflicts. Review the preview and resolve the listed attendance, payroll, or protected-schedule conflicts.",
  SCHEDULE_CHANGE_DATABASE_ERROR:
    "The schedule change could not be completed because of a system error. Try again; contact an administrator if it persists.",
  SCHEDULE_CHANGE_ATTENDANCE_PROCESS_ERROR:
    "The schedule change was not completed because attendance reprocessing failed. Try again; contact an administrator if it persists.",
  PINAlreadyUsed: "Pin Already Used",
  PAYROLL_BATCH_ALREADY_EXISTS:
    "A payroll batch with this number already exists. Use a different batch number.",
  PAYROLL_BATCH_STATE_INVALID:
    "This payroll batch is not in a state that allows the requested action. Refresh the batch and try again.",
  PAYROLL_EMPLOYEE_NOT_FOUND:
    "No eligible employee with active salary history was found. Configure active salary data before validating the batch.",
  PAYROLL_EMPLOYEE_NOT_READY:
    "Complete the required payroll data before calculating the batch.",
  PAYROLL_ADJUSTMENT_BATCH_NOT_READY:
    "Adjustments can only be created while the payroll batch is READY.",
  PAYROLL_ADJUSTMENT_COMPONENT_TYPE_INVALID:
    "Only Earning and Deduction adjustments are supported.",
  PAYROLL_ADJUSTMENT_AMOUNT_REASON_REQUIRED:
    "Adjustment amount and reason are required.",
  PAYROLL_ADJUSTMENT_TARGET_NOT_READY:
    "The selected employee is not ready in this payroll batch. Validate the batch again.",
  PAYROLL_ADJUSTMENT_COMPONENT_MAPPING_INVALID:
    "The selected adjustment component is no longer active or does not match its type.",
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
  REGULATION_VERSION_EXISTS:
    "This regulation version already exists. Use a new version label.",
  REGULATION_NOT_DRAFT:
    "Only a draft regulation package can be changed. Refresh the package list.",
  REGULATION_TEST_COVERAGE_REQUIRED:
    "Add at least one parameter or rate table and one active test case before marking the package tested.",
  REGULATION_TEST_EXECUTION_REQUIRED:
    "Run the tests again after the regulation changed; all active tests must pass.",
  INVALID_RATE_BRACKET:
    "The rate bracket contains an invalid range, rate, or amount.",
  INVALID_RATE_BRACKET_TABLE:
    "The rate table must start at 0, use consecutive sequences, and have no gaps or overlaps.",
  INVALID_STATE_OR_VERSION:
    "The regulation changed while you were editing it. Refresh and try again.",
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
  PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE:
    "Data rekening bank karyawan belum lengkap. Pastikan seluruh karyawan yang menerima gaji telah memiliki rekening bank aktif di menu Data Karyawan sebelum membuat batch pembayaran.",
  PAYROLL_PAYMENT_ENCRYPTION_UNAVAILABLE:
    "Kunci enkripsi pembayaran payroll tidak tersedia. Hubungi administrator sistem.",
  PAYROLL_PAYMENT_BATCH_ALREADY_EXISTS:
    "Nomor batch pembayaran sudah terdaftar. Gunakan nomor batch pembayaran yang berbeda.",
  PAYROLL_PAYMENT_BATCH_STATE_INVALID:
    "Status batch pembayaran tidak valid untuk aksi ini. Segarkan halaman dan coba lagi.",
  PAYROLL_PAYMENT_SETTLEMENT_REQUIRED:
    "Tidak ada karyawan dengan gaji bersih lebih dari 0 untuk dibuatkan batch pembayaran.",
  PAYROLL_PAYMENT_SETTLEMENT_INVALID:
    "Referensi transfer bank belum lengkap. Pastikan nomor referensi telah terisi sebelum konfirmasi settlement.",
  PAYROLL_PAYMENT_NOT_SETTLED: "Batch pembayaran belum diselesaikan.",
  PAYROLL_PAYMENT_BATCH_NUMBER_REQUIRED: "Nomor batch pembayaran wajib diisi.",
};

const FALLBACK_ERROR_MESSAGE =
  "A system error has occurred, please contact the administrator";

const DB_ERROR_PATTERNS = [
  /database error/i,
  /sqlx/i,
  /syntax error at or near/i,
  /violates.*constraint/i,
  /relation.*does not exist/i,
  /null value in column/i,
  /column.*does not exist/i,
  /duplicate key value violates unique constraint/i,
  /foreign key constraint/i,
  /check constraint/i,
  /pgdatabaseerror/i,
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export function isDatabaseError(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "string") {
    return DB_ERROR_PATTERNS.some((pattern) => pattern.test(err));
  }
  if (err instanceof Error) {
    return DB_ERROR_PATTERNS.some((pattern) => pattern.test(err.message));
  }
  if (isRecord(err)) {
    const code = String(err.code ?? "");
    const msg = String(err.message ?? err.error ?? "");
    return (
      code === "DatabaseError" ||
      code === "DATABASE_ERROR" ||
      DB_ERROR_PATTERNS.some(
        (pattern) => pattern.test(code) || pattern.test(msg),
      )
    );
  }
  return false;
}

const isTransportOrParseError = (err: unknown): boolean => {
  if (err instanceof SyntaxError) {
    return true;
  }

  return (
    err instanceof TypeError && /fetch|network|load failed/i.test(err.message)
  );
};

const extractArrayErrorMessage = (errors: unknown): string => {
  if (!Array.isArray(errors) || errors.length === 0) return "";
  const first = errors[0];
  if (typeof first === "string") return first;
  if (isRecord(first) && typeof first.message === "string")
    return first.message;
  return "";
};

const getErrorDetails = (err: unknown): { code: string; message: string } => {
  if (err instanceof Error) {
    return { code: "", message: err.message };
  }
  if (!isRecord(err)) {
    return { code: "", message: "" };
  }
  const code =
    typeof err.code === "string"
      ? err.code
      : typeof err.status === "number"
        ? String(err.status)
        : "";
  const rawMsg =
    err.message ?? err.error ?? extractArrayErrorMessage(err.errors);
  const message = typeof rawMsg === "string" ? rawMsg : "";
  return {
    code,
    message,
  };
};

export function getErrorMessage(
  err: unknown,
  source: "code" | "message" = "message",
): string {
  if (isTransportOrParseError(err)) {
    return ERROR_MESSAGES.API_UNAVAILABLE;
  }

  if (isDatabaseError(err)) {
    return ERROR_MESSAGES.DATABASE_ERROR;
  }

  const { code, message } = getErrorDetails(err);
  if (code.startsWith("PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE::")) {
    const details = code
      .slice("PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE::".length)
      .trim();
    return `Data rekening bank belum lengkap untuk karyawan: ${details}. Silakan lengkapi data rekening bank aktif di menu Data Karyawan sebelum membuat batch pembayaran.`;
  }
  const mappedMessage = code ? ERROR_MESSAGES[code] : undefined;

  if (source === "code") {
    return mappedMessage || message || FALLBACK_ERROR_MESSAGE;
  }

  if (
    message &&
    message !== "Request failed. Please try again." &&
    message !== FALLBACK_ERROR_MESSAGE
  ) {
    if (message.startsWith("PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE::")) {
      const details = message
        .slice("PAYROLL_PAYMENT_SNAPSHOT_UNAVAILABLE::".length)
        .trim();
      return `Data rekening bank belum lengkap untuk karyawan: ${details}. Silakan lengkapi data rekening bank aktif di menu Data Karyawan sebelum membuat batch pembayaran.`;
    }
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
