import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/overtime-management";

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
  if (
    rowVersion === null ||
    rowVersion === undefined ||
    Number.isNaN(Number(rowVersion)) ||
    rowVersion < 0
  ) {
    throw new Error("rowVersion is required");
  }
};

export const approveOvertimeManagement = async (
  id: number,
  rowVersion: number,
  note?: string,
) => {
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${id}/approve`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({
      note: note?.trim() || null,
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const rejectOvertimeManagement = async (
  id: number,
  rowVersion: number,
  note: string,
) => {
  validateRowVersion(rowVersion);

  const res = await fetch(`${API_URL}/${id}/reject`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify({
      note: note.trim(),
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};
