import {
  EmployeeEducationRow,
  EmployeeEmergencyContactRow,
  EmployeeEmploymentData,
  EmployeeFamilyRow,
  EmployeeIdentityRow,
  EmployeePersonalData,
  EmployeeWorkExperienceRow,
} from "../types/employee-general";
import { EmployeeLeaveBalance } from "../types/employee-leave-balance";
import { ResponseTypeError } from "../types/response-type";

const API_URL = "/api/my-profile";

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

export const getMyProfilePersonalData =
  async (): Promise<EmployeePersonalData> => {
    const res = await fetch(`${API_URL}/personal-data`, {
      method: "GET",
      credentials: "include",
    });

    await ensureOk(res);
    return res.json();
  };

export const getMyProfileIdentityAddressData = async (): Promise<
  EmployeeIdentityRow[]
> => {
  const res = await fetch(`${API_URL}/identity-address-data`, {
    method: "GET",
    credentials: "include",
  });

  await ensureOk(res);
  return res.json();
};

export const getMyProfileFamilyData = async (): Promise<
  EmployeeFamilyRow[]
> => {
  const res = await fetch(`${API_URL}/family-data`, {
    method: "GET",
    credentials: "include",
  });

  await ensureOk(res);
  return res.json();
};

export const getMyProfileEmergencyContactData = async (): Promise<
  EmployeeEmergencyContactRow[]
> => {
  const res = await fetch(`${API_URL}/emergency-contact-data`, {
    method: "GET",
    credentials: "include",
  });

  await ensureOk(res);
  return res.json();
};

export const getMyProfileEmploymentData =
  async (): Promise<EmployeeEmploymentData | null> => {
    const res = await fetch(`${API_URL}/employment-data`, {
      method: "GET",
      credentials: "include",
    });

    await ensureOk(res);
    return res.json();
  };

export const getMyProfileFormalEducationData = async (): Promise<
  EmployeeEducationRow[]
> => {
  const res = await fetch(`${API_URL}/education-data/formal`, {
    method: "GET",
    credentials: "include",
  });

  await ensureOk(res);
  return res.json();
};

export const getMyProfileInformalEducationData = async (): Promise<
  EmployeeEducationRow[]
> => {
  const res = await fetch(`${API_URL}/education-data/informal`, {
    method: "GET",
    credentials: "include",
  });

  await ensureOk(res);
  return res.json();
};

export const getMyProfileWorkExperienceData = async (): Promise<
  EmployeeWorkExperienceRow[]
> => {
  const res = await fetch(`${API_URL}/work-experience-data`, {
    method: "GET",
    credentials: "include",
  });

  await ensureOk(res);
  return res.json();
};

export const getMyProfileLeaveBalance = async (): Promise<
  EmployeeLeaveBalance[]
> => {
  const res = await fetch(`${API_URL}/leave-balance`, {
    method: "GET",
    credentials: "include",
  });

  await ensureOk(res);
  return res.json();
};
