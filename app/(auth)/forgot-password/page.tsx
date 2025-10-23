"use client";

import { ForgotPassword } from '@/app/types/forgot-password';
import { showToast } from '@/store/ToastSlice';
import { useRouter } from 'next/navigation';
import { InputOtp } from 'primereact/inputotp';
import { InputText } from 'primereact/inputtext';
import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form';
import { useDispatch } from 'react-redux';

const ForgotPasswordPage = () => {
  const { handleSubmit, control } = useForm<ForgotPassword>();
  const [submitting, setSubmitting] = useState(false);
  const [isOtpFormVisible, setOtpFormVisible] = useState(false);
  // const [isResetPasswordFormVisible, setResetPasswordFormVisible] = useState(false);
  const [token, setTokens] = useState<string | number | undefined | null>();
  const router = useRouter();
  const dispatch = useDispatch();

  useEffect(() => {
    document.title = "Reset Password - PT. Hexing Technology";
  }, [])
  
  const onSubmit = async (formData: ForgotPassword) => {
      try {
        setSubmitting(true);

        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });
  
        const responseData = await res.json();
        setOtpFormVisible(true)
  
        if (!res.ok) {
          const errorMessage =
            responseData?.message || `Failed to request. Please try again.`;
          throw new Error(errorMessage);
        }

        dispatch(showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: responseData.message,
        }));
      } catch (err: unknown) {
        console.error(err);
  
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Unexpected error occurred. Please try again.";

        dispatch(showToast({
          visible: true,
          severity: "error",
          summary: "failed",
          detail: errorMessage,
        }));
      } finally {
        setSubmitting(false);
      }
    };

  const onClickConfirmResetPassword = async () => {
    try {
      setSubmitting(true);

      const body = {
        otp: token
      }

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
          responseData?.message || `Failed to login. Please try again.`;
        throw new Error(errorMessage);
      }

      dispatch(showToast({
        visible: true,
        severity: "success",
        summary: "success",
        detail: responseData.message,
      }));

      router.push("/login");
    } catch (err: unknown) {
      console.error(err);

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unexpected error occurred. Please try again.";

      dispatch(showToast({
        visible: true,
        severity: "error",
        summary: "failed",
        detail: errorMessage,
      }));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFormOTP = () => {
    return <>
      <div className="flex flex-col justify-center mb-5 gap-3">
        <div className="">
          <h1 className='font-bold'>Input OTP</h1>
          <p>You can find the OTP code in your email.</p>
        </div>
        <InputOtp disabled={submitting} value={token} onChange={(e) => setTokens(e.value)} length={6}/>
      </div>
      <button
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
        disabled={submitting}
        onClick={onClickConfirmResetPassword}
      >
        {submitting ? "Loading..." : "Confirm"}
      </button>
    </>
  }

  const renderForgotPassword = () => {
    return <>
      <div className="flex flex-col gap-3">
        <div className="">
          <h1 className='font-bold'>Reset Password</h1>
          <p>Enter your registered email address.</p>
        </div>
        <form
            className="space-y-4 w-full"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="flex flex-col gap-2 w-full">
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
                      className={`w-full ${
                        fieldState.invalid ? "p-invalid" : ""
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
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
      </div>
    </>
  }

  return (
      <>
        <div className="bg-white p-10 rounded-lg shadow-md">
          {isOtpFormVisible ? renderFormOTP() : renderForgotPassword()}
        </div>
      </>
    );
}

export default ForgotPasswordPage