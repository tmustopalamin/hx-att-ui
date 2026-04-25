"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { InputOtp } from "primereact/inputotp";
import { InputText } from "primereact/inputtext";
import { ForgotPassword } from "@/app/types/forgot-password";
import { showToast } from "@/store/ToastSlice";

const ForgotPasswordPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const { handleSubmit, control } = useForm<ForgotPassword>({
    defaultValues: {
      email: "",
    },
    mode: "onTouched",
  });

  const [submitting, setSubmitting] = useState(false);
  const [isOtpFormVisible, setOtpFormVisible] = useState(false);
  const [otpToken, setOtpToken] = useState<string | number | undefined | null>("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    document.title = "Reset Password - PT. Hexing Technology";
  }, []);

  const onSubmit = async (formData: ForgotPassword) => {
    try {
      setSubmitting(true);
      setFormError("");

      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMessage =
          responseData?.message || "Failed to request reset password. Please try again.";
        throw new Error(errorMessage);
      }

      setOtpFormVisible(true);

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: responseData.message,
        })
      );
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unexpected error occurred. Please try again.";

      setFormError(errorMessage);

      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Failed",
          detail: errorMessage,
        })
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
        throw new Error("OTP must be 6 digits.");
      }

      const body = {
        otp: otpValue,
      };

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMessage =
          responseData?.message || "Failed to verify OTP. Please try again.";
        throw new Error(errorMessage);
      }

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: responseData.message,
        })
      );

      router.push("/login");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unexpected error occurred. Please try again.";

      setFormError(errorMessage);

      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Failed",
          detail: errorMessage,
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="mb-6 flex items-center justify-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${!isOtpFormVisible
              ? "bg-blue-600 text-white"
              : "bg-blue-100 text-blue-700"
              }`}
          >
            1
          </div>
          <span
            className={`text-xs font-medium ${!isOtpFormVisible ? "text-slate-700" : "text-slate-500"
              }`}
          >
            Email
          </span>
        </div>

        <div className="h-px w-8 bg-slate-300" />

        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${isOtpFormVisible
              ? "bg-blue-600 text-white"
              : "bg-slate-200 text-slate-500"
              }`}
          >
            2
          </div>
          <span
            className={`text-xs font-medium ${isOtpFormVisible ? "text-slate-700" : "text-slate-500"
              }`}
          >
            OTP
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
      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
        <div className="flex items-start gap-3">
          <i className="pi pi-exclamation-circle mt-0.5 text-red-500" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Process failed
            </p>
            <p className="mt-1 text-sm text-red-600">{formError}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderFormOTP = () => {
    return (
      <>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Input OTP</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter the 6-digit OTP code sent to your email.
          </p>
        </div>

        {renderStepIndicator()}
        {renderErrorBanner()}

        <div className="mb-6 flex flex-col items-center gap-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
            <InputOtp
              disabled={submitting}
              value={otpToken}
              onChange={(e) => setOtpToken(e.value)}
              length={6}
              integerOnly
            />
          </div>

          <p className="text-center text-xs text-slate-500">
            Make sure the code is entered correctly before confirming.
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={submitting}
            onClick={onClickConfirmResetPassword}
          >
            {submitting && <i className="pi pi-spin pi-spinner" />}
            <span>{submitting ? "Confirming..." : "Confirm OTP"}</span>
          </button>

          <button
            type="button"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed"
            disabled={submitting}
            onClick={() => {
              setOtpFormVisible(false);
              setOtpToken("");
              setFormError("");
            }}
          >
            Back
          </button>
        </div>
      </>
    );
  };

  const renderForgotPassword = () => {
    return (
      <>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Reset Password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter your registered email address to receive an OTP code.
          </p>
        </div>

        {renderStepIndicator()}
        {renderErrorBanner()}

        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700"
            >
              Email
            </label>

            <Controller
              name="email"
              control={control}
              rules={{
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Email format is invalid",
                },
              }}
              render={({ field, fieldState }) => (
                <>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <i className="pi pi-envelope" />
                    </span>

                    <InputText
                      id="email"
                      {...field}
                      type="email"
                      placeholder="Enter your registered email"
                      autoComplete="email"
                      disabled={submitting}
                      className={`w-full rounded-xl border-slate-300 py-3 pl-11 pr-4 text-sm shadow-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${fieldState.invalid ? "p-invalid" : ""
                        }`}
                    />
                  </div>

                  {fieldState.error && (
                    <small className="text-sm font-medium text-red-500">
                      {fieldState.error.message}
                    </small>
                  )}
                </>
              )}
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={submitting}
          >
            {submitting && <i className="pi pi-spin pi-spinner" />}
            <span>{submitting ? "Submitting..." : "Send OTP"}</span>
          </button>
        </form>
      </>
    );
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mb-5 flex justify-center">
            <div className="flex h-40 w-40 items-center justify-center rounded-3xl bg-slate-50 shadow-sm ring-1 ring-slate-200">
              <Image
                src="/images/logo.png"
                alt="Company Logo"
                width={128}
                height={128}
                priority
                className="object-contain"
              />
            </div>
          </div>

          <p className="text-sm text-slate-500">
            PT. Hexing Technology HRIS
          </p>
        </div>

        {isOtpFormVisible ? renderFormOTP() : renderForgotPassword()}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;