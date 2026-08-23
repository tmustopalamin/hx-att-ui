"use client";
import { useI18n } from "@/app/i18n";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { TabView, TabPanel, TabViewTabChangeEvent } from "primereact/tabview";
import React, { lazy, Suspense, useState } from "react";

const PersonalData = lazy(() => import("./basic-info/PersonalData"));
const PersonalIdentityAndAddress = lazy(
  () => import("./basic-info/PersonalIdentityAndAddress"),
);
const EmployeeFamily = lazy(
  () => import("./basic-info/EmployeeFamilyDataTable"),
);
const EmployeeEmergencyContactDataTable = lazy(
  () => import("./basic-info/EmployeeEmergencyContactDataTable"),
);

const EmployeeDetailGeneralPersonalTab = () => {
  const { t: i18nT } = useI18n();
  const [activeIndex, setActiveIndex] = useState(0);

  const handleTabChange = (e: TabViewTabChangeEvent) => {
    setActiveIndex(e.index);
  };

  const renderBasicInfo = () => {
    return (
      <Suspense fallback={<LoadingDataTable />}>
        <div className="flex flex-col gap-10">
          <PersonalData />
          <PersonalIdentityAndAddress />
        </div>
      </Suspense>
    );
  };

  const renderFamilyInfo = () => {
    return (
      <Suspense fallback={<LoadingDataTable />}>
        <div className="flex flex-col gap-10">
          <EmployeeFamily />
        </div>
      </Suspense>
    );
  };

  const renderEmergencyContact = () => {
    return (
      <Suspense fallback={<LoadingDataTable />}>
        <div className="flex flex-col gap-10">
          <EmployeeEmergencyContactDataTable />
        </div>
      </Suspense>
    );
  };

  return (
    <>
      <TabView
        activeIndex={activeIndex}
        onTabChange={handleTabChange}
        renderActiveOnly={false}
      >
        <TabPanel header={i18nT("static.1ljy29v")}>
          {renderBasicInfo()}
        </TabPanel>
        <TabPanel header={i18nT("static.1ii54cp")}>
          {renderFamilyInfo()}
        </TabPanel>
        <TabPanel header={i18nT("static.682t3a")}>
          {renderEmergencyContact()}
        </TabPanel>
      </TabView>
    </>
  );
};

export default EmployeeDetailGeneralPersonalTab;
