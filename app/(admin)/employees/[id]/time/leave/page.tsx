import LeaveTableData from "./LeaveTableData";
import EmployeeTimeHistoryPanel from "../_components/EmployeeTimeHistoryPanel";

export const metadata = {
  title: "Leave Balance - PT. Hexing Technology",
  description: "employee leave balance detail",
};

const EmployeeTimeLeave = () => {
  return (
    <div className="flex flex-col gap-5">
      <EmployeeTimeHistoryPanel view="leave" />
      <LeaveTableData />
    </div>
  );
};

export default EmployeeTimeLeave;
