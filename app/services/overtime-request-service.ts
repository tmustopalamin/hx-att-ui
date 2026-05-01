import dayjs from 'dayjs';

import { ResponseTypeError } from '../types/response-type';
import { OvertimeRequestForm } from '../types/overtime-request';

const API_URL = '/api/overtime-request';

type OvertimeRequestPayload = {
    overtime_date: string;
    requested_start_at: string;
    requested_end_at: string;
    reason: string | null;
};

type RejectOvertimeRequestPayload = {
    rejection_reason: string | null;
};

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

const combineDateAndTime = (date: Date | null, time: string | null): Date => {
    if (!date || !time) {
        throw new Error('Date and time are required');
    }

    const [hourText, minuteText] = time.split(':');
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (
        Number.isNaN(hour) ||
        Number.isNaN(minute) ||
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59
    ) {
        throw new Error('Invalid time format');
    }

    return dayjs(date)
        .hour(hour)
        .minute(minute)
        .second(0)
        .millisecond(0)
        .toDate();
};

const normalizeReason = (value?: string | null) => {
    const trimmed = (value ?? '').trim();

    return trimmed.length > 0 ? trimmed : null;
};

const buildOvertimeRequestPayload = (
    data: OvertimeRequestForm
): OvertimeRequestPayload => {
    const requestedStartAt = combineDateAndTime(
        data.overtime_date,
        data.requested_start_time
    );

    const requestedEndAt = combineDateAndTime(
        data.overtime_date,
        data.requested_end_time
    );

    if (
        dayjs(requestedEndAt).isSame(requestedStartAt) ||
        dayjs(requestedEndAt).isBefore(requestedStartAt)
    ) {
        throw new Error('Requested end time must be after requested start time');
    }

    return {
        overtime_date: dayjs(data.overtime_date).format('YYYY-MM-DD'),
        requested_start_at: requestedStartAt.toISOString(),
        requested_end_at: requestedEndAt.toISOString(),
        reason: normalizeReason(data.reason),
    };
};

export const createOvertimeRequest = async (data: OvertimeRequestForm) => {
    const payload = buildOvertimeRequestPayload(data);

    const res = await fetch(API_URL, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw await parseErrorResponse(res);
    }

    return res.json();
};

export const updateOvertimeRequest = async (
    id: number,
    rowVersion: number,
    data: OvertimeRequestForm
) => {
    if (rowVersion <= 0) {
        throw new Error('rowVersion is required');
    }

    const payload = buildOvertimeRequestPayload(data);

    const res = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'If-Match': String(rowVersion),
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw await parseErrorResponse(res);
    }

    return res.json();
};

export const deleteOvertimeRequest = async (
    id: number,
    rowVersion: number
) => {
    if (rowVersion <= 0) {
        throw new Error('rowVersion is required');
    }

    const res = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'If-Match': String(rowVersion),
        },
    });

    if (!res.ok) {
        throw await parseErrorResponse(res);
    }

    return res.json();
};

export const restoreOvertimeRequest = async (
    id: number,
    rowVersion: number
) => {
    if (rowVersion <= 0) {
        throw new Error('rowVersion is required');
    }

    const res = await fetch(`${API_URL}/${id}/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'If-Match': String(rowVersion),
        },
    });

    if (!res.ok) {
        throw await parseErrorResponse(res);
    }

    return res.json();
};

export const purgeOvertimeRequest = async (id: number) => {
    const res = await fetch(`${API_URL}/${id}/purge`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    if (!res.ok) {
        throw await parseErrorResponse(res);
    }

    return res.json();
};

export const approveOvertimeRequest = async (
    id: number,
    rowVersion: number
) => {
    if (rowVersion <= 0) {
        throw new Error('rowVersion is required');
    }

    const res = await fetch(`${API_URL}/${id}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'If-Match': String(rowVersion),
        },
    });

    if (!res.ok) {
        throw await parseErrorResponse(res);
    }

    return res.json();
};

export const rejectOvertimeRequest = async (
    id: number,
    rowVersion: number,
    rejectionReason?: string | null
) => {
    if (rowVersion <= 0) {
        throw new Error('rowVersion is required');
    }

    const payload: RejectOvertimeRequestPayload = {
        rejection_reason: normalizeReason(rejectionReason),
    };

    const res = await fetch(`${API_URL}/${id}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'If-Match': String(rowVersion),
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        throw await parseErrorResponse(res);
    }

    return res.json();
};