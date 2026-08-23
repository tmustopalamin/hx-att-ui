// app/(admin)/account-settings/ChangeProfilePicture.tsx

"use client";
import { useI18n } from "@/app/i18n";

import { apiFetchResponse } from "@/app/utils/api-client";

import { useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useSWR, { mutate } from "swr";

import { Avatar } from "primereact/avatar";
import { Button } from "primereact/button";
import { FileUpload } from "primereact/fileupload";
import type { FileUploadHandlerEvent } from "primereact/fileupload";
import { ProgressSpinner } from "primereact/progressspinner";
import { Tag } from "primereact/tag";

import { Employee } from "@/app/types/employee";
import { Me } from "@/app/types/me";
import { uploadEmployeePhoto } from "@/app/services/employee-service";
import { fetcher } from "@/app/utils/fetcher";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";

import { updateDataProfile } from "@/store/me/ProfileSlice";
import { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

interface ChangeProfilePictureProps {
  employeeId?: string | number;
  title?: string;
  description?: string;
  showCurrentPhoto?: boolean;
  showRefreshButton?: boolean;
}

const getPhotoUrl = (photoUrl?: string | null) => {
  if (!photoUrl) return undefined;

  if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
    return photoUrl;
  }

  if (photoUrl.startsWith("/")) {
    return photoUrl;
  }

  return `/api/public/images/uploads/${encodeURIComponent(photoUrl)}`;
};

const getInitials = (employee?: Employee | null, me?: Me | null) => {
  const employeeFirst = employee?.first_name?.trim()?.charAt(0) ?? "";
  const employeeLast = employee?.last_name?.trim()?.charAt(0) ?? "";

  if (employeeFirst || employeeLast) {
    return `${employeeFirst}${employeeLast}`.toUpperCase();
  }

  const name = me?.name?.trim() ?? "";
  if (name) {
    const words = name.split(" ").filter(Boolean);
    const first = words[0]?.charAt(0) ?? "";
    const last =
      words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";

    return `${first}${last}`.toUpperCase() || "EM";
  }

  return "EM";
};

const getDisplayName = (employee?: Employee | null, me?: Me | null) => {
  if (employee?.full_name?.trim()) return employee.full_name;

  const employeeName = [
    employee?.first_name,
    employee?.middle_name,
    employee?.last_name,
  ]
    .filter(Boolean)
    .join(" ");

  if (employeeName.trim()) return employeeName;

  if (me?.name?.trim()) return me.name;

  return "Employee";
};

const fetchMe = async (): Promise<Me> => {
  const res = await apiFetchResponse("/api/auth/me", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to refresh profile data.");
  }

  return res.json();
};

const ChangeProfilePicture = ({
  employeeId,
  title = "Edit Photo",
  description = "Upload a new profile picture.",
  showCurrentPhoto = true,
  showRefreshButton = true,
}: ChangeProfilePictureProps) => {
  const { t: i18nT, tText } = useI18n();
  const localizedTitle = tText(title);
  const localizedDescription = tText(description);
  const dispatch = useDispatch();
  const fileUploadRef = useRef<FileUpload | null>(null);

  const profileState = useSelector((state: RootState) => state.profile);
  const [isUploading, setIsUploading] = useState(false);

  /*
    Important:
    Fetch /api/auth/me only for reading current login info.
    Do NOT dispatch updateDataProfile on mount, because this component is also used
    on employee detail pages and changing global profile state can affect sidebar/menu.
  */
  const { data: meData } = useSWR<Me>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
  });

  const targetEmployeeId = useMemo(() => {
    if (
      employeeId !== undefined &&
      employeeId !== null &&
      String(employeeId).trim() !== ""
    ) {
      return Number(employeeId);
    }

    if (profileState.employee_id) {
      return Number(profileState.employee_id);
    }

    if (meData?.employee_id) {
      return Number(meData.employee_id);
    }

    return null;
  }, [employeeId, profileState.employee_id, meData?.employee_id]);

  const isOwnProfile = useMemo(() => {
    if (!targetEmployeeId) return false;

    const profileEmployeeId = profileState.employee_id
      ? Number(profileState.employee_id)
      : null;

    const meEmployeeId = meData?.employee_id
      ? Number(meData.employee_id)
      : null;

    return (
      targetEmployeeId === profileEmployeeId ||
      targetEmployeeId === meEmployeeId
    );
  }, [targetEmployeeId, profileState.employee_id, meData?.employee_id]);

  const employeePersonalDataKey = targetEmployeeId
    ? `/api/employees/${targetEmployeeId}/personal-data`
    : null;

  const {
    data: employeeData,
    isLoading: isEmployeeLoading,
    error: employeeError,
  } = useSWR<Employee>(employeePersonalDataKey, fetcher, {
    revalidateOnFocus: false,
  });

  const currentPhotoUrl = useMemo(() => {
    if (employeeData?.photo_url) return employeeData.photo_url;

    if (isOwnProfile && profileState.photo_url) {
      return profileState.photo_url;
    }

    if (isOwnProfile && meData?.photo_url) {
      return meData.photo_url;
    }

    return null;
  }, [
    employeeData?.photo_url,
    isOwnProfile,
    profileState.photo_url,
    meData?.photo_url,
  ]);

  const displayName = getDisplayName(employeeData, meData ?? null);
  const initials = getInitials(employeeData, meData ?? null);

  const refreshAfterUpload = async () => {
    if (targetEmployeeId) {
      await mutate(`/api/employees/${targetEmployeeId}/personal-data`);
    }

    await mutate(
      (key) => typeof key === "string" && key.startsWith("/api/employees/list"),
      undefined,
      { revalidate: true },
    );

    if (!isOwnProfile) {
      return;
    }

    await mutate("/api/auth/me");

    /*
      Only update global profile after successful upload and only for own profile.
      Preserve current role and permissions if they already exist, so menu access
      does not disappear when /api/auth/me returns partial or changed auth data.
    */
    try {
      const refreshedMe = await fetchMe();

      const currentRole = profileState.role;
      const hasCurrentRole =
        Array.isArray(currentRole) && currentRole.length > 0;

      const currentPermissions = profileState.permissions;
      const hasCurrentPermissions =
        Array.isArray(currentPermissions) && currentPermissions.length > 0;

      dispatch(
        updateDataProfile({
          user_id: refreshedMe.user_id,
          employee_id: refreshedMe.employee_id,
          email: refreshedMe.email,
          username: refreshedMe.username,
          name: refreshedMe.name,
          role: hasCurrentRole ? currentRole : refreshedMe.role,
          permissions: hasCurrentPermissions
            ? currentPermissions
            : refreshedMe.permissions,
          photo_url: refreshedMe.photo_url,
          must_change_password: refreshedMe.must_change_password,
          last_login_at: refreshedMe.last_login_at,
          password_changed_at: refreshedMe.password_changed_at,
        }),
      );
    } catch {
      // Photo upload already succeeded. Do not fail page only because profile refresh failed.
    }
  };

  const handleUpload = async (event: FileUploadHandlerEvent) => {
    const file = event.files[0];

    if (!targetEmployeeId) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.npsixg"),
          detail: i18nT("static.1af5xzm"),
        }),
      );
      return;
    }

    if (!file) {
      dispatch(
        showToast({
          visible: true,
          severity: "warn",
          summary: i18nT("static.fh2d8v"),
          detail: i18nT("static.171q004"),
        }),
      );
      return;
    }

    try {
      setIsUploading(true);

      const response = await uploadEmployeePhoto(targetEmployeeId, file);

      await refreshAfterUpload();

      fileUploadRef.current?.clear();

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: i18nT("static.udvru8"),
          detail: response.message || i18nT("static.162q1bg"),
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.npsixg"),
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.npsixg"),
            detail: err.message,
          }),
        );
      } else {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: i18nT("static.npsixg"),
            detail: i18nT("static.1p5fa6d"),
          }),
        );
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          {localizedTitle}
        </h2>
        <p className="mt-1 text-sm text-gray-500">{localizedDescription}</p>
      </div>

      <div
        className={
          showCurrentPhoto
            ? "grid grid-cols-1 gap-5 xl:grid-cols-[260px_minmax(0,1fr)]"
            : "grid grid-cols-1 gap-5"
        }
      >
        {showCurrentPhoto && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-col items-center gap-3">
              {isEmployeeLoading ? (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white">
                  <ProgressSpinner style={{ width: "36px", height: "36px" }} />
                </div>
              ) : (
                <Avatar
                  label={initials}
                  image={getPhotoUrl(currentPhotoUrl)}
                  shape="circle"
                  style={{ width: "7rem", height: "7rem", fontSize: "2.5rem" }}
                  className="bg-blue-100 text-blue-700"
                />
              )}

              <div className="text-center">
                <div className="max-w-56 truncate text-sm font-semibold text-slate-900">
                  {displayName === "Employee" ? tText("Employee") : displayName}
                </div>

                {targetEmployeeId ? (
                  <div className="mt-1 text-xs text-slate-500">
                    {i18nT("static.1i0c9sc")} {targetEmployeeId}
                  </div>
                ) : (
                  <Tag value={i18nT("static.zp9cy9")} severity="danger" />
                )}
              </div>

              {employeeError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {i18nT("static.p8ukxk")}{" "}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
          <FileUpload
            ref={fileUploadRef}
            name="file"
            accept="image/png,image/jpeg"
            maxFileSize={1048576}
            multiple={false}
            customUpload
            uploadHandler={handleUpload}
            disabled={isUploading || !targetEmployeeId}
            previewWidth={220}
            chooseLabel={i18nT("static.5idlz1")}
            uploadLabel={isUploading ? "Uploading..." : "Upload"}
            cancelLabel={i18nT("static.ew9em3")}
            emptyTemplate={
              <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
                <i className="pi pi-image text-3xl text-slate-400" />
                <p className="m-0 text-sm text-slate-500">
                  {i18nT("static.1xuyiwk")}{" "}
                </p>
                <p className="m-0 text-xs text-slate-400">
                  {i18nT("static.1a9s728")}{" "}
                </p>
              </div>
            }
          />

          <div className="mt-4 flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
            <i className="pi pi-info-circle mt-0.5" />
            <div>
              {i18nT("static.4grqfl")}{" "}
              {isOwnProfile ? i18nT("static.mg6idt") : ""}
            </div>
          </div>
        </div>
      </div>

      {showRefreshButton && (
        <div>
          <Button
            type="button"
            icon="pi pi-refresh"
            label={i18nT("static.84cvjk")}
            className="p-button-secondary p-button-sm"
            disabled={!targetEmployeeId || isUploading}
            onClick={() => {
              void refreshAfterUpload();
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ChangeProfilePicture;
