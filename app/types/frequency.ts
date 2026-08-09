export interface Frequency {
  id: number;
  name: string;
  description: string | null;
  days_in_period: number;
  is_active: boolean;
  deleted_at: string | null;
  row_version: number;
}

export type FrequencyPayload = Pick<
  Frequency,
  "name" | "description" | "days_in_period" | "is_active"
>;
