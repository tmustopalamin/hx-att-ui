import type {
  NewPayrollProrationMethod,
  PayrollProrationMethod,
  UpdatePayrollProrationMethod,
} from "@/app/types/payroll-proration-method";
import { apiFetch } from "@/app/utils/api-client";

const URL = "/api/payroll-proration-methods";

const jsonRequest = (
  method: "POST" | "PUT",
  body: unknown,
  rowVersion?: number,
) => ({
  method,
  headers: {
    "Content-Type": "application/json",
    ...(rowVersion === undefined ? {} : { "If-Match": String(rowVersion) }),
  },
  body: JSON.stringify(body),
});

export const getPayrollProrationMethods = (
  showAll = false,
): Promise<PayrollProrationMethod[]> => apiFetch(`${URL}?show_all=${showAll}`);

export const createPayrollProrationMethod = (
  data: NewPayrollProrationMethod,
): Promise<PayrollProrationMethod> => apiFetch(URL, jsonRequest("POST", data));

export const updatePayrollProrationMethod = (
  id: number,
  rowVersion: number,
  data: UpdatePayrollProrationMethod,
): Promise<PayrollProrationMethod> =>
  apiFetch(`${URL}/${id}`, jsonRequest("PUT", data, rowVersion));

export const deletePayrollProrationMethod = (
  id: number,
  rowVersion: number,
): Promise<void> =>
  apiFetch(`${URL}/${id}`, {
    method: "DELETE",
    headers: { "If-Match": String(rowVersion) },
  });

export const restorePayrollProrationMethod = (
  id: number,
  rowVersion: number,
): Promise<void> =>
  apiFetch(`${URL}/${id}/restore`, {
    method: "POST",
    headers: { "If-Match": String(rowVersion) },
  });

export const purgePayrollProrationMethod = (id: number): Promise<void> =>
  apiFetch(`${URL}/${id}/purge`, { method: "DELETE" });
