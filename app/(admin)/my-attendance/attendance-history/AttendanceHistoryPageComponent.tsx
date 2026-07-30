"use client";

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

type SourceOption = {
  label: string;
  value: string;
};

const DISPLAY_DATE_TIME_FORMAT = "DD-MM-YYYY HH:mm:ss";

const SOURCE_OPTIONS: SourceOption[] = [
  { label: "All Sources", value: "ALL" },
  { label: "Mobile", value: "MOBILE" },
  { label: "Machine", value: "MACHINE" },
  { label: "Web", value: "WEB" },
  { label: "API", value: "API" },
  { label: "Face", value: "FACE" },
  { label: "GPS", value: "GPS" },
];

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";

  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;

  return parsed.format(DISPLAY_DATE_TIME_FORMAT);
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

const AttendanceHistoryPageComponent = () => {
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
        (item.source_type ?? "").toUpperCase() === sourceFilter.toUpperCase();

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
      return <span className="text-sm text-slate-400">No Photo</span>;
    }

    return (
      <button
        type="button"
        className="overflow-hidden rounded-lg border border-slate-200"
        onClick={() => setPreviewPhoto(finalPhotoUrl)}
      >
        <img
          src={finalPhotoUrl}
          alt="Attendance"
          className="h-12 w-12 object-cover"
        />
      </button>
    );
  };

  const sourceBodyTemplate = (rowData: AttendanceLog) => {
    return <Tag value={rowData.source_type || "-"} severity="info" />;
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
        value={rowData.processed ? "Processed" : "Pending"}
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
        Open Map
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
                  Attendance History
                </h2>
                <p className="text-sm text-slate-500">
                  Review your attendance log history.
                </p>
              </div>

              <Button
                type="button"
                icon="pi pi-refresh"
                label="Refresh"
                onClick={() => mutate()}
                severity="secondary"
                outlined
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Source
                </label>
                <Dropdown
                  value={sourceFilter}
                  options={SOURCE_OPTIONS}
                  onChange={(e) => setSourceFilter(e.value)}
                  optionLabel="label"
                  optionValue="value"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date From
                </label>
                <Calendar
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.value ?? null)}
                  showIcon
                  dateFormat="dd-mm-yy"
                  className="w-full"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Date To
                </label>
                <Calendar
                  value={dateTo}
                  onChange={(e) => setDateTo(e.value ?? null)}
                  showIcon
                  dateFormat="dd-mm-yy"
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
            emptyMessage="No attendance history found."
          >
            <Column
              header="#"
              style={{ width: "4rem" }}
              body={(_, options) => options.rowIndex + 1}
            />
            <Column
              header="Date Time"
              style={{ minWidth: "14rem" }}
              body={(rowData: AttendanceLog) =>
                formatDateTime(rowData.event_time)
              }
            />
            <Column
              header="Source"
              style={{ minWidth: "8rem" }}
              body={sourceBodyTemplate}
            />
            <Column
              header="Status"
              style={{ minWidth: "8rem" }}
              body={statusBodyTemplate}
            />
            <Column
              header="Photo"
              style={{ minWidth: "7rem" }}
              body={photoBodyTemplate}
            />
            <Column
              header="Location"
              style={{ minWidth: "8rem" }}
              body={locationBodyTemplate}
            />
            <Column
              header="Processed"
              style={{ minWidth: "8rem" }}
              body={processedBodyTemplate}
            />
          </DataTable>
        </Card>
      </div>

      <Dialog
        header="Attendance Photo"
        visible={!!previewPhoto}
        style={{ width: "32rem", maxWidth: "95vw" }}
        onHide={() => setPreviewPhoto(null)}
      >
        {previewPhoto && (
          <img
            src={previewPhoto}
            alt="Attendance Preview"
            className="w-full rounded-xl"
          />
        )}
      </Dialog>
    </>
  );
};

export default AttendanceHistoryPageComponent;
