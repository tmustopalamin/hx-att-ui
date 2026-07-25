import React from "react";
import LeaveTypeTableData from "./LeaveTypeTableData";

export const metadata = {
  title: "Manage Leave Type - PT. Hexing Technology",
  description: "add, update, delete leave type data",
};

const BankSettingPage = () => {
  return (
    <>
      <LeaveTypeTableData />
    </>
  );
};

export default BankSettingPage;
