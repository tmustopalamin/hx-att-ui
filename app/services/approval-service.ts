import { ApprovalRequestLine } from "../types/approval-request-line";
import { ResponseTypeError } from "../types/response-type";

const API_URL = '/api/approval';

export const approveAction = async (data: ApprovalRequestLine) => {
  const res = await fetch(API_URL + '/approve', {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: data.id
    })    
  });

  const contentType = res.headers.get("Content-Type");
  if (!res.ok) {
    let errorDetail: ResponseTypeError;

    try {
      if (contentType && contentType.includes("application/json")) {
        errorDetail = (await res.json()) as ResponseTypeError;
      } else {
        errorDetail = {
          success: false,
          code: String(res.status),
          message: await res.text(),
        };
      }
    } catch {
      errorDetail = {
        success: false,
        code: String(res.status),
        message: "Unknown error",
      };
    }
    throw errorDetail;
  }

  return res.json();
}

export const rejectAction = async (data: ApprovalRequestLine) => {
  const res = await fetch(API_URL + '/reject', {
    method: 'POST',
    credentials: 'include',
    headers: { 
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: data.id
    })    
  });

  const contentType = res.headers.get("Content-Type");
  if (!res.ok) {
    let errorDetail: ResponseTypeError;

    try {
      if (contentType && contentType.includes("application/json")) {
        errorDetail = (await res.json()) as ResponseTypeError;
      } else {
        errorDetail = {
          success: false,
          code: String(res.status),
          message: await res.text(),
        };
      }
    } catch {
      errorDetail = {
        success: false,
        code: String(res.status),
        message: "Unknown error",
      };
    }
    throw errorDetail;
  }

  return res.json();
}
