"use client";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { TabView, TabPanel, TabViewTabChangeEvent } from "primereact/tabview";
import React, { lazy, Suspense, useState } from "react";

const EmployeeDetailGeneralPersonalTab = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mountedTabs, setMountedTabs] = useState([true, false, false]);

  const handleTabChange = (e: TabViewTabChangeEvent) => {
    setActiveIndex(e.index);
    setMountedTabs(() => {
      const updated = [false, false, false];
      updated[e.index] = true;
      return updated;
    });
  };

  const renderBasicInfo = () => {
    const PersonalData = lazy(() => import("./basic-info/PersonalData"));
    const PersonalIdentityAndAddress = lazy(
      () => import("./basic-info/PersonalIdentityAndAddress"),
    );

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
    const EmployeeFamily = lazy(
      () => import("./basic-info/EmployeeFamilyDataTable"),
    );

    return (
      <Suspense fallback={<LoadingDataTable />}>
        <div className="flex flex-col gap-10">
          <EmployeeFamily />
        </div>
      </Suspense>
    );
  };

  const renderEmergencyContact = () => {
    const EmployeeEmergencyContactDataTable = lazy(
      () => import("./basic-info/EmployeeEmergencyContactDataTable"),
    );

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
      <TabView activeIndex={activeIndex} onTabChange={handleTabChange}>
        <TabPanel header="Basic Info">
          {mountedTabs[0] && renderBasicInfo()}
        </TabPanel>
        <TabPanel header="Family">
          {mountedTabs[1] && renderFamilyInfo()}
        </TabPanel>
        <TabPanel header="Emergency Contact">
          {mountedTabs[2] && renderEmergencyContact()}
        </TabPanel>
      </TabView>
    </>
  );
};

export default EmployeeDetailGeneralPersonalTab;
