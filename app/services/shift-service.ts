import { apiFetchResponse } from "@/app/utils/api-client";

import { Shift } from "../types/shift";
import { ResponseTypeError } from "../types/response-type";
import dayjs from "dayjs";

const API_URL = "/api/shift";

export const createShift = async (data: Shift) => {
  const work_start = dayjs(data.work_start).isValid()
    ? dayjs(data.work_start).format("HH:mm:ss")
    : null;
  const work_end = dayjs(data.work_end).isValid()
    ? dayjs(data.work_end).format("HH:mm:ss")
    : null;
  const break_start = dayjs(data.break_start).isValid()
    ? dayjs(data.break_start).format("HH:mm:ss")
    : null;
  const break_end = dayjs(data.break_end).isValid()
    ? dayjs(data.break_end).format("HH:mm:ss")
    : null;
  const checkin_start = dayjs(data.checkin_start).isValid()
    ? dayjs(data.checkin_start).format("HH:mm:ss")
    : null;
  const checkin_end = dayjs(data.checkin_end).isValid()
    ? dayjs(data.checkin_end).format("HH:mm:ss")
    : null;
  const checkout_start = dayjs(data.checkout_start).isValid()
    ? dayjs(data.checkout_start).format("HH:mm:ss")
    : null;
  const checkout_end = dayjs(data.checkout_end).isValid()
    ? dayjs(data.checkout_end).format("HH:mm:ss")
    : null;

  const reqData = {
    ...data,
    timezone_offset_minutes: Number(data.timezone_offset_minutes ?? 420),
    duplicate_punch_tolerance_seconds: Number(
      data.duplicate_punch_tolerance_seconds ?? 60,
    ),
    finalization_delay_minutes: Number(data.finalization_delay_minutes ?? 30),
    work_start,
    work_end,
    break_start,
    break_end,
    checkin_start,
    checkin_end,
    checkout_start,
    checkout_end,
  };

  const res = await apiFetchResponse(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqData),
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

export const updateShift = async (
  id: number,
  rowVersion: number,
  data: Shift,
) => {
  if (rowVersion <= -1) throw new Error("rowVersion is required");

  const work_start = dayjs(data.work_start).isValid()
    ? dayjs(data.work_start).format("HH:mm:ss")
    : null;
  const work_end = dayjs(data.work_end).isValid()
    ? dayjs(data.work_end).format("HH:mm:ss")
    : null;
  const break_start = dayjs(data.break_start).isValid()
    ? dayjs(data.break_start).format("HH:mm:ss")
    : null;
  const break_end = dayjs(data.break_end).isValid()
    ? dayjs(data.break_end).format("HH:mm:ss")
    : null;
  const checkin_start = dayjs(data.checkin_start).isValid()
    ? dayjs(data.checkin_start).format("HH:mm:ss")
    : null;
  const checkin_end = dayjs(data.checkin_end).isValid()
    ? dayjs(data.checkin_end).format("HH:mm:ss")
    : null;
  const checkout_start = dayjs(data.checkout_start).isValid()
    ? dayjs(data.checkout_start).format("HH:mm:ss")
    : null;
  const checkout_end = dayjs(data.checkout_end).isValid()
    ? dayjs(data.checkout_end).format("HH:mm:ss")
    : null;

  const reqData = {
    ...data,
    timezone_offset_minutes: Number(data.timezone_offset_minutes ?? 420),
    duplicate_punch_tolerance_seconds: Number(
      data.duplicate_punch_tolerance_seconds ?? 60,
    ),
    finalization_delay_minutes: Number(data.finalization_delay_minutes ?? 30),
    work_start,
    work_end,
    break_start,
    break_end,
    checkin_start,
    checkin_end,
    checkout_start,
    checkout_end,
  };

  const res = await apiFetchResponse(`${API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(reqData),
  });
  if (!res.ok) {
    const errorData: ResponseTypeError = await res.json();
    throw errorData;
  }
  return res.json();
};

export const deleteShift = async (id: number, rowVersion: number) => {
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

export const purgeShift = async (id: number) => {
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

export const restoreShift = async (id: number, rowVersion: number) => {
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
