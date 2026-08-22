import { apiFetchResponse } from "@/app/utils/api-client";

import { AdminDashboardResponse } from "../types/admin-dashboard";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/dashboard/admin";

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

export const getAdminDashboard = async (): Promise<AdminDashboardResponse> => {
  const res = await apiFetchResponse(API_URL, {
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
