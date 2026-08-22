import { apiFetchResponse } from "@/app/utils/api-client";

import { RequestLeaveAttachment } from "../types/request-leave-attachment";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/request-leave";

const parseErrorResponse = async (
  res: Response,
): Promise<ResponseTypeError> => {
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

const validateRowVersion = (rowVersion: number) => {
  if (rowVersion <= 0 || Number.isNaN(rowVersion)) {
    throw new Error("rowVersion is required");
  }
};

export const getRequestLeaveAttachments = async (
  requestLeaveId: number,
): Promise<RequestLeaveAttachment[]> => {
  const res = await apiFetchResponse(
    `${API_URL}/${requestLeaveId}/attachments`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const uploadRequestLeaveAttachment = async (
  requestLeaveId: number,
  file: File,
) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetchResponse(
    `${API_URL}/${requestLeaveId}/attachments`,
    {
      method: "POST",
      credentials: "include",
      body: formData,
    },
  );

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const deleteRequestLeaveAttachment = async (
  requestLeaveId: number,
  attachmentId: number,
  rowVersion: number,
) => {
  validateRowVersion(rowVersion);

  const res = await apiFetchResponse(
    `${API_URL}/${requestLeaveId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
    },
  );

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const viewRequestLeaveAttachmentUrl = (
  requestLeaveId: number,
  attachmentId: number,
) => {
  return `${API_URL}/${requestLeaveId}/attachments/${attachmentId}/view`;
};
