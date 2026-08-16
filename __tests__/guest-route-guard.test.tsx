import { render, screen, waitFor } from "@testing-library/react";

import GuestRouteGuard from "@/app/(auth)/guest-route-guard";

const mockRouterReplace = jest.fn();
const mockFetch = jest.fn();
const mockLocksRequest = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
}));

describe("GuestRouteGuard", () => {
  beforeEach(() => {
    mockRouterReplace.mockReset();
    mockFetch.mockReset();
    mockLocksRequest.mockReset();
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: mockFetch,
      writable: true,
    });
  });

  it("redirects an authenticated session to the dashboard", async () => {
    mockFetch.mockResolvedValue({ ok: true } as Response);

    render(
      <GuestRouteGuard>
        <p>guest page</p>
      </GuestRouteGuard>,
    );

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
    });

    expect(screen.queryByText("guest page")).toBeNull();
  });

  it("queues a concurrent session probe behind the active lock", async () => {
    let fetchCallCount = 0;
    let releaseFirstProbe: (() => void) | undefined;

    mockFetch.mockImplementation(() => {
      fetchCallCount += 1;

      if (fetchCallCount === 1) {
        return new Promise<Response>((resolve) => {
          releaseFirstProbe = () => resolve({ ok: true } as Response);
        });
      }

      return Promise.resolve({ ok: true } as Response);
    });

    let lockTail = Promise.resolve();
    mockLocksRequest.mockImplementation(
      (
        _name: string,
        _options: LockOptions,
        callback: () => Promise<Response>,
      ) => {
        const request = lockTail.then(callback);
        lockTail = request.then(
          () => undefined,
          () => undefined,
        );
        return request;
      },
    );
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: { request: mockLocksRequest },
    });

    render(
      <>
        <GuestRouteGuard>
          <p>guest page one</p>
        </GuestRouteGuard>
        <GuestRouteGuard>
          <p>guest page two</p>
        </GuestRouteGuard>
      </>,
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    expect(releaseFirstProbe).toBeDefined();
    releaseFirstProbe?.();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    expect(mockLocksRequest).toHaveBeenCalledTimes(2);
    expect(mockLocksRequest).toHaveBeenCalledWith(
      "attendance-hx:guest-session-probe",
      expect.objectContaining({ mode: "exclusive" }),
      expect.any(Function),
    );
  });

  it("keeps the auth page available for an invalid session", async () => {
    mockFetch.mockResolvedValue({ ok: false } as Response);

    render(
      <GuestRouteGuard>
        <p>guest page</p>
      </GuestRouteGuard>,
    );

    expect(await screen.findByText("guest page")).not.toBeNull();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });
});
