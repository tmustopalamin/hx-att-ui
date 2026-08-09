import { notFound } from "next/navigation";

import PayrollBatchDetailData from "./PayrollBatchDetailData";

interface Params {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Payroll Batch Detail - PT. Hexing Technology",
  description: "Payroll batch result detail",
};

const PayrollBatchDetailPage = async ({ params }: Params) => {
  const { id } = await params;
  const batchId = Number(id);
  if (!Number.isSafeInteger(batchId) || batchId <= 0) notFound();

  return <PayrollBatchDetailData batchId={batchId} />;
};

export default PayrollBatchDetailPage;
