import {
  apiFetch,
  apiFetchResponse,
  parseApiError,
} from "@/app/utils/api-client";
import { getErrorMessage } from "@/app/utils/error-messages";

const createResponse = (
  body: unknown,
  status: number,
  contentType = "application/json",
): Response => {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? contentType : null,
    },
    json: async () => body,
    text: async () => String(body),
  } as unknown as Response;
  Object.defineProperty(response, "clone", {
    value: () => createResponse(body, status, contentType),
  });
  return response;
};

describe("parseApiError", () => {
  it("returns a normalized JSON API error", async () => {
    const response = createResponse(
      { code: "VALIDATION_ERROR", message: "Invalid data" },
      422,
    );

    await expect(parseApiError(response)).resolves.toEqual({
      success: false,
      code: "VALIDATION_ERROR",
      message: "Invalid data",
    });
  });

  it("does not expose an unbounded non-JSON response", async () => {
    const response = createResponse("x".repeat(1_000), 500, "text/plain");
    const result = await parseApiError(response);

    expect(result.code).toBe("500");
    expect(result.message).toHaveLength(500);
  });

  it("returns a friendly message for an HTML response", async () => {
    const response = createResponse(
      "<html><h1>Not Found</h1></html>",
      404,
      "text/html",
    );

    await expect(parseApiError(response)).resolves.toEqual({
      success: false,
      code: "API_UNAVAILABLE",
      message:
        "The service is temporarily unavailable. Please try again later.",
    });
  });

  it("uses an actionable message when the API returns only an error code", async () => {
    const response = createResponse(
      { success: false, code: "PAYROLL_PERIOD_RULE_NOT_FOUND" },
      409,
    );

    await expect(parseApiError(response)).resolves.toMatchObject({
      code: "PAYROLL_PERIOD_RULE_NOT_FOUND",
      message: expect.stringContaining(
        "Payroll Configuration > General Settings",
      ),
    });
  });

  it("returns a friendly message for transport and JSON parse errors", () => {
    expect(getErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "The service is temporarily unavailable. Please try again later.",
    );
    expect(getErrorMessage(new SyntaxError("Unexpected token '<'"))).toBe(
      "The service is temporarily unavailable. Please try again later.",
    );
  });

  it("maps approval and supervisor failures to actionable instructions", () => {
    expect(
      getErrorMessage(
        {
          code: "ApprovalChainNotConfigured",
          message: "approval chain is not configured",
        },
        "code",
      ),
    ).toContain("active supervisor/manager");
    expect(
      getErrorMessage(
        {
          code: "SUPERVISOR_HIERARCHY_CYCLE",
          message: "invalid hierarchy",
        },
        "code",
      ),
    ).toContain("reporting loop");
  });
});

describe("apiFetch", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("throws a friendly error when an API request receives HTML", async () => {
    const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    const fetchMock = jest
      .fn()
      .mockResolvedValue(
        createResponse("<html><h1>Not Found</h1></html>", 404, "text/html"),
      );
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
      writable: true,
    });

    try {
      await expect(apiFetch("/api/auth/login")).rejects.toMatchObject({
        code: "API_UNAVAILABLE",
        message:
          "The service is temporarily unavailable. Please try again later.",
      });
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", originalFetch);
      } else {
        Reflect.deleteProperty(globalThis, "fetch");
      }
    }
  });

  it("retries legacy response callers during session rotation", async () => {
    const firstResponse = createResponse(
      {
        success: false,
        code: "SESSION_REFRESH_RETRY",
        message: "Session refresh is already in progress.",
      },
      401,
    );
    const successResponse = createResponse({ ok: true }, 200);
    const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(successResponse);
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
      writable: true,
    });

    try {
      const response = await apiFetchResponse("/api/request-leave", {
        method: "POST",
      });

      expect(response.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", originalFetch);
      } else {
        Reflect.deleteProperty(globalThis, "fetch");
      }
    }
  });

  it("retries once when another request is rotating the session", async () => {
    const firstResponse = createResponse(
      {
        success: false,
        code: "SESSION_REFRESH_RETRY",
        message: "Session refresh is already in progress.",
      },
      401,
    );
    const successResponse = createResponse({ ok: true }, 200);
    const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(successResponse);
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
      writable: true,
    });

    try {
      await expect(
        apiFetch<{ ok: boolean }>("/api/dashboard/admin"),
      ).resolves.toEqual({ ok: true });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    } finally {
      if (originalFetch) {
        Object.defineProperty(globalThis, "fetch", originalFetch);
      } else {
        Reflect.deleteProperty(globalThis, "fetch");
      }
    }
  });
});
