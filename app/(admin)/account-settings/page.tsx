"use client";

import CardTitle from '@/app/_components/CardTitle';
import { FormChangePassword } from '@/app/types/form-change-password';
import { RootState } from '@/store/store';
import { Card } from 'primereact/card';
import { Password } from 'primereact/password';
import { TabView, TabPanel } from 'primereact/tabview';
import React, { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import ChangeProfilePicture from './ChangeProfilePicture';
import { showToast } from '@/store/ToastSlice';

const AccountSettingsPage = () => {
  const { handleSubmit, control, getValues } = useForm<FormChangePassword>();
  const [submitting, setSubmitting] = useState(false);
  const dispatch = useDispatch();
  const profileState = useSelector((state: RootState) => state.profile);

  useEffect(() => {
    document.title = "Account Settings";
  }, []);

  const onSubmit = async (formData: FormChangePassword) => {
    try {
      setSubmitting(true);

      const body = {
        email: profileState.email,
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      }

      const res = await fetch("/api/user/change-password", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const responseData = await res.json();

      if (!res.ok) {
        const errorMessage =
          responseData?.message || `Please try again.`;
        throw new Error(errorMessage);
      }

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "success",
          detail: "Change Password Success",
        })
      );

      setTimeout(() => {
        // router.push("/dashboard");
      }, 1000);
    } catch (err: unknown) {
      console.error(err);

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Unexpected error occurred. Please try again.";

      dispatch(
        showToast({
          visible: false,
          severity: "error",
          summary: "failed",
          detail: errorMessage,
        })
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title={<CardTitle title="Account Settings" url="" />}>
      <TabView>
        <TabPanel header="Change Profile Picture">
          <ChangeProfilePicture />
        </TabPanel>
        <TabPanel header="Change Password">
          <div className="w-94">
            <form
              className="space-y-4 w-full"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="flex flex-col gap-2 w-full">
                <div className="mb-6">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    Change Password
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Protect your account by using a strong password
                  </p>
                </div>

                <label htmlFor="currentPassword">Current Password</label>
                <Controller
                  name="currentPassword"
                  defaultValue=""
                  control={control}
                  rules={{
                    required: "Current Password is required",
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
                        id="currentPassword"
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

              <div className="flex flex-col gap-2 w-full">
                <label htmlFor="newPassword">New Password</label>
                <Controller
                  name="newPassword"
                  defaultValue=""
                  control={control}
                  rules={{
                    required: "New Password is required",
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
                        id="newPassword"
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

              <div className="flex flex-col gap-2 w-full">
                <label htmlFor="newPasswordRetype">
                  New Password (Re-Type)
                </label>
                <Controller
                  name="newPasswordRetype"
                  defaultValue=""
                  control={control}
                  rules={{
                    required: "New Password is required",
                    validate: (value) => value === getValues("newPassword") || "Passwords do not match",
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
                        id="newPasswordRetype"
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
                  {submitting ? "Loading..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </TabPanel>
      </TabView>
    </Card>
  );
};

export default AccountSettingsPage;
