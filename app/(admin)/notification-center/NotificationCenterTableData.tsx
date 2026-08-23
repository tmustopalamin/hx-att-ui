"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { ProgressSpinner } from "primereact/progressspinner";

import {
  archiveNotification,
  getMyNotifications,
  getUnreadNotificationCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  NotificationItem,
} from "@/app/services/notification-service";
import { getSafeInternalPath } from "@/app/utils/safe-navigation";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import { formatDateTime as formatDisplayDateTime } from "@/app/utils/date-format";

const moduleOptions = [
  { label: "All Modules", value: "" },
  { label: "Leave", value: "LEAVE" },
  { label: "Overtime", value: "OVERTIME" },
  { label: "Attendance", value: "ATTENDANCE" },
  { label: "Fingerprint", value: "FINGERPRINT" },
  { label: "Background Jobs", value: "BACKGROUND_JOB" },
];

const readOptions = [
  { label: "All Notifications", value: "ALL" },
  { label: "Unread Only", value: "UNREAD" },
];

const formatDateTime = (value: string) => {
  return formatDisplayDateTime(value);
};

const getPriorityClass = (priority: string) => {
  const normalized = priority.toUpperCase();

  if (normalized === "URGENT") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (normalized === "HIGH") {
    return "bg-orange-50 text-orange-700 ring-orange-100";
  }

  if (normalized === "LOW") {
    return "bg-slate-50 text-slate-600 ring-slate-100";
  }

  return "bg-blue-50 text-blue-700 ring-blue-100";
};

const getModuleIcon = (moduleCode: string) => {
  const normalized = moduleCode.toUpperCase();

  if (normalized === "LEAVE") {
    return "pi-calendar";
  }

  if (normalized === "OVERTIME") {
    return "pi-clock";
  }

  if (normalized === "ATTENDANCE") {
    return "pi-calendar-clock";
  }

  if (normalized === "FINGERPRINT") {
    return "pi-id-card";
  }

  return "pi-bell";
};

const NotificationCenterTableData = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [moduleFilter, setModuleFilter] = useState("");
  const [readFilter, setReadFilter] = useState<"ALL" | "UNREAD">("ALL");

  const unreadOnly = useMemo(() => readFilter === "UNREAD", [readFilter]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [rows, count] = await Promise.all([
        getMyNotifications({
          limit: 50,
          offset: 0,
          module_code: moduleFilter || undefined,
          unread_only: unreadOnly,
        }),
        getUnreadNotificationCount(),
      ]);

      setNotifications(rows);
      setUnreadCount(count.unread_count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, unreadOnly]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkRead = async (notification: NotificationItem) => {
    try {
      setActionLoadingId(notification.id);
      await markNotificationAsRead(notification.id);
      await fetchData();
    } finally {
      setActionLoadingId(null);
    }
  };

  const archive = async (notification: NotificationItem) => {
    try {
      setActionLoadingId(notification.id);
      await archiveNotification(notification.id);
      await fetchData();
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = (notification: NotificationItem) => {
    requestActionConfirmation({
      action: "Archive notification",
      target: notification.title,
      description: "Remove this notification from the active list?",
      severity: "warning",
      confirmLabel: "Archive",
      confirmIcon: "pi pi-archive",
      onAccept: () => archive(notification),
    });
  };

  const handleMarkAllRead = async () => {
    setLoading(true);

    try {
      await markAllNotificationsAsRead();
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
    }

    const actionPath = getSafeInternalPath(notification.action_url);
    if (actionPath) {
      router.push(actionPath);
      return;
    }

    await fetchData();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <i className="pi pi-bell text-lg" />
              </div>

              <div>
                <h1 className="text-lg font-bold text-slate-900">
                  Notification Center
                </h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  Review HRIS updates, approvals, and system messages.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              {unreadCount} unread
            </div>

            <Button
              type="button"
              label="Mark All Read"
              icon="pi pi-check"
              disabled={loading || unreadCount <= 0}
              onClick={handleMarkAllRead}
              className="p-button-sm"
            />

            <Button
              type="button"
              label="Refresh"
              icon="pi pi-refresh"
              disabled={loading}
              onClick={fetchData}
              className="p-button-sm p-button-outlined"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Module
            </label>
            <Dropdown
              value={moduleFilter}
              options={moduleOptions}
              onChange={(event) => setModuleFilter(event.value)}
              className="w-full"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Status
            </label>
            <Dropdown
              value={readFilter}
              options={readOptions}
              onChange={(event) => setReadFilter(event.value)}
              className="w-full"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <ProgressSpinner
              style={{ width: "40px", height: "40px" }}
              strokeWidth="5"
            />
          </div>
        )}

        {!loading && notifications.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              <i className="pi pi-bell-slash text-xl" />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-800">
              No notifications found
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Try changing the filter or check again later.
            </p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const isProcessing = actionLoadingId === notification.id;

              return (
                <div
                  key={notification.id}
                  className={`p-4 transition-colors sm:p-5 ${
                    notification.is_read ? "bg-white" : "bg-blue-50/40"
                  }`}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <div className="relative mt-0.5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200">
                          <i
                            className={`pi ${getModuleIcon(
                              notification.module_code,
                            )} text-base`}
                          />
                        </div>

                        {!notification.is_read && (
                          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-bold text-slate-900 sm:text-base">
                            {notification.title}
                          </h2>

                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {notification.module_code}
                          </span>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${getPriorityClass(
                              notification.priority,
                            )}`}
                          >
                            {notification.priority}
                          </span>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {notification.message}
                        </p>

                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                          <span>
                            <i className="pi pi-clock mr-1" />
                            {formatDateTime(notification.created_at)}
                          </span>

                          {notification.actor_name && (
                            <span>
                              <i className="pi pi-user mr-1" />
                              {notification.actor_name}
                            </span>
                          )}

                          <span>
                            {notification.is_read ? "Read" : "Unread"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                      {notification.action_url && (
                        <Button
                          type="button"
                          label="Open"
                          icon="pi pi-external-link"
                          disabled={isProcessing}
                          onClick={() => handleOpen(notification)}
                          className="p-button-sm"
                        />
                      )}

                      {!notification.is_read && (
                        <Button
                          type="button"
                          label="Mark Read"
                          icon="pi pi-check"
                          disabled={isProcessing}
                          onClick={() => handleMarkRead(notification)}
                          className="p-button-sm p-button-outlined"
                        />
                      )}

                      <Button
                        type="button"
                        label="Archive"
                        icon="pi pi-times"
                        disabled={isProcessing}
                        onClick={() => handleArchive(notification)}
                        className="p-button-sm p-button-outlined p-button-secondary"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenterTableData;
