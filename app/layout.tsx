import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "PT. Hexing Technology HRIS",
  description: "HRIS system",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-slate-100">
      <body>{children}</body>
    </html>
  );
}
