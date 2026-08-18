export interface Frequency {
  id: number;
  code: string;
  name: string;
  description: string | null;
  /** API field retained for wage-basis normalization compatibility. */
  days_in_period: number;
  is_active: boolean;
  deleted_at: string | null;
  row_version: number;
}

export type FrequencyPayload = Pick<
  Frequency,
  "name" | "description" | "days_in_period" | "is_active"
>;
