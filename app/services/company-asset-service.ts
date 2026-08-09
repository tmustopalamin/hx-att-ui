import { apiFetch } from "@/app/utils/api-client";
import type {
  AssetAssignment,
  AssetCategory,
  CompanyAsset,
  CompanyAssetStatusHistory,
  NewAssetCategory,
  NewCompanyAsset,
} from "@/app/types/company-asset";
type Envelope<T> = { success: boolean; data: T; message: string };
const unwrap = <T>(request: Promise<Envelope<T>>): Promise<T> =>
  request.then((response) => response.data);
export const getAssetCategories = () =>
  unwrap(apiFetch<Envelope<AssetCategory[]>>("/api/asset-categories"));
export const createAssetCategory = (data: NewAssetCategory) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>("/api/asset-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
export const getCompanyAssets = () =>
  unwrap(apiFetch<Envelope<CompanyAsset[]>>("/api/assets"));
export const getCompanyAssetStatusHistory = (assetId: number) =>
  unwrap(
    apiFetch<Envelope<CompanyAssetStatusHistory[]>>(
      `/api/assets/${assetId}/history`,
    ),
  );
export const createCompanyAsset = (data: NewCompanyAsset) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  );
export const updateCompanyAssetStatus = (
  assetId: number,
  rowVersion: number,
  status: "AVAILABLE" | "REPAIR" | "RETIRED",
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(`/api/assets/${assetId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify({ status }),
    }),
  );
export const getAssetAssignments = () =>
  unwrap(apiFetch<Envelope<AssetAssignment[]>>("/api/asset-assignments"));
export const assignCompanyAsset = (
  assetId: number,
  rowVersion: number,
  data: {
    employee_id: number;
    due_return_date?: string | null;
    note?: string | null;
  },
) =>
  unwrap(
    apiFetch<Envelope<{ id: number }>>(`/api/assets/${assetId}/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "If-Match": String(rowVersion),
      },
      body: JSON.stringify(data),
    }),
  );
export const returnCompanyAsset = (
  assignmentId: number,
  rowVersion: number,
  note?: string | null,
) =>
  unwrap(
    apiFetch<Envelope<Record<string, never>>>(
      `/api/asset-assignments/${assignmentId}/return`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(rowVersion),
        },
        body: JSON.stringify({ note: note ?? null }),
      },
    ),
  );
