import { apiFetch } from "@/app/utils/api-client";
import { ResponseType } from "@/app/types/response-type";
import {
  EmployeeScheduleChangePreviewResponse,
  EmployeeScheduleChangeRequest,
} from "@/app/types/employee-schedule-change";

const PREVIEW_URL = "/api/employee-schedule-change/preview";
const APPLY_URL = "/api/employee-schedule-change/apply";

const request = async (url: string, payload: EmployeeScheduleChangeRequest) =>
  apiFetch<ResponseType<EmployeeScheduleChangePreviewResponse>>(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

export const previewEmployeeScheduleChange = (
  payload: EmployeeScheduleChangeRequest,
) => request(PREVIEW_URL, payload);

export const applyEmployeeScheduleChange = (
  payload: EmployeeScheduleChangeRequest,
) => request(APPLY_URL, payload);
