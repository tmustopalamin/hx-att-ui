"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";

import { showToast } from "@/store/ToastSlice";
import { FormDataLogin } from "@/app/types/form-data-login";

const LoginForm = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const {
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormDataLogin>({
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onTouched",
  });

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const onSubmit = async (formData: FormDataLogin) => {
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMessage =
          responseData?.message || "Failed to login. Please try again.";

        throw new Error(errorMessage);
      }

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Login Success",
          detail: "Redirecting to your dashboard...",
        }),
      );

      setTimeout(() => {
        router.replace("/dashboard");
      }, 500);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unexpected error occurred. Please try again.";

      setFormError(errorMessage);
      setSubmitting(false);

      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Login Failed",
          detail: errorMessage,
        }),
      );
    }
  };

  const inputBaseClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

  const inputErrorClass =
    "border-red-300 focus:border-red-500 focus:ring-red-100";

  return (
    <main className="fixed inset-0 flex min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-100 px-4 py-8">
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
                  alt="PT. Hexing Technology"
                  width={104}
                  height={104}
                  priority
                  className="object-contain"
                />
              </div>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
              HRIS System
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              Welcome back
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Sign in to continue to your dashboard.
            </p>
          </div>

          {formError && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <i className="pi pi-exclamation-circle text-sm" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-red-700">
                    Login failed
                  </p>
                  <p className="mt-1 text-sm leading-5 text-red-600">
                    {formError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
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
                    message: "Please enter a valid email address",
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
                        placeholder="name@company.com"
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

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <Controller
                name="password"
                control={control}
                rules={{
                  required: "Password is required",
                }}
                render={({ field, fieldState }) => (
                  <>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400">
                        <i className="pi pi-lock text-sm" />
                      </span>

                      <Password
                        id="password"
                        {...field}
                        toggleMask
                        feedback={false}
                        disabled={submitting}
                        placeholder="Enter your password"
                        className="w-full"
                        inputClassName={`${inputBaseClass} pl-11 pr-11 ${
                          fieldState.invalid ? inputErrorClass : ""
                        }`}
                        pt={{
                          root: {
                            className: "w-full",
                          },
                          input: {
                            className: "w-full",
                          },
                          iconField: {
                            root: {
                              className: "w-full",
                            },
                          },
                          hideIcon: {
                            className: "right-4 text-slate-400",
                          },
                          showIcon: {
                            className: "right-4 text-slate-400",
                          },
                        }}
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

            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Secure employee access
              </div>

              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
            >
              {submitting && <i className="pi pi-spin pi-spinner text-sm" />}
              <span>{submitting ? "Signing in..." : "Sign in"}</span>
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} PT. Hexing Technology. All rights
          reserved.
        </p>
      </section>
    </main>
  );
};

export default LoginForm;
