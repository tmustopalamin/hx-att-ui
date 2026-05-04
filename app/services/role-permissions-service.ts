import { ResponseTypeError } from "../types/response-type";
import { RolePermissions } from "../types/role-permissions";

const API_URL = "/api/roles";

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

export const getRolePermissions = async (roleCode: string) => {
  const res = await fetch(`${API_URL}/${roleCode}/permissions`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const saveRolePermissions = async (data: RolePermissions) => {
  const payload: RolePermissions = {
    role_id: String(data.role_id || "").trim(),
    permissions: data.permissions ?? [],
  };

  const res = await fetch(`${API_URL}/permissions`, {
    method: "PUT",
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