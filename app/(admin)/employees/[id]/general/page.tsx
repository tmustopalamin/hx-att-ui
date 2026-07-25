import { redirect } from "next/navigation";
import React from "react";

interface Params {
  params: { id: string };
}

const EmployeeIdGeneralPage = ({ params }: Params) => {
  redirect(`/employees/${params.id}/general/personal`);
};

export default EmployeeIdGeneralPage;
