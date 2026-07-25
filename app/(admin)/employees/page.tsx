import React from "react";
import EmployeesDataTable from "./EmployeesDataTable";

export const metadata = {
  title: "Manage Employees - PT. Hexing Technology",
  description: "add, update, delete employee data",
};

const EmployeesPage = () => {
  return <EmployeesDataTable />;
};

export default EmployeesPage;
