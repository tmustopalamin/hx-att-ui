"use client"

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormDataLogin } from "@/app/types/form-data-login";
import { useDispatch } from "react-redux";
import { showToast } from "@/store/ToastSlice";
import { InputText } from "primereact/inputtext";
import { Password } from "primereact/password";

const LoginForm = () => {
    const { handleSubmit, control } = useForm<FormDataLogin>();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const dispatch = useDispatch();

    const onSubmit = async (formData: FormDataLogin) => {
        setSubmitting(true);
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
                const errorMessage = responseData?.message || `Failed to login. Please try again.`;
                setSubmitting(false);
                throw new Error(errorMessage);
            }

            dispatch(showToast({
                visible: true,
                severity: "success",
                summary: "Login Success",
                detail: "Redirecting to your dashboard...",
            }));

            setSubmitting(true)
            setTimeout(() => {
                router.push("/dashboard");
            }, 1000);
        } catch (err: unknown) {
            setSubmitting(false)
            console.error(err);

            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Unexpected error occurred. Please try again.";

            dispatch(showToast({
                visible: false,
                severity: "error",
                summary: "Login Failed",
                detail: errorMessage,
            }));
        }
    };

    return (
        <>
            <div className="w-96 bg-white p-10 rounded-lg shadow-md">
                <>
                    <div className="flex justify-center mb-5">
                        <Image
                            src="/images/logo.png"
                            alt="Logo"
                            width={150}
                            height={150}
                            priority
                            className="rounded-full mt-4"
                        />
                    </div>

                    <form
                        className="space-y-4 w-full"
                        onSubmit={handleSubmit(onSubmit)}
                    >
                        <div className="flex flex-col gap-2 w-full">
                            <label htmlFor="email">Email</label>
                            <Controller
                                name="email"
                                defaultValue=""
                                control={control}
                                rules={{
                                    required: "Email is required",
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <InputText
                                            id="email"
                                            {...field}
                                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""
                                                }`}
                                            disabled={submitting}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold text-red-500">
                                                {fieldState.error.message}
                                            </small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="flex flex-col gap-2 w-full">
                            <label htmlFor="password">Password</label>
                            <Controller
                                name="password"
                                defaultValue=""
                                control={control}
                                rules={{
                                    required: "Password is required",
                                }}
                                render={({ field, fieldState }) => (
                                    <>
                                        <Password
                                            toggleMask
                                            pt={{
                                                iconField: {
                                                    root: {
                                                        style: { width: "100%" },
                                                    },
                                                },
                                                input: {
                                                    style: { width: "100%" },
                                                },
                                                root: {
                                                    style: { width: "100%" },
                                                },
                                            }}
                                            id="password"
                                            {...field}
                                            feedback={false}
                                            inputClassName="w-full"
                                            className={`w-full ${fieldState.invalid ? "p-invalid" : ""
                                                }`}
                                            disabled={submitting}
                                        />
                                        {fieldState.error && (
                                            <small className="font-bold text-red-500">
                                                {fieldState.error.message}
                                            </small>
                                        )}
                                    </>
                                )}
                            />
                        </div>

                        <div className="flex w-full flex-col gap-2 text-center">
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
                                disabled={submitting}
                            >
                                {submitting ? "Logging in..." : "Login"}
                            </button>
                            <Link href="/forgot-password">
                                <span className="hover:underline text-sm text-gray-600">
                                    Forgot your password?
                                </span>
                            </Link>
                        </div>
                    </form>
                </>
            </div>
        </>
    );
};

export default LoginForm