import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

export const metadata: Metadata = {
    title: "PT. Hexing Technology HRIS",
    description: "HRIS system",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
    children,
}: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className="bg-slate-100">
            <body className={inter.className}>{children}</body>
        </html>
    );
}