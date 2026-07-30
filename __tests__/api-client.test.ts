import { parseApiError } from "@/app/utils/api-client";

const createResponse = (
  body: unknown,
  status: number,
  contentType = "application/json",
) =>
  ({
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? contentType : null,
    },
    json: async () => body,
    text: async () => String(body),
  }) as unknown as Response;

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
});
