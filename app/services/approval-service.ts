import { ApprovalActionPayload } from '../types/approval';
import { ResponseTypeError } from '../types/response-type';

const API_URL = '/api/approval';

const parseErrorResponse = async (res: Response): Promise<ResponseTypeError> => {
  const contentType = res.headers.get('Content-Type');

  try {
    if (contentType && contentType.includes('application/json')) {
      return (await res.json()) as ResponseTypeError;
    }

    return {
      success: false,
      code: String(res.status),
      message: await res.text(),
    };
  } catch {
    return {
      success: false,
      code: String(res.status),
      message: 'Unknown error',
    };
  }
};

const normalizeNote = (value?: string | null) => {
  const trimmed = (value ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const approveApprovalRequest = async (
  approvalRequestId: number,
  rowVersion: number,
  payload: ApprovalActionPayload
) => {
  if (rowVersion <= 0) {
    throw new Error('rowVersion is required');
  }

  const res = await fetch(`${API_URL}/${approvalRequestId}/approve`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': String(rowVersion),
    },
    body: JSON.stringify({
      note: normalizeNote(payload.note),
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};

export const rejectApprovalRequest = async (
  approvalRequestId: number,
  rowVersion: number,
  payload: ApprovalActionPayload
) => {
  if (rowVersion <= 0) {
    throw new Error('rowVersion is required');
  }

  const res = await fetch(`${API_URL}/${approvalRequestId}/reject`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'If-Match': String(rowVersion),
    },
    body: JSON.stringify({
      note: normalizeNote(payload.note),
    }),
  });

  if (!res.ok) {
    throw await parseErrorResponse(res);
  }

  return res.json();
};