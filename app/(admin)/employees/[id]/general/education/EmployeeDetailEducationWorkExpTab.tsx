"use client";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import { TabView, TabPanel, TabViewTabChangeEvent } from "primereact/tabview";
import React, { lazy, Suspense, useState } from "react";

const EmployeeDetailEducationWorkExpTab = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [mountedTabs, setMountedTabs] = useState([true, false, false]);

  const handleTabChange = (e: TabViewTabChangeEvent) => {
    setActiveIndex(e.index);
    setMountedTabs(() => {
      const updated = [false, false, false]
      updated[e.index] = true;
      return updated;
    });
  };

  const renderFormalEducation = () => {
    const FormalEducation = lazy(() => import("./FormalEducation"));

    return (
      <Suspense fallback={<LoadingDataTable />}>
        <div className="flex flex-col gap-10">
          <FormalEducation />
        </div>
      </Suspense>
    );
  };

  const renderInformalEducation = () => {
    const InformalEducation = lazy(() => import("./InformalEducation"));

    return (
      <Suspense fallback={<LoadingDataTable />}>
        <div className="flex flex-col gap-10">
          <InformalEducation />
        </div>
      </Suspense>
    );
  };

  const renderWorkExperience = () => {
    const WorkExperience = lazy(() => import("./WorkExperience"));

    return (
      <Suspense fallback={<LoadingDataTable />}>
        <div className="flex flex-col gap-10">
          <WorkExperience />
        </div>
      </Suspense>
    );
  };

  return (
    <>
      <TabView activeIndex={activeIndex} onTabChange={handleTabChange}>
        <TabPanel header="Formal Education">
          {mountedTabs[0] && renderFormalEducation()}
        </TabPanel>
        <TabPanel header="Informal Education">
          {mountedTabs[1] && renderInformalEducation()}
        </TabPanel>
        <TabPanel header="Working Experience">
          {mountedTabs[2] && renderWorkExperience()}
        </TabPanel>
      </TabView>
    </>
  );
};

export default EmployeeDetailEducationWorkExpTab;
