import { fetcher } from '../utils/fetcher';
import useSWR from 'swr';

const UseGetDocumentDetailApproval = (approvalRequestId?: number) => {
  return useSWR(
    approvalRequestId ? `/api/approval/get-detail-document/${approvalRequestId}` : null, fetcher, {
      keepPreviousData: false,
    });
}

export default UseGetDocumentDetailApproval