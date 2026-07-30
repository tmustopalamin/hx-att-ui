import { Card } from "primereact/card";

export interface EmployeeSummary {
  total: number;
  active: number;
  deleted: number;
  noOrganization: number;
}

interface EmployeeSummaryCardsProps {
  summary: EmployeeSummary;
}

const items = [
  {
    key: "total",
    label: "Total Employees",
    borderClass: "border-slate-200",
    labelClass: "text-slate-500",
    valueClass: "text-slate-800",
    iconClass: "bg-blue-50 text-blue-600",
    icon: "pi-users",
  },
  {
    key: "active",
    label: "Active Records",
    borderClass: "border-green-200",
    labelClass: "text-green-700",
    valueClass: "text-green-800",
    iconClass: "bg-green-50 text-green-600",
    icon: "pi-check-circle",
  },
  {
    key: "deleted",
    label: "Deleted Records",
    borderClass: "border-red-200",
    labelClass: "text-red-700",
    valueClass: "text-red-800",
    iconClass: "bg-red-50 text-red-600",
    icon: "pi-trash",
  },
  {
    key: "noOrganization",
    label: "Need Org Update",
    borderClass: "border-amber-200",
    labelClass: "text-amber-700",
    valueClass: "text-amber-800",
    iconClass: "bg-amber-50 text-amber-600",
    icon: "pi-briefcase",
  },
] as const;

export default function EmployeeSummaryCards({
  summary,
}: EmployeeSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((item) => (
        <Card key={item.key} className={`border shadow-sm ${item.borderClass}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={`m-0 text-xs ${item.labelClass}`}>{item.label}</p>
              <p
                className={`m-0 mt-2 text-2xl font-semibold ${item.valueClass}`}
              >
                {summary[item.key]}
              </p>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}
            >
              <i className={`pi ${item.icon} text-lg`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
