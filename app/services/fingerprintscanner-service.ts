import { FingerprintScanner } from "../types/fingerprint-scanner";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/fingerprint-scanner";

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

const buildScannerPayload = (data: FingerprintScanner) => {
  return {
    code: data.code ?? "",
    name: data.name,
    ip: data.ip,
    port: data.port,
    password: data.password,
    last_pull_time: data.last_pull_time ?? null,
    timezone_offset_minutes: data.timezone_offset_minutes ?? 420,

    auto_sync_enabled: data.auto_sync_enabled ?? true,
    sync_interval_minutes: data.sync_interval_minutes ?? 5,

    is_active: data.is_active,
  };
};

export const createFingerprintScanner = async (data: FingerprintScanner) => {
  const res = await fetch(API_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildScannerPayload(data)),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};

export const updateFingerprintScanner = async (
  id: number,
  rowVersion: number,
  data: FingerprintScanner
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
    body: JSON.stringify(buildScannerPayload(data)),
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};

export const deleteFingerprintScanner = async (
  id: number,
  rowVersion: number
) => {
  if (rowVersion <= -1) {
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
    throw await parseError(res);
  }

  return res.json();
};

export const purgeFingerprintScanner = async (id: number) => {
  const res = await fetch(`${API_URL}/${id}/purge`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};

export const restoreFingerprintScanner = async (
  id: number,
  rowVersion: number
) => {
  if (rowVersion <= -1) {
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
    throw await parseError(res);
  }

  return res.json();
};

export const checkConnectionFingerprintScanner = async (
  data: FingerprintScanner
) => {
  const res = await fetch(`${API_URL}/check-connection/${data.id}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};

export interface AttendanceLogSyncScannerResult {
  scanner_id: number;
  scanner_code: string | null;
  scanner_name: string;
  scanner_ip: string;
  scanner_port: string;

  status: string;

  fetched: number;
  after_filter: number;
  inserted: number;
  duplicate: number;
  invalid_mapping: number;

  last_pull_time_before: string | null;
  last_pull_time_after: string | null;

  started_at: string;
  finished_at: string;

  error_code: string | null;
  error_message: string | null;
  suggestion: string | null;
}

export interface AttendanceLogSyncResult {
  scanner_total: number;
  scanner_success: number;
  scanner_failed: number;

  total_fetched: number;
  total_after_filter: number;
  total_inserted: number;
  total_duplicate: number;
  total_invalid_mapping: number;

  started_at: string;
  finished_at: string;

  status: string;
  message: string;

  details: AttendanceLogSyncScannerResult[];
}

export const syncFingerprintScannerAttendanceLog = async (
  scannerId: number
): Promise<{
  success: boolean;
  data: AttendanceLogSyncResult;
  message: string;
}> => {
  const res = await fetch(`/api/attendance-log/sync/${scannerId}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};

export interface FingerprintScannerUserInfoRow {
  pin: string;
  name: string;
  password: string;
  group: string;
  privilege: string;
  card: string;
  pin2: string;
  tz1: string;
  tz2: string;
  tz3: string;
}

export const getAllUserListFingerprintScanner = async (
  scannerId: number
): Promise<{
  success: boolean;
  data: FingerprintScannerUserInfoRow[];
  message: string;
}> => {
  const res = await fetch(`${API_URL}/${scannerId}/users`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw await parseError(res);
  }

  return res.json();
};