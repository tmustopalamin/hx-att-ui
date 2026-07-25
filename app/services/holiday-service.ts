import dayjs from "dayjs";
import { Holiday, HolidayForm } from "../types/holiday";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/holiday";

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

const buildPayload = (data: HolidayForm) => {
  return {
    code: data.code,
    name: data.name,
    holiday_date: data.holiday_date
      ? dayjs(data.holiday_date).format("YYYY-MM-DD")
      : null,
    holiday_type: data.holiday_type,
    description: data.description,
    is_active: data.is_active,
  };
};

export const createHoliday = async (data: HolidayForm) => {
  const res = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildPayload(data)),
  });

  await ensureOk(res);
  return res.json();
};

export const updateHoliday = async (
  id: number,
  rowVersion: number,
  data: HolidayForm,
) => {
  if (rowVersion <= -1) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(buildPayload(data)),
  });

  await ensureOk(res);
  return res.json();
};

export const deleteHoliday = async (id: number, data: Holiday) => {
  if (data.row_version <= -1) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(data.row_version),
    },
  });

  await ensureOk(res);
  return res.json();
};

export const restoreHoliday = async (id: number, data: Holiday) => {
  if (data.row_version <= -1) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(data.row_version),
    },
  });

  await ensureOk(res);
  return res.json();
};

export const purgeHoliday = async (id: number) => {
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
