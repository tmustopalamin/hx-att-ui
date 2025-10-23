import React, { } from "react";
import UserTableData from "./UserTableData";

export const metadata = {
  title: 'Manage State - PT. Hexing Technology',
  description: 'add, update, delete state data',
};

const SettingUserPage = () => {
  return <>
    <UserTableData />
  </>
};

export default SettingUserPage;
