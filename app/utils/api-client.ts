import type { ResponseTypeError } from "@/app/types/response-type";

const DEFAULT_ERROR_MESSAGE = "Request failed. Please try again.";
const MAX_ERROR_MESSAGE_LENGTH = 500;

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

export async function parseApiError(
  response: Response,
): Promise<ResponseTypeError> {
  let payload: unknown;

  try {
    payload = response.headers.get("content-type")?.includes("application/json")
      ? await response.json()
      : await response.text();
  } catch {
    payload = null;
  }

  const data = isRecord(payload) ? payload : {};

  return {
    success: false,
    code:
      typeof data.code === "string" && data.code.trim()
        ? data.code
        : String(response.status),
    message: normalizeMessage(data.message ?? payload),
  };
}

export async function apiFetch<T>(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
