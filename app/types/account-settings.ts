export interface SessionSummary {
  active_count: number;
  other_count: number;
  has_current_session: boolean;
}

export interface RevokeSessionsResult {
  revoked_count: number;
}

export interface ApiDataResponse<T> {
  success: boolean;
  data: T;
  message: string;
}
