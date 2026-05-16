"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { OverlayPanel } from "primereact/overlaypanel";
import { ProgressSpinner } from "primereact/progressspinner";

import {
    archiveNotification,
    getMyNotifications,
    getUnreadNotificationCount,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    NotificationItem,
} from "../services/notification-service";

const MAX_BADGE_COUNT = 99;

const formatNotificationTime = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
        return "Just now";
    }

    if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
        return `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);

    if (diffDays < 7) {
        return `${diffDays}d ago`;
    }

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
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

const NotificationBell = () => {
    const router = useRouter();
    const panelRef = useRef<OverlayPanel>(null);

    const [loading, setLoading] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const badgeLabel = useMemo(() => {
        if (unreadCount <= 0) {
            return "";
        }

        if (unreadCount > MAX_BADGE_COUNT) {
            return `${MAX_BADGE_COUNT}+`;
        }

        return String(unreadCount);
    }, [unreadCount]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const result = await getUnreadNotificationCount();
            setUnreadCount(result.unread_count ?? 0);
        } catch {
            setUnreadCount(0);
        }
    }, []);

    const fetchNotifications = useCallback(async () => {
        setLoading(true);

        try {
            const result = await getMyNotifications({
                limit: 10,
                offset: 0,
            });

            console.log("NOTIFICATION RESULT", result);


            setNotifications(result);
        } catch {
            setNotifications([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnreadCount();

        const interval = window.setInterval(() => {
            fetchUnreadCount();
        }, 30000);

        return () => {
            window.clearInterval(interval);
        };
    }, [fetchUnreadCount]);

    const openPanel = async (event: React.MouseEvent<HTMLButtonElement>) => {
        panelRef.current?.toggle(event);
        await fetchNotifications();
        await fetchUnreadCount();
    };

    const handleClickNotification = async (notification: NotificationItem) => {
        try {
            setActionLoadingId(notification.id);

            if (!notification.is_read) {
                await markNotificationAsRead(notification.id);
            }

            panelRef.current?.hide();

            if (notification.action_url) {
                router.push(notification.action_url);
            }

            await fetchUnreadCount();
            await fetchNotifications();
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            setLoading(true);

            await markAllNotificationsAsRead();
            await fetchUnreadCount();
            await fetchNotifications();
        } finally {
            setLoading(false);
        }
    };

    const handleArchive = async (
        event: React.MouseEvent<HTMLButtonElement>,
        notification: NotificationItem
    ) => {
        event.stopPropagation();

        try {
            setActionLoadingId(notification.id);

            await archiveNotification(notification.id);
            await fetchUnreadCount();
            await fetchNotifications();
        } finally {
            setActionLoadingId(null);
        }
    };

    const handleViewAll = () => {
        panelRef.current?.hide();
        router.push("/notification-center");
    };

    return (
        <>
            <button
                type="button"
                onClick={openPanel}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                aria-label="Open notifications"
            >
                <i className="pi pi-bell text-lg" />

                {badgeLabel && (
                    <span className="absolute -right-1 -top-1 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ring-2 ring-white">
                        {badgeLabel}
                    </span>
                )}
            </button>

            <OverlayPanel
                ref={panelRef}
                appendTo={typeof window !== "undefined" ? document.body : undefined}
                className="!mt-2 !w-[calc(100vw-2rem)] !max-w-[26rem] !rounded-2xl !border !border-slate-200 !shadow-xl"
            >
                <div className="overflow-hidden rounded-2xl bg-white">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-4">
                        <div>
                            <p className="text-sm font-bold text-slate-900">Notifications</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Latest HRIS updates and approval alerts.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleMarkAllRead}
                            disabled={loading || unreadCount <= 0}
                            className="rounded-full px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
                        >
                            Mark all read
                        </button>
                    </div>

                    <div className="max-h-[26rem] overflow-y-auto">
                        {loading && (
                            <div className="flex items-center justify-center py-10">
                                <ProgressSpinner
                                    style={{ width: "32px", height: "32px" }}
                                    strokeWidth="5"
                                />
                            </div>
                        )}

                        {!loading && notifications.length === 0 && (
                            <div className="px-5 py-10 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                    <i className="pi pi-bell-slash text-lg" />
                                </div>
                                <p className="mt-3 text-sm font-semibold text-slate-800">
                                    No notifications
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    New approval and HRIS updates will appear here.
                                </p>
                            </div>
                        )}

                        {!loading &&
                            notifications.map((notification) => {
                                const isProcessing = actionLoadingId === notification.id;

                                return (
                                    <button
                                        key={notification.id}
                                        type="button"
                                        disabled={isProcessing}
                                        onClick={() => handleClickNotification(notification)}
                                        className={`flex w-full gap-3 border-b border-slate-100 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70 ${notification.is_read ? "bg-white" : "bg-blue-50/40"
                                            }`}
                                    >
                                        <div className="relative mt-0.5">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-blue-700 ring-1 ring-slate-200">
                                                <i
                                                    className={`pi ${getModuleIcon(
                                                        notification.module_code
                                                    )} text-sm`}
                                                />
                                            </div>

                                            {!notification.is_read && (
                                                <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-600 ring-2 ring-white" />
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <p className="line-clamp-1 text-sm font-semibold text-slate-900">
                                                    {notification.title}
                                                </p>

                                                <span className="shrink-0 text-[11px] text-slate-400">
                                                    {formatNotificationTime(notification.created_at)}
                                                </span>
                                            </div>

                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                                                {notification.message}
                                            </p>

                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                                        {notification.module_code}
                                                    </span>

                                                    <span
                                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${getPriorityClass(
                                                            notification.priority
                                                        )}`}
                                                    >
                                                        {notification.priority}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(event) => handleArchive(event, notification)}
                                                    className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-slate-700"
                                                    aria-label="Archive notification"
                                                >
                                                    <i className="pi pi-times text-xs" />
                                                </button>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                    </div>

                    <div className="border-t border-slate-100 p-3">
                        <button
                            type="button"
                            onClick={handleViewAll}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                        >
                            <span>View all notifications</span>
                            <i className="pi pi-arrow-right text-xs" />
                        </button>
                    </div>
                </div>
            </OverlayPanel>
        </>
    );
};

export default NotificationBell;