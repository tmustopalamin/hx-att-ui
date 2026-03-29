"use client";

import React, { useEffect } from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { clearProfile, updateDataProfile } from "@/store/me/ProfileSlice";
import { RootState } from "@/store/store";
import { Me } from "../types/me";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const profileData = useSelector((state: RootState) => state.profile);

  const fetcher = async (url: string) => {
    const res = await fetch(url, {
      credentials: "include",
    });

    if (!res.ok) {
      const error = new Error("Unauthorized") as Error & { status?: number };
      error.status = res.status;
      throw error;
    }


    return res.json();
  };

  const { data, error, isLoading } = useSWR<Me>("/api/auth/me", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  }
  );

  useEffect(() => {
    if (data) {
      dispatch(updateDataProfile(data));
    }

    if (error?.status === 401) {
      dispatch(clearProfile());
    }
  }, [data, error]);

  if (isLoading) return null;
  if (!profileData?.employee_id) return null;
  return <>{children}</>;
};

export default AuthProvider;
