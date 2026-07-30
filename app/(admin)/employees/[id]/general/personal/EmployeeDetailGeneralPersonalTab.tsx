"use client";

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
        <TabPanel header="Basic Info">{renderBasicInfo()}</TabPanel>
        <TabPanel header="Family">{renderFamilyInfo()}</TabPanel>
        <TabPanel header="Emergency Contact">
          {renderEmergencyContact()}
        </TabPanel>
      </TabView>
    </>
  );
};

export default EmployeeDetailGeneralPersonalTab;
