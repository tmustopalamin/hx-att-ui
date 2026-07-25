import React from "react";
import FingerprintScannerMachineTableData from "./FingerprintScannerTableData";

export const metadata = {
  title: "Manage Fingerprint Scanner Machine - PT. Hexing Technology",
  description: "add, update, delete fingerprint scanner machine data",
};

const FingerprintScannerMachineSettingPage = () => {
  return (
    <>
      <FingerprintScannerMachineTableData />
    </>
  );
};

export default FingerprintScannerMachineSettingPage;
