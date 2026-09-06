"use client";

import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { Button } from "primereact/button";
import { Calendar } from "primereact/calendar";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";

import { useI18n } from "@/app/i18n";
import {
  getEmployeeScheduleChangeLog,
  getEmployeeScheduleChangeLogs,
} from "@/app/services/employee-schedule-change-log-service";
import type {
  EmployeeScheduleChangeLogDetail,
  EmployeeScheduleChangeLogEntry,
  EmployeeScheduleChangeLogSummary,
} from "@/app/types/employee-schedule-change-log";
import { formatDate, formatDateTimeWithSeconds } from "@/app/utils/date-format";
import {
  getErrorMessage,
  isResponseTypeError,
} from "@/app/utils/error-messages";
import { hasPermission } from "@/app/utils/permission-utils";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { RootState } from "@/store/store";

const parseId = (value: string) => {
  if (!value.trim()) return undefined;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const changeTypeSeverity = (changeType: string) => {
  switch (changeType) {
    case "INSERT":
      return "success" as const;
    case "ARCHIVE":
      return "warning" as const;
    default:
      return "info" as const;
  }
};

const formatShift = (name: string | null, id: number | null) =>
  name || (id ? `#${id}` : "-");

const formatTimeline = (
  timeline: EmployeeScheduleChangeLogDetail["preview_snapshot"]["employees"][number]["timeline"],
) =>
  timeline.map((segment) => {
    const end = segment.effective_to ? formatDate(segment.effective_to) : "∞";
    return `#${segment.shift_rule_id} (${formatDate(segment.effective_from)} – ${end})`;
  });

export default function EmployeeScheduleChangeLogData() {
  const { tText } = useI18n();
  const permissions = useSelector(
    (state: RootState) => state.profile.permissions,
  );
  const canRead = hasPermission(
    permissions,
    "employee-schedule-change-log.read",
  );

  const [occurredFrom, setOccurredFrom] = useState<Date | null>(null);
  const [occurredTo, setOccurredTo] = useState<Date | null>(null);
  const [actorEmployeeId, setActorEmployeeId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [first, setFirst] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [rows, setRows] = useState<EmployeeScheduleChangeLogSummary[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<EmployeeScheduleChangeLogDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const result = await getEmployeeScheduleChangeLogs({
        page: Math.floor(first / rowsPerPage) + 1,
        page_size: rowsPerPage,
        occurred_from: occurredFrom
          ? dayjs(occurredFrom).format("YYYY-MM-DD")
          : undefined,
        occurred_to: occurredTo
          ? dayjs(occurredTo).format("YYYY-MM-DD")
          : undefined,
        actor_employee_id: parseId(actorEmployeeId),
        employee_id: parseId(employeeId),
      });
      setRows(result.data ?? []);
      setTotalRecords(result.total_records ?? 0);
    } catch (requestError: unknown) {
      setError(
        isResponseTypeError(requestError)
          ? getErrorMessage(requestError, "message")
          : tText("Unable to load mass schedule change logs."),
      );
    } finally {
      setLoading(false);
    }
  }, [
    actorEmployeeId,
    canRead,
    employeeId,
    first,
    occurredFrom,
    occurredTo,
    rowsPerPage,
    tText,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadDetail = async (id: number) => {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);
    try {
      setDetail(await getEmployeeScheduleChangeLog(id));
    } catch (requestError: unknown) {
      setDetailError(
        isResponseTypeError(requestError)
          ? getErrorMessage(requestError, "message")
          : tText("Unable to load mass schedule change detail."),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const resetFilters = () => {
    setOccurredFrom(null);
    setOccurredTo(null);
    setActorEmployeeId("");
    setEmployeeId("");
    setFirst(0);
  };

  if (!canRead) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {tText("Only superadmin can view the mass schedule change log.")}
      </div>
    );
  }

  if (loading && rows.length === 0) return <LoadingDataTable />;

  return (
    <div className="space-y-4">
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <i className="pi pi-history text-lg" />
            </div>
            <div>
              <h1 className="m-0 text-xl font-bold text-slate-900">
                {tText("Mass Shift Change Log")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {tText(
                  "Review who applied each mass shift change and the exact employee shift transitions.",
                )}
              </p>
            </div>
          </div>
          <Button
            label={tText("Refresh")}
            icon="pi pi-refresh"
            outlined
            loading={loading}
            onClick={() => void load()}
          />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              {tText("Performed from")}
            </label>
            <Calendar
              value={occurredFrom}
              onChange={(event) => {
                setOccurredFrom((event.value as Date | null) ?? null);
                setFirst(0);
              }}
              showIcon
              dateFormat="dd MM yy"
              className="w-full"
              maxDate={occurredTo ?? undefined}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              {tText("Performed to")}
            </label>
            <Calendar
              value={occurredTo}
              onChange={(event) => {
                setOccurredTo((event.value as Date | null) ?? null);
                setFirst(0);
              }}
              showIcon
              dateFormat="dd MM yy"
              className="w-full"
              minDate={occurredFrom ?? undefined}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              {tText("Actor employee ID")}
            </label>
            <InputText
              value={actorEmployeeId}
              onChange={(event) => {
                setActorEmployeeId(event.target.value);
                setFirst(0);
              }}
              inputMode="numeric"
              placeholder={tText("All actors")}
              className="w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              {tText("Changed employee ID")}
            </label>
            <InputText
              value={employeeId}
              onChange={(event) => {
                setEmployeeId(event.target.value);
                setFirst(0);
              }}
              inputMode="numeric"
              placeholder={tText("All employees")}
              className="w-full"
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            label={tText("Clear filters")}
            icon="pi pi-filter-slash"
            text
            onClick={resetFilters}
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}

      <Card className="border border-slate-200 shadow-sm">
        <DataTable
          value={rows}
          dataKey="id"
          lazy
          paginator
          first={first}
          rows={rowsPerPage}
          totalRecords={totalRecords}
          rowsPerPageOptions={[10, 25, 50, 100]}
          responsiveLayout="scroll"
          stripedRows
          rowHover
          loading={loading}
          emptyMessage={tText("No mass schedule change logs found.")}
          currentPageReportTemplate={tText(
            "Showing {first} to {last} of {totalRecords}",
          )}
          paginatorTemplate="RowsPerPageDropdown FirstPageLink PrevPageLink CurrentPageReport NextPageLink LastPageLink"
          onPage={(event) => {
            setFirst(event.first);
            setRowsPerPage(event.rows);
          }}
        >
          <Column field="id" header={tText("ID")} style={{ width: "5rem" }} />
          <Column
            field="occurred_at"
            header={tText("Performed at")}
            body={(row: EmployeeScheduleChangeLogSummary) =>
              formatDateTimeWithSeconds(row.occurred_at)
            }
          />
          <Column
            field="actor_name"
            header={tText("Performed by")}
            body={(row: EmployeeScheduleChangeLogSummary) => (
              <div>
                <div className="font-medium text-slate-800">
                  {row.actor_name}
                </div>
                <div className="text-xs text-slate-500">
                  {tText("Employee")} #{row.actor_employee_id}
                </div>
              </div>
            )}
          />
          <Column
            field="target_shift_rule_name"
            header={tText("Target Shift Rule")}
          />
          <Column
            header={tText("Effective period")}
            body={(row: EmployeeScheduleChangeLogSummary) =>
              `${formatDate(row.effective_from)} – ${formatDate(row.effective_to)}`
            }
          />
          <Column
            header={tText("Employees / changed rows")}
            body={(row: EmployeeScheduleChangeLogSummary) =>
              `${row.employee_count} / ${row.changed_row_count}`
            }
          />
          <Column
            header={tText("Detail")}
            body={(row: EmployeeScheduleChangeLogSummary) => (
              <Button
                icon="pi pi-eye"
                rounded
                outlined
                size="small"
                tooltip={tText("View detail")}
                onClick={() => {
                  setDetailLoading(true);
                  void loadDetail(row.id);
                }}
              />
            )}
          />
        </DataTable>
      </Card>

      <Dialog
        visible={detail !== null || detailLoading || detailError !== ""}
        onHide={() => {
          if (!detailLoading) {
            setDetail(null);
            setDetailError("");
          }
        }}
        header={tText("Mass Shift Change Detail")}
        modal
        maximizable
        style={{ width: "min(1200px, 96vw)" }}
      >
        {detailLoading && !detail && (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <i className="pi pi-spin pi-spinner" />
            {tText("Loading detail...")}
          </div>
        )}
        {detailError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {detailError}
          </div>
        )}
        {detail && (
          <div className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [tText("Performed by"), detail.actor_name],
                [
                  tText("Performed at"),
                  formatDateTimeWithSeconds(detail.occurred_at),
                ],
                [
                  tText("Effective period"),
                  `${formatDate(detail.effective_from)} – ${formatDate(detail.effective_to)}`,
                ],
                [tText("Target Shift Rule"), detail.target_shift_rule_name],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="m-0 text-xs text-slate-500">{label}</p>
                  <p className="m-0 mt-1 font-semibold text-slate-800">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                [tText("Employees"), detail.employee_count],
                [tText("Inserted"), detail.assignments_inserted],
                [tText("Updated"), detail.assignments_updated],
                [tText("Archived"), detail.assignments_archived],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-slate-50 p-3">
                  <p className="m-0 text-xs text-slate-500">{label}</p>
                  <p className="m-0 mt-1 text-lg font-semibold text-slate-800">
                    {String(value)}
                  </p>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 px-4 py-3">
                <h3 className="m-0 text-sm font-semibold text-slate-800">
                  {tText("Employee shift transitions")}
                </h3>
              </div>
              <table className="w-full min-w-[58rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-2">{tText("Date")}</th>
                    <th className="px-3 py-2">{tText("Employee")}</th>
                    <th className="px-3 py-2">{tText("Change")}</th>
                    <th className="px-3 py-2">{tText("From shift")}</th>
                    <th className="px-3 py-2">{tText("To shift")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.changes.map(
                    (change: EmployeeScheduleChangeLogEntry) => (
                      <tr
                        key={change.id}
                        className="border-b border-slate-100 align-top"
                      >
                        <td className="px-3 py-3 whitespace-nowrap">
                          {formatDate(change.shift_date)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-slate-800">
                            {change.employee_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            #{change.employee_id}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Tag
                            value={change.change_type}
                            severity={changeTypeSeverity(change.change_type)}
                            rounded
                          />
                        </td>
                        <td className="px-3 py-3">
                          {formatShift(
                            change.old_shift_name,
                            change.old_shift_id,
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {formatShift(
                            change.new_shift_name,
                            change.new_shift_id,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              {detail.changes.length === 0 && (
                <p className="m-0 p-4 text-sm text-slate-500">
                  {tText(
                    "No daily assignment changed; this operation changed the employee rule timeline only.",
                  )}
                </p>
              )}
            </div>

            <details className="rounded-xl border border-slate-200">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-800">
                {tText("Preview snapshot")}
              </summary>
              <div className="overflow-x-auto border-t border-slate-200">
                <table className="w-full min-w-[48rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-2">{tText("Employee ID")}</th>
                      <th className="px-3 py-2">{tText("Rule timeline")}</th>
                      <th className="px-3 py-2">{tText("Inserted")}</th>
                      <th className="px-3 py-2">{tText("Updated")}</th>
                      <th className="px-3 py-2">{tText("Archived")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.preview_snapshot.employees.map((employee) => (
                      <tr
                        key={employee.employee_id}
                        className="border-b border-slate-100 align-top"
                      >
                        <td className="px-3 py-3">{employee.employee_id}</td>
                        <td className="px-3 py-3">
                          <div className="flex flex-col gap-1">
                            {formatTimeline(employee.timeline).map((value) => (
                              <span key={value}>{value}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          {employee.assignments_to_insert}
                        </td>
                        <td className="px-3 py-3">
                          {employee.assignments_to_update}
                        </td>
                        <td className="px-3 py-3">
                          {employee.assignments_to_archive}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        )}
      </Dialog>
    </div>
  );
}
