import type { ResponseType } from "@/app/types/response-type";
import type {
  MobileAppSettings,
  UpdateMobileAppSettings,
} from "@/app/types/mobile-app-settings";
import { apiFetch } from "@/app/utils/api-client";

const ENDPOINT = "/api/mobile-app-settings";

const unwrap = <T>(response: ResponseType<T>): T => response.data;

export async function getMobileAppSettings(): Promise<MobileAppSettings> {
  return unwrap(await apiFetch<ResponseType<MobileAppSettings>>(ENDPOINT));
}

export async function updateMobileAppSettings(
  rowVersion: number,
  input: UpdateMobileAppSettings,
): Promise<MobileAppSettings> {
  return unwrap(
    await apiFetch<ResponseType<MobileAppSettings>>(ENDPOINT, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify(input),
    }),
  );
}
