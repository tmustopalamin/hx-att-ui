import type { AssetAssignment } from "@/app/types/company-asset";
import type { EmployeeDocument } from "@/app/types/employee-document";
import type { EmployeeLifecycleCase } from "@/app/types/employee-lifecycle";
import type { PerformanceReview } from "@/app/types/performance";
import type {
  EmployeeCertification,
  TrainingEnrollment,
} from "@/app/types/training";

export interface EmployeeHrDetail {
  documents: EmployeeDocument[] | null;
  asset_assignments: AssetAssignment[] | null;
  lifecycle_cases: EmployeeLifecycleCase[] | null;
  performance_reviews: PerformanceReview[] | null;
  training_enrollments: TrainingEnrollment[] | null;
  certifications: EmployeeCertification[] | null;
}
