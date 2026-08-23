"use client";
import { useI18n } from "@/app/i18n";

import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import useSWR from "swr";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Tag } from "primereact/tag";
import { AttendanceLog } from "@/app/types/attendance-log";
import { getMyAttendanceHistory } from "@/app/services/my-attendance-history-service";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { formatDateTimeWithSeconds } from "@/app/utils/date-format";

type SourceOption = {
  labelKey: string;
  value: string;
};

const SOURCE_OPTIONS: SourceOption[] = [
  { labelKey: "All Sources", value: "ALL" },
  { labelKey: "Mobile App", value: "MOBILE" },
  { labelKey: "Machine", value: "MACHINE" },
  { labelKey: "Web", value: "WEB" },
  { labelKey: "API", value: "API" },
  { labelKey: "Face", value: "FACE" },
  { labelKey: "GPS", value: "GPS" },
];

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;

  return formatDateTimeWithSeconds(value, value);
};

const buildPhotoUrl = (photoUrl?: string | null) => {
  if (!photoUrl) return null;
  const filename = photoUrl.split(/[\\/]/).pop();
  return filename
    ? `/api/public/upload/attendance/${encodeURIComponent(filename)}`
    : null;
};

const buildGoogleMapsUrl = (latitude?: unknown, longitude?: unknown) => {
  if (latitude == null || longitude == null) return null;
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
};

const getStatusSeverity = (status?: string | null) => {
  const normalized = (status ?? "").toUpperCase();

  switch (normalized) {
    case "VALID":
      return "success";
    case "DUPLICATE":
      return "warning";
    case "INVALID":
      return "danger";
    case "IGNORED":
      return "secondary";
    default:
      return "info";
  }
};

const getProcessedSeverity = (processed: boolean) => {
  return processed ? "success" : "warning";
};

const getSourceValue = (rowData: AttendanceLog) => {
  const externalSystem = (rowData.external_system ?? "").toUpperCase();

  if (externalSystem === "MOBILE_WEB") return "WEB";
  if (externalSystem === "ANDROID_APP") return "MOBILE";

  const clientPlatform = rowData.extra_data?.client_platform;
  if (typeof clientPlatform === "string") {
    const normalizedPlatform = clientPlatform.toUpperCase();
    if (normalizedPlatform === "WEB") return "WEB";
    if (normalizedPlatform === "ANDROID") return "MOBILE";
  }

  return (rowData.source_type ?? "").toUpperCase();
};

const getSourceLabel = (sourceValue: string) => {
  if (sourceValue === "MOBILE") return "Mobile App";
  if (sourceValue === "WEB") return "Web";
  return sourceValue || "-";
};

const AttendanceHistoryPageComponent = () => {
  const { t: i18nT, tText } = useI18n();
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  const {
    data: attendanceLogs,
    error,
    isLoading,
    mutate,
  } = useSWR<AttendanceLog[]>(
    "/api/my-attendance/history",
    getMyAttendanceHistory,
  );

  const filteredData = useMemo(() => {
    const rows = attendanceLogs ?? [];

    return rows.filter((item) => {
      const sourceMatch =
        sourceFilter === "ALL" ||
        getSourceValue(item) === sourceFilter.toUpperCase();

      const eventDate = item.event_time ? dayjs(item.event_time) : null;

      const fromMatch =
        !dateFrom ||
        !eventDate ||
        eventDate.isAfter(dayjs(dateFrom).startOf("day")) ||
        eventDate.isSame(dayjs(dateFrom).startOf("day"));

      const toMatch =
        !dateTo ||
        !eventDate ||
        eventDate.isBefore(dayjs(dateTo).endOf("day")) ||
        eventDate.isSame(dayjs(dateTo).endOf("day"));

      return sourceMatch && fromMatch && toMatch;
    });
  }, [attendanceLogs, sourceFilter, dateFrom, dateTo]);

  const photoBodyTemplate = (rowData: AttendanceLog) => {
    const finalPhotoUrl = buildPhotoUrl(rowData.photo_url);

    if (!finalPhotoUrl) {
      return (
        <span className="text-sm text-slate-400">{i18nT("static.1uy2e")}</span>
      );
    }

    return (
      <button
        type="button"
        className="overflow-hidden rounded-lg border border-slate-200"
        onClick={() => setPreviewPhoto(finalPhotoUrl)}
      >
        <img
          src={finalPhotoUrl}
          alt={tText("Attendance")}
          className="h-12 w-12 object-cover"
        />
      </button>
    );
  };

  const sourceBodyTemplate = (rowData: AttendanceLog) => {
    return (
      <Tag
        value={tText(getSourceLabel(getSourceValue(rowData)))}
        severity="info"
      />
    );
  };

  const statusBodyTemplate = (rowData: AttendanceLog) => {
    return (
      <Tag
        value={rowData.status || "-"}
        severity={getStatusSeverity(rowData.status)}
      />
    );
  };

  const processedBodyTemplate = (rowData: AttendanceLog) => {
    return (
      <Tag
        value={tText(rowData.processed ? "Processed" : "Pending")}
        severity={getProcessedSeverity(!!rowData.processed)}
      />
    );
  };

  const locationBodyTemplate = (rowData: AttendanceLog) => {
    const mapUrl = buildGoogleMapsUrl(rowData.latitude, rowData.longitude);

    if (rowData.latitude == null || rowData.longitude == null) {
      return <span className="text-sm text-slate-400">-</span>;
    }

    return (
      <button
        type="button"
        className="text-sm font-medium text-blue-600 hover:underline"
        onClick={() => window.open(mapUrl!, "_blank", "noopener,noreferrer")}
      >
        {i18nT("static.1obuvcr")}{" "}
      </button>
    );
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) {
    return <ErrorNotConnectedToApi mutateKey="/api/my-attendance/history" />;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <Card className="shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {i18nT("static.16ukhgu")}{" "}
                </h2>
                <p className="text-sm text-slate-500">
                  {i18nT("static.px68n9")}{" "}
                </p>
              </div>

              <Button
                type="button"
                icon="pi pi-refresh"
                label={i18nT("static.28r6qc")}
                onClick={() => mutate()}
                severity="secondary"
                outlined
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {i18nT("static.r5qyuw")}{" "}
                </label>
                <Dropdown
                  value={sourceFilter}
                  options={SOURCE_OPTIONS.map((option) => ({
                    label: i18nT(option.labelKey),
                    value: option.value,
                  }))}
                  onChange={(e) => setSourceFilter(e.value)}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {i18nT("static.pkgk6v")}{" "}
                </label>
                <Calendar
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.value ?? null)}
                  showIcon
                  dateFormat="dd MM yy"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  {i18nT("static.1iqht4m")}{" "}
                </label>
                <Calendar
                  value={dateTo}
                  onChange={(e) => setDateTo(e.value ?? null)}
                  showIcon
                  dateFormat="dd MM yy"
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </Card>

        <Card className="shadow-sm">
          <DataTable
            value={filteredData}
            paginator
            rows={10}
            rowsPerPageOptions={[10, 25, 50]}
            dataKey="id"
            stripedRows
            rowHover
            scrollable
            tableStyle={{ minWidth: "60rem" }}
            emptyMessage={i18nT("static.tl9trl")}
          >
            <Column
              header="#"
              style={{ width: "4rem" }}
              body={(_, options) => options.rowIndex + 1}
            />
            <Column
              header={i18nT("static.16l1nsi")}
              style={{ minWidth: "14rem" }}
              body={(rowData: AttendanceLog) =>
                formatDateTime(rowData.event_time)
              }
            />
            <Column
              header={i18nT("static.r5qyuw")}
              style={{ minWidth: "8rem" }}
              body={sourceBodyTemplate}
            />
            <Column
              header={i18nT("static.3pd73")}
              style={{ minWidth: "8rem" }}
              body={statusBodyTemplate}
            />
            <Column
              header={i18nT("static.n2dhtv")}
              style={{ minWidth: "7rem" }}
              body={photoBodyTemplate}
            />
            <Column
              header={i18nT("static.pghiva")}
              style={{ minWidth: "8rem" }}
              body={locationBodyTemplate}
            />
            <Column
              header={i18nT("static.1k5drjf")}
              style={{ minWidth: "8rem" }}
              body={processedBodyTemplate}
            />
          </DataTable>
        </Card>
      </div>

      <Dialog
        header={i18nT("static.1tkcrji")}
        visible={!!previewPhoto}
        style={{ width: "32rem", maxWidth: "95vw" }}
        onHide={() => setPreviewPhoto(null)}
      >
        {previewPhoto && (
          <img
            src={previewPhoto}
            alt={tText("Attendance Preview")}
            className="w-full rounded-xl"
          />
        )}
      </Dialog>
    </>
  );
};

export default AttendanceHistoryPageComponent;
