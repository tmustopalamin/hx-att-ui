import React from "react";
import IdentityTypeTableData from "./IdentityTypeTableData";

export const metadata = {
  title: "Manage Identity Type - PT. Hexing Technology",
  description: "add, update, delete identity type data",
};

const BankSettingPage = () => {
  return (
    <>
      <IdentityTypeTableData />
    </>
  );
};

export default BankSettingPage;
