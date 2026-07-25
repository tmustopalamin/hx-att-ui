export interface DashboardAttendanceTrendPoint {
  label: string;
  present: number;
  absent: number;
}

export interface DashboardTrendPoint {
  label: string;
  value: number;
}

export interface DashboardLabelValue {
  label: string;
  value: number;
}

export interface AdminDashboardTodayOverview {
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
  active_employees: number;
  attendance_exceptions: number;
}

export interface AdminDashboardNeedsAttention {
  unprocessed_attendance_logs: number;
  unmapped_attendance_logs: number;
  missing_shift_assignment: number;
  incomplete_attendance: number;
}

export interface AdminDashboardPeopleAdminNotes {
  active_contracts: number;
  expiring_in_7_days: number;
  expiring_in_30_days: number;
  birthdays_this_week: number;
}

export interface AdminDashboardOrganizationSnapshot {
  total_employees: number;
  departments: number;
  branches: number;
  new_employees_this_month: number;
}

export interface AdminDashboardCharts {
  attendance_trend: DashboardAttendanceTrendPoint[];
  late_trend: DashboardTrendPoint[];
  employees_by_department: DashboardLabelValue[];
}

export interface AdminDashboardResponse {
  today_overview: AdminDashboardTodayOverview;
  needs_attention: AdminDashboardNeedsAttention;
  people_admin_notes: AdminDashboardPeopleAdminNotes;
  organization_snapshot: AdminDashboardOrganizationSnapshot;
  charts: AdminDashboardCharts;
}
