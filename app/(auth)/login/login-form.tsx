"use client";
import { useI18n } from "@/app/i18n";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";
import { mutate } from "swr";

import { showToast } from "@/store/ToastSlice";
import { updateDataProfile } from "@/store/me/ProfileSlice";
import type { FormDataLogin } from "@/app/types/form-data-login";
import type { Me } from "@/app/types/me";
import { apiFetchResponse, apiFetch } from "@/app/utils/api-client";
import { getErrorMessage } from "@/app/utils/error-messages";
import LanguageSwitcher from "@/app/_components/LanguageSwitcher";

const LoginForm = () => {
  const { t } = useI18n();
  const router = useRouter();
  const dispatch = useDispatch();

  const { handleSubmit, control } = useForm<FormDataLogin>({
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
      await apiFetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const sessionResponse = await apiFetchResponse("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!sessionResponse.ok) {
        await apiFetchResponse("/api/auth/logout", {
          method: "POST",
          credentials: "include",
        }).catch(() => undefined);

        throw new Error(
          "Login succeeded, but the session could not be established. Please try again.",
        );
      }

      const sessionData = (await sessionResponse.json()) as Me;

      dispatch(updateDataProfile(sessionData));
      await mutate("/api/auth/me", sessionData, { revalidate: false });

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: t("auth.login.success"),
          detail: t("auth.login.redirecting"),
        }),
      );

      router.replace("/dashboard");
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);

      setFormError(errorMessage);
      setSubmitting(false);
    }
  };

  const inputBaseClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

  const inputErrorClass =
    "border-red-300 focus:border-red-500 focus:ring-red-100";

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
              <div className="flex h-20 w-full max-w-[250px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-5 shadow-sm sm:h-24">
                <Image
                  src="/images/logo.png"
                  alt={t("static.kvg22y")}
                  width={475}
                  height={110}
                  priority
                  sizes="(max-width: 640px) 210px, 225px"
                  className="h-auto w-full max-w-[225px] object-contain"
                />
              </div>
            </div>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">
              {t("static.1cpvh20")}{" "}
            </p>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950">
              {t("auth.login.title")}
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {t("auth.login.description")}
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
                    {t("auth.login.failed")}
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
                {t("auth.login.email")}
              </label>

              <Controller
                name="email"
                control={control}
                rules={{
                  required: t("auth.login.emailRequired"),
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: t("auth.login.emailInvalid"),
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

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                {t("auth.login.password")}
              </label>

              <Controller
                name="password"
                control={control}
                rules={{
                  required: t("auth.login.passwordRequired"),
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
                        placeholder={t("auth.login.passwordPlaceholder")}
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

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700 hover:underline"
              >
                {t("auth.login.forgotPassword")}
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:translate-y-0 disabled:cursor-not-allowed disabled:bg-blue-300 disabled:shadow-none"
            >
              {submitting && <i className="pi pi-spin pi-spinner text-sm" />}
              <span>
                {submitting
                  ? t("auth.login.submitting")
                  : t("auth.login.submit")}
              </span>
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-slate-500">
          {t("static.108t1hg")} {new Date().getFullYear()}{" "}
          {t("static.jcxwpg")}{" "}
        </p>
      </section>
    </main>
  );
};

export default LoginForm;
