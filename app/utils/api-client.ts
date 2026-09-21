import type { ResponseTypeError } from "@/app/types/response-type";
import {
  ERROR_MESSAGES,
  getErrorMessage,
  isDatabaseError,
} from "./error-messages";

const DEFAULT_ERROR_MESSAGE = "Request failed. Please try again.";
const MAX_ERROR_MESSAGE_LENGTH = 500;
const HTML_RESPONSE_PATTERN = /<\s*(?:!doctype\s+html|html|head|body)\b/i;
const SESSION_REFRESH_RETRY_CODE = "SESSION_REFRESH_RETRY";
const SESSION_REFRESH_RETRY_DELAY_MS = 100;
const SESSION_REFRESH_RETRY_LIMIT = 2;

let authRedirectInFlight = false;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeMessage = (value: unknown): string => {
  if (typeof value !== "string") {
    return DEFAULT_ERROR_MESSAGE;
  }

  const message = value.trim();
  return message
    ? message.slice(0, MAX_ERROR_MESSAGE_LENGTH)
    : DEFAULT_ERROR_MESSAGE;
};

const requestPath = (input: RequestInfo | URL): string => {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.pathname;
  return input.url;
};

const isPublicAuthRequest = (input: RequestInfo | URL): boolean => {
  const path = requestPath(input).split("?", 1)[0];
  return [
    "/api/auth/login",
    "/api/auth/forgot-password",
    "/api/auth/verify-otp",
    "/api/auth/reset-password",
  ].includes(path);
};

export const redirectToLogin = () => {
  if (
    typeof window === "undefined" ||
    window.location.pathname === "/login" ||
    authRedirectInFlight
  ) {
    return;
  }

  authRedirectInFlight = true;
  window.location.replace("/login?reason=session-expired");
};

export const isUnauthorizedError = (error: unknown): boolean => {
  if (!isRecord(error)) return false;

  return (
    error.status === 401 ||
    error.code === "401" ||
    error.code === "UNAUTHORIZED" ||
    error.code === "SESSION_EXPIRED"
  );
};

const isRefreshRetryResponse = async (response: Response): Promise<boolean> => {
  if (response.status !== 401) return false;

  try {
    const payload = (await response.clone().json()) as unknown;
    return isRecord(payload) && payload.code === SESSION_REFRESH_RETRY_CODE;
  } catch {
    return false;
  }
};

const waitForSessionRetry = () =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, SESSION_REFRESH_RETRY_DELAY_MS);
  });

const fetchWithSessionRetry = async (
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> => {
  const requestInput = () =>
    typeof Request !== "undefined" && input instanceof Request
      ? input.clone()
      : input;

  const response = await fetch(requestInput(), {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });

  let retryCount = 0;
  let nextResponse = response;
  while (
    retryCount < SESSION_REFRESH_RETRY_LIMIT &&
    (await isRefreshRetryResponse(nextResponse))
  ) {
    retryCount += 1;
    await waitForSessionRetry();
    nextResponse = await fetch(requestInput(), {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
  }

  return nextResponse;
};

/**
 * Response-level API client for legacy callers that still parse the response
 * themselves. It preserves the native Response contract while sharing the
 * session-refresh retry and terminal-session redirect behavior with apiFetch.
 */
export async function apiFetchResponse(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetchWithSessionRetry(input, init);

  if (response.status === 401 && !isPublicAuthRequest(input)) {
    redirectToLogin();
  }

  return response;
}

export async function parseApiError(
  response: Response,
): Promise<ResponseTypeError> {
  let payload: unknown;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  try {
    payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    payload = null;
  }

  const data = isRecord(payload) ? payload : {};
  const isHtmlResponse =
    contentType.includes("text/html") ||
    (typeof payload === "string" && HTML_RESPONSE_PATTERN.test(payload));

  if (isDatabaseError(payload) || isDatabaseError(data)) {
    return {
      success: false,
      code: "DATABASE_ERROR",
      message: ERROR_MESSAGES.DATABASE_ERROR,
    };
  }

  const code = isHtmlResponse
    ? "API_UNAVAILABLE"
    : typeof data.code === "string" && data.code.trim()
      ? data.code
      : String(response.status);
  const message = isHtmlResponse
    ? getErrorMessage({ code }, "code")
    : normalizeMessage(data.message ?? payload);

  return {
    success: false,
    code,
    message:
      message === DEFAULT_ERROR_MESSAGE
        ? getErrorMessage({ code, message }, "code")
        : message,
  };
}

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const response = await apiFetchResponse(input, init);

  if (!response.ok) {
    const error = await parseApiError(response);
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch {
    return undefined as T;
  }
}
