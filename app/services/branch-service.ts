import { Branch } from "../types/branch";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/branch";

const parseError = async (res: Response): Promise<ResponseTypeError> => {
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

const ensureOk = async (res: Response) => {
  if (!res.ok) {
    throw await parseError(res);
  }
};

export const createBranch = async (data: Branch) => {
  const res = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  await ensureOk(res);
  return res.json();
};

export const updateBranch = async (
  id: number,
  rowVersion: number,
  data: Branch,
) => {
  if (rowVersion <= -1) throw new Error("rowVersion is required");

  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(data),
  });

  await ensureOk(res);
  return res.json();
};

export const deleteBranch = async (id: number, rowVersion: number) => {
  if (rowVersion <= -1) throw new Error("rowVersion is required");

  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  await ensureOk(res);
  return res.json();
};

export const purgeBranch = async (id: number) => {
  const res = await fetch(`${API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  await ensureOk(res);
  return res.json();
};

export const restoreBranch = async (id: number, rowVersion: number) => {
  const res = await fetch(`${API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  await ensureOk(res);
  return res.json();
};
