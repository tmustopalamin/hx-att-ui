import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/request-leave";

const parseErrorResponse = async (res: Response): Promise<ResponseTypeError> => {
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

const fileToBytes = async (file: File): Promise<number[]> => {
  const arrayBuffer = await file.arrayBuffer();
  return Array.from(new Uint8Array(arrayBuffer));
};

export const uploadRequestLeaveAttachment = async (
  requestLeaveId: number,
  file: File
) => {
  const bytes = await fileToBytes(file);

  const res = await fetch(`${API_URL}/${requestLeaveId}/attachments`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filename: file.name,
      content_type: file.type,
      size: file.size,
      bytes,
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const getRequestLeaveAttachments = async (requestLeaveId: number) => {
  const res = await fetch(`${API_URL}/${requestLeaveId}/attachments`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const deleteRequestLeaveAttachment = async (
  requestLeaveId: number,
  attachmentId: number,
  rowVersion: number
) => {
  const res = await fetch(
    `${API_URL}/${requestLeaveId}/attachments/${attachmentId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
    }
  );

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};