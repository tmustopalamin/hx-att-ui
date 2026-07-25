import React from "react";
import BankTableData from "./BankTableData";

export const metadata = {
  title: "Manage Bank - PT. Hexing Technology",
  description: "add, update, delete bank data",
};

const BankSettingPage = () => {
  return (
    <>
      <BankTableData />
    </>
  );
};

export default BankSettingPage;
