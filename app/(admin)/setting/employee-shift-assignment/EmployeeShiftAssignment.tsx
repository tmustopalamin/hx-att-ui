"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import dayjs from "dayjs";

import { Card } from "primereact/card";
import { InputText } from "primereact/inputtext";
import { Button } from "primereact/button";
import { Checkbox } from "primereact/checkbox";
import { Calendar } from "primereact/calendar";
import { Tag } from "primereact/tag";
import { ConfirmDialog, confirmDialog } from "primereact/confirmdialog";
import { Divider } from "primereact/divider";

import { fetcher } from "@/app/utils/fetcher";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import { showToast } from "@/store/ToastSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { hasRole } from "@/app/utils/role-utils";
import { EmployeeShiftAssignment } from "@/app/types/employee-shift-assignment";
import {
  deleteEmployeeShiftAssignment,
  purgeEmployeeShiftAssignment,
  restoreEmployeeShiftAssignment,
} from "@/app/services/employee-shift-assignment-service";

type QuickRange = "today" | "this_week" | "this_month";

type SelectedCell = {
  employeeId: number | null;
  employeeName: string | null;
  dateKey: string;
  entries: EmployeeShiftAssignment[];
} | null;

const EmployeeShiftAssignmentListPage = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const profileState = useSelector((state: RootState) => state.profile);

  const [search, setSearch] = useState("");
  const [isShowDeletedDataChecked, setIsShowDeletedDataChecked] =
    useState(false);
  const [dateFrom, setDateFrom] = useState<Date | null>(
    dayjs().startOf("week").toDate(),
  );
  const [dateTo, setDateTo] = useState<Date | null>(
    dayjs().endOf("week").toDate(),
  );
  const [quickRange, setQuickRange] = useState<QuickRange>("this_week");
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);

  const { data, error, isLoading } = useSWR<EmployeeShiftAssignment[]>(
    `/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`,
    fetcher,
  );

  const rows = data ?? [];

  const applyQuickRange = (range: QuickRange) => {
    setQuickRange(range);

    const today = dayjs();

    if (range === "today") {
      setDateFrom(today.startOf("day").toDate());
      setDateTo(today.endOf("day").toDate());
      return;
    }

    if (range === "this_week") {
      setDateFrom(today.startOf("week").toDate());
      setDateTo(today.endOf("week").toDate());
      return;
    }

    setDateFrom(today.startOf("month").toDate());
    setDateTo(today.endOf("month").toDate());
  };

  const filteredData = useMemo(() => {
    return rows.filter((item) => {
      const keyword = search.toLowerCase().trim();
      const shiftDate = item.shift_date ? dayjs(item.shift_date) : null;

      const matchSearch =
        !keyword ||
        (item.employee_name ?? "").toLowerCase().includes(keyword) ||
        (item.shift_name ?? "").toLowerCase().includes(keyword) ||
        (item.is_day_off ? "day off".includes(keyword) : false) ||
        (item.is_holiday ? "holiday".includes(keyword) : false) ||
        shiftDate?.format("DD-MM-YYYY").toLowerCase().includes(keyword);

      const matchDateFrom =
        !dateFrom ||
        (shiftDate !== null &&
          shiftDate.startOf("day").valueOf() >=
            dayjs(dateFrom).startOf("day").valueOf());

      const matchDateTo =
        !dateTo ||
        (shiftDate !== null &&
          shiftDate.endOf("day").valueOf() <=
            dayjs(dateTo).endOf("day").valueOf());

      return matchSearch && matchDateFrom && matchDateTo;
    });
  }, [rows, search, dateFrom, dateTo]);

  const visibleDates = useMemo(() => {
    if (!dateFrom || !dateTo) return [];

    const from = dayjs(dateFrom).startOf("day");
    const to = dayjs(dateTo).startOf("day");

    if (from.valueOf() > to.valueOf()) return [];

    const result: string[] = [];
    let current = from;

    while (current.valueOf() <= to.valueOf()) {
      result.push(current.format("YYYY-MM-DD"));
      current = current.add(1, "day");
    }

    return result;
  }, [dateFrom, dateTo]);

  const employeeRows = useMemo(() => {
    const map = new Map<
      number,
      { employeeId: number | null; employeeName: string | null }
    >();

    filteredData.forEach((item) => {
      if (item.employee_id == null) return;
      if (!map.has(item.employee_id)) {
        map.set(item.employee_id, {
          employeeId: item.employee_id,
          employeeName: item.employee_name,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      (a.employeeName ?? "").localeCompare(b.employeeName ?? ""),
    );
  }, [filteredData]);

  const scheduleMap = useMemo(() => {
    const map = new Map<string, EmployeeShiftAssignment[]>();

    filteredData.forEach((item) => {
      const dateKey = item.shift_date
        ? dayjs(item.shift_date).format("YYYY-MM-DD")
        : "no-date";
      const key = `${item.employee_id}__${dateKey}`;

      if (!map.has(key)) {
        map.set(key, []);
      }

      map.get(key)!.push(item);
    });

    return map;
  }, [filteredData]);

  const stats = useMemo(() => {
    const activeRows = filteredData.filter((item) => !item.deleted_at);
    const deletedRows = filteredData.filter((item) => !!item.deleted_at);
    const holidayRows = filteredData.filter((item) => item.is_holiday);
    const dayOffRows = filteredData.filter((item) => item.is_day_off);

    return {
      schedules: filteredData.length,
      employees: employeeRows.length,
      active: activeRows.length,
      deleted: deletedRows.length,
      holidays: holidayRows.length,
      dayOffs: dayOffRows.length,
    };
  }, [filteredData, employeeRows]);

  const topShifts = useMemo(() => {
    const countMap = new Map<string, number>();

    filteredData.forEach((item) => {
      const shiftName = item.shift_name ?? "Unknown Shift";
      countMap.set(shiftName, (countMap.get(shiftName) ?? 0) + 1);
    });

    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [filteredData]);

  const hasActiveFilter = !!search || !!dateFrom || !!dateTo;

  const clearFilters = () => {
    setSearch("");
    setDateFrom(dayjs().startOf("week").toDate());
    setDateTo(dayjs().endOf("week").toDate());
    setQuickRange("this_week");
    setSelectedCell(null);
  };

  const handleDelete = async (row: EmployeeShiftAssignment) => {
    try {
      await deleteEmployeeShiftAssignment(row.id, row.row_version);
      await mutate(
        `/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`,
      );
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: "Schedule deleted",
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: err.message,
        }),
      );
    }
  };

  const handleRestore = async (row: EmployeeShiftAssignment) => {
    try {
      await restoreEmployeeShiftAssignment(row.id, row.row_version);
      await mutate(
        `/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`,
      );
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: "Schedule restored",
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: err.message,
        }),
      );
    }
  };

  const handlePurge = async (row: EmployeeShiftAssignment) => {
    try {
      await purgeEmployeeShiftAssignment(row.id);
      await mutate(
        `/api/employee-shift-assignment?show_all=${isShowDeletedDataChecked}`,
      );
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: "Success",
          detail: "Schedule deleted permanently",
        }),
      );
    } catch (err: any) {
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: "Error",
          detail: err.message,
        }),
      );
    }
  };

  const renderStatusTag = (row: EmployeeShiftAssignment) => {
    return row.deleted_at ? (
      <Tag value="Deleted" severity="danger" />
    ) : (
      <Tag value="Active" severity="success" />
    );
  };

  const renderSpecialTags = (row: EmployeeShiftAssignment) => {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {row.is_holiday && <Tag value="Holiday" severity="warning" />}
        {row.is_day_off && <Tag value="Day Off" severity="info" />}
      </div>
    );
  };

  const getCellStyle = (entries: EmployeeShiftAssignment[]) => {
    const hasDeleted = entries.some((entry) => !!entry.deleted_at);
    const hasHoliday = entries.some((entry) => entry.is_holiday);
    const hasDayOff = entries.some((entry) => entry.is_day_off);

    if (hasDeleted) {
      return "bg-red-50 border-red-200 text-red-700";
    }

    if (hasHoliday && hasDayOff) {
      return "bg-amber-50 border-amber-200 text-amber-700";
    }

    if (hasHoliday) {
      return "bg-yellow-50 border-yellow-200 text-yellow-700";
    }

    if (hasDayOff) {
      return "bg-sky-50 border-sky-200 text-sky-700";
    }

    return "bg-blue-50 border-blue-200 text-blue-700";
  };

  const renderActionButtons = (row: EmployeeShiftAssignment) => {
    return (
      <div className="flex items-center gap-1">
        {hasRole(profileState.role, ["superadmin"]) && (
          <Button
            icon="pi pi-times"
            severity="secondary"
            rounded
            text
            size="small"
            tooltip="Delete permanently"
            onClick={() =>
              confirmDialog({
                header: "Delete Permanently",
                message: "Do you want to delete this schedule permanently?",
                accept: () => handlePurge(row),
              })
            }
          />
        )}

        {row.deleted_at ? (
          <Button
            icon="pi pi-refresh"
            severity="success"
            rounded
            text
            size="small"
            tooltip="Restore"
            onClick={() =>
              confirmDialog({
                header: "Restore Schedule",
                message: "Do you want to restore this schedule?",
                accept: () => handleRestore(row),
              })
            }
          />
        ) : (
          <Button
            icon="pi pi-trash"
            severity="danger"
            rounded
            text
            size="small"
            tooltip="Delete"
            onClick={() =>
              confirmDialog({
                header: "Delete Schedule",
                message: "Do you want to delete this schedule?",
                accept: () => handleDelete(row),
              })
            }
          />
        )}
      </div>
    );
  };

  if (isLoading) return <LoadingDataTable />;
  if (error)
    return (
      <ErrorNotConnectedToApi mutateKey="/api/employee-shift-assignment?show_all=true" />
    );

  return (
    <>
      <ConfirmDialog />

      <div className="p-4">
        <div className="mx-auto max-w-[1600px]">
          <Card className="shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div>
                  <div className="text-2xl md:text-3xl font-semibold text-gray-900">
                    Employee Shift Assignment (Daily Schedule)
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    One glance to see who works on which day.
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center rounded-full bg-gray-50 border border-gray-200 px-3 py-2">
                    <Checkbox
                      inputId="showDeletedData"
                      checked={isShowDeletedDataChecked}
                      onChange={() =>
                        setIsShowDeletedDataChecked(!isShowDeletedDataChecked)
                      }
                    />
                    <label
                      htmlFor="showDeletedData"
                      className="ml-2 text-sm text-gray-700"
                    >
                      Show deleted
                    </label>
                  </div>

                  <Button
                    label="Generate Schedule"
                    icon="pi pi-plus"
                    onClick={() =>
                      router.push("/setting/employee-shift-assignment/generate")
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 px-4 py-4">
                  <div className="text-xs text-gray-500">Schedules</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.schedules}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 px-4 py-4">
                  <div className="text-xs text-gray-500">Employees</div>
                  <div className="text-2xl font-semibold text-gray-900 mt-1">
                    {stats.employees}
                  </div>
                </div>

                <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white px-4 py-4">
                  <div className="text-xs text-green-600">Active</div>
                  <div className="text-2xl font-semibold text-green-700 mt-1">
                    {stats.active}
                  </div>
                </div>

                <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white px-4 py-4">
                  <div className="text-xs text-red-600">Deleted</div>
                  <div className="text-2xl font-semibold text-red-700 mt-1">
                    {stats.deleted}
                  </div>
                </div>

                <div className="rounded-2xl border border-yellow-200 bg-gradient-to-br from-yellow-50 to-white px-4 py-4">
                  <div className="text-xs text-yellow-600">Holiday</div>
                  <div className="text-2xl font-semibold text-yellow-700 mt-1">
                    {stats.holidays}
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white px-4 py-4">
                  <div className="text-xs text-sky-600">Day Off</div>
                  <div className="text-2xl font-semibold text-sky-700 mt-1">
                    {stats.dayOffs}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex-1">
                      <InputText
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search employee, shift, day off, or holiday"
                        className="w-full"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:w-[360px]">
                      <Calendar
                        value={dateFrom}
                        onChange={(e) => {
                          setDateFrom(e.value as Date);
                          setQuickRange("this_week");
                        }}
                        placeholder="Date From"
                        dateFormat="dd-mm-yy"
                        showIcon
                      />

                      <Calendar
                        value={dateTo}
                        onChange={(e) => {
                          setDateTo(e.value as Date);
                          setQuickRange("this_week");
                        }}
                        placeholder="Date To"
                        dateFormat="dd-mm-yy"
                        showIcon
                      />
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        label="Today"
                        size="small"
                        severity={quickRange === "today" ? "info" : "secondary"}
                        outlined={quickRange !== "today"}
                        onClick={() => applyQuickRange("today")}
                      />
                      <Button
                        label="This Week"
                        size="small"
                        severity={
                          quickRange === "this_week" ? "info" : "secondary"
                        }
                        outlined={quickRange !== "this_week"}
                        onClick={() => applyQuickRange("this_week")}
                      />
                      <Button
                        label="This Month"
                        size="small"
                        severity={
                          quickRange === "this_month" ? "info" : "secondary"
                        }
                        outlined={quickRange !== "this_month"}
                        onClick={() => applyQuickRange("this_month")}
                      />
                    </div>

                    {hasActiveFilter && (
                      <Button
                        label="Clear Filter"
                        severity="secondary"
                        outlined
                        onClick={clearFilters}
                      />
                    )}
                  </div>
                </div>
              </div>

              {topShifts.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Most Used Shifts
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {topShifts.map(([shiftName, count]) => (
                      <Tag
                        key={shiftName}
                        value={`${shiftName} • ${count}`}
                        severity="info"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Legend
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Tag value="Workday" severity="info" />
                  <Tag value="Holiday" severity="warning" />
                  <Tag value="Day Off" severity="info" />
                  <Tag value="Deleted" severity="danger" />
                </div>
              </div>

              <Divider className="my-0" />

              <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
                {employeeRows.length === 0 || visibleDates.length === 0 ? (
                  <div className="py-16 text-center text-gray-500">
                    <div className="text-base font-medium text-gray-700">
                      No schedules found
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Try adjusting the keyword or date range.
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto overflow-y-hidden">
                    <table className="min-w-[1100px] w-full border-separate border-spacing-0">
                      <thead>
                        <tr>
                          <th className="sticky left-0 top-0 z-30 min-w-[260px] bg-gray-50 border-b border-r border-gray-200 px-4 py-4 text-left">
                            <div className="text-sm font-semibold text-gray-900">
                              Employee
                            </div>
                          </th>

                          {visibleDates.map((dateKey) => {
                            const isToday = dayjs(dateKey).isSame(
                              dayjs(),
                              "day",
                            );

                            return (
                              <th
                                key={dateKey}
                                className={`top-0 z-20 min-w-[120px] border-b border-r border-gray-100 px-3 py-3 text-center ${
                                  isToday ? "bg-blue-50" : "bg-gray-50"
                                }`}
                              >
                                <div className="text-xs text-gray-500 uppercase">
                                  {dayjs(dateKey).format("ddd")}
                                </div>
                                <div
                                  className={`text-sm font-semibold ${isToday ? "text-blue-700" : "text-gray-900"}`}
                                >
                                  {dayjs(dateKey).format("DD MMM")}
                                </div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>

                      <tbody>
                        {employeeRows.map((employee) => (
                          <tr
                            key={
                              employee.employeeId ??
                              `emp-${employee.employeeName}`
                            }
                          >
                            <td className="sticky left-0 z-10 min-w-[260px] border-b border-r border-gray-200 bg-white px-4 py-4 align-top shadow-[6px_0_10px_-10px_rgba(0,0,0,0.12)]">
                              <div className="text-sm font-semibold text-gray-900 truncate">
                                {employee.employeeName ?? "-"}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                ID: {employee.employeeId ?? "-"}
                              </div>
                            </td>

                            {visibleDates.map((dateKey) => {
                              const key = `${employee.employeeId}__${dateKey}`;
                              const entries = scheduleMap.get(key) ?? [];
                              const firstEntry = entries[0];

                              const isSelected =
                                selectedCell?.employeeId ===
                                  employee.employeeId &&
                                selectedCell?.dateKey === dateKey;

                              return (
                                <td
                                  key={dateKey}
                                  className={`min-w-[120px] border-b border-r border-gray-100 px-2 py-2 align-top ${
                                    isSelected ? "bg-blue-50" : "bg-white"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setSelectedCell({
                                        employeeId: employee.employeeId,
                                        employeeName: employee.employeeName,
                                        dateKey,
                                        entries,
                                      })
                                    }
                                    className="w-full min-h-[96px] text-left"
                                  >
                                    {entries.length === 0 ? (
                                      <div className="h-full flex items-center justify-center text-xs text-gray-300">
                                        —
                                      </div>
                                    ) : (
                                      <div className="flex flex-col gap-1">
                                        {entries.slice(0, 2).map((entry) => (
                                          <div
                                            key={entry.id}
                                            className={`rounded-lg px-2 py-1 text-xs font-medium truncate border ${getCellStyle([entry])}`}
                                          >
                                            {entry.shift_name ?? "-"}
                                          </div>
                                        ))}

                                        {entries.some(
                                          (entry) => entry.is_holiday,
                                        ) && (
                                          <div className="text-[11px] text-yellow-700 font-medium">
                                            Holiday
                                          </div>
                                        )}

                                        {entries.some(
                                          (entry) => entry.is_day_off,
                                        ) && (
                                          <div className="text-[11px] text-sky-700 font-medium">
                                            Day Off
                                          </div>
                                        )}

                                        {entries.length > 2 && (
                                          <div className="text-[11px] text-gray-500">
                                            +{entries.length - 2} more
                                          </div>
                                        )}

                                        {firstEntry && (
                                          <div className="text-[11px] text-gray-400 mt-1">
                                            {firstEntry.deleted_at
                                              ? "Deleted"
                                              : "Active"}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {selectedCell && (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                  <div className="px-5 py-4 bg-gray-50 border-b">
                    <div className="text-base font-semibold text-gray-900">
                      Schedule Detail
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {selectedCell.employeeName ?? "-"} •{" "}
                      {dayjs(selectedCell.dateKey).format("dddd, DD MMM YYYY")}
                    </div>
                  </div>

                  <div className="p-5">
                    {selectedCell.entries.length === 0 ? (
                      <div className="text-sm text-gray-500">
                        No schedule on this date.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        {selectedCell.entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3"
                          >
                            <div>
                              <div className="text-sm font-semibold text-gray-900">
                                {entry.shift_name ?? "-"}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Schedule ID: {entry.id}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {renderStatusTag(entry)}
                                {entry.is_holiday && (
                                  <Tag value="Holiday" severity="warning" />
                                )}
                                {entry.is_day_off && (
                                  <Tag value="Day Off" severity="info" />
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap">
                              {renderActionButtons(entry)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default EmployeeShiftAssignmentListPage;
