import type { Metadata } from "next";

import "@/app/globals.css";
import StoreProvider from "@/store/StoreProvider";
import GlobalToast from "../_components/GlobalToast";

export const metadata: Metadata = {
  title: "Login | Attendance & Payroll System | PT. Hexing Technology",
  description: "login page for Attendance Hexing application",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-bl from-blue-600 to-purple-100 min-h-screen flex items-center justify-center">
        <div className="relative z-10 max-w-md w-full px-4">
          <StoreProvider>
            <GlobalToast />
            {children}
          </StoreProvider>
        </div>
      </body>
    </html>
  );
}
