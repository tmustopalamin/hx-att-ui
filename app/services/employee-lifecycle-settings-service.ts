import { apiFetch } from "@/app/utils/api-client";
import type { ResponseType } from "@/app/types/response-type";
import type {
  EmployeeLifecycleAssigneeOption,
  EmployeeLifecycleChecklistTemplateInput,
  EmployeeLifecycleSettings,
} from "@/app/types/employee-lifecycle-settings";

const baseUrl = "/api/employee-lifecycle/settings";

export const getEmployeeLifecycleSettings = () =>
  apiFetch<ResponseType<EmployeeLifecycleSettings>>(baseUrl);

export const getEmployeeLifecycleAssignees = () =>
  apiFetch<ResponseType<EmployeeLifecycleAssigneeOption[]>>(
    `${baseUrl}/assignees`,
  );

export const createEmployeeLifecycleTemplateVersion = (
  data: EmployeeLifecycleChecklistTemplateInput,
) =>
  apiFetch<ResponseType<unknown>>(`${baseUrl}/templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

export const setEmployeeLifecycleTemplateActive = (
  id: number,
  rowVersion: number,
  isActive: boolean,
) =>
  apiFetch<ResponseType<unknown>>(`${baseUrl}/templates/${id}/active`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({ is_active: isActive }),
  });
