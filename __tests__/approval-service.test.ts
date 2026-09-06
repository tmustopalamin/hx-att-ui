import {
  approveApprovalRequest,
  rejectApprovalRequest,
  updateApprovalWorkflowSetting,
} from "@/app/services/approval-service";

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

describe("approval service", () => {
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const fetchMock = jest.fn<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >();

  beforeEach(() => {
    fetchMock.mockReset();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchMock,
      writable: true,
    });
  });

  afterAll(() => {
    if (originalFetch) {
      Object.defineProperty(globalThis, "fetch", originalFetch);
    } else {
      Reflect.deleteProperty(globalThis, "fetch");
    }
  });

  it("approves with optimistic locking and a normalized optional note", async () => {
    fetchMock.mockResolvedValue(
      createResponse({ success: true, message: "Approved" }, 200),
    );

    await approveApprovalRequest(25, 7, "  reviewed  ");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/approval/25/approve",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({ "If-Match": "7" }),
        body: JSON.stringify({ note: "reviewed" }),
      }),
    );
  });

  it("requires a valid request and row version before sending an action", async () => {
    await expect(rejectApprovalRequest(25, 0, "reason")).rejects.toThrow(
      "Approval version is missing or invalid. Refresh and try again.",
    );
    await expect(approveApprovalRequest(Number.NaN, 1)).rejects.toThrow(
      "Approval request is missing or invalid. Refresh and try again.",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes an HTML error instead of exposing the response body", async () => {
    fetchMock.mockResolvedValue(
      createResponse("<html>proxy error</html>", 502, "text/html"),
    );

    await expect(approveApprovalRequest(25, 7)).rejects.toMatchObject({
      code: "API_UNAVAILABLE",
      message:
        "The service is temporarily unavailable. Please try again later.",
    });
  });

  it("updates only mutable workflow fields with optimistic locking", async () => {
    fetchMock.mockResolvedValue(
      createResponse({ success: true, message: "Updated" }, 200),
    );

    await updateApprovalWorkflowSetting(3, 4, {
      id: 999,
      name: "  Leave approval  ",
      required_steps: 2,
      is_active: true,
      row_version: 999,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/approval/workflow-settings/3",
      expect.objectContaining({
        method: "PUT",
        credentials: "include",
        headers: expect.objectContaining({ "If-Match": "4" }),
        body: JSON.stringify({
          name: "Leave approval",
          required_steps: 2,
          is_active: true,
        }),
      }),
    );
  });
});
