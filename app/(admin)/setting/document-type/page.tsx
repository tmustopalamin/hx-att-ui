import React from "react";
import DocumentTypeTableData from "./DocumentTypeTableData";

export const metadata = {
  title: "Manage Document Type - PT. Hexing Technology",
  description: "add, update, delete Document Type data",
};

const BankSettingPage = () => {
  return (
    <>
      <DocumentTypeTableData />
    </>
  );
};

export default BankSettingPage;
