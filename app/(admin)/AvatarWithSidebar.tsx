"use client";

import { apiFetchResponse } from "@/app/utils/api-client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "primereact/avatar";
import { Sidebar } from "primereact/sidebar";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
const AvatarWithSidebar = () => {
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileData = useSelector((state: RootState) => state.profile);
  const router = useRouter();
  const dispatch = useDispatch();
  const appendTarget = () => document.body;
  const avatarLabel = useMemo(() => {
    const name = profileData?.name?.trim();
    if (!name) {
      return "U";
    }
    return name.charAt(0).toUpperCase();
  }, [profileData?.name]);
  const avatarImageUrl = useMemo(() => {
    if (!profileData?.photo_url) {
      return undefined;
    }
    const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(
      /\/$/,
      "",
    );
    if (!apiBaseUrl) {
      return `/api/public/images/uploads/${profileData.photo_url}`;
    }
    return `${apiBaseUrl}/api/public/images/uploads/${profileData.photo_url}`;
  }, [profileData?.photo_url]);
  const closeSidebar = () => {
    setIsSidebarVisible(false);
  };
  const onClickLogout = async () => {
    try {
      setLoggingOut(true);
      const res = await apiFetchResponse("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      const responseData = await res.json().catch(() => null);
      if (!res.ok) {
        const errorMessage =
          responseData?.message || "Failed to logout. Please try again.";
        throw new Error(errorMessage);
      }
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Logout Success",
          detail: "Redirecting to login page...",
        }),
      );
      setIsSidebarVisible(false);
      setTimeout(() => {
        router.push("/login");
      }, 800);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unexpected error occurred. Please try again.";
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Logout Failed",
          detail: errorMessage,
        }),
      );
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <>
      {" "}
      <button
        type="button"
        onClick={() => setIsSidebarVisible(true)}
        className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-1.5 py-1.5 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
        aria-label="Open account menu"
      >
        {" "}
        <div className="hidden min-w-0 text-right sm:block">
          {" "}
          <p className="max-w-[12rem] truncate text-sm font-semibold text-slate-700">
            {" "}
            {profileData?.name || "User"}{" "}
          </p>{" "}
          <p className="text-xs text-slate-500">Account Menu</p>{" "}
        </div>{" "}
        <Avatar
          size="large"
          style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
          label={avatarLabel}
          image={avatarImageUrl}
          shape="circle"
        />{" "}
      </button>{" "}
      <Sidebar
        appendTo={appendTarget}
        visible={isSidebarVisible}
        position="right"
        onHide={() => setIsSidebarVisible(false)}
        className="!w-full sm:!w-[24rem]"
      >
        {" "}
        <div className="flex h-full flex-col">
          {" "}
          <div className="border-b border-slate-200 pb-6">
            {" "}
            <div className="flex items-center gap-4">
              {" "}
              <Avatar
                size="xlarge"
                style={{ backgroundColor: "#2563eb", color: "#ffffff" }}
                label={avatarLabel}
                image={avatarImageUrl}
                shape="circle"
              />{" "}
              <div className="min-w-0">
                {" "}
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {" "}
                  Signed in as{" "}
                </p>{" "}
                <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">
                  {" "}
                  {profileData?.name || "User"}{" "}
                </h3>{" "}
                <p className="mt-1 text-sm text-slate-500">
                  {" "}
                  Manage your account, notifications, and current session.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex-1 py-6">
            {" "}
            <div className="space-y-3">
              {" "}
              <Link
                href="/account-settings"
                onClick={closeSidebar}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:bg-slate-50"
              >
                {" "}
                <div className="mt-1 text-blue-600">
                  {" "}
                  <i className="pi pi-user text-lg" />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-slate-800">
                    {" "}
                    Account Settings{" "}
                  </p>{" "}
                  <p className="mt-1 text-sm text-slate-500">
                    {" "}
                    Change your account details and profile information.{" "}
                  </p>{" "}
                </div>{" "}
              </Link>{" "}
              <Link
                href="/notification-center"
                onClick={closeSidebar}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition-colors hover:bg-slate-50"
              >
                {" "}
                <div className="mt-1 text-blue-600">
                  {" "}
                  <i className="pi pi-bell text-lg" />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <p className="text-sm font-semibold text-slate-800">
                    {" "}
                    Notifications{" "}
                  </p>{" "}
                  <p className="mt-1 text-sm text-slate-500">
                    {" "}
                    View approval alerts, HRIS updates, and system
                    messages.{" "}
                  </p>{" "}
                </div>{" "}
              </Link>{" "}
              <button
                type="button"
                onClick={onClickLogout}
                disabled={loggingOut}
                className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {" "}
                <div className="mt-1 text-blue-600">
                  {" "}
                  <i className="pi pi-power-off text-lg" />{" "}
                </div>{" "}
                <div className="flex-1">
                  {" "}
                  <p className="text-sm font-semibold text-slate-800">
                    {" "}
                    {loggingOut ? "Signing Out..." : "Sign Out"}{" "}
                  </p>{" "}
                  <p className="mt-1 text-sm text-slate-500">
                    {" "}
                    End the current session and return to the login page.{" "}
                  </p>{" "}
                </div>{" "}
              </button>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </Sidebar>{" "}
    </>
  );
};
export default AvatarWithSidebar;
