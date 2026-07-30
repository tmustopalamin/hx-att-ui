import { EmployeeDashboardResponse } from "../types/employee-dashboard";
import { apiFetch } from "../utils/api-client";

const API_URL = "/api/dashboard/employee";

export const getEmployeeDashboard =
  async (): Promise<EmployeeDashboardResponse> => {
    return apiFetch<EmployeeDashboardResponse>(API_URL, {
      method: "GET",
    });
  };
