import { EmployeeDashboardResponse } from "../types/employee-dashboard";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/dashboard/employee";

const parseError = async (res: Response): Promise<ResponseTypeError> => {
  const contentType = res.headers.get("Content-Type");

  try {
    if (contentType && contentType.includes("application/json")) {
      return (await res.json()) as ResponseTypeError;
    }

    return {
      success: false,
      code: String(res.status),
      message: await res.text(),
    };
  } catch {
    return {
      success: false,
      code: String(res.status),
      message: "Unknown error",
    };
  }
};

export const getEmployeeDashboard =
  async (): Promise<EmployeeDashboardResponse> => {
    const res = await fetch(API_URL, {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      throw await parseError(res);
    }

    return res.json();
  };
