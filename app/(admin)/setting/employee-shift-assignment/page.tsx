import React from "react";
import EmployeeShiftAssignment from "./EmployeeShiftAssignment";

export const metadata = {
  title: "Assign Shift To Employee - PT. Hexing Technology",
  description: "add, update, delete and generate shift employee",
};

const BankSettingPage = () => {
  return (
    <>
      <EmployeeShiftAssignment />
    </>
  );
};

export default BankSettingPage;
