import React from "react";
import FrequencyDataTable from "./FrequencyDataTable";

export const metadata = {
  title: "Manage Wage Basis - PT. Hexing Technology",
  description: "Add, update, delete, and restore wage basis data",
};

const FrequencyPage = () => {
  return (
    <>
      <FrequencyDataTable />
    </>
  );
};

export default FrequencyPage;
