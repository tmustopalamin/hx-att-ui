import type {
  EmployeeLifecycleAssignedTask,
  EmployeeLifecycleCase,
  EmployeeLifecycleDetail,
  NewEmployeeLifecycleCase,
} from "@/app/types/employee-lifecycle";
import { apiFetch } from "@/app/utils/api-client";
type Envelope<T> = { success: boolean; data: T; message: string };
const url = "/api/employee-lifecycle";
const unwrap = <T>(request: Promise<Envelope<T>>): Promise<T> =>
  request.then((response) => response.data);
export const getEmployeeLifecycleCases = () =>
  unwrap(apiFetch<Envelope<EmployeeLifecycleCase[]>>(url));
export const getEmployeeLifecycleCase = (id: number) =>
  unwrap(apiFetch<Envelope<EmployeeLifecycleDetail>>(`${url}/${id}`));
export const getMyEmployeeLifecycleTasks = () =>
  unwrap(
    apiFetch<Envelope<EmployeeLifecycleAssignedTask[]>>(`${url}/my-tasks`),
  );
export const createEmployeeLifecycleCase = (data: NewEmployeeLifecycleCase) =>
  unwrap(
    apiFetch<Envelope<{ id: number; row_version: number }>>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
export const submitEmployeeLifecycleCase = (id: number, rowVersion: number) =>
  unwrap(
    apiFetch<Envelope<unknown>>(`${url}/${id}/submit`, {
      method: "POST",
      headers: { "If-Match": String(rowVersion) },
    }),
  );
export const cancelEmployeeLifecycleCase = (id: number, rowVersion: number) =>
  unwrap(
    apiFetch<Envelope<unknown>>(`${url}/${id}/cancel`, {
      method: "POST",
      headers: { "If-Match": String(rowVersion) },
    }),
  );
export const completeEmployeeLifecycleTask = (
  caseId: number,
  taskId: number,
  rowVersion: number,
  note: string | null,
) =>
  unwrap(
    apiFetch<Envelope<unknown>>(`${url}/${caseId}/tasks/${taskId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify({ note }),
    }),
  );
export const assignEmployeeLifecycleTask = (
  caseId: number,
  taskId: number,
  rowVersion: number,
  assignedEmployeeId: number | null,
  dueDate: string | null,
) =>
  unwrap(
    apiFetch<Envelope<unknown>>(`${url}/${caseId}/tasks/${taskId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify({
        assigned_employee_id: assignedEmployeeId,
        due_date: dueDate,
      }),
    }),
  );
