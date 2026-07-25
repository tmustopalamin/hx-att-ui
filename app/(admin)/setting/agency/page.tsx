import React from "react";
import AgencyTableData from "./AgencyTableData";

export const metadata = {
  title: "Manage Agencies - PT. Hexing Technology",
  description: "add, update, delete agency data",
};

const AgencySettingPage = () => {
  return (
    <>
      <AgencyTableData />
    </>
  );
};

export default AgencySettingPage;
