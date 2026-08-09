import FingerprintTableData from "./FingerprintTableData";
import EmployeeTimeHistoryPanel from "../_components/EmployeeTimeHistoryPanel";

export const metadata = {
  title: "Attendance - PT. Hexing Technology",
  description: "employee attendance detail",
};

const EmployeeFingerprintData = () => {
  return (
    <div className="flex flex-col gap-5">
      <EmployeeTimeHistoryPanel view="attendance" />
      <FingerprintTableData />
    </div>
  );
};

export default EmployeeFingerprintData;
