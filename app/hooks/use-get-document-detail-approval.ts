import type { ApprovalDocumentDetail } from "../types/approval-request-line";
import { fetcher } from "../utils/fetcher";
import useSWR from "swr";

const useGetDocumentDetailApproval = (approvalRequestId?: number) => {
  return useSWR<ApprovalDocumentDetail>(
    approvalRequestId
      ? `/api/approval/get-detail-document/${approvalRequestId}`
      : null,
    fetcher,
    {
      keepPreviousData: false,
    },
  );
};

export default useGetDocumentDetailApproval;
