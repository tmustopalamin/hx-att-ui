"use client";

import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { MultiSelect } from "primereact/multiselect";
import { Tag } from "primereact/tag";

import { useI18n } from "@/app/i18n";
import { fetcher } from "@/app/utils/fetcher";
import { ResponseType } from "@/app/types/response-type";
import { Agency } from "@/app/types/agency";
import { Department } from "@/app/types/department";
import { Position } from "@/app/types/position";

export interface AttendanceSummaryExportFilters {
  agencyIds: number[];
  departmentIds: number[];
  positionIds: number[];
}

interface ExportAttendanceSummaryDialogProps {
  visible: boolean;
  onHide: () => void;
  onExport: (filters: AttendanceSummaryExportFilters) => Promise<void>;
  isExporting: boolean;
  dateRangeText?: string;
}

export default function ExportAttendanceSummaryDialog({
  visible,
  onHide,
  onExport,
  isExporting,
  dateRangeText,
}: ExportAttendanceSummaryDialogProps) {
  const { locale } = useI18n();
  const isId = locale === "id";

  // Filter States: default is empty array (meaning ALL)
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<number[]>([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>(
    [],
  );
  const [selectedPositionIds, setSelectedPositionIds] = useState<number[]>([]);

  // Fetch Master Data
  const { data: agencyData, isLoading: agencyLoading } = useSWR<
    ResponseType<Agency[]> | Agency[]
  >(visible ? "/api/agency?show_all=false" : null, fetcher);

  const { data: departmentData, isLoading: departmentLoading } = useSWR<
    ResponseType<Department[]> | Department[]
  >(visible ? "/api/department?show_all=false" : null, fetcher);

  const { data: positionData, isLoading: positionLoading } = useSWR<
    ResponseType<Position[]> | Position[]
  >(visible ? "/api/position?show_all=false" : null, fetcher);

  // Map options
  const agencyOptions = useMemo(() => {
    const list = Array.isArray(agencyData)
      ? agencyData
      : ((agencyData as ResponseType<Agency[]>)?.data ?? []);

    return list
      .filter((item) => item.is_active !== false)
      .map((item) => ({
        id: item.id,
        name: item.name || item.code,
        code: item.code,
      }));
  }, [agencyData]);

  const departmentOptions = useMemo(() => {
    const list = Array.isArray(departmentData)
      ? departmentData
      : ((departmentData as ResponseType<Department[]>)?.data ?? []);

    return list
      .filter((item) => item.is_active !== false)
      .map((item) => ({
        id: item.id,
        name: item.name || item.code,
        code: item.code,
      }));
  }, [departmentData]);

  const positionOptions = useMemo(() => {
    const list = Array.isArray(positionData)
      ? positionData
      : ((positionData as ResponseType<Position[]>)?.data ?? []);

    return list
      .filter((item) => item.is_active !== false)
      .map((item) => ({
        id: item.id,
        name: item.name || item.code,
        code: item.code,
      }));
  }, [positionData]);

  // Check if any filter is active
  const isAllSelected =
    selectedAgencyIds.length === 0 &&
    selectedDepartmentIds.length === 0 &&
    selectedPositionIds.length === 0;

  const totalActiveFilters =
    (selectedAgencyIds.length > 0 ? 1 : 0) +
    (selectedDepartmentIds.length > 0 ? 1 : 0) +
    (selectedPositionIds.length > 0 ? 1 : 0);

  const handleResetToAll = () => {
    setSelectedAgencyIds([]);
    setSelectedDepartmentIds([]);
    setSelectedPositionIds([]);
  };

  const handleExport = async () => {
    await onExport({
      agencyIds: selectedAgencyIds,
      departmentIds: selectedDepartmentIds,
      positionIds: selectedPositionIds,
    });
  };

  const headerElement = (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
        <i className="pi pi-file-excel text-lg" />
      </div>
      <div>
        <h3 className="m-0 text-base font-semibold text-slate-800">
          {isId
            ? "Ekspor Excel Attendance Summary"
            : "Export Attendance Summary Excel"}
        </h3>
        {dateRangeText && (
          <p className="m-0 text-xs text-slate-500">
            {isId ? "Periode: " : "Period: "}
            <span className="font-medium text-slate-700">{dateRangeText}</span>
          </p>
        )}
      </div>
    </div>
  );

  const footerElement = (
    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-3 border-t border-slate-200">
      <div className="flex items-center">
        {!isAllSelected && (
          <Button
            type="button"
            label={isId ? "Reset ke Semua (All)" : "Reset to All"}
            icon="pi pi-refresh"
            size="small"
            text
            severity="secondary"
            disabled={isExporting}
            onClick={handleResetToAll}
          />
        )}
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          label={isId ? "Batal" : "Cancel"}
          icon="pi pi-times"
          size="small"
          outlined
          severity="secondary"
          disabled={isExporting}
          onClick={onHide}
        />
        <Button
          type="button"
          label={
            isExporting
              ? isId
                ? "Mengekspor..."
                : "Exporting..."
              : isId
                ? "Ekspor Excel"
                : "Export Excel"
          }
          icon={isExporting ? "pi pi-spin pi-spinner" : "pi pi-download"}
          size="small"
          severity="success"
          loading={isExporting}
          onClick={handleExport}
        />
      </div>
    </div>
  );

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={headerElement}
      footer={footerElement}
      style={{ width: "95vw", maxWidth: "600px" }}
      modal
      className="p-fluid shadow-2xl rounded-2xl"
      closable={!isExporting}
    >
      <div className="flex flex-col gap-5 py-2">
        {/* Info Banner showing export mode */}
        <div
          className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs leading-relaxed transition-all ${
            isAllSelected
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-blue-200 bg-blue-50 text-blue-900"
          }`}
        >
          <i
            className={`mt-0.5 text-sm ${
              isAllSelected
                ? "pi pi-info-circle text-emerald-600"
                : "pi pi-filter text-blue-600"
            }`}
          />
          <div className="flex-1">
            {isAllSelected ? (
              <div>
                <span className="font-semibold text-emerald-950">
                  {isId
                    ? "Mode Ekspor: Semua Data (All)"
                    : "Export Mode: All Data"}
                </span>
                <p className="m-0 mt-0.5 text-emerald-800">
                  {isId
                    ? "Tidak ada filter yang dipilih. Seluruh data karyawan dari semua agensi, departemen, dan posisi akan diekspor."
                    : "No specific filters selected. All employee records across all agencies, departments, and positions will be exported."}
                </p>
              </div>
            ) : (
              <div>
                <span className="font-semibold text-blue-950">
                  {isId
                    ? `Mode Ekspor: Difilter Spesifik (${totalActiveFilters} Kategori)`
                    : `Export Mode: Specific Filter (${totalActiveFilters} Categories)`}
                </span>
                <p className="m-0 mt-0.5 text-blue-800">
                  {isId
                    ? "Hanya data karyawan yang memenuhi kriteria pilihan di bawah yang akan diekspor."
                    : "Only employee records matching the selected criteria below will be exported."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Funnel Order: 1. Agency -> 2. Department -> 3. Position */}
        <div className="flex flex-col gap-4">
          {/* Level 1: Agency */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <i className="pi pi-building text-slate-500 text-xs" />
                <span>
                  {isId ? "1. Agency / Rekanan" : "1. Agency / Partner"}
                </span>
              </label>
              {selectedAgencyIds.length === 0 ? (
                <Tag
                  value={isId ? "Semua Agency (All)" : "All Agencies"}
                  severity="secondary"
                  className="text-[10px] py-0 px-2 font-normal"
                />
              ) : (
                <Tag
                  value={`${selectedAgencyIds.length} ${
                    isId ? "dipilih" : "selected"
                  }`}
                  severity="info"
                  className="text-[10px] py-0 px-2 font-semibold"
                />
              )}
            </div>
            <MultiSelect
              value={selectedAgencyIds}
              options={agencyOptions}
              optionLabel="name"
              optionValue="id"
              filter
              display="chip"
              showClear
              placeholder={
                isId
                  ? "Semua Agency (Kosong = All)"
                  : "All Agencies (Empty = All)"
              }
              className="w-full text-sm"
              loading={agencyLoading}
              disabled={agencyLoading || isExporting}
              onChange={(e) => setSelectedAgencyIds(e.value || [])}
              itemTemplate={(option: {
                id: number;
                name: string;
                code: string;
              }) => (
                <div className="flex items-center justify-between w-full py-0.5">
                  <span className="font-medium text-slate-800 text-xs sm:text-sm">
                    {option.name}
                  </span>
                  {option.code && (
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {option.code}
                    </span>
                  )}
                </div>
              )}
            />
            <span className="text-[11px] text-slate-400">
              {isId
                ? "Pilih satu atau lebih agency. Kosongkan untuk mengekspor semua agency."
                : "Select one or more agencies. Leave blank to export all agencies."}
            </span>
          </div>

          {/* Level 2: Department */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <i className="pi pi-sitemap text-slate-500 text-xs" />
                <span>
                  {isId ? "2. Departemen / Divisi" : "2. Department / Division"}
                </span>
              </label>
              {selectedDepartmentIds.length === 0 ? (
                <Tag
                  value={isId ? "Semua Departemen (All)" : "All Departments"}
                  severity="secondary"
                  className="text-[10px] py-0 px-2 font-normal"
                />
              ) : (
                <Tag
                  value={`${selectedDepartmentIds.length} ${
                    isId ? "dipilih" : "selected"
                  }`}
                  severity="info"
                  className="text-[10px] py-0 px-2 font-semibold"
                />
              )}
            </div>
            <MultiSelect
              value={selectedDepartmentIds}
              options={departmentOptions}
              optionLabel="name"
              optionValue="id"
              filter
              display="chip"
              showClear
              placeholder={
                isId
                  ? "Semua Departemen (Kosong = All)"
                  : "All Departments (Empty = All)"
              }
              className="w-full text-sm"
              loading={departmentLoading}
              disabled={departmentLoading || isExporting}
              onChange={(e) => setSelectedDepartmentIds(e.value || [])}
              itemTemplate={(option: {
                id: number;
                name: string;
                code: string;
              }) => (
                <div className="flex items-center justify-between w-full py-0.5">
                  <span className="font-medium text-slate-800 text-xs sm:text-sm">
                    {option.name}
                  </span>
                  {option.code && (
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {option.code}
                    </span>
                  )}
                </div>
              )}
            />
            <span className="text-[11px] text-slate-400">
              {isId
                ? "Pilih satu atau lebih departemen. Kosongkan untuk mengekspor semua departemen."
                : "Select one or more departments. Leave blank to export all departments."}
            </span>
          </div>

          {/* Level 3: Position */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <i className="pi pi-id-card text-slate-500 text-xs" />
                <span>
                  {isId ? "3. Posisi / Jabatan" : "3. Position / Role"}
                </span>
              </label>
              {selectedPositionIds.length === 0 ? (
                <Tag
                  value={isId ? "Semua Posisi (All)" : "All Positions"}
                  severity="secondary"
                  className="text-[10px] py-0 px-2 font-normal"
                />
              ) : (
                <Tag
                  value={`${selectedPositionIds.length} ${
                    isId ? "dipilih" : "selected"
                  }`}
                  severity="info"
                  className="text-[10px] py-0 px-2 font-semibold"
                />
              )}
            </div>
            <MultiSelect
              value={selectedPositionIds}
              options={positionOptions}
              optionLabel="name"
              optionValue="id"
              filter
              display="chip"
              showClear
              placeholder={
                isId
                  ? "Semua Posisi (Kosong = All)"
                  : "All Positions (Empty = All)"
              }
              className="w-full text-sm"
              loading={positionLoading}
              disabled={positionLoading || isExporting}
              onChange={(e) => setSelectedPositionIds(e.value || [])}
              itemTemplate={(option: {
                id: number;
                name: string;
                code: string;
              }) => (
                <div className="flex items-center justify-between w-full py-0.5">
                  <span className="font-medium text-slate-800 text-xs sm:text-sm">
                    {option.name}
                  </span>
                  {option.code && (
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {option.code}
                    </span>
                  )}
                </div>
              )}
            />
            <span className="text-[11px] text-slate-400">
              {isId
                ? "Pilih satu atau lebih posisi/jabatan. Kosongkan untuk mengekspor semua posisi."
                : "Select one or more positions. Leave blank to export all positions."}
            </span>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
