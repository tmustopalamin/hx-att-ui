"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import useSWR from "swr";
import dayjs from "dayjs";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { confirmDialog, ConfirmDialog } from "primereact/confirmdialog";
import { Password } from "primereact/password";
import { ProgressSpinner } from "primereact/progressspinner";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";

import CardTitle from "@/app/_components/CardTitle";
import {
  getAccount,
  getSessionSummary,
  revokeOtherSessions,
} from "@/app/services/account-service";
import { changePassword } from "@/app/services/user-service";
import type { FormChangePassword } from "@/app/types/form-change-password";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { clearProfile } from "@/store/me/ProfileSlice";
import { showToast } from "@/store/ToastSlice";

const strongPassword =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/;

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Not available";
  const date = dayjs(value);
  return date.isValid() ? date.format("DD MMM YYYY, HH:mm") : "Not available";
};

const InfoItem = ({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number;
  children?: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
    </div>
    <div className="mt-1 break-words text-sm font-semibold text-slate-900">
      {children ?? value ?? "-"}
    </div>
  </div>
);

const SectionHeader = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="mb-5">
    <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
    <p className="mt-1 text-sm text-slate-500">{description}</p>
  </div>
);

const AccountSettingsPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const {
    data: account,
    error: accountError,
    isLoading: accountLoading,
  } = useSWR("/api/auth/me", getAccount, { revalidateOnFocus: false });
  const {
    data: sessionResponse,
    error: sessionError,
    isLoading: sessionLoading,
    mutate: refreshSessions,
  } = useSWR("/api/auth/sessions", getSessionSummary, {
    revalidateOnFocus: false,
  });

  const {
    handleSubmit,
    control,
    getValues,
    reset,
    formState: { isValid },
  } = useForm<FormChangePassword>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      newPasswordRetype: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    document.title = "Account Settings";
  }, []);

  const passwordRules = useMemo(
    () => [
      "12–128 characters",
      "Uppercase and lowercase letters",
      "At least one number",
      "At least one symbol",
    ],
    [],
  );

  const redirectToLogin = async () => {
    dispatch(clearProfile());
    router.replace("/login?reason=password-changed");
  };

  const onSubmit = async (formData: FormChangePassword) => {
    if (!isValid || submitting) return;

    try {
      setSubmitting(true);
      await changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });
      reset();
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Password changed",
          detail: "Please sign in again with your new password.",
        }),
      );
      await redirectToLogin();
    } catch (error: unknown) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Unable to change password",
          detail: isResponseTypeError(error)
            ? getErrorMessage(error, "message")
            : error instanceof Error
              ? error.message
              : "Unexpected error occurred. Please try again.",
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeOthers = async () => {
    try {
      setRevoking(true);
      const response = await revokeOtherSessions();
      await refreshSessions();
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Sessions secured",
          detail:
            response.data.revoked_count > 0
              ? `${response.data.revoked_count} other session(s) signed out.`
              : "There were no other sessions to sign out.",
        }),
      );
    } catch (error: unknown) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Unable to sign out sessions",
          detail: isResponseTypeError(error)
            ? getErrorMessage(error, "message")
            : "Session service is temporarily unavailable.",
        }),
      );
    } finally {
      setRevoking(false);
    }
  };

  const askRevokeOthers = () =>
    confirmDialog({
      header: "Sign out other sessions?",
      message:
        "Other browsers and devices will need to sign in again. This session will remain active.",
      icon: "pi pi-shield",
      acceptLabel: "Sign Out Others",
      rejectLabel: "Cancel",
      acceptClassName: "p-button-danger",
      accept: () => void handleRevokeOthers(),
    });

  return (
    <Card title={<CardTitle title="Account Settings" url="" />}>
      <ConfirmDialog />
      <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        Account Settings controls sign-in and account security. Employee
        information remains available in{" "}
        <Link href="/my-profile" className="font-semibold underline">
          My Profile
        </Link>
        .
      </div>

      <TabView>
        <TabPanel header="Account" leftIcon="pi pi-user mr-2">
          <SectionHeader
            title="Account overview"
            description="Read-only sign-in identity and access information."
          />
          {accountLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <ProgressSpinner style={{ width: 40, height: 40 }} />
            </div>
          ) : accountError || !account ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Account information could not be loaded.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoItem label="Full name" value={account.name} />
              <InfoItem label="Username" value={account.username} />
              <InfoItem label="Login email" value={account.email} />
              <InfoItem label="Employee ID" value={account.employee_id} />
              <InfoItem label="Roles">
                <div className="flex flex-wrap gap-2">
                  {account.role.map((role) => (
                    <Tag key={role} value={role} severity="info" />
                  ))}
                </div>
              </InfoItem>
              <InfoItem label="Security status">
                <Tag
                  value={
                    account.must_change_password
                      ? "Password change required"
                      : "Account secured"
                  }
                  severity={
                    account.must_change_password ? "warning" : "success"
                  }
                />
              </InfoItem>
              <InfoItem
                label="Last login"
                value={formatDateTime(account.last_login_at)}
              />
              <InfoItem
                label="Password last changed"
                value={formatDateTime(account.password_changed_at)}
              />
            </div>
          )}
        </TabPanel>

        <TabPanel header="Security" leftIcon="pi pi-lock mr-2">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,640px)_minmax(260px,1fr)]">
            <div>
              <SectionHeader
                title="Change password"
                description="Changing your password signs out existing sessions."
              />
              <form
                className="space-y-4"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
              >
                {(
                  [
                    ["currentPassword", "Current password"],
                    ["newPassword", "New password"],
                    ["newPasswordRetype", "Confirm new password"],
                  ] as const
                ).map(([name, label]) => (
                  <div key={name} className="flex flex-col gap-2">
                    <label
                      htmlFor={name}
                      className="text-sm font-medium text-slate-700"
                    >
                      {label}
                    </label>
                    <Controller
                      name={name}
                      control={control}
                      rules={{
                        required: `${label} is required.`,
                        validate: (value) => {
                          if (
                            name === "newPassword" &&
                            value === getValues("currentPassword")
                          ) {
                            return "New password must be different.";
                          }
                          if (
                            name === "newPassword" &&
                            !strongPassword.test(value)
                          ) {
                            return "Password does not meet the security requirements.";
                          }
                          if (
                            name === "newPasswordRetype" &&
                            value !== getValues("newPassword")
                          ) {
                            return "Passwords do not match.";
                          }
                          return true;
                        },
                      }}
                      render={({ field, fieldState }) => (
                        <>
                          <Password
                            {...field}
                            inputId={name}
                            toggleMask
                            feedback={name === "newPassword"}
                            disabled={submitting}
                            className="w-full"
                            inputClassName={`w-full ${fieldState.invalid ? "p-invalid" : ""}`}
                          />
                          {fieldState.error && (
                            <small className="text-red-600">
                              {fieldState.error.message}
                            </small>
                          )}
                        </>
                      )}
                    />
                  </div>
                ))}
                <div className="flex justify-end border-t border-slate-200 pt-4">
                  <Button
                    type="submit"
                    label={submitting ? "Changing..." : "Change Password"}
                    icon={submitting ? "pi pi-spin pi-spinner" : "pi pi-lock"}
                    disabled={!isValid || submitting}
                  />
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">
                Password requirements
              </h3>
              <ul className="mt-4 space-y-3">
                {passwordRules.map((rule) => (
                  <li
                    key={rule}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <i className="pi pi-check-circle text-emerald-600" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </TabPanel>

        <TabPanel header="Sessions" leftIcon="pi pi-desktop mr-2">
          <SectionHeader
            title="Active sessions"
            description="Review and revoke persistent sign-in sessions for your account."
          />
          {sessionLoading ? (
            <ProgressSpinner style={{ width: 36, height: 36 }} />
          ) : sessionError || !sessionResponse ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Session information is temporarily unavailable.
            </div>
          ) : (
            <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <i className="pi pi-desktop text-blue-600" />
                    <span className="font-semibold text-slate-900">
                      Current browser
                    </span>
                    <Tag value="Current" severity="success" />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {sessionResponse.data.active_count} active persistent
                    session(s), including this browser.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Revoked devices may retain access for up to 15 minutes until
                    their short-lived access token expires.
                  </p>
                </div>
                <Button
                  type="button"
                  label={
                    revoking
                      ? "Signing Out..."
                      : `Sign Out Other Sessions (${sessionResponse.data.other_count})`
                  }
                  icon={revoking ? "pi pi-spin pi-spinner" : "pi pi-sign-out"}
                  severity="danger"
                  outlined
                  disabled={revoking || sessionResponse.data.other_count === 0}
                  onClick={askRevokeOthers}
                />
              </div>
            </div>
          )}
        </TabPanel>
      </TabView>
    </Card>
  );
};

export default AccountSettingsPage;
