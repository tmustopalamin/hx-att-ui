import { ResponseTypeError } from "../types/response-type";
import { User } from "../types/User";

const API_URL = "/api/user";

type CreateUserPayload = {
  employee_id: number;
  username: string;
  email: string;
  password?: string;
  role: string[];
  is_active: boolean;
};

type UpdateUserPayload = {
  id: number;
  employee_id: number;
  username: string;
  email: string;
  password?: string;
  role: string[];
  is_active: boolean;
};

const normalizeText = (value?: string | null) => {
  return (value ?? "").trim();
};

const normalizeLoginValue = (value?: string | null) => {
  return normalizeText(value).toLowerCase();
};

const buildCreateUserPayload = (data: User): CreateUserPayload => {
  const payload: CreateUserPayload = {
    employee_id: data.employee_id,
    username: normalizeLoginValue(data.username),
    email: normalizeLoginValue(data.email),
    role: data.role ?? [],
    is_active: !!data.is_active,
  };

  const password = normalizeText(data.password);

  if (password) {
    payload.password = password;
  }

  return payload;
};

const buildUpdateUserPayload = (id: number, data: User): UpdateUserPayload => {
  const payload: UpdateUserPayload = {
    id,
    employee_id: data.employee_id,
    username: normalizeLoginValue(data.username),
    email: normalizeLoginValue(data.email),
    role: data.role ?? [],
    is_active: !!data.is_active,
  };

  const password = normalizeText(data.password);

  if (password) {
    payload.password = password;
  }

  return payload;
};

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

export const createUser = async (data: User) => {
  const payload = buildCreateUserPayload(data);

  const res = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const updateUser = async (
  id: number,
  rowVersion: number,
  data: User,
) => {
  if (
    rowVersion === null ||
    rowVersion === undefined ||
    Number.isNaN(Number(rowVersion))
  ) {
    throw new Error("rowVersion is required");
  }

  const payload = buildUpdateUserPayload(id, data);

  const res = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const deleteUser = async (id: number, rowVersion: number) => {
  if (
    rowVersion === null ||
    rowVersion === undefined ||
    Number.isNaN(Number(rowVersion))
  ) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const purgeUser = async (id: number) => {
  const res = await fetch(`${API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const restoreUser = async (id: number, rowVersion: number) => {
  if (
    rowVersion === null ||
    rowVersion === undefined ||
    Number.isNaN(Number(rowVersion))
  ) {
    throw new Error("rowVersion is required");
  }

  const res = await fetch(`${API_URL}/${id}/restore`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "If-Match": String(rowVersion),
    },
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export const changePassword = async (data: ChangePasswordPayload) => {
  const res = await fetch(`${API_URL}/change-password`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      current_password: data.current_password,
      new_password: data.new_password,
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};
