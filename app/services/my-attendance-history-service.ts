import { ResponseTypeError } from "../types/response-type";
import { AttendanceLog } from "../types/attendance-log";

const API_URL = "/api/attendance-log/history";

const parseError = async (res: Response): Promise<ResponseTypeError> => {
    const contentType = res.headers.get("Content-Type");

    try {
        if (contentType && contentType.includes("application/json")) {
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
            message: "Unknown error",
        };
    }
};

export const getMyAttendanceHistory = async (): Promise<AttendanceLog[]> => {
    const res = await fetch(API_URL, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!res.ok) {
        throw await parseError(res);
    }

    return res.json();
};