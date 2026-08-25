"use client";
import { useI18n } from "@/app/i18n";

import { getMobileAppSettings } from "@/app/services/mobile-app-settings-service";
import type { MobileAppSettings } from "@/app/types/mobile-app-settings";
import { apiFetchResponse } from "@/app/utils/api-client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "primereact/avatar";
import { Sidebar } from "primereact/sidebar";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const MOBILE_APP_SETTINGS_KEY = "/api/mobile-app-settings";
const MOBILE_APP_DOWNLOAD_URL = "/api/mobile-app-settings/download";

const getSafeExternalUrl = (value?: string | null) => {
  if (!value?.trim()) {
    return null;
  }

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

const AvatarWithSidebar = () => {
  const { t, tText } = useI18n();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileData = useSelector((state: RootState) => state.profile);
  const router = useRouter();
  const dispatch = useDispatch();
  const appendTarget = () => document.body;
  const { data: mobileAppSettings } = useSWR<MobileAppSettings>(
    isSidebarVisible ? MOBILE_APP_SETTINGS_KEY : null,
    getMobileAppSettings,
    { revalidateOnFocus: false },
  );
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
  const mobileAppUrl = useMemo(
    () => getSafeExternalUrl(mobileAppSettings?.target_url),
    [mobileAppSettings?.target_url],
  );
  const mobileAppActionUrl = mobileAppUrl
    ? mobileAppSettings?.action === "download"
      ? MOBILE_APP_DOWNLOAD_URL
      : mobileAppUrl
    : null;
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
          summary: t("auth.accountMenu.logoutSuccess"),
          detail: t("auth.accountMenu.logoutRedirecting"),
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
          summary: t("auth.accountMenu.logoutFailed"),
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
        aria-label={t("auth.accountMenu.open")}
      >
        {" "}
        <div className="hidden min-w-0 text-right sm:block">
          {" "}
          <p className="max-w-[12rem] truncate text-sm font-semibold text-slate-700">
            {" "}
            {profileData?.name || t("auth.accountMenu.user")}{" "}
          </p>{" "}
          <p className="text-xs text-slate-500">
            {t("auth.accountMenu.account")}
          </p>{" "}
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
                  {t("auth.accountMenu.signedInAs")}{" "}
                </p>{" "}
                <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">
                  {" "}
                  {profileData?.name || t("auth.accountMenu.user")}{" "}
                </h3>{" "}
                <p className="mt-1 text-sm text-slate-500">
                  {" "}
                  {t("auth.accountMenu.description")}{" "}
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
                    {t("auth.accountMenu.settings")}{" "}
                  </p>{" "}
                  <p className="mt-1 text-sm text-slate-500">
                    {" "}
                    {t("auth.accountMenu.settingsDescription")}{" "}
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
                    {t("auth.accountMenu.notifications")}{" "}
                  </p>{" "}
                  <p className="mt-1 text-sm text-slate-500">
                    {" "}
                    {t("auth.accountMenu.notificationsDescription")}{" "}
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
                    {loggingOut
                      ? t("auth.accountMenu.signingOut")
                      : t("auth.accountMenu.signOut")}{" "}
                  </p>{" "}
                  <p className="mt-1 text-sm text-slate-500">
                    {" "}
                    {t("auth.accountMenu.signOutDescription")}{" "}
                  </p>{" "}
                </div>{" "}
              </button>{" "}
            </div>{" "}
          </div>{" "}
          {mobileAppSettings?.is_enabled && mobileAppActionUrl && (
            <div className="mt-auto border-t border-slate-200 pt-5">
              <a
                href={mobileAppActionUrl}
                target={
                  mobileAppSettings.action === "download" ? undefined : "_blank"
                }
                rel={
                  mobileAppSettings.action === "download"
                    ? undefined
                    : "noreferrer"
                }
                download={mobileAppSettings.action === "download"}
                onClick={closeSidebar}
                className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-blue-800 transition-colors hover:border-blue-200 hover:bg-blue-100"
                aria-label={
                  mobileAppSettings.label ||
                  tText("Download Hexing HRIS Mobile")
                }
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                  <i className="pi pi-mobile text-lg" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">
                    {mobileAppSettings.label ||
                      tText("Download Hexing HRIS Mobile")}
                  </span>
                  <span className="mt-0.5 block text-xs text-blue-600">
                    {mobileAppSettings.action === "download"
                      ? tText("Download Android application")
                      : tText("Open mobile application link")}
                  </span>
                </span>
                <i
                  className={`pi ${mobileAppSettings.action === "download" ? "pi-download" : "pi-external-link"} shrink-0 text-sm`}
                />
              </a>
            </div>
          )}
        </div>{" "}
      </Sidebar>{" "}
    </>
  );
};
export default AvatarWithSidebar;
