"use client";
import { useI18n } from "@/app/i18n";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { InputOtp } from "primereact/inputotp";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";

import { ForgotPassword, ResetPassword } from "@/app/types/forgot-password";
import type { ResponseType } from "@/app/types/response-type";
import { showToast } from "@/store/ToastSlice";
import { apiFetch } from "@/app/utils/api-client";
import { getErrorMessage } from "@/app/utils/error-messages";
import LanguageSwitcher from "@/app/_components/LanguageSwitcher";

const ForgotPasswordPage = () => {
  const { t } = useI18n();
  const router = useRouter();
  const dispatch = useDispatch();

  const { handleSubmit, control } = useForm<ForgotPassword>({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
  });
  const {
    handleSubmit: handleResetPasswordSubmit,
    control: resetPasswordControl,
  } = useForm<ResetPassword>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"email" | "otp" | "password">("email");
  const [otpToken, setOtpToken] = useState<string | number | undefined | null>(
    "",
  );
  const [challengeId, setChallengeId] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.title = `${t("auth.reset.title")} - PT. Hexing Technology`;
  }, [t]);

  const onSubmit = async (formData: ForgotPassword) => {
    try {
      setSubmitting(true);
      setFormError("");

      const responseData = await apiFetch<ResponseType<string | null>>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email.trim().toLowerCase(),
          }),
        },
      );

      setStep("otp");
      setChallengeId(responseData?.data || "");

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: t("auth.reset.otpSent"),
          detail: responseData.message,
        }),
      );
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);

      setFormError(errorMessage);

      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: t("auth.reset.failed"),
          detail: errorMessage,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onClickConfirmResetPassword = async () => {
    try {
      setSubmitting(true);
      setFormError("");

      const otpValue = String(otpToken || "").trim();

      if (otpValue.length !== 6) {
        throw new Error(t("auth.reset.otpInvalid"));
      }

      if (!challengeId) {
        throw new Error(t("auth.reset.sessionExpired"));
      }

      const responseData = await apiFetch<ResponseType<string | null>>(
        "/api/auth/verify-otp",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            challenge_id: challengeId,
            otp: otpValue,
          }),
        },
      );

      const verifiedResetToken = String(responseData?.data || "").trim();
      if (!verifiedResetToken) {
        throw new Error(t("auth.reset.sessionExpired"));
      }

      setResetToken(verifiedResetToken);
      setOtpToken("");
      setStep("password");

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: t("auth.reset.success"),
          detail: responseData.message,
        }),
      );
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);

      setFormError(errorMessage);

      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: t("auth.reset.failed"),
          detail: errorMessage,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmitNewPassword = async (formData: ResetPassword) => {
    try {
      setSubmitting(true);
      setFormError("");

      if (!resetToken) {
        throw new Error(t("auth.reset.sessionExpired"));
      }

      const responseData = await apiFetch<ResponseType<unknown>>(
        "/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reset_token: resetToken,
            password: formData.password,
            confirm_password: formData.confirmPassword,
          }),
        },
      );

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: t("auth.reset.passwordReset"),
          detail: responseData.message,
        }),
      );
      router.replace("/login");
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      setFormError(errorMessage);
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: t("auth.reset.failed"),
          detail: errorMessage,
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputBaseClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

  const inputErrorClass =
    "border-red-300 focus:border-red-500 focus:ring-red-100";

  const renderStepIndicator = () => {
    return (
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === "email"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            1
          </div>
          <span
            className={`text-xs font-semibold ${
              step === "email" ? "text-slate-800" : "text-slate-500"
            }`}
          >
            {t("auth.login.email")}
          </span>
        </div>

        <div className="h-px w-8 bg-slate-300" />

        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === "otp"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            2
          </div>
          <span
            className={`text-xs font-semibold ${
              step === "otp" ? "text-slate-800" : "text-slate-500"
            }`}
          >
            {t("static.13ezd6")}{" "}
          </span>
        </div>

        <div className="h-px w-8 bg-slate-300" />

        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === "password"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            3
          </div>
          <span
            className={`text-xs font-semibold ${
              step === "password" ? "text-slate-800" : "text-slate-500"
            }`}
          >
            {t("auth.login.password")}
          </span>
        </div>
      </div>
    );
  };

  const renderErrorBanner = () => {
    if (!formError) {
      return null;
    }

    return (
      <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
            <i className="pi pi-exclamation-circle text-sm" />
          </div>

          <div>
            <p className="text-sm font-semibold text-red-700">
              {t("auth.reset.processFailed")}
            </p>
            <p className="mt-1 text-sm leading-5 text-red-600">{formError}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderForgotPassword = () => {
    return (
      <>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {t("auth.reset.title")}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t("auth.reset.emailDescription")}
          </p>
        </div>

        {renderStepIndicator()}
        {renderErrorBanner()}

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-slate-700"
            >
              {t("auth.login.email")}
            </label>

            <Controller
              name="email"
              control={control}
              rules={{
                required: t("auth.reset.emailRequired"),
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: t("auth.reset.emailInvalid"),
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                      <i className="pi pi-envelope text-sm" />
                    </span>

                    <InputText
                      id="email"
                      {...field}
                      type="email"
                      placeholder={t("static.1ng56ta")}
                      autoComplete="email"
                      disabled={submitting}
                      className={`${inputBaseClass} pl-11 pr-4 ${
                        fieldState.invalid ? inputErrorClass : ""
                      }`}
                    />
                  </div>

                  {fieldState.error && (
                    <p className="text-xs font-medium text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
          >
            {submitting && <i className="pi pi-spin pi-spinner text-sm" />}
            <span>
              {submitting
                ? t("auth.reset.sendingOtp")
                : t("auth.reset.sendOtp")}
            </span>
          </button>
        </form>
      </>
    );
  };

  const renderFormOTP = () => {
    return (
      <>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {t("auth.reset.verifyTitle")}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t("auth.reset.verifyDescription")}
          </p>
        </div>

        {renderStepIndicator()}
        {renderErrorBanner()}

        <div className="mb-6 space-y-4">
          <div className="flex justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5">
            <InputOtp
              disabled={submitting}
              value={otpToken}
              onChange={(e) => setOtpToken(e.value)}
              length={6}
              integerOnly
            />
          </div>

          <p className="text-center text-xs leading-5 text-slate-500">
            {t("auth.reset.otpInstruction")}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            disabled={submitting}
            onClick={onClickConfirmResetPassword}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
          >
            {submitting && <i className="pi pi-spin pi-spinner text-sm" />}
            <span>
              {submitting
                ? t("auth.reset.confirmingOtp")
                : t("auth.reset.confirmOtp")}
            </span>
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={() => {
              setStep("email");
              setOtpToken("");
              setChallengeId("");
              setResetToken("");
              setFormError("");
            }}
            className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            {t("auth.reset.backToEmail")}
          </button>
        </div>
      </>
    );
  };

  const renderResetPassword = () => {
    return (
      <>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">
            {t("auth.reset.createTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t("auth.reset.createDescription")}
          </p>
        </div>

        {renderStepIndicator()}
        {renderErrorBanner()}

        <form
          className="space-y-5"
          onSubmit={handleResetPasswordSubmit(onSubmitNewPassword)}
        >
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-slate-700"
            >
              {t("auth.reset.newPassword")}
            </label>
            <Controller
              name="password"
              control={resetPasswordControl}
              rules={{
                required: t("auth.reset.passwordRequired"),
                minLength: {
                  value: 12,
                  message: t("auth.reset.passwordMinLength"),
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <Password
                    inputId="password"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    toggleMask
                    feedback={false}
                    autoComplete="new-password"
                    disabled={submitting}
                    className="w-full"
                    inputClassName={`${inputBaseClass} ${
                      fieldState.invalid ? inputErrorClass : ""
                    }`}
                  />
                  {fieldState.error && (
                    <p className="text-xs font-medium text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-semibold text-slate-700"
            >
              {t("auth.reset.confirmPassword")}
            </label>
            <Controller
              name="confirmPassword"
              control={resetPasswordControl}
              rules={{ required: t("auth.reset.confirmationRequired") }}
              render={({ field, fieldState }) => (
                <>
                  <Password
                    inputId="confirmPassword"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    toggleMask
                    feedback={false}
                    autoComplete="new-password"
                    disabled={submitting}
                    className="w-full"
                    inputClassName={`${inputBaseClass} ${
                      fieldState.invalid ? inputErrorClass : ""
                    }`}
                  />
                  {fieldState.error && (
                    <p className="text-xs font-medium text-red-500">
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
          >
            {submitting && <i className="pi pi-spin pi-spinner text-sm" />}
            <span>
              {submitting ? t("auth.reset.saving") : t("auth.reset.title")}
            </span>
          </button>
        </form>
      </>
    );
  };

  return (
    <main className="fixed inset-0 flex min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
      <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
        <LanguageSwitcher compact />
      </div>
      <div className="pointer-events-none absolute -left-28 -top-28 h-72 w-72 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-sky-200/60 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40 blur-3xl" />

      <section className="relative w-full max-w-[420px]">
        <div className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-2xl shadow-slate-300/60 backdrop-blur md:p-8">
          <div className="mb-7 text-center">
            <div className="mb-5 flex justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-3xl border border-slate-200 bg-slate-50 shadow-sm md:h-32 md:w-32">
                <Image
                  src="/images/logo.png"
                  alt={t("static.kvg22y")}
                  width={104}
                  height={24}
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
              {t("static.1cpvh20")}{" "}
            </p>
          </div>

          {step === "email"
            ? renderForgotPassword()
            : step === "otp"
              ? renderFormOTP()
              : renderResetPassword()}

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
            >
              {t("auth.reset.backToSignIn")}
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          {t("static.108t1hg")} {new Date().getFullYear()}{" "}
          {t("static.jcxwpg")}{" "}
        </p>
      </section>
    </main>
  );
};

export default ForgotPasswordPage;
