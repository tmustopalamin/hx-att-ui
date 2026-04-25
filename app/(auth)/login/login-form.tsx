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
                body: JSON.stringify(formData),
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
                })
            );

            setTimeout(() => {
                router.push("/dashboard");
            }, 800);
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
                })
            );
        }
    };

    return (
        <div className="w-full max-w-md">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
                <div className="mb-8 text-center">
                    <div className="mb-5 flex justify-center">
                        <div className="flex h-44 w-44 items-center justify-center rounded-3xl bg-slate-50 shadow-sm ring-1 ring-slate-200">
                            <Image
                                src="/images/logo.png"
                                alt="Company Logo"
                                width={140}
                                height={140}
                                priority
                                className="object-contain"
                            />
                        </div>
                    </div>

                    <h1 className="text-2xl font-semibold text-slate-900">
                        Welcome back
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                        Sign in to access your HRIS dashboard
                    </p>
                </div>

                {formError && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                        <div className="flex items-start gap-3">
                            <i className="pi pi-exclamation-circle mt-0.5 text-red-500" />
                            <div>
                                <p className="text-sm font-semibold text-red-700">
                                    Login failed
                                </p>
                                <p className="mt-1 text-sm text-red-600">
                                    {formError}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <form
                    className="space-y-5"
                    onSubmit={handleSubmit(onSubmit)}
                >
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
                                            placeholder="Enter your email"
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

                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="password"
                            className="text-sm font-medium text-slate-700"
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
                                            <i className="pi pi-lock" />
                                        </span>

                                        <Password
                                            id="password"
                                            {...field}
                                            toggleMask
                                            feedback={false}
                                            disabled={submitting}
                                            placeholder="Enter your password"
                                            inputClassName="w-full rounded-xl py-3 pl-11 pr-10 text-sm"
                                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""
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
                                            }}
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

                    <div className="flex items-center justify-end">
                        <Link
                            href="/forgot-password"
                            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline"
                        >
                            Forgot your password?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        {submitting && <i className="pi pi-spin pi-spinner" />}
                        <span>{submitting ? "Logging in..." : "Login"}</span>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;