import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import LoginForm from "@/app/(auth)/login/login-form";
import { updateDataProfile } from "@/store/me/ProfileSlice";
import type { Me } from "@/app/types/me";

const mockFetch = jest.fn();

jest.mock("next/navigation", () => {
  const replace = jest.fn();

  return {
    __esModule: true,
    __replace: replace,
    useRouter: () => ({ replace }),
  };
});

jest.mock("react-redux", () => {
  const dispatch = jest.fn();

  return {
    __esModule: true,
    __dispatch: dispatch,
    useDispatch: () => dispatch,
  };
});

jest.mock("@/app/utils/api-client", () => {
  const apiFetch = jest.fn();

  return {
    __esModule: true,
    __apiFetch: apiFetch,
    apiFetch,
  };
});

jest.mock("swr", () => {
  const mutate = jest.fn();

  return {
    __esModule: true,
    __mutate: mutate,
    mutate,
  };
});

const mockRouterReplace = jest.mocked(
  jest.requireMock("next/navigation").__replace,
);
const mockDispatch = jest.mocked(jest.requireMock("react-redux").__dispatch);
const mockApiFetch = jest.mocked(
  jest.requireMock("@/app/utils/api-client").__apiFetch,
);
const mockMutate = jest.mocked(jest.requireMock("swr").__mutate);

const sessionData: Me = {
  user_id: 7,
  employee_id: 42,
  email: "user@company.com",
  username: "user",
  name: "Test User",
  role: ["HR"],
  permissions: ["dashboard.read"],
  photo_url: "",
  must_change_password: false,
  last_login_at: null,
  password_changed_at: null,
};

const fillLoginForm = () => {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: " USER@COMPANY.COM " },
  });
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: "password" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
};

describe("LoginForm", () => {
  beforeEach(() => {
    mockRouterReplace.mockReset();
    mockDispatch.mockReset();
    mockApiFetch.mockReset();
    mockMutate.mockReset();
    mockFetch.mockReset();
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: mockFetch,
      writable: true,
    });
  });

  it("primes the authenticated session before redirecting to the dashboard", async () => {
    mockApiFetch.mockResolvedValue({});
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => sessionData,
    });

    render(<LoginForm />);
    fillLoginForm();

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/dashboard");
    });

    expect(mockApiFetch).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "user@company.com",
          password: "password",
        }),
      }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }),
    );
    expect(mockDispatch).toHaveBeenCalledWith(updateDataProfile(sessionData));
    expect(mockMutate).toHaveBeenCalledWith("/api/auth/me", sessionData, {
      revalidate: false,
    });
  });

  it("shows a session establishment error without redirecting", async () => {
    mockApiFetch.mockResolvedValue({});
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true });

    render(<LoginForm />);
    fillLoginForm();

    expect(
      await screen.findByText(
        "Login succeeded, but the session could not be established. Please try again.",
      ),
    ).not.toBeNull();
    expect(mockRouterReplace).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
