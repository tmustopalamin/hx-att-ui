import { render, screen, waitFor } from "@testing-library/react";

import AuthProvider from "@/app/(auth)/auth-provider";
import { clearProfile } from "@/store/me/ProfileSlice";

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
  const useSelector = jest.fn();

  return {
    __esModule: true,
    __dispatch: dispatch,
    __useSelector: useSelector,
    useDispatch: () => dispatch,
    useSelector,
  };
});

jest.mock("swr", () => {
  const useSWR = jest.fn();

  return {
    __esModule: true,
    __useSWR: useSWR,
    default: useSWR,
  };
});

jest.mock("@/app/utils/api-client", () => ({
  __esModule: true,
  ...jest.requireActual("@/app/utils/api-client"),
  apiFetch: jest.fn(),
}));

const mockRouterReplace = jest.mocked(
  jest.requireMock("next/navigation").__replace,
);
const mockDispatch = jest.mocked(jest.requireMock("react-redux").__dispatch);
const mockUseSelector = jest.mocked(
  jest.requireMock("react-redux").__useSelector,
);
const mockUseSWR = jest.mocked(jest.requireMock("swr").__useSWR);

describe("AuthProvider", () => {
  beforeEach(() => {
    mockRouterReplace.mockReset();
    mockDispatch.mockReset();
    mockUseSelector.mockReset();
    mockUseSelector.mockReturnValue({ employee_id: 0 });
    mockUseSWR.mockReset();
  });

  it("redirects when the session probe returns a normalized 401 error", async () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      error: {
        success: false,
        code: "401",
        message: "Unauthorized",
      },
      isLoading: false,
    });

    render(
      <AuthProvider>
        <p>protected content</p>
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/login");
    });

    expect(mockDispatch).toHaveBeenCalledWith(clearProfile());
    expect(screen.queryByText("protected content")).toBeNull();
  });
});
