"use client";

import React from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { updateDataProfile } from "@/store/me/ProfileSlice";
import { RootState } from "@/store/store";
import { useRouter } from "next/navigation";
import { Me } from "../types/me";

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const profileData = useSelector((state: RootState) => state.profile);

  const fetcher = async (url: string) => {
    const res = await fetch(url, {
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401) {
        // If unauthorized, redirect to login
        router.push("/login");
        return null; // Return null so SWR data is null
      }

      const errorBody = await res.json();
      const error = new Error(
        errorBody.message || "An error occurred while fetching data."
      ) as Error & { status?: number };
      error.status = res.status;
      throw error;
    }

    return res.json();
  };

  const { data, isLoading } = useSWR<Me>(profileData ? `/api/auth/me` : null,fetcher);

  React.useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      const newData: Me = {
        employee_id: data.employee_id,
        email: data.email,
        name: data.name,
        role: data.role,
        photo_url: data.photo_url,
      };
      dispatch(updateDataProfile(newData));
    }
  }, [data, dispatch]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  // While data is null but no loading, show nothing to avoid flicker
  if (!data) {
    return null;
  }

  return <>{children}</>;
};

export default AuthProvider;
