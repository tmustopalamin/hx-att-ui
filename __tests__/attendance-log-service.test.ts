import {
  getAttendanceLogSyncOptions,
  syncAttendanceLogSelected,
} from "@/app/services/attendance-log-service";

const createResponse = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => "application/json",
    },
    json: async () => body,
  }) as unknown as Response;

describe("attendance log sync service", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, "fetch");
  });

  it("loads active fingerprint device options", async () => {
    const fetchMock = jest.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      createResponse({
        success: true,
        data: [{ id: 7, code: "MAIN", name: "Main scanner" }],
      }),
    );

    await expect(getAttendanceLogSyncOptions()).resolves.toMatchObject({
      data: [{ id: 7, name: "Main scanner" }],
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/attendance-log/sync-options",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("queues synchronization for the selected device IDs", async () => {
    const fetchMock = jest.mocked(globalThis.fetch);
    fetchMock.mockResolvedValueOnce(
      createResponse(
        {
          success: true,
          data: { job_id: 42, deduplicated: false },
        },
        202,
      ),
    );

    await syncAttendanceLogSelected([7, 9]);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/attendance-log/sync-selected",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ scanner_ids: [7, 9] }),
      }),
    );
  });
});
