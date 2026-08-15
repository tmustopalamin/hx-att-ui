export type MyProfilePersonalData = {
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  preferred_name?: string | null;

  dob: string;
  birth_place: string;

  photo_url?: string | null;
  phone_number?: string | null;
  personal_email?: string | null;
  work_email?: string | null;

  gender_id: number;
  gender_name?: string | null;

  religion_id: number;
  religion_name?: string | null;

  marital_status_id: string;
  marital_status_name?: string | null;

  nationality_country_id?: number | null;
  nationality_country_name?: string | null;
};

export type MyProfileEmploymentData = {
  employee_id: number;

  code?: string | null;
  join_date?: string | null;
  end_date?: string | null;
  probation_end_date?: string | null;
  confirmation_date?: string | null;

  agency_id?: number | null;
  agency_name?: string | null;

  branch_id?: number | null;
  branch_name?: string | null;

  department_id?: number | null;
  department_name?: string | null;

  position_id?: number | null;
  position_name?: string | null;

  employment_status_id?: number | null;
  employment_status_name?: string | null;

  supervisor_employee_id?: number | null;
  supervisor_employee_name?: string | null;
};
