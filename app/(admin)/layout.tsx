import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import StoreProvider from "@/store/StoreProvider";
import GlobalToast from "../_components/GlobalToast";
import PrimeReactLocaleProvider from "../_components/PrimeReactLocaleProvider";
import AppMain from "./AppMain";

export const metadata: Metadata = {
  title: "PT. Hexing Technology HRIS",
  description: "HRIS admin panel",
};

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const access = cookieStore.get("access_token");
  const refresh = cookieStore.get("refresh_token");

  if (!access && !refresh) {
    redirect("/login");
  }

  return (
    <StoreProvider>
      <PrimeReactLocaleProvider>
        <GlobalToast />
        <AppMain>{children}</AppMain>
      </PrimeReactLocaleProvider>
    </StoreProvider>
  );
}
