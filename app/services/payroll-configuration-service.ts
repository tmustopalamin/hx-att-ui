import type {
  NewPayrollRegulationPackage,
  PayrollComponentMapping,
  PayrollRegulationPackage,
  PayrollRegulationParameter,
  PayrollRegulationRateBracket,
  PayrollRegulationStatus,
  PayrollRegulationTestCase,
  PayrollRegulationTestRun,
  PayrollSetting,
  PayrollPeriodRule,
  PayrollPeriodPreview,
  NewPayrollPeriodRule,
  UpdatePayrollPeriodRule,
  SavePayrollRegulationParameter,
  SavePayrollRegulationRateBracket,
  SavePayrollRegulationTestCase,
  SavePayrollComponentMapping,
  UpdatePayrollRegulationPackage,
  UpdatePayrollSetting,
} from "@/app/types/payroll-configuration";
import { apiFetch } from "@/app/utils/api-client";

const SETTING_URL = "/api/payroll-settings";
const REGULATION_URL = "/api/payroll-regulations";
const COMPONENT_MAPPING_URL = "/api/payroll-component-mappings";

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

export const updatePayrollSetting = (
  id: number,
  rowVersion: number,
  data: UpdatePayrollSetting,
): Promise<PayrollSetting> =>
  apiFetch(`${SETTING_URL}/${id}`, jsonRequest("PUT", data, rowVersion));

export const getPayrollPeriodRules = (
  settingId: number,
  showAll = false,
): Promise<PayrollPeriodRule[]> =>
  apiFetch(`${SETTING_URL}/${settingId}/period-rules?show_all=${showAll}`);

export const createPayrollPeriodRule = (
  settingId: number,
  data: NewPayrollPeriodRule,
): Promise<PayrollPeriodRule> =>
  apiFetch(
    `${SETTING_URL}/${settingId}/period-rules`,
    jsonRequest("POST", data),
  );

export const updatePayrollPeriodRule = (
  settingId: number,
  ruleId: number,
  rowVersion: number,
  data: UpdatePayrollPeriodRule,
): Promise<PayrollPeriodRule> =>
  apiFetch(
    `${SETTING_URL}/${settingId}/period-rules/${ruleId}`,
    jsonRequest("PUT", data, rowVersion),
  );

export const deletePayrollPeriodRule = (
  settingId: number,
  ruleId: number,
  rowVersion: number,
): Promise<void> =>
  apiFetch(`${SETTING_URL}/${settingId}/period-rules/${ruleId}`, {
    method: "DELETE",
    headers: { "If-Match": String(rowVersion) },
  });

export const getPayrollPeriodPreview = (
  settingId: number,
  referenceMonth: string,
): Promise<PayrollPeriodPreview> =>
  apiFetch(
    `${SETTING_URL}/${settingId}/period-preview?reference_month=${encodeURIComponent(referenceMonth)}`,
  );

export const createPayrollRegulation = (
  data: NewPayrollRegulationPackage,
): Promise<PayrollRegulationPackage> =>
  apiFetch(REGULATION_URL, jsonRequest("POST", data));

export const updatePayrollRegulation = (
  id: number,
  rowVersion: number,
  data: UpdatePayrollRegulationPackage,
): Promise<PayrollRegulationPackage> =>
  apiFetch(`${REGULATION_URL}/${id}`, jsonRequest("PUT", data, rowVersion));

export const transitionPayrollRegulation = (
  id: number,
  rowVersion: number,
  status: Exclude<PayrollRegulationStatus, "DRAFT">,
): Promise<PayrollRegulationPackage> =>
  apiFetch(
    `${REGULATION_URL}/${id}/transition`,
    jsonRequest("POST", { status }, rowVersion),
  );

export const runPayrollRegulationTests = (
  id: number,
): Promise<PayrollRegulationTestRun> =>
  apiFetch(`${REGULATION_URL}/${id}/test-runs`, { method: "POST" });

export const savePayrollRegulationParameter = (
  packageId: number,
  data: SavePayrollRegulationParameter,
): Promise<PayrollRegulationParameter> =>
  apiFetch(
    `${REGULATION_URL}/${packageId}/parameters`,
    jsonRequest("POST", data),
  );

export const savePayrollRegulationRateBracket = (
  packageId: number,
  data: SavePayrollRegulationRateBracket,
): Promise<PayrollRegulationRateBracket> =>
  apiFetch(
    `${REGULATION_URL}/${packageId}/rate-brackets`,
    jsonRequest("POST", data),
  );

export const savePayrollRegulationTestCase = (
  packageId: number,
  data: SavePayrollRegulationTestCase,
): Promise<PayrollRegulationTestCase> =>
  apiFetch(
    `${REGULATION_URL}/${packageId}/test-cases`,
    jsonRequest("POST", data),
  );

export const deletePayrollRegulationDetail = (
  packageId: number,
  detailType: "parameters" | "rate-brackets" | "test-cases",
  id: number,
  rowVersion: number,
): Promise<void> =>
  apiFetch(`${REGULATION_URL}/${packageId}/${detailType}/${id}`, {
    method: "DELETE",
    headers: { "If-Match": String(rowVersion) },
  });

export const createPayrollComponentMapping = (
  data: SavePayrollComponentMapping,
): Promise<PayrollComponentMapping> =>
  apiFetch(COMPONENT_MAPPING_URL, jsonRequest("POST", data));

export const updatePayrollComponentMapping = (
  id: number,
  rowVersion: number,
  data: SavePayrollComponentMapping,
): Promise<PayrollComponentMapping> =>
  apiFetch(
    `${COMPONENT_MAPPING_URL}/${id}`,
    jsonRequest("PUT", data, rowVersion),
  );

export const deletePayrollComponentMapping = (
  id: number,
  rowVersion: number,
): Promise<void> =>
  apiFetch(`${COMPONENT_MAPPING_URL}/${id}`, {
    method: "DELETE",
    headers: { "If-Match": String(rowVersion) },
  });
