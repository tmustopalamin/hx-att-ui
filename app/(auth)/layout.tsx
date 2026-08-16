import type { Metadata } from "next";

import "@/app/globals.css";
import StoreProvider from "@/store/StoreProvider";
import GlobalToast from "../_components/GlobalToast";
import GuestRouteGuard from "./guest-route-guard";

export const metadata: Metadata = {
  title: "Login | Attendance & Payroll System | PT. Hexing Technology",
  description: "login page for Attendance Hexing application",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <StoreProvider>
      <GlobalToast />
      <GuestRouteGuard>{children}</GuestRouteGuard>
    </StoreProvider>
  );
}
