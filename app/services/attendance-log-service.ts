import { AttendanceLog } from "../types/attendance-log";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/attendance-log";

export const remapEmployeeAttendanceLog = async () => {
  const res = await fetch(API_URL + "/remap-employee", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    // body: JSON.stringify(data)
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

export const createAttendanceLog = async (data: AttendanceLog) => {
  const res = await fetch(API_URL, {
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

export const updateAttendanceLog = async (
  id: number,
  rowVersion: number,
  data: AttendanceLog,
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
  if (!res.ok) {
    const errorData: ResponseTypeError = await res.json();
    throw errorData;
  }
  return res.json();
};

export const deleteAttendanceLog = async (id: number, rowVersion: number) => {
  if (rowVersion <= -1) throw new Error("rowVersion is required");

  const res = await fetch(`${API_URL}/${id}`, {
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

export const purgeAttendanceLog = async (id: number) => {
  const res = await fetch(`${API_URL}/${id}/purge`, {
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

export const restoreAttendanceLog = async (id: number, rowVersion: number) => {
  const res = await fetch(`${API_URL}/${id}/restore`, {
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

export const syncAttendanceLog = async () => {
  const res = await fetch(`${API_URL}/sync`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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

export const syncAttendanceLogByScanner = async (scannerId: number) => {
  const res = await fetch(`${API_URL}/sync/${scannerId}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
