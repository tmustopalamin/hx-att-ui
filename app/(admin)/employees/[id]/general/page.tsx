import { redirect } from "next/navigation";

interface Params {
  params: Promise<{ id: string }>;
}

const EmployeeIdGeneralPage = async ({ params }: Params) => {
  const { id } = await params;
  redirect(`/employees/${id}/general/personal`);
};

export default EmployeeIdGeneralPage;
