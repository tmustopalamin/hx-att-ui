export type MobileAppAction = "download" | "link";

export interface MobileAppSettings {
  id: number;
  label: string;
  target_url: string | null;
  action: MobileAppAction;
  is_enabled: boolean;
  row_version: number;
  updated_at: string;
  updated_by: number | null;
}

export type UpdateMobileAppSettings = Pick<
  MobileAppSettings,
  "label" | "target_url" | "action" | "is_enabled"
>;
