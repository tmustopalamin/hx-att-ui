import { redirect } from "next/navigation";

export const metadata = {
  title: "Approval Task - PT. Hexing Technology",
  description: "Approve or Reject the document",
};

const ApprovalTaskPage = () => {
  redirect("/approval");
};

export default ApprovalTaskPage;
