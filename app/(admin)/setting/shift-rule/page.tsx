import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import ShiftRuleTableData from "./ShiftRuleTableData";

dayjs.extend(utc);

export const metadata = {
  title: "Manage Shift Rule - PT. Hexing Technology",
  description: "add, update, delete shift rule data",
};

const ShiftRuleSettingPage = () => {
  return (
    <>
      <ShiftRuleTableData />
    </>
  );
};

export default ShiftRuleSettingPage;
