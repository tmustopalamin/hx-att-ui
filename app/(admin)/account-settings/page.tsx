"use client";
import { useI18n } from "@/app/i18n";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import useSWR from "swr";
import { formatDateTime as formatDisplayDateTime } from "@/app/utils/date-format";

import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
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
  return formatDisplayDateTime(value, "Not available");
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
  const { t: i18nT } = useI18n();
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
          summary: i18nT("static.466mdo"),
          detail: i18nT("static.17qfdiz"),
        }),
      );
      await redirectToLogin();
    } catch (error: unknown) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.w31is6"),
          detail: isResponseTypeError(error)
            ? getErrorMessage(error, "message")
            : error instanceof Error
              ? error.message
              : i18nT("static.12ynlbk"),
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
          summary: i18nT("static.9xg9k3"),
          detail:
            response.data.revoked_count > 0
              ? i18nT("static.3oggrr", { p0: response.data.revoked_count })
              : i18nT("static.m5aytg"),
        }),
      );
    } catch (error: unknown) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: i18nT("static.1k5njcl"),
          detail: isResponseTypeError(error)
            ? getErrorMessage(error, "message")
            : i18nT("static.2n6q28"),
        }),
      );
    } finally {
      setRevoking(false);
    }
  };

  const askRevokeOthers = () =>
    requestActionConfirmation({
      header: i18nT("static.1bhx7a4"),
      message: i18nT("static.rhjfv3"),
      icon: "pi pi-shield",
      acceptLabel: "Sign Out Others",
      rejectLabel: "Cancel",
      acceptClassName: "p-button-danger",
      accept: () => void handleRevokeOthers(),
    });

  return (
    <Card title={<CardTitle title={i18nT("static.10tvoe1")} url="" />}>
      <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        {i18nT("static.10sfe8f")}{" "}
        <Link href="/my-profile" className="font-semibold underline">
          {i18nT("static.1g5mem2")}{" "}
        </Link>
        .
      </div>

      <TabView>
        <TabPanel header={i18nT("static.oyp43g")} leftIcon="pi pi-user mr-2">
          <SectionHeader
            title={i18nT("static.1o3ojo7")}
            description={i18nT("static.1vvc5ie")}
          />
          {accountLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <ProgressSpinner style={{ width: 40, height: 40 }} />
            </div>
          ) : accountError || !account ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {i18nT("static.82ou9y")}{" "}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <InfoItem label={i18nT("static.13z0t9r")} value={account.name} />
              <InfoItem
                label={i18nT("static.7s11ax")}
                value={account.username}
              />
              <InfoItem label={i18nT("static.1iypo76")} value={account.email} />
              <InfoItem
                label={i18nT("static.1lghzb2")}
                value={account.employee_id}
              />
              <InfoItem label={i18nT("static.hbz43i")}>
                <div className="flex flex-wrap gap-2">
                  {account.role.map((role) => (
                    <Tag key={role} value={role} severity="info" />
                  ))}
                </div>
              </InfoItem>
              <InfoItem label={i18nT("static.evyv6r")}>
                <Tag
                  value={
                    account.must_change_password
                      ? i18nT("static.q6l6ix")
                      : i18nT("static.19a55g3")
                  }
                  severity={
                    account.must_change_password ? "warning" : "success"
                  }
                />
              </InfoItem>
              <InfoItem
                label={i18nT("static.sz3xrs")}
                value={formatDateTime(account.last_login_at)}
              />
              <InfoItem
                label={i18nT("static.1225ebg")}
                value={formatDateTime(account.password_changed_at)}
              />
            </div>
          )}
        </TabPanel>

        <TabPanel header={i18nT("static.1i3q76j")} leftIcon="pi pi-lock mr-2">
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,640px)_minmax(260px,1fr)]">
            <div>
              <SectionHeader
                title={i18nT("static.11q3s6m")}
                description={i18nT("static.26sy4o")}
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
                        required: i18nT("static.r4vbwu", { p0: label }),
                        validate: (value) => {
                          if (
                            name === "newPassword" &&
                            value === getValues("currentPassword")
                          ) {
                            return i18nT("New password must be different.");
                          }
                          if (
                            name === "newPassword" &&
                            !strongPassword.test(value)
                          ) {
                            return i18nT(
                              "Password does not meet the security requirements.",
                            );
                          }
                          if (
                            name === "newPasswordRetype" &&
                            value !== getValues("newPassword")
                          ) {
                            return i18nT("Passwords do not match.");
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
                    label={
                      submitting
                        ? i18nT("static.1z0jal0")
                        : i18nT("static.100ew7i")
                    }
                    icon={submitting ? "pi pi-spin pi-spinner" : "pi pi-lock"}
                    disabled={!isValid || submitting}
                  />
                </div>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="font-semibold text-slate-900">
                {i18nT("static.c4hhxs")}{" "}
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

        <TabPanel
          header={i18nT("static.1enz6jw")}
          leftIcon="pi pi-desktop mr-2"
        >
          <SectionHeader
            title={i18nT("static.e1ej1w")}
            description={i18nT("static.ujjpvo")}
          />
          {sessionLoading ? (
            <ProgressSpinner style={{ width: 36, height: 36 }} />
          ) : sessionError || !sessionResponse ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {i18nT("static.1ofh0b1")}{" "}
            </div>
          ) : (
            <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <i className="pi pi-desktop text-blue-600" />
                    <span className="font-semibold text-slate-900">
                      {i18nT("static.wejq2q")}{" "}
                    </span>
                    <Tag value={i18nT("static.1dw4k8q")} severity="success" />
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {sessionResponse.data.active_count}{" "}
                    {i18nT("static.1d6wq4d")}{" "}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {i18nT("static.1bm5nmg")}{" "}
                  </p>
                </div>
                <Button
                  type="button"
                  label={
                    revoking
                      ? i18nT("static.1u04oh2")
                      : i18nT("static.wmhvt6", {
                          p0: sessionResponse.data.other_count,
                        })
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
