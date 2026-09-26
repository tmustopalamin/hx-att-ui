"use client";

import { useI18n } from "@/app/i18n";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { InputTextarea } from "primereact/inputtextarea";
import { Tag } from "primereact/tag";

import LoadingDataTable from "@/app/_components/LoadingDataTable";
import ErrorNotConnectedToApi from "@/app/_components/ErrorNotConnectedToApi";
import {
  acknowledgePerformanceReview,
  getPerformanceGoals,
  getPerformanceReviews,
} from "@/app/services/performance-service";
import type {
  PerformanceGoal,
  PerformanceReview,
} from "@/app/types/performance";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";

const statusSeverity = (
  status?: string | null,
): "secondary" | "warning" | "info" | "success" | "danger" => {
  switch (status) {
    case "SUBMITTED":
      return "warning";
    case "ACKNOWLEDGED":
      return "info";
    case "FINALIZED":
      return "success";
    case "CANCELLED":
      return "danger";
    case "DRAFT":
    default:
      return "secondary";
  }
};

export default function MyPerformanceData() {
  const { t: i18nT, locale } = useI18n();
  const isId = locale === "id";
  const dispatch = useDispatch();

  const currentEmployeeId = useSelector(
    (s: RootState) => s.profile.employee_id,
  );

  const {
    data: reviews = [],
    error,
    isLoading,
    isValidating,
    mutate: reloadReviews,
  } = useSWR<PerformanceReview[]>("performance-reviews", getPerformanceReviews);

  const myReviews = useMemo(() => {
    if (!currentEmployeeId) return [];
    return reviews.filter((r) => r.employee_id === currentEmployeeId);
  }, [reviews, currentEmployeeId]);

  const [selectedReview, setSelectedReview] =
    useState<PerformanceReview | null>(null);
  const [dialog, setDialog] = useState<"goals" | "acknowledge" | null>(null);
  const [goalsKey, setGoalsKey] = useState<number | null>(null);
  const [employeeComment, setEmployeeComment] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: goals = [], isLoading: isLoadingGoals } = useSWR<
    PerformanceGoal[]
  >(goalsKey ? `performance-goals-${goalsKey}` : null, () =>
    getPerformanceGoals(goalsKey!),
  );

  const activeGoals = useMemo(
    () => goals.filter((g) => g.status !== "CANCELLED"),
    [goals],
  );

  const goalsTotalWeight = useMemo(
    () => activeGoals.reduce((sum, g) => sum + (Number(g.weight) || 0), 0),
    [activeGoals],
  );

  const goalsCalculatedScore = useMemo(() => {
    if (activeGoals.length === 0) return null;
    const allScored = activeGoals.every(
      (g) =>
        g.score !== null &&
        g.score !== undefined &&
        !Number.isNaN(Number(g.score)),
    );
    if (!allScored) return null;
    const weightedSum = activeGoals.reduce((sum, g) => {
      const w = Number(g.weight) || 0;
      const s = Number(g.score) || 0;
      return sum + (w * s) / 100;
    }, 0);
    return Math.round(weightedSum * 100) / 100;
  }, [activeGoals]);

  const pendingAcknowledgeCount = useMemo(
    () => myReviews.filter((r) => r.status === "SUBMITTED").length,
    [myReviews],
  );

  const latestScore = useMemo(() => {
    const withScore = myReviews.find(
      (r) => r.overall_score !== null && r.overall_score !== undefined,
    );
    return withScore?.overall_score ?? null;
  }, [myReviews]);

  const openGoals = (review: PerformanceReview) => {
    setSelectedReview(review);
    setGoalsKey(review.id);
    setDialog("goals");
  };

  const openAcknowledge = (review: PerformanceReview) => {
    setSelectedReview(review);
    setEmployeeComment(review.employee_comment || "");
    setDialog("acknowledge");
  };

  const closeDialog = () => {
    if (!saving) {
      setDialog(null);
      setSelectedReview(null);
      setGoalsKey(null);
      setEmployeeComment("");
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedReview) return;
    setSaving(true);
    try {
      await acknowledgePerformanceReview(
        selectedReview.id,
        selectedReview.row_version,
        employeeComment.trim() || null,
      );
      dispatch(
        showToast({
          visible: true,
          severity: "success",
          summary: isId ? "Berhasil" : "Success",
          detail: isId
            ? "Penilaian kinerja berhasil dikonfirmasi (Acknowledged)."
            : "Performance review successfully acknowledged.",
        }),
      );
      closeDialog();
      await reloadReviews();
    } catch (err: unknown) {
      const msg =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof err.message === "string"
          ? err.message
          : isId
            ? "Gagal mengonfirmasi penilaian kinerja."
            : "Failed to acknowledge performance review.";
      dispatch(
        showToast({
          visible: true,
          severity: "error",
          summary: isId ? "Gagal" : "Error",
          detail: msg,
        }),
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <LoadingDataTable />;
  if (error) return <ErrorNotConnectedToApi mutateKey="performance-reviews" />;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="m-0 text-xl font-bold text-slate-800">
                {isId ? "Kinerja Saya" : "My Performance"}
              </h1>
              <p className="m-0 mt-1 text-sm text-slate-500">
                {isId
                  ? "Lihat riwayat evaluasi kinerja, capaian target KPI, dan lakukan konfirmasi hasil penilaian."
                  : "View your performance reviews, goal achievements, and acknowledge evaluation outcomes."}
              </p>
            </div>
            <Button
              label={i18nT("static.28r6qc")}
              outlined
              severity="secondary"
              icon="pi pi-refresh"
              size="small"
              loading={isValidating}
              onClick={() => void reloadReviews()}
            />
          </div>

          {/* Pending Acknowledge Banner */}
          {pendingAcknowledgeCount > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <i className="pi pi-exclamation-triangle text-xl text-amber-600" />
              <div className="flex-1 text-sm">
                <span className="font-semibold">
                  {isId
                    ? "Perhatian: Ada evaluasi kinerja yang menunggu konfirmasi Anda!"
                    : "Attention: You have performance evaluations awaiting your acknowledgment!"}
                </span>
                <p className="m-0 mt-0.5 text-xs text-amber-750">
                  {isId
                    ? "Silakan tinjau rincian nilai dan klik tombol 'Acknowledge' pada baris review di bawah ini."
                    : "Please review the scores and click the 'Acknowledge' button on the review below."}
                </p>
              </div>
            </div>
          )}

          {/* Metric Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {isId ? "Total Peninjauan" : "Total Reviews"}
              </span>
              <div className="mt-1 text-2xl font-bold text-slate-800">
                {myReviews.length}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {isId ? "Skor Terakhir" : "Latest Overall Score"}
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-emerald-600">
                  {latestScore !== null ? Number(latestScore).toFixed(2) : "-"}
                </span>
                {latestScore !== null && (
                  <span className="text-xs text-slate-500">/ 100</span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {isId ? "Perlu Konfirmasi" : "Pending Acknowledgment"}
              </span>
              <div className="mt-1 text-2xl font-bold text-amber-600">
                {pendingAcknowledgeCount}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Reviews Table */}
      <Card className="border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-4 p-3 sm:p-4 md:p-5">
          <div className="flex items-center justify-between">
            <h2 className="m-0 text-base font-semibold text-slate-800">
              {isId ? "Daftar Evaluasi Kinerja Saya" : "My Evaluation History"}
            </h2>
          </div>

          <DataTable
            value={myReviews}
            dataKey="id"
            paginator
            rows={10}
            stripedRows
            rowHover
            size="small"
            emptyMessage={
              isId
                ? "Belum ada evaluasi kinerja untuk Anda."
                : "No performance evaluations found for you."
            }
          >
            <Column
              field="cycle_name"
              header={isId ? "Siklus Kinerja" : "Review Cycle"}
              body={(r: PerformanceReview) => (
                <div className="font-semibold text-slate-800">
                  {r.cycle_name}
                </div>
              )}
            />
            <Column
              field="review_type"
              header={isId ? "Tipe Peninjauan" : "Review Type"}
              body={(r: PerformanceReview) => (
                <span className="text-xs text-slate-600">
                  {r.review_type === "MANAGER"
                    ? isId
                      ? "Penilaian Atasan"
                      : "Manager Review"
                    : r.review_type === "SELF"
                      ? isId
                        ? "Penilaian Mandiri"
                        : "Self Review"
                      : r.review_type}
                </span>
              )}
            />
            <Column
              field="reviewer_name"
              header={isId ? "Penilai (Reviewer)" : "Reviewer"}
              body={(r: PerformanceReview) => (
                <div className="text-sm text-slate-700">
                  {r.reviewer_name || "-"}
                </div>
              )}
            />
            <Column
              field="overall_score"
              header={isId ? "Skor Akhir" : "Overall Score"}
              body={(r: PerformanceReview) =>
                r.overall_score !== null && r.overall_score !== undefined ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                    {Number(r.overall_score).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">-</span>
                )
              }
            />
            <Column
              field="status"
              header="Status"
              body={(r: PerformanceReview) => (
                <Tag
                  value={r.status}
                  severity={statusSeverity(r.status)}
                  className="text-xs"
                />
              )}
            />
            <Column
              field="reviewer_comment"
              header={isId ? "Catatan Penilai" : "Reviewer Feedback"}
              body={(r: PerformanceReview) => (
                <div
                  className="max-w-xs truncate text-xs text-slate-600"
                  title={r.reviewer_comment || ""}
                >
                  {r.reviewer_comment || "-"}
                </div>
              )}
            />
            <Column
              field="employee_comment"
              header={isId ? "Tanggapan Saya" : "My Comments"}
              body={(r: PerformanceReview) => (
                <div
                  className="max-w-xs truncate text-xs text-slate-600"
                  title={r.employee_comment || ""}
                >
                  {r.employee_comment || "-"}
                </div>
              )}
            />
            <Column
              header={isId ? "Aksi" : "Actions"}
              body={(r: PerformanceReview) => (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    label={isId ? "Lihat Goals" : "View Goals"}
                    icon="pi pi-list"
                    size="small"
                    outlined
                    severity="secondary"
                    className="text-xs"
                    onClick={() => openGoals(r)}
                  />
                  {r.status === "SUBMITTED" && (
                    <Button
                      label="Acknowledge"
                      icon="pi pi-check"
                      size="small"
                      severity="warning"
                      className="text-xs font-semibold"
                      onClick={() => openAcknowledge(r)}
                    />
                  )}
                </div>
              )}
            />
          </DataTable>
        </div>
      </Card>

      {/* Goals / KPI Breakdown Dialog */}
      <Dialog
        header={
          <div className="flex items-center gap-2">
            <i className="pi pi-list text-primary" />
            <span>
              {isId ? "Rincian Target KPI & Bobot" : "Goal & KPI Details"}
              {selectedReview ? ` - ${selectedReview.cycle_name}` : ""}
            </span>
          </div>
        }
        visible={dialog === "goals"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "52rem" }}
        onHide={closeDialog}
        footer={
          <div className="flex justify-end">
            <Button
              label={isId ? "Tutup" : "Close"}
              text
              severity="secondary"
              onClick={closeDialog}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Review Context Header */}
          {selectedReview && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
              <div>
                <span className="text-slate-500">
                  {isId ? "Penilai:" : "Reviewer:"}
                </span>
                <div className="font-semibold text-slate-800">
                  {selectedReview.reviewer_name}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Status:</span>
                <div>
                  <Tag
                    value={selectedReview.status}
                    severity={statusSeverity(selectedReview.status)}
                    className="text-xs"
                  />
                </div>
              </div>
              <div>
                <span className="text-slate-500">
                  {isId ? "Skor Review:" : "Overall Score:"}
                </span>
                <div className="font-bold text-emerald-600">
                  {selectedReview.overall_score !== null
                    ? Number(selectedReview.overall_score).toFixed(2)
                    : "-"}
                </div>
              </div>
              <div>
                <span className="text-slate-500">
                  {isId ? "Total Bobot KPI:" : "Total Weight:"}
                </span>
                <div className="font-semibold text-slate-800">
                  {goalsTotalWeight}%
                </div>
              </div>
            </div>
          )}

          {/* Goals Table */}
          <DataTable
            value={goals}
            dataKey="id"
            size="small"
            stripedRows
            loading={isLoadingGoals}
            emptyMessage={
              isId
                ? "Tidak ada target KPI yang tercatat."
                : "No KPI goals recorded for this review."
            }
          >
            <Column
              field="title"
              header={isId ? "Judul KPI" : "Goal Title"}
              body={(g: PerformanceGoal) => (
                <div>
                  <div className="font-semibold text-slate-800">{g.title}</div>
                  {g.description && (
                    <div className="text-xs text-slate-500">
                      {g.description}
                    </div>
                  )}
                </div>
              )}
            />
            <Column
              field="weight"
              header={isId ? "Bobot" : "Weight"}
              style={{ width: "6rem" }}
              body={(g: PerformanceGoal) => (
                <span className="font-medium">{Number(g.weight)}%</span>
              )}
            />
            <Column
              field="target_value"
              header={isId ? "Target" : "Target"}
              body={(g: PerformanceGoal) => g.target_value || "-"}
            />
            <Column
              field="actual_value"
              header={isId ? "Realisasi" : "Actual"}
              body={(g: PerformanceGoal) => g.actual_value || "-"}
            />
            <Column
              field="score"
              header={isId ? "Skor" : "Score"}
              style={{ width: "6rem" }}
              body={(g: PerformanceGoal) =>
                g.score !== null && g.score !== undefined ? (
                  <span className="font-bold text-slate-800">
                    {Number(g.score).toFixed(2)}
                  </span>
                ) : (
                  "-"
                )
              }
            />
            <Column
              field="status"
              header="Status"
              body={(g: PerformanceGoal) => (
                <span className="text-xs text-slate-600">{g.status}</span>
              )}
            />
          </DataTable>

          {/* Calculation Summary Footer */}
          {goalsCalculatedScore !== null && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-700">
                {isId ? "Kalkulasi Skor Terbobot: " : "Weighted Score: "}
              </span>
              <span>
                ∑ (Bobot × Skor) / 100 ={" "}
                <span className="font-bold text-emerald-700">
                  {goalsCalculatedScore.toFixed(2)}
                </span>
              </span>
            </div>
          )}
        </div>
      </Dialog>

      {/* Acknowledge Confirmation Dialog */}
      <Dialog
        header={
          <div className="flex items-center gap-2 text-slate-800">
            <i className="pi pi-check-circle text-amber-500" />
            <span>
              {isId
                ? "Konfirmasi Penilaian Kinerja (Acknowledge)"
                : "Acknowledge Performance Review"}
            </span>
          </div>
        }
        visible={dialog === "acknowledge"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "36rem" }}
        onHide={closeDialog}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              label={isId ? "Batal" : "Cancel"}
              text
              severity="secondary"
              onClick={closeDialog}
              disabled={saving}
            />
            <Button
              label={isId ? "Konfirmasi & Acknowledge" : "Confirm Acknowledge"}
              icon="pi pi-check"
              severity="warning"
              loading={saving}
              onClick={handleAcknowledge}
            />
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="m-0 text-sm text-slate-600">
            {isId
              ? "Dengan melakukan Acknowledge, Anda menyatakan telah meninjau dan menerima hasil penilaian kinerja ini. Hasil ini selanjutnya akan diproses ke tahap pengesahan final oleh Manajemen / HR."
              : "By acknowledging, you confirm that you have reviewed the evaluation outcome. This review will proceed to final approval by HR / Management."}
          </p>

          {selectedReview && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex justify-between border-b border-slate-200 pb-2 text-xs">
                <span className="text-slate-500">
                  {isId ? "Siklus Kinerja" : "Review Cycle"}
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedReview.cycle_name}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 py-2 text-xs">
                <span className="text-slate-500">
                  {isId ? "Penilai" : "Reviewer"}
                </span>
                <span className="font-semibold text-slate-800">
                  {selectedReview.reviewer_name}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 py-2 text-xs">
                <span className="text-slate-500">
                  {isId ? "Skor Keseluruhan" : "Overall Score"}
                </span>
                <span className="font-bold text-emerald-700">
                  {selectedReview.overall_score !== null
                    ? Number(selectedReview.overall_score).toFixed(2)
                    : "-"}
                </span>
              </div>
              <div className="pt-2 text-xs">
                <span className="text-slate-500">
                  {isId ? "Komentar Penilai:" : "Reviewer Comment:"}
                </span>
                <p className="m-0 mt-1 italic text-slate-700">
                  &ldquo;
                  {selectedReview.reviewer_comment ||
                    (isId ? "Tidak ada catatan." : "No comment.")}
                  &rdquo;
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-700">
              {isId
                ? "Tanggapan / Catatan Karyawan (Opsional)"
                : "Employee Feedback / Comment (Optional)"}
            </label>
            <InputTextarea
              value={employeeComment}
              onChange={(e) => setEmployeeComment(e.target.value)}
              rows={3}
              placeholder={
                isId
                  ? "Tuliskan tanggapan, apresiasi, atau catatan Anda terkait hasil evaluasi ini..."
                  : "Enter your feedback or notes regarding this evaluation..."
              }
              className="w-full text-sm"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
}
