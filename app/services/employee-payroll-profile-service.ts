import type {
  EmployeeSalaryHistory,
  EmployeeBankAccount,
  EmployeeStatutoryEnrollment,
  EmployeeStatutoryWage,
  EmployeeTaxProfile,
  NewSalaryHistory,
  NewEmployeeBankAccount,
  NewStatutoryEnrollment,
  NewStatutoryWage,
  NewTaxProfile,
  PayrollProfileSection,
  UpdateEmployeeBankAccount,
  UpdateStatutoryEnrollment,
} from "@/app/types/employee-payroll-profile";
import { apiFetch } from "@/app/utils/api-client";

const url = (employeeId: number) =>
  `/api/employees/${employeeId}/payroll-profile`;
const create = <T>(
  employeeId: number,
  section: PayrollProfileSection,
  data: unknown,
): Promise<T> =>
  apiFetch(`${url(employeeId)}/${section}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
export const createStatutoryEnrollment = (
  employeeId: number,
  data: NewStatutoryEnrollment,
) => create<EmployeeStatutoryEnrollment>(employeeId, "enrollments", data);
export const updateStatutoryEnrollment = (
  employeeId: number,
  id: number,
  rowVersion: number,
  data: UpdateStatutoryEnrollment,
) =>
  apiFetch<EmployeeStatutoryEnrollment>(
    `${url(employeeId)}/enrollments/${id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify(data),
    },
  );
export const createStatutoryWage = (
  employeeId: number,
  data: NewStatutoryWage,
) => create<EmployeeStatutoryWage>(employeeId, "statutory-wages", data);
export const createTaxProfile = (employeeId: number, data: NewTaxProfile) =>
  create<EmployeeTaxProfile>(employeeId, "tax-profiles", data);
export const createSalaryHistory = (
  employeeId: number,
  data: NewSalaryHistory,
) => create<EmployeeSalaryHistory>(employeeId, "salary-history", data);
export const createEmployeeBankAccount = (
  employeeId: number,
  data: NewEmployeeBankAccount,
) => create<EmployeeBankAccount>(employeeId, "bank-accounts", data);
export const updateEmployeeBankAccount = (
  employeeId: number,
  id: number,
  rowVersion: number,
  data: UpdateEmployeeBankAccount,
) =>
  apiFetch<EmployeeBankAccount>(`${url(employeeId)}/bank-accounts/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(data),
  });
export const deletePayrollProfileItem = (
  employeeId: number,
  section: PayrollProfileSection,
  id: number,
  rowVersion: number,
): Promise<void> =>
  apiFetch(`${url(employeeId)}/${section}/${id}`, {
    method: "DELETE",
    headers: { "If-Match": String(rowVersion) },
  });
