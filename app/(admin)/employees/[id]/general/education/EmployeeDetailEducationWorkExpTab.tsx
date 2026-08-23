"use client";

import { useI18n } from "@/app/i18n";
import LoadingDataTable from "@/app/_components/LoadingDataTable";
import React, { Suspense, lazy, useMemo, useState } from "react";
import { Button } from "primereact/button";

type TabKey = "formal" | "informal" | "work-experience";

const FormalEducation = lazy(() => import("./FormalEducation"));
const InformalEducation = lazy(() => import("./InformalEducation"));
const WorkExperience = lazy(() => import("./WorkExperience"));

const tabs: Array<{
  key: TabKey;
  labelKey: string;
  icon: string;
  descriptionKey: string;
}> = [
  {
    key: "formal",
    labelKey: "Formal Education",
    icon: "pi pi-building-columns",
    descriptionKey:
      "School, diploma, bachelor, master, and other formal records.",
  },
  {
    key: "informal",
    labelKey: "Informal Education",
    icon: "pi pi-book",
    descriptionKey: "Course, workshop, training, and certification records.",
  },
  {
    key: "work-experience",
    labelKey: "Work Experience",
    icon: "pi pi-briefcase",
    descriptionKey: "Previous company and professional experience records.",
  },
];

const EmployeeDetailEducationWorkExpTab = () => {
  const { t: i18nT } = useI18n();
  const [activeTab, setActiveTab] = useState<TabKey>("formal");

  const activeTabMeta = useMemo(
    () => tabs.find((tab) => tab.key === activeTab) ?? tabs[0],
    [activeTab],
  );

  const renderContent = () => {
    switch (activeTab) {
      case "formal":
        return <FormalEducation />;
      case "informal":
        return <InformalEducation />;
      case "work-experience":
        return <WorkExperience />;
      default:
        return <FormalEducation />;
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;

              return (
                <Button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`justify-start rounded-xl border px-4 py-3 text-left shadow-none transition ${
                    isActive
                      ? "border-blue-200 bg-blue-600 text-white hover:bg-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`${tab.icon} text-sm`} />
                    <span className="text-sm font-semibold">
                      {i18nT(tab.labelKey)}
                    </span>
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="rounded-xl bg-white px-4 py-3">
            <div className="flex items-start gap-3">
              <span className={`${activeTabMeta.icon} mt-0.5 text-blue-600`} />
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {i18nT(activeTabMeta.labelKey)}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {i18nT(activeTabMeta.descriptionKey)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<LoadingDataTable />}>
        <div className="flex flex-col gap-5">{renderContent()}</div>
      </Suspense>
    </div>
  );
};

export default EmployeeDetailEducationWorkExpTab;
