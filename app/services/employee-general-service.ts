import dayjs from "dayjs";
import {
    EmployeeEducationPayload,
    EmployeeEducationRow,
    EmployeeEmergencyContactRow,
    EmployeeEmploymentData,
    EmployeeFamilyRow,
    EmployeeIdentityPayload,
    EmployeeIdentityRow,
    EmployeePersonalData,
    EmployeeWorkExperiencePayload,
    EmployeeWorkExperienceRow,
    OptionItem,
} from "../types/employee-general";
import { ResponseTypeError } from "../types/response-type";

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

const ensureOk = async (res: Response) => {
    if (!res.ok) {
        throw await parseError(res);
    }
};

const toDateString = (value?: Date | string | null) => {
    if (!value) return null;
    const d = dayjs(value);
    return d.isValid() ? d.format("YYYY-MM-DD") : null;
};

export const getGenderOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/gender", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getReligionOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/religion", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getMaritalOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/marital", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getCountryOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/country", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getIdentityTypeOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/identity-type", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getRelationshipOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/relationship", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getDepartmentOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/department", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getPositionOptions = async (): Promise<
    Array<OptionItem & { department_id?: number | null }>
> => {
    const res = await fetch("/api/position", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getEmploymentStatusOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/employment-status", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getAgencyOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/agency", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getBranchOptions = async (): Promise<OptionItem[]> => {
    const res = await fetch("/api/branch", { credentials: "include" });
    await ensureOk(res);
    return res.json();
};

export const getEmployeePersonalData = async (
    employeeId: number
): Promise<EmployeePersonalData> => {
    const res = await fetch(`/api/employees/${employeeId}/personal-data`, {
        credentials: "include",
    });
    await ensureOk(res);
    return res.json();
};

export const updateEmployeePersonalData = async (
    employeeId: number,
    payload: EmployeePersonalData
) => {
    const res = await fetch(`/api/employees/${employeeId}/personal-data`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...payload,
            dob: toDateString(payload.dob),
        }),
    });

    await ensureOk(res);
    return res.json();
};

export const getEmployeeEmploymentData = async (
    employeeId: number
): Promise<EmployeeEmploymentData | null> => {
    const res = await fetch(`/api/employees/${employeeId}/employment-data`, {
        credentials: "include",
    });
    await ensureOk(res);
    return res.json();
};

export const updateEmployeeEmploymentData = async (
    employeeId: number,
    payload: EmployeeEmploymentData
) => {
    const res = await fetch(`/api/employees/${employeeId}/employment-data`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            code: payload.code ?? null,
            employee_id: employeeId,
            join_date: toDateString(payload.join_date),
            end_date: toDateString(payload.end_date),
            department_id: payload.department_id,
            position_id: payload.position_id,
            employment_status_id: payload.employment_status_id,
            agency_id: payload.agency_id ?? null,
            branch_id: payload.branch_id ?? null,
        }),
    });

    await ensureOk(res);
    return res.json();
};

export const getEmployeeIdentities = async (
    employeeId: number
): Promise<EmployeeIdentityRow[]> => {
    const res = await fetch(`/api/employees/${employeeId}/identity-address-data`, {
        credentials: "include",
    });
    await ensureOk(res);
    return res.json();
};

export const createEmployeeIdentity = async (
    employeeId: number,
    payload: EmployeeIdentityPayload
) => {
    const res = await fetch(`/api/employees/${employeeId}/identity-address-data`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...payload,
            expire_date: toDateString(payload.expire_date),
        }),
    });

    await ensureOk(res);
    return res.json();
};

export const updateEmployeeIdentity = async (
    employeeId: number,
    id: number,
    rowVersion: number,
    payload: EmployeeIdentityPayload
) => {
    const res = await fetch(
        `/api/employees/${employeeId}/identity-address-data/${id}`,
        {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "If-Match": String(rowVersion),
            },
            body: JSON.stringify({
                ...payload,
                expire_date: toDateString(payload.expire_date),
            }),
        }
    );

    await ensureOk(res);
    return res.json();
};

export const deleteEmployeeIdentity = async (
    employeeId: number,
    id: number,
    rowVersion: number
) => {
    const res = await fetch(
        `/api/employees/${employeeId}/identity-address-data/${id}`,
        {
            method: "DELETE",
            credentials: "include",
            headers: {
                "If-Match": String(rowVersion),
            },
        }
    );

    await ensureOk(res);
    return res.json();
};

export const restoreEmployeeIdentity = async (
    employeeId: number,
    id: number,
    rowVersion: number
) => {
    const res = await fetch(
        `/api/employees/${employeeId}/identity-address-data/${id}/restore`,
        {
            method: "POST",
            credentials: "include",
            headers: {
                "If-Match": String(rowVersion),
            },
        }
    );

    await ensureOk(res);
    return res.json();
};

export const purgeEmployeeIdentity = async (
    employeeId: number,
    id: number
) => {
    const res = await fetch(
        `/api/employees/${employeeId}/identity-address-data/${id}/purge`,
        {
            method: "DELETE",
            credentials: "include",
        }
    );

    await ensureOk(res);
    return res.json();
};

export const getEmployeeEducation = async (
    employeeId: number,
    type: "formal" | "informal"
): Promise<EmployeeEducationRow[]> => {
    const res = await fetch(`/api/employees/${employeeId}/education-data/${type}`, {
        credentials: "include",
    });
    await ensureOk(res);
    return res.json();
};

export const createEmployeeEducation = async (
    employeeId: number,
    type: "formal" | "informal",
    payload: EmployeeEducationPayload
) => {
    const res = await fetch(`/api/employees/${employeeId}/education-data/${type}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...payload,
            start_date: toDateString(payload.start_date),
            end_date: toDateString(payload.end_date),
        }),
    });
    await ensureOk(res);
    return res.json();
};

export const updateEmployeeEducation = async (
    employeeId: number,
    type: "formal" | "informal",
    id: number,
    rowVersion: number,
    payload: EmployeeEducationPayload
) => {
    const res = await fetch(
        `/api/employees/${employeeId}/education-data/${type}/${id}`,
        {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "If-Match": String(rowVersion),
            },
            body: JSON.stringify({
                ...payload,
                start_date: toDateString(payload.start_date),
                end_date: toDateString(payload.end_date),
            }),
        }
    );
    await ensureOk(res);
    return res.json();
};

export const deleteEmployeeEducation = async (
    employeeId: number,
    type: "formal" | "informal",
    id: number,
    rowVersion: number
) => {
    const res = await fetch(
        `/api/employees/${employeeId}/education-data/${type}/${id}`,
        {
            method: "DELETE",
            credentials: "include",
            headers: {
                "If-Match": String(rowVersion),
            },
        }
    );
    await ensureOk(res);
    return res.json();
};

export const getEmployeeWorkExperiences = async (
    employeeId: number
): Promise<EmployeeWorkExperienceRow[]> => {
    const res = await fetch(`/api/employees/${employeeId}/work-experience-data`, {
        credentials: "include",
    });
    await ensureOk(res);
    return res.json();
};

export const createEmployeeWorkExperience = async (
    employeeId: number,
    payload: EmployeeWorkExperiencePayload
) => {
    const res = await fetch(`/api/employees/${employeeId}/work-experience-data`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            ...payload,
            start_date: toDateString(payload.start_date),
            end_date: toDateString(payload.end_date),
        }),
    });
    await ensureOk(res);
    return res.json();
};

export const updateEmployeeWorkExperience = async (
    employeeId: number,
    id: number,
    rowVersion: number,
    payload: EmployeeWorkExperiencePayload
) => {
    const res = await fetch(
        `/api/employees/${employeeId}/work-experience-data/${id}`,
        {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "If-Match": String(rowVersion),
            },
            body: JSON.stringify({
                ...payload,
                start_date: toDateString(payload.start_date),
                end_date: toDateString(payload.end_date),
            }),
        }
    );
    await ensureOk(res);
    return res.json();
};

export const deleteEmployeeWorkExperience = async (
    employeeId: number,
    id: number,
    rowVersion: number
) => {
    const res = await fetch(
        `/api/employees/${employeeId}/work-experience-data/${id}`,
        {
            method: "DELETE",
            credentials: "include",
            headers: { "If-Match": String(rowVersion) },
        }
    );
    await ensureOk(res);
    return res.json();
};


type EmployeeEmergencyContactPayload = {
    name: string;
    relationship_id: number;
    phone: string;
    is_active?: boolean;
};

export const getEmployeeEmergencyContacts = async (
    employeeId: number
) => {
    const res = await fetch(`/api/employees/${employeeId}/emergency-contact-data`, {
        credentials: "include",
    });

    await ensureOk(res);
    return res.json();
};

export const createEmployeeEmergencyContact = async (
    employeeId: number,
    payload: EmployeeEmergencyContactPayload
) => {
    const res = await fetch(`/api/employees/${employeeId}/emergency-contact-data`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            employee_id: employeeId,
            name: payload.name.trim(),
            relationship_id: Number(payload.relationship_id),
            phone: payload.phone.trim(),
        }),
    });

    await ensureOk(res);
    return res.json();
};

export const updateEmployeeEmergencyContact = async (
    employeeId: number,
    id: number,
    _rowVersion: number,
    payload: EmployeeEmergencyContactPayload
) => {
    const res = await fetch(`/api/employees/${employeeId}/emergency-contact-data`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id,
            employee_id: employeeId,
            name: payload.name.trim(),
            relationship_id: Number(payload.relationship_id),
            phone: payload.phone.trim(),
        }),
    });

    await ensureOk(res);
    return res.json();
};

export const deleteEmployeeEmergencyContact = async (
    employeeId: number,
    id: number,
    _rowVersion: number
) => {
    const res = await fetch(`/api/employees/${employeeId}/emergency-contact-data`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id,
        }),
    });

    await ensureOk(res);
    return res.json();
};

export type EmployeeFamilyPayload = {
    name: string;
    relationship_id: number;
    dob: string;
    marital_status: string;
    gender_id: number;
    job?: string | null;
    phone1?: string | null;
    phone2?: string | null;
    is_active?: boolean;
};

export const getEmployeeFamilies = async (employeeId: number) => {
    const res = await fetch(`/api/employees/${employeeId}/family-data`, {
        credentials: "include",
    });

    await ensureOk(res);
    return res.json();
};

export const createEmployeeFamily = async (
    employeeId: number,
    payload: EmployeeFamilyPayload
) => {
    const res = await fetch(`/api/employees/${employeeId}/family-data`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            employee_id: employeeId,
            name: payload.name.trim(),
            relationship_id: Number(payload.relationship_id),
            dob: payload.dob,
            marital_status: payload.marital_status,
            gender_id: Number(payload.gender_id),
            job: payload.job?.trim() || null,
            phone1: payload.phone1?.trim() || null,
            phone2: payload.phone2?.trim() || null,
        }),
    });

    await ensureOk(res);
    return res.json();
};

export const updateEmployeeFamily = async (
    employeeId: number,
    id: number,
    _rowVersion: number,
    payload: EmployeeFamilyPayload
) => {
    const res = await fetch(`/api/employees/${employeeId}/family-data`, {
        method: "PUT",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id,
            employee_id: employeeId,
            name: payload.name.trim(),
            relationship_id: Number(payload.relationship_id),
            dob: payload.dob,
            marital_status: payload.marital_status,
            gender_id: Number(payload.gender_id),
            job: payload.job?.trim() || null,
            phone1: payload.phone1?.trim() || null,
            phone2: payload.phone2?.trim() || null,
        }),
    });

    await ensureOk(res);
    return res.json();
};

export const deleteEmployeeFamily = async (
    employeeId: number,
    id: number,
    _rowVersion: number
) => {
    const res = await fetch(`/api/employees/${employeeId}/family-data`, {
        method: "DELETE",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id,
        }),
    });

    await ensureOk(res);
    return res.json();
};