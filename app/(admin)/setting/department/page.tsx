import React from "react";
import DepartmentTableData from "./DepartmentTableData";

export const metadata = {
  title: "Manage Department - PT. Hexing Technology",
  description: "add, update, delete department data",
};

const DepartmentSettingPage = () => {
  return (
    <>
      <DepartmentTableData />
    </>
  );
};

export default DepartmentSettingPage;
