"use client";

import React from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

export interface ReportPrintHeaderParam {
  label: string;
  value: string;
}

export interface ReportPrintHeaderProps {
  reportTitle: string;
  reportSubtitle?: string;
  params?: ReportPrintHeaderParam[];
  totalRecords?: number;
}

export default function ReportPrintHeader({
  reportTitle,
  reportSubtitle,
  params = [],
  totalRecords,
}: ReportPrintHeaderProps) {
  const profileState = useSelector((state: RootState) => state.profile);
  const printedByName =
    profileState.name || profileState.email || "Administrator";

  const printedAt = dayjs().format("DD/MM/YYYY HH:mm:ss");

  return (
    <div className="report-print-header w-full pb-3 text-slate-900">
      {/* KOP SURAT RESMI */}
      <div className="border-b-2 border-slate-900 pb-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo.png"
              alt="PT. Hexing Technology"
              className="h-11 w-auto object-contain"
            />
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-wide text-slate-950">
                PT. HEXING TECHNOLOGY
              </span>
              <span className="text-[10px] leading-tight text-slate-700">
                Kawasan Industri Mitrakarawang, Jl. Mitra Raya II Blok E No.
                5-7, Parungmulya, Ciampel, Karawang, Jawa Barat 41361
              </span>
              <span className="text-[10px] text-slate-600">
                Telepon: (021) 8911-9988 • Email: hrd@hexing.co.id • Website:
                www.hexing.co.id
              </span>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <span className="inline-block rounded border border-slate-400 bg-slate-100 px-2 py-0.5 text-[9.5px] font-bold tracking-wider text-slate-800">
              OFFICIAL REPORT
            </span>
            <div className="mt-1 text-[10px] text-slate-600">
              Waktu Cetak:{" "}
              <strong className="font-mono text-slate-800">{printedAt}</strong>
            </div>
            <div className="text-[10px] text-slate-600">
              Dicetak Oleh:{" "}
              <strong className="text-slate-800">{printedByName}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* JUDUL LAPORAN */}
      <div className="my-2.5 text-center">
        <h2 className="m-0 text-base font-bold uppercase tracking-wider text-slate-950">
          {reportTitle}
        </h2>
        {reportSubtitle && (
          <p className="m-0 mt-0.5 text-[11px] text-slate-600">
            {reportSubtitle}
          </p>
        )}
      </div>

      {/* PARAMETER FILTER AKTIF */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded border border-slate-300 bg-slate-50/80 px-3 py-1.5 text-[10.5px]">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {params.map((p, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-slate-500">{p.label}:</span>
              <strong className="text-slate-800">{p.value}</strong>
            </div>
          ))}
        </div>
        {totalRecords !== undefined && (
          <div className="text-slate-600">
            Total Data:{" "}
            <strong className="text-slate-900">
              {totalRecords.toLocaleString()} baris
            </strong>
          </div>
        )}
      </div>
    </div>
  );
}
