"use client";

import React, { useEffect } from "react";
import { Button } from "primereact/button";
import { Card } from "primereact/card";

export default function AdminRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Can be connected to error logging service
  }, [error]);

  return (
    <div className="p-4 sm:p-6">
      <Card className="border border-red-200 bg-red-50/50 shadow-sm">
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
            <i className="pi pi-exclamation-circle text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">
              Gagal Memuat Konten Halaman
            </h3>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Terjadi kendala saat memproses data pada tampilan ini. Silakan
              coba lagi atau refresh halaman.
            </p>
          </div>
          <Button
            label="Coba Lagi"
            icon="pi pi-refresh"
            onClick={() => reset()}
            className="p-button-sm"
          />
        </div>
      </Card>
    </div>
  );
}
