"use client";

import type { ReactNode } from "react";
import {
  addLocale,
  locale as setPrimeReactLocale,
  PrimeReactProvider,
  type AppendToType,
} from "primereact/api";

const indonesianLocale = {
  accept: "Ya",
  cancel: "Batal",
  clear: "Hapus",
  choose: "Pilih",
  chooseDate: "Pilih tanggal",
  chooseMonth: "Pilih bulan",
  chooseYear: "Pilih tahun",
  dateFormat: "dd MM yy",
  dayNames: ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"],
  dayNamesMin: ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"],
  dayNamesShort: ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"],
  firstDayOfWeek: 1,
  monthNames: [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Agu",
    "Sep",
    "Okt",
    "Nov",
    "Des",
  ],
  nextDecade: "Dekade berikutnya",
  nextHour: "Jam berikutnya",
  nextMinute: "Menit berikutnya",
  nextMonth: "Bulan berikutnya",
  nextSecond: "Detik berikutnya",
  nextYear: "Tahun berikutnya",
  now: "Sekarang",
  pm: "PM",
  prevDecade: "Dekade sebelumnya",
  prevHour: "Jam sebelumnya",
  prevMinute: "Menit sebelumnya",
  prevMonth: "Bulan sebelumnya",
  prevSecond: "Detik sebelumnya",
  prevYear: "Tahun sebelumnya",
  today: "Hari ini",
  weekHeader: "Mg",
};

addLocale("id", indonesianLocale);
setPrimeReactLocale("id");

const primeReactConfig = {
  appendTo: "self" as AppendToType,
  locale: "id",
};

export default function PrimeReactLocaleProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <PrimeReactProvider value={primeReactConfig}>{children}</PrimeReactProvider>
  );
}
