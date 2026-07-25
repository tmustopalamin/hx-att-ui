import React from "react";
import FrequencyDataTable from "./FrequencyDataTable";

export const metadata = {
  title: "Manage Frequency - PT. Hexing Technology",
  description: "add, update, delete frequency data",
};

const FrequencyPage = () => {
  return (
    <>
      <FrequencyDataTable />
    </>
  );
};

export default FrequencyPage;
