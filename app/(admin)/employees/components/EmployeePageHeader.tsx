import { ReactNode } from "react";

interface EmployeePageHeaderProps {
  title: string;
  description: string;
  icon?: string;
  actions?: ReactNode;
}

const EmployeePageHeader = ({
  title,
  description,
  icon = "pi pi-id-card",
  actions,
}: EmployeePageHeaderProps) => {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 sm:flex">
          <i className={`${icon} text-xl`} />
        </div>

        <div className="min-w-0">
          <h1 className="m-0 text-xl font-semibold tracking-tight text-slate-800 sm:text-2xl">
            {title}
          </h1>
          <p className="m-0 mt-1 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          {actions}
        </div>
      ) : null}
    </div>
  );
};

export default EmployeePageHeader;
