import { apiFetch } from "./api-client";

export function fetcher<T>(url: string): Promise<T> {
  return apiFetch<T>(url);
}
