"use client";

import React from "react";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-slate-100 p-4 font-sans antialiased">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <i className="pi pi-exclamation-triangle text-2xl" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">
            Terjadi Kesalahan Sistem
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Aplikasi mengalami kendala tak terduga saat memuat data. Silakan
            coba muat ulang halaman.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Muat Ulang Halaman
          </button>
        </div>
      </body>
    </html>
  );
}
