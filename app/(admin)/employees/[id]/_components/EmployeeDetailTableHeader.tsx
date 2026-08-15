"use client";

import type { ChangeEvent, ReactNode } from "react";
import { Checkbox } from "primereact/checkbox";
import { IconField } from "primereact/iconfield";
import { InputIcon } from "primereact/inputicon";
import { InputText } from "primereact/inputtext";

type EmployeeDetailTableHeaderProps = {
  title: string;
  description: string;
  showDeleted?: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    inputId?: string;
    label?: string;
  };
  search?: {
    value: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    placeholder: string;
  };
  actions?: ReactNode;
};

/**
 * Shared responsive header for employee detail tables.
 * Keep title, search, archived filter, and actions in one predictable layout.
 */
export default function EmployeeDetailTableHeader({
  title,
  description,
  showDeleted,
  search,
  actions,
}: EmployeeDetailTableHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h5 className="m-0 text-xl font-semibold text-slate-900">{title}</h5>
        <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      {(showDeleted || search || actions) && (
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
          {showDeleted && (
            <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:w-auto">
              <Checkbox
                inputId={showDeleted.inputId ?? "showDeletedData"}
                checked={showDeleted.checked}
                onChange={(event) =>
                  showDeleted.onChange(Boolean(event.checked))
                }
              />
              <label
                htmlFor={showDeleted.inputId ?? "showDeletedData"}
                className="cursor-pointer select-none text-sm text-slate-700"
              >
                {showDeleted.label ?? "Show deleted data"}
              </label>
            </div>
          )}

          {search && (
            <IconField iconPosition="left" className="w-full sm:w-64">
              <InputIcon className="pi pi-search" />
              <InputText
                value={search.value}
                onChange={search.onChange}
                placeholder={search.placeholder}
                className="w-full"
              />
            </IconField>
          )}

          {actions}
        </div>
      )}
    </div>
  );
}
