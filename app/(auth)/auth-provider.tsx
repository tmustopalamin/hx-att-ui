"use client";

import React, { useEffect } from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { clearProfile, updateDataProfile } from "@/store/me/ProfileSlice";
import { RootState } from "@/store/store";
import { Me } from "../types/me";
import { useRouter } from "next/navigation";
import { apiFetch, isUnauthorizedError } from "@/app/utils/api-client";
import { Button } from "primereact/button";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const profileData = useSelector((state: RootState) => state.profile);

  const fetcher = (url: string) => apiFetch<Me>(url);

  const {
    data,
    error,
    isLoading,
    mutate: revalidateMe,
  } = useSWR<Me>("/api/auth/me", fetcher, {
    // Keep the short-lived access cookie warm while the long-lived refresh
    // cookie is still valid. The API performs the actual refresh/rotation.
    refreshInterval: 60_000,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5_000,
    shouldRetryOnError: false,
  });

  useEffect(() => {
    if (data) {
      dispatch(updateDataProfile(data));
    }

    if (isUnauthorizedError(error)) {
      dispatch(clearProfile());
      router.replace("/login");
    }
  }, [data, error, dispatch, router]);

  if (isLoading) return null;

  if (error && !isUnauthorizedError(error)) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <i className="pi pi-server text-2xl" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            Layanan Sedang Mengalami Kendala
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Tidak dapat memuat profil pengguna atau database server sedang
            sibuk. Silakan coba lagi.
          </p>
          <div className="mt-5">
            <Button
              label="Coba Lagi"
              icon="pi pi-refresh"
              onClick={() => {
                void revalidateMe();
              }}
              className="p-button-sm"
            />
          </div>
        </div>
      </div>
    );
  }

  if (!profileData?.employee_id) return null;
  return <>{children}</>;
};

export default AuthProvider;
