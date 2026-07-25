import React from "react";
import BranchTableData from "./BranchTableData";

export const metadata = {
  title: "Manage Branch - PT. Hexing Technology",
  description: "add, update, delete branch data",
};

const BranchSettingPage = () => {
  return (
    <>
      <BranchTableData />
    </>
  );
};

export default BranchSettingPage;
