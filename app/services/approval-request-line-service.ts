import { apiFetchResponse } from "@/app/utils/api-client";

import { ApprovalRequestLine } from "../types/approval-request-line";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/approval-request-line";

export const approve = async (data: ApprovalRequestLine) => {
  const res = await apiFetchResponse(API_URL + "/approve", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const contentType = res.headers.get("Content-Type");
  if (!res.ok) {
    let errorDetail: ResponseTypeError;

    try {
      if (contentType && contentType.includes("application/json")) {
        errorDetail = (await res.json()) as ResponseTypeError;
      } else {
        errorDetail = {
          success: false,
          code: String(res.status),
          message: await res.text(),
        };
      }
    } catch {
      errorDetail = {
        success: false,
        code: String(res.status),
        message: "Unknown error",
      };
    }
    throw errorDetail;
  }

  return res.json();
};
