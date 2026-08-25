"use client";

import React, { useEffect } from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { clearProfile, updateDataProfile } from "@/store/me/ProfileSlice";
import { RootState } from "@/store/store";
import { Me } from "../types/me";
import { useRouter } from "next/navigation";
import { apiFetch, isUnauthorizedError } from "@/app/utils/api-client";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const profileData = useSelector((state: RootState) => state.profile);

  const fetcher = (url: string) => apiFetch<Me>(url);

  const { data, error, isLoading } = useSWR<Me>("/api/auth/me", fetcher, {
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
  if (!profileData?.employee_id) return null;
  return <>{children}</>;
};

export default AuthProvider;
