import { ResponseTypeError } from "../types/response-type";

export const ERROR_MESSAGES: Record<string, string> = {
  DatabaseError: "There is a problem with the database connection",
  PINAlreadyUsed: "Pin Already Used",
};

export function getErrorMessage(err: ResponseTypeError, source: 'code' | 'message'): string {
  console.log(err, 'pani')
  if (source === 'code') {
    if(err.code) {
      return ERROR_MESSAGES[err.code];
    }else{
      return err.message || "A system error has occurred, please contact the administrator";
    }
  }else{
    return err.message || "A system error has occurred, please contact the administrator";
  }
}

export function isResponseTypeError(obj: unknown): obj is ResponseTypeError {
    const isErrorObject = typeof obj === "object";
    return isErrorObject;
}