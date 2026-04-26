export type OptionItem = {
    id: number | string;
    name: string;
    is_active?: boolean;
};

export type EmployeePersonalData = {
    first_name: string;
    middle_name?: string | null;
    last_name: string;
    preferred_name?: string | null;
    dob: string;
    gender_id: number;
    religion_id: number;
    marital_status_id: string;
    birth_place: string;
    photo_url?: string | null;
    phone_number?: string | null;
    personal_email?: string | null;
    work_email?: string | null;
    nationality_country_id?: number | null;
};

export type EmployeeEmploymentData = {
    code?: string | null;
    employee_id: number;
    join_date: string;
    end_date?: string | null;
    department_id: number;
    position_id: number;
    employment_status_id: number;
    position_name?: string | null;
    agency_id?: number | null;
    agency_name?: string | null;
    branch_id?: number | null;
    branch_name?: string | null;
};

export type EmployeeIdentityRow = {
    id: number;
    employee_id: number;
    identity_type_id: number;
    identity_type_name?: string | null;
    number: string;
    citizen_address: string;
    expire_date?: string | null;
    residential_address: string;
    is_permanent: boolean;
    is_active: boolean;
    created_at: string;
    created_by?: number | null;
    updated_at: string;
    updated_by?: number | null;
    deleted_at?: string | null;
    deleted_by?: number | null;
    row_version: number;
};

export type EmployeeIdentityPayload = {
    identity_type_id: number;
    number: string;
    citizen_address: string;
    expire_date?: string | null;
    residential_address: string;
    is_permanent: boolean;
    is_active: boolean;
};

export type EmployeeFamilyRow = {
    id: number;
    employee_id: number;
    name: string;
    relationship_id: number;
    dob: string;
    marital_status: string;
    gender_id: number;
    job?: string | null;
    phone1?: string | null;
    phone2?: string | null;
    is_active: boolean;
    relationship_name?: string | null;
    gender_name?: string | null;
    marital_name?: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    row_version: number;
};

export type EmployeeEmergencyContactRow = {
    id: number;
    employee_id: number;
    name: string;
    relationship_id: number;
    phone: string;
    is_active: boolean;
    relationship_name?: string | null;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    row_version: number;
};

export type EmployeeEducationRow = {
    id: number;
    employee_id: number;
    name: string;
    institution_name: string;
    major: string;
    start_date: string;
    end_date?: string | null;
    score: string;
    is_formal: boolean;
    is_certificate: boolean;
    held_by: string;
    degree: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    row_version: number;
};

export type EmployeeEducationPayload = {
    name: string;
    institution_name: string;
    major: string;
    start_date: string;
    end_date?: string | null;
    score: string;
    is_certificate: boolean;
    held_by: string;
    degree: string;
    is_active: boolean;
};

export type EmployeeWorkExperienceRow = {
    id: number;
    employee_id: number;
    company: string;
    position: string;
    start_date: string;
    end_date?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    row_version: number;
};

export type EmployeeWorkExperiencePayload = {
    company: string;
    position: string;
    start_date: string;
    end_date?: string | null;
    is_active: boolean;
};