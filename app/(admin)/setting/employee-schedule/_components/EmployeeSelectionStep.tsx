"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useI18n } from "@/app/i18n";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dropdown } from "primereact/dropdown";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";
import { Tag } from "primereact/tag";
import { Button } from "primereact/button";

export type EmployeeSelectionRow = {
  id: number;
  full_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  code?: string | null;
  department_name?: string | null;
  position_name?: string | null;
  agency_name?: string | null;
  branch_name?: string | null;
  deleted_at?: string | null;
  is_active?: boolean;
};

type EmployeeSelectionStepProps = {
  employees: EmployeeSelectionRow[];
  selectedIds: Set<number>;
  disabled?: boolean;
  onToggle: (id: number) => void;
  onSelect: (ids: number[]) => void;
  onClear: () => void;
};

const employeeName = (employee: EmployeeSelectionRow) =>
  employee.full_name ||
  [employee.first_name, employee.middle_name, employee.last_name]
    .filter(Boolean)
    .join(" ") ||
  undefined;

const EmployeeSelectionStep = ({
  employees,
  selectedIds,
  disabled = false,
  onToggle,
  onSelect,
  onClear,
}: EmployeeSelectionStepProps) => {
  const { t: i18nT } = useI18n();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map((employee) => employee.department_name?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((first, second) => first.localeCompare(second, "id")),
    [employees],
  );

  const positions = useMemo(
    () =>
      Array.from(
        new Set(
          employees
            .map((employee) => employee.position_name?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((first, second) => first.localeCompare(second, "id")),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return employees.filter((employee) => {
      if (department && employee.department_name?.trim() !== department) {
        return false;
      }
      if (position && employee.position_name?.trim() !== position) {
        return false;
      }
      if (!keyword) {
        return true;
      }

      return [
        employeeName(employee) ||
          i18nT("static.iapzf0", {
            p0: employee.id,
          }),
        employee.code,
        employee.department_name,
        employee.position_name,
        employee.agency_name,
        employee.branch_name,
      ].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [department, employees, i18nT, position, search]);

  const visibleIds = filteredEmployees.map((employee) => employee.id);
  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedIds.has(id),
  ).length;
  const allVisibleSelected =
    visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;

  const toggleVisible = () => {
    if (allVisibleSelected) {
      onSelect(
        Array.from(selectedIds).filter((id) => !visibleIds.includes(id)),
      );
      return;
    }

    onSelect(Array.from(new Set([...Array.from(selectedIds), ...visibleIds])));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="m-0 text-base font-semibold text-slate-800">
            {i18nT("static.sadvsn")}
          </h2>
          <p className="m-0 mt-1 text-xs text-slate-500">
            {i18nT("static.1tfchfx")}
          </p>
        </div>
        <Tag
          value={i18nT("static.fkvuu6", { p0: selectedIds.size })}
          severity={selectedIds.size > 0 ? "success" : "secondary"}
          rounded
        />
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(16rem,1fr)_minmax(12rem,16rem)_minmax(12rem,16rem)]">
        <IconField iconPosition="left" className="w-full">
          <InputIcon className="pi pi-search" />
          <InputText
            value={search}
            placeholder={i18nT("static.1wi6rlh")}
            className="w-full"
            disabled={disabled}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setSearch(event.target.value)
            }
          />
        </IconField>
        <Dropdown
          value={department}
          options={departments}
          showClear
          filter
          placeholder={i18nT("static.1tmn1k4")}
          className="w-full"
          disabled={disabled}
          onChange={(event) => setDepartment(event.value ?? null)}
        />
        <Dropdown
          value={position}
          options={positions}
          showClear
          filter
          placeholder={i18nT("static.1ybw07l")}
          className="w-full"
          disabled={disabled}
          onChange={(event) => setPosition(event.value ?? null)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          label={i18nT("static.9fc2ug")}
          icon="pi pi-check-square"
          severity="secondary"
          outlined
          size="small"
          disabled={disabled || filteredEmployees.length === 0}
          onClick={toggleVisible}
        />
        <Button
          type="button"
          label={i18nT("static.1qfq1up")}
          icon="pi pi-minus-circle"
          severity="secondary"
          outlined
          size="small"
          disabled={disabled || selectedVisibleCount === 0}
          onClick={() =>
            onSelect(
              Array.from(selectedIds).filter((id) => !visibleIds.includes(id)),
            )
          }
        />
        <Button
          type="button"
          label={i18nT("static.1pqh2hx")}
          icon="pi pi-filter-slash"
          severity="danger"
          text
          size="small"
          disabled={disabled || selectedIds.size === 0}
          onClick={onClear}
        />
      </div>

      <DataTable
        value={filteredEmployees}
        dataKey="id"
        paginator
        rows={10}
        rowsPerPageOptions={[10, 25, 50, 100]}
        stripedRows
        rowHover
        scrollable
        size="small"
        emptyMessage={i18nT("static.1l60s88")}
        onRowClick={(event) =>
          onToggle((event.data as EmployeeSelectionRow).id)
        }
      >
        <Column
          header={
            <input
              type="checkbox"
              aria-label={i18nT("static.9fc2ug")}
              checked={allVisibleSelected}
              disabled={disabled || filteredEmployees.length === 0}
              onChange={toggleVisible}
            />
          }
          body={(employee: EmployeeSelectionRow) => (
            <input
              type="checkbox"
              aria-label={
                employeeName(employee) ||
                i18nT("static.iapzf0", { p0: employee.id })
              }
              checked={selectedIds.has(employee.id)}
              disabled={disabled}
              onChange={() => onToggle(employee.id)}
              onClick={(event) => event.stopPropagation()}
            />
          )}
          style={{ width: "4rem" }}
        />
        <Column
          field="full_name"
          header={i18nT("static.1fak8xt")}
          sortable
          body={(employee: EmployeeSelectionRow) => (
            <div>
              <div className="font-semibold text-slate-800">
                {employeeName(employee) ||
                  i18nT("static.iapzf0", { p0: employee.id })}
              </div>
              <div className="font-mono text-xs text-slate-500">
                {employee.code || "-"}
              </div>
            </div>
          )}
          style={{ minWidth: "18rem" }}
        />
        <Column
          field="department_name"
          header={i18nT("static.725tl6")}
          sortable
          style={{ minWidth: "14rem" }}
        />
        <Column
          field="position_name"
          header={i18nT("static.1ybw07l")}
          sortable
          style={{ minWidth: "14rem" }}
        />
      </DataTable>
    </div>
  );
};

export default EmployeeSelectionStep;
