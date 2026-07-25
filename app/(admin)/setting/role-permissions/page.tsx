import RolePermissionsTableData from "./RolePermissionsTableData";

export const metadata = {
  title: "Manage Role Permissions - PT. Hexing Technology",
  description: "add, update, delete role permission",
};

const RoleSettingPage = () => {
  return (
    <>
      <RolePermissionsTableData />
    </>
  );
};

export default RoleSettingPage;
