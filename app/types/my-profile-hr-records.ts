export type MyProfileDocument = {
  id: number;
  document_type_name: string;
  document_name?: string | null;
  expired_date?: string | null;
  verification_status: string;
  is_primary: boolean;
};

export type MyProfileAssetAssignment = {
  id: number;
  asset_tag: string;
  asset_name: string;
  assigned_at: string;
  due_return_date?: string | null;
  status: string;
};

export type MyProfileTrainingEnrollment = {
  id: number;
  session_code: string;
  course_name: string;
  status: string;
  completion_date?: string | null;
  score?: number | null;
};

export type MyProfileCertification = {
  id: number;
  course_name?: string | null;
  certification_name: string;
  issuing_organization?: string | null;
  issued_date?: string | null;
  expiry_date?: string | null;
  status: string;
};

export type MyProfileHrRecords = {
  documents: MyProfileDocument[];
  asset_assignments: MyProfileAssetAssignment[];
  training_enrollments: MyProfileTrainingEnrollment[];
  certifications: MyProfileCertification[];
  pending_lifecycle_task_count: number;
};
