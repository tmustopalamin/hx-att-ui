import { apiFetchResponse } from "@/app/utils/api-client";

// app/services/notification-service.ts

export interface NotificationItem {
  id: number;
  notification_event_id: number;

  event_code: string;
  module_code: string;

  reference_table?: string | null;
  reference_id?: number | null;

  actor_employee_id?: number | null;
  actor_name?: string | null;

  title: string;
  message: string;
  action_url?: string | null;

  priority: string;
  payload?: unknown;

  is_read: boolean;
  read_at?: string | null;

  is_archived: boolean;
  archived_at?: string | null;

  created_at: string;
}

export interface NotificationUnreadCount {
  unread_count: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  code?: string;
}

export interface NotificationQueryParams {
  limit?: number;
  offset?: number;
  unread_only?: boolean;
  module_code?: string;
}

const buildQueryString = (params?: NotificationQueryParams) => {
  const searchParams = new URLSearchParams();

  if (params?.limit !== undefined) {
    searchParams.set("limit", String(params.limit));
  }

  if (params?.offset !== undefined) {
    searchParams.set("offset", String(params.offset));
  }

  if (params?.unread_only !== undefined) {
    searchParams.set("unread_only", String(params.unread_only));
  }

  if (params?.module_code) {
    searchParams.set("module_code", params.module_code);
  }

  const queryString = searchParams.toString();

  return queryString ? `?${queryString}` : "";
};

const apiRequest = async <T>(
  url: string,
  fallback: T,
  init?: RequestInit,
): Promise<T> => {
  const response = await apiFetchResponse(url, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  if (!text) {
    return fallback;
  }

  const json = JSON.parse(text) as unknown;

  if (
    typeof json === "object" &&
    json !== null &&
    "success" in json &&
    "data" in json
  ) {
    const apiResponse = json as ApiResponse<T>;

    if (!apiResponse.success) {
      throw new Error(apiResponse.message || "Request failed.");
    }

    return apiResponse.data ?? fallback;
  }

  return (json ?? fallback) as T;
};

export const getMyNotifications = async (
  params?: NotificationQueryParams,
): Promise<NotificationItem[]> => {
  const result = await apiRequest<NotificationItem[]>(
    `/api/notification${buildQueryString(params)}`,
    [],
  );

  return Array.isArray(result) ? result : [];
};

export const getUnreadNotificationCount =
  async (): Promise<NotificationUnreadCount> => {
    return apiRequest<NotificationUnreadCount>(
      "/api/notification/unread-count",
      {
        unread_count: 0,
      },
    );
  };

export const markNotificationAsRead = async (id: number): Promise<number> => {
  return apiRequest<number>(`/api/notification/${id}/read`, 0, {
    method: "POST",
  });
};

export const markAllNotificationsAsRead = async (): Promise<number> => {
  return apiRequest<number>("/api/notification/mark-all-read", 0, {
    method: "POST",
  });
};

export const archiveNotification = async (id: number): Promise<number> => {
  return apiRequest<number>(`/api/notification/${id}/archive`, 0, {
    method: "POST",
  });
};
