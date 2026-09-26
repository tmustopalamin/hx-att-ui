"use client";

import React from "react";
import dayjs from "dayjs";

export interface ReportPrintSignaturesProps {
  preparedByRole?: string;
  preparedByName?: string;
  reviewedByRole?: string;
  reviewedByName?: string;
  approvedByRole?: string;
  approvedByName?: string;
  location?: string;
}

export default function ReportPrintSignatures({
  preparedByRole = "Staff HRD / Payroll",
  preparedByName = "( ................................................ )",
  reviewedByRole = "HR / Finance Supervisor",
  reviewedByName = "( ................................................ )",
  approvedByRole = "HR Manager / Direktur",
  approvedByName = "( ................................................ )",
  location = "Karawang",
}: ReportPrintSignaturesProps) {
  const currentDate = dayjs().format("DD MMMM YYYY");

  return (
    <div className="report-print-signatures mt-6 break-inside-avoid text-[10.5px] text-slate-800">
      <div className="mb-2 text-right text-slate-600">
        {location}, {currentDate}
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {/* Kolom 1: Dibuat */}
        <div className="flex flex-col items-center">
          <span className="font-medium text-slate-600">Dibuat Oleh:</span>
          <span className="text-[10px] text-slate-500">{preparedByRole}</span>
          <div className="mt-14 w-44 border-b border-slate-900" />
          <span className="mt-1 font-semibold text-slate-900">
            {preparedByName}
          </span>
        </div>

        {/* Kolom 2: Diperiksa */}
        <div className="flex flex-col items-center">
          <span className="font-medium text-slate-600">Diperiksa Oleh:</span>
          <span className="text-[10px] text-slate-500">{reviewedByRole}</span>
          <div className="mt-14 w-44 border-b border-slate-900" />
          <span className="mt-1 font-semibold text-slate-900">
            {reviewedByName}
          </span>
        </div>

        {/* Kolom 3: Disetujui */}
        <div className="flex flex-col items-center">
          <span className="font-medium text-slate-600">Disetujui Oleh:</span>
          <span className="text-[10px] text-slate-500">{approvedByRole}</span>
          <div className="mt-14 w-44 border-b border-slate-900" />
          <span className="mt-1 font-semibold text-slate-900">
            {approvedByName}
          </span>
        </div>
      </div>
    </div>
  );
}
