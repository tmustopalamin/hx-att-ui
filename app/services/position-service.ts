import { apiFetchResponse } from "@/app/utils/api-client";

import { Position } from "../types/position";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/position";

export const createPosition = async (data: Position) => {
  const res = await apiFetchResponse(API_URL, {
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

export const updatePosition = async (
  id: number,
  rowVersion: number,
  data: Position,
) => {
  if (rowVersion <= -1) throw new Error("rowVersion is required");

  const res = await apiFetchResponse(`${API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData: ResponseTypeError = await res.json();
    throw errorData;
  }
  return res.json();
};

export const deletePosition = async (id: number, rowVersion: number) => {
  if (rowVersion <= -1) throw new Error("rowVersion is required");

  const res = await apiFetchResponse(`${API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });
  if (!res.ok) {
    const errorData: ResponseTypeError = await res.json();
    throw errorData;
  }
  return res.json();
};

export const purgePosition = async (id: number) => {
  const res = await apiFetchResponse(`${API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const errorData: ResponseTypeError = await res.json();
    throw errorData;
  }
  return res.json();
};

export const restorePosition = async (id: number, rowVersion: number) => {
  const res = await apiFetchResponse(`${API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
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
