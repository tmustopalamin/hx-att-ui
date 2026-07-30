"use client";

import CardTitle from "@/app/_components/CardTitle";
import { FormChangePassword } from "@/app/types/form-change-password";
import {
  isResponseTypeError,
  getErrorMessage,
} from "@/app/utils/error-messages";
import { changePassword } from "@/app/services/user-service";
import { showToast } from "@/store/ToastSlice";
import { Card } from "primereact/card";
import { Password } from "primereact/password";
import { TabPanel, TabView } from "primereact/tabview";
import React, { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import ChangeProfilePicture from "./ChangeProfilePicture";

const AccountSettingsPage = () => {
  const dispatch = useDispatch();
  const [submitting, setSubmitting] = useState(false);

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
    mode: "onTouched",
  });

  useEffect(() => {
    document.title = "Account Settings";
  }, []);

  const onSubmit = async (formData: FormChangePassword) => {
    if (!isValid || submitting) {
      return;
    }

    try {
      setSubmitting(true);

      await changePassword({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });

      reset({
        currentPassword: "",
        newPassword: "",
        newPasswordRetype: "",
      });

      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: "Password changed successfully.",
        }),
      );
    } catch (err: unknown) {
      if (isResponseTypeError(err)) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Failed",
            detail: getErrorMessage(err, "message"),
          }),
        );
      } else if (err instanceof Error) {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Failed",
            detail: err.message,
          }),
        );
      } else {
        dispatch(
          showToast({
            visible: true,
            severity: "error",
            summary: "Failed",
            detail: "Unexpected error occurred. Please try again.",
          }),
        );
      }
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
          <div className="w-full max-w-xl">
            <form
              className="w-full space-y-4"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                  Change Password
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Protect your account by using a strong password.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2">
                <label htmlFor="currentPassword">Current Password</label>

                <Controller
                  name="currentPassword"
                  control={control}
                  rules={{
                    required: "Current password is required",
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Password
                        id="currentPassword"
                        {...field}
                        toggleMask
                        feedback={false}
                        inputClassName="w-full"
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
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

              <div className="flex w-full flex-col gap-2">
                <label htmlFor="newPassword">New Password</label>

                <Controller
                  name="newPassword"
                  control={control}
                  rules={{
                    required: "New password is required",
                    validate: (value) => {
                      const currentPassword = getValues("currentPassword");

                      if (value === currentPassword) {
                        return "New password must be different from current password";
                      }
                      if (
                        !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,128}$/.test(
                          value,
                        )
                      ) {
                        return "Use 12-128 characters with uppercase, lowercase, number, and symbol";
                      }

                      return true;
                    },
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Password
                        id="newPassword"
                        {...field}
                        toggleMask
                        feedback
                        inputClassName="w-full"
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
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

              <div className="flex w-full flex-col gap-2">
                <label htmlFor="newPasswordRetype">
                  New Password Confirmation
                </label>

                <Controller
                  name="newPasswordRetype"
                  control={control}
                  rules={{
                    required: "New password confirmation is required",
                    validate: (value) =>
                      value === getValues("newPassword") ||
                      "Passwords do not match",
                  }}
                  render={({ field, fieldState }) => (
                    <>
                      <Password
                        id="newPasswordRetype"
                        {...field}
                        toggleMask
                        feedback={false}
                        inputClassName="w-full"
                        className={`w-full ${
                          fieldState.invalid ? "p-invalid" : ""
                        }`}
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

              <div className="flex w-full flex-col gap-2 pt-2 text-center">
                <button
                  type="submit"
                  className="w-full rounded-md bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Change Password"}
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
