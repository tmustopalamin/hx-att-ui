import { apiFetch } from "@/app/utils/api-client";
import {
  EmployeeScheduleChangeLogDetail,
  EmployeeScheduleChangeLogPage,
} from "@/app/types/employee-schedule-change-log";

const API_URL = "/api/employee-schedule-change/logs";

export interface EmployeeScheduleChangeLogQuery {
  page?: number;
  page_size?: number;
  occurred_from?: string;
  occurred_to?: string;
  actor_employee_id?: number;
  employee_id?: number;
}

const queryString = (query?: EmployeeScheduleChangeLogQuery) => {
  const params = new URLSearchParams();

  if (query?.page !== undefined) params.set("page", String(query.page));
  if (query?.page_size !== undefined) {
    params.set("page_size", String(query.page_size));
  }
  if (query?.occurred_from) params.set("occurred_from", query.occurred_from);
  if (query?.occurred_to) params.set("occurred_to", query.occurred_to);
  if (query?.actor_employee_id !== undefined) {
    params.set("actor_employee_id", String(query.actor_employee_id));
  }
  if (query?.employee_id !== undefined) {
    params.set("employee_id", String(query.employee_id));
  }

  const value = params.toString();
  return value ? `?${value}` : "";
};

export const getEmployeeScheduleChangeLogs = (
  query?: EmployeeScheduleChangeLogQuery,
) => apiFetch<EmployeeScheduleChangeLogPage>(`${API_URL}${queryString(query)}`);

export const getEmployeeScheduleChangeLog = (id: number) =>
  apiFetch<EmployeeScheduleChangeLogDetail>(`${API_URL}/${id}`);
