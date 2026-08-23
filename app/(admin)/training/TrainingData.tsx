"use client";
import { useI18n } from "@/app/i18n";
import { useMemo, useState } from "react";
import useSWR from "swr";
import { Button } from "primereact/button";
import { Card } from "primereact/card";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { Dialog } from "primereact/dialog";
import { Dropdown } from "primereact/dropdown";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { InputTextarea } from "primereact/inputtextarea";
import { TabPanel, TabView } from "primereact/tabview";
import { Tag } from "primereact/tag";
import {
  formatDate as formatDisplayDate,
  formatDateTime as formatDisplayDateTime,
} from "@/app/utils/date-format";
import { useDispatch, useSelector } from "react-redux";
import type { Employee } from "@/app/types/employee";
import type {
  EmployeeCertification,
  TrainingCourse,
  TrainingEnrollment,
  TrainingSession,
} from "@/app/types/training";
import {
  createEmployeeCertification,
  createTrainingCourse,
  createTrainingEnrollment,
  createTrainingSession,
  getEmployeeCertifications,
  getTrainingCourses,
  getTrainingEnrollments,
  getTrainingSessions,
  updateTrainingEnrollmentStatus,
  updateEmployeeCertificationStatus,
  updateTrainingCourseActive,
  updateTrainingSessionStatus,
} from "@/app/services/training-service";
import { fetcher } from "@/app/utils/fetcher";
import type { RootState } from "@/store/store";
import { showToast } from "@/store/ToastSlice";
import { requestActionConfirmation } from "@/app/_components/ActionConfirmDialog";
import type { ResponseTypeError } from "@/app/types/response-type";
import PrimeDatePicker from "@/app/_components/PrimeDatePicker";
type DialogName =
  "course" | "session" | "enroll" | "enrollmentStatus" | "certification" | null;
const severity = (s: string) =>
  ["OPEN", "COMPLETED", "ACTIVE"].includes(s)
    ? "success"
    : s === "DRAFT" || s === "ENROLLED"
      ? "info"
      : s === "ATTENDED"
        ? "warning"
        : "danger";
export default function TrainingData() {
  const { t: i18nT } = useI18n();
  const dispatch = useDispatch();
  const permissions = useSelector((s: RootState) => s.profile.permissions);
  const canManage = permissions.includes("training.manage");
  const {
    data: courses = [],
    mutate: reloadCourses,
    isValidating,
  } = useSWR("training-courses", getTrainingCourses);
  const { data: sessions = [], mutate: reloadSessions } = useSWR(
    "training-sessions",
    getTrainingSessions,
  );
  const { data: enrollments = [], mutate: reloadEnrollments } = useSWR(
    "training-enrollments",
    getTrainingEnrollments,
  );
  const { data: certifications = [], mutate: reloadCertifications } = useSWR(
    "employee-certifications",
    getEmployeeCertifications,
  );
  const { data: employees = [] } = useSWR<Employee[]>(
    "/api/employees/list?show_all=false",
    fetcher,
  );
  const [dialog, setDialog] = useState<DialogName>(null);
  const [saving, setSaving] = useState(false);
  const [selectedSession, setSelectedSession] =
    useState<TrainingSession | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] =
    useState<TrainingEnrollment | null>(null);
  const [course, setCourse] = useState({
    code: "",
    name: "",
    category: "",
    description: "",
    duration_hours: null as number | null,
  });
  const [session, setSession] = useState({
    training_course_id: 0,
    code: "",
    start_at: "",
    end_at: "",
    provider_name: "",
    location: "",
    capacity: null as number | null,
  });
  const [enrollment, setEnrollment] = useState({
    training_session_id: 0,
    employee_id: 0,
  });
  const [enrollmentStatus, setEnrollmentStatus] = useState({
    status: "COMPLETED",
    completion_date: "",
    score: null as number | null,
  });
  const [certification, setCertification] = useState({
    employee_id: 0,
    training_course_id: 0,
    certification_name: "",
    issuing_organization: "",
    credential_number: "",
    issued_date: "",
    expiry_date: "",
  });
  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        label:
          e.full_name || [e.first_name, e.last_name].filter(Boolean).join(" "),
        value: e.id,
      })),
    [employees],
  );
  const courseOptions = useMemo(
    () =>
      courses
        .filter((c) => c.is_active)
        .map((c) => ({
          label: i18nT("static.1v0umq8", { p0: c.code, p1: c.name }),
          value: c.id,
        })),
    [courses],
  );
  const sessionOptions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "OPEN")
        .map((s) => ({
          label: i18nT("static.1v0umq8", { p0: s.code, p1: s.course_name }),
          value: s.id,
        })),
    [sessions],
  );
  const notify = (
    severity: "success" | "error",
    summary: string,
    detail: string,
  ) => dispatch(showToast({ visible: true, severity, summary, detail }));
  const refresh = async () => {
    await Promise.all([
      reloadCourses(),
      reloadSessions(),
      reloadEnrollments(),
      reloadCertifications(),
    ]);
  };
  const close = () => {
    if (!saving) setDialog(null);
  };
  const footer = (label: string, onClick: () => void) => (
    <div className="flex justify-end gap-2">
      <Button
        label={i18nT("static.ew9em3")}
        text
        severity="secondary"
        disabled={saving}
        onClick={close}
      />
      <Button
        label={label}
        icon="pi pi-check"
        loading={saving}
        onClick={onClick}
      />
    </div>
  );
  const save = async (
    action: () => Promise<unknown>,
    success: string,
    reset: () => void,
  ) => {
    setSaving(true);
    try {
      await action();
      reset();
      setDialog(null);
      await refresh();
      notify("success", i18nT("static.12ek4is"), success);
    } catch (error: unknown) {
      const apiError =
        typeof error === "object" &&
        error !== null &&
        "message" in error &&
        typeof (error as ResponseTypeError).message === "string"
          ? (error as ResponseTypeError)
          : null;
      notify(
        "error",
        i18nT("static.rulhkg"),
        apiError?.message ?? i18nT("static.144zhk6"),
      );
    } finally {
      setSaving(false);
    }
  };
  const sessionAction = async (
    row: TrainingSession,
    status: "OPEN" | "COMPLETED" | "CANCELLED",
  ) => {
    setSaving(true);
    try {
      await updateTrainingSessionStatus(row.id, row.row_version, status);
      await reloadSessions();
      notify(
        "success",
        i18nT("static.miz9ao"),
        i18nT("static.14rqmef", { p0: status.toLowerCase() }),
      );
    } catch {
      notify("error", i18nT("static.1yhx6qk"), i18nT("static.1ri6ckh"));
    } finally {
      setSaving(false);
    }
  };
  const confirmSessionAction = (
    row: TrainingSession,
    status: "OPEN" | "COMPLETED" | "CANCELLED",
  ) => {
    const cancelling = status === "CANCELLED";
    const completing = status === "COMPLETED";
    requestActionConfirmation({
      action: completing
        ? i18nT("static.18mmecw")
        : cancelling
          ? i18nT("static.ygyxiz")
          : i18nT("static.1il208h"),
      target: `${row.code} · ${row.course_name}`,
      severity: cancelling ? "danger" : "warning",
      confirmLabel: completing
        ? i18nT("static.rcgk2q")
        : cancelling
          ? i18nT("static.ew9em3")
          : i18nT("static.n6hn1l"),
      confirmIcon: completing
        ? "pi pi-check"
        : cancelling
          ? "pi pi-times"
          : "pi pi-folder-open",
      description: completing
        ? i18nT("static.10e2skp")
        : cancelling
          ? i18nT("static.1xk63mu")
          : i18nT("static.badg1g"),
      onAccept: () => sessionAction(row, status),
    });
  };
  const courseAction = async (row: TrainingCourse) => {
    setSaving(true);
    try {
      await updateTrainingCourseActive(row.id, row.row_version, !row.is_active);
      await reloadCourses();
      notify(
        "success",
        i18nT("static.miz9ao"),
        i18nT("static.n4vp66", {
          p0: row.is_active ? i18nT("static.1ubdbo8") : i18nT("static.1oc52r3"),
        }),
      );
    } catch {
      notify("error", i18nT("static.1yhx6qk"), i18nT("static.144xn6e"));
    } finally {
      setSaving(false);
    }
  };
  const confirmCourseAction = (row: TrainingCourse) => {
    const nextState = row.is_active ? "deactivate" : "activate";
    requestActionConfirmation({
      action: i18nT("static.vlz1ra", { p0: nextState }),
      target: `${row.code} · ${row.name}`,
      severity: row.is_active ? "danger" : "warning",
      confirmLabel: row.is_active
        ? i18nT("static.zgo73n")
        : i18nT("static.giwx3k"),
      confirmIcon: row.is_active ? "pi pi-ban" : "pi pi-check",
      description: row.is_active
        ? i18nT("static.1gyd9ir")
        : i18nT("static.t723n8"),
      onAccept: () => courseAction(row),
    });
  };
  const certificationAction = async (
    row: EmployeeCertification,
    status: "ACTIVE" | "REVOKED",
  ) => {
    setSaving(true);
    try {
      await updateEmployeeCertificationStatus(row.id, row.row_version, status);
      await reloadCertifications();
      notify(
        "success",
        i18nT("static.miz9ao"),
        i18nT("static.3ih6jh", { p0: status.toLowerCase() }),
      );
    } catch {
      notify("error", i18nT("static.1yhx6qk"), i18nT("static.arahcb"));
    } finally {
      setSaving(false);
    }
  };
  const confirmCertificationAction = (
    row: EmployeeCertification,
    status: "ACTIVE" | "REVOKED",
  ) => {
    const revoking = status === "REVOKED";
    requestActionConfirmation({
      action: revoking ? i18nT("static.1n5u8jt") : i18nT("static.3cu213"),
      target: row.certification_name,
      severity: revoking ? "danger" : "warning",
      confirmLabel: revoking ? i18nT("static.9gmdzn") : i18nT("static.4fiyr5"),
      confirmIcon: revoking ? "pi pi-times" : "pi pi-refresh",
      description: revoking ? i18nT("static.rj4v2s") : i18nT("static.hqotne"),
      onAccept: () => certificationAction(row, status),
    });
  };
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
              {i18nT("static.1resp73")}{" "}
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              {i18nT("static.sdk3lk")}{" "}
            </p>
          </div>
          <Button
            label={i18nT("static.28r6qc")}
            icon="pi pi-refresh"
            outlined
            severity="secondary"
            size="small"
            loading={isValidating}
            onClick={() => void refresh()}
          />
        </div>
        <TabView>
          <TabPanel header={i18nT("static.4u866p")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.1mvzd6e")}
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => setDialog("course")}
                />
              )}
            </div>
            <DataTable
              value={courses}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage={i18nT("static.81yddl")}
            >
              <Column field="code" header={i18nT("static.xoaiok")} />
              <Column field="name" header={i18nT("static.1yoky9k")} />
              <Column
                field="category"
                header={i18nT("static.1cr1mz5")}
                body={(r) => r.category || "-"}
              />
              <Column
                header={i18nT("static.1bi4ul0")}
                body={(r) => r.duration_hours ?? "-"}
              />
              <Column
                header={i18nT("static.8qzyhb")}
                body={(r: TrainingCourse) => (
                  <Tag
                    value={
                      r.is_active
                        ? i18nT("static.8qzyhb")
                        : i18nT("static.13zf5vc")
                    }
                    severity={r.is_active ? "success" : "secondary"}
                  />
                )}
              />
              {canManage && (
                <Column
                  header={i18nT("static.2wk0tb")}
                  body={(r: TrainingCourse) => (
                    <Button
                      label={
                        r.is_active
                          ? i18nT("static.zgo73n")
                          : i18nT("static.giwx3k")
                      }
                      text
                      severity={r.is_active ? "danger" : "secondary"}
                      size="small"
                      disabled={saving}
                      onClick={() => confirmCourseAction(r)}
                    />
                  )}
                />
              )}
            </DataTable>
          </TabPanel>
          <TabPanel header={i18nT("static.1enz6jw")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.hm8ea5")}
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => setDialog("session")}
                />
              )}
            </div>
            <DataTable
              value={sessions}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage={i18nT("static.vrqzd2")}
            >
              <Column field="code" header={i18nT("static.xoaiok")} />
              <Column field="course_name" header={i18nT("static.1yoky9k")} />
              <Column
                header={i18nT("static.30xvgf")}
                body={(r: TrainingSession) => formatDisplayDateTime(r.start_at)}
              />
              <Column
                field="provider_name"
                header={i18nT("static.evz7q4")}
                body={(r) => r.provider_name || "-"}
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(r: TrainingSession) => (
                  <Tag value={r.status} severity={severity(r.status)} />
                )}
              />
              {canManage && (
                <Column
                  header={i18nT("static.2wk0tb")}
                  body={(r: TrainingSession) => (
                    <div className="flex gap-1">
                      {r.status === "DRAFT" && (
                        <>
                          <Button
                            label={i18nT("static.n6hn1l")}
                            text
                            size="small"
                            onClick={() => confirmSessionAction(r, "OPEN")}
                          />
                          <Button
                            label={i18nT("static.ew9em3")}
                            text
                            severity="danger"
                            size="small"
                            onClick={() => confirmSessionAction(r, "CANCELLED")}
                          />
                        </>
                      )}{" "}
                      {r.status === "OPEN" && (
                        <>
                          <Button
                            label={i18nT("static.rcgk2q")}
                            text
                            size="small"
                            onClick={() => confirmSessionAction(r, "COMPLETED")}
                          />
                          <Button
                            label={i18nT("static.ew9em3")}
                            text
                            severity="danger"
                            size="small"
                            onClick={() => confirmSessionAction(r, "CANCELLED")}
                          />
                        </>
                      )}
                    </div>
                  )}
                />
              )}
            </DataTable>
          </TabPanel>
          <TabPanel header={i18nT("static.1s5mriy")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.15dora7")}
                  icon="pi pi-user-plus"
                  size="small"
                  onClick={() => setDialog("enroll")}
                />
              )}
            </div>
            <DataTable
              value={enrollments}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage={i18nT("static.1vimc56")}
            >
              <Column field="employee_name" header={i18nT("static.1fak8xt")} />
              <Column field="session_code" header={i18nT("static.8yh9jr")} />
              <Column field="course_name" header={i18nT("static.1yoky9k")} />
              <Column
                header={i18nT("static.3pd73")}
                body={(r: TrainingEnrollment) => (
                  <Tag value={r.status} severity={severity(r.status)} />
                )}
              />
              {canManage && (
                <Column
                  header={i18nT("static.2wk0tb")}
                  body={(r: TrainingEnrollment) =>
                    ["ENROLLED", "ATTENDED"].includes(r.status) ? (
                      <Button
                        label={i18nT("static.tyeea8")}
                        text
                        size="small"
                        onClick={() => {
                          setSelectedEnrollment(r);
                          setEnrollmentStatus({
                            status: "COMPLETED",
                            completion_date: "",
                            score: null,
                          });
                          setDialog("enrollmentStatus");
                        }}
                      />
                    ) : null
                  }
                />
              )}
            </DataTable>
          </TabPanel>
          <TabPanel header={i18nT("static.fhktvu")}>
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label={i18nT("static.tvobhj")}
                  icon="pi pi-plus"
                  size="small"
                  onClick={() => setDialog("certification")}
                />
              )}
            </div>
            <DataTable
              value={certifications}
              dataKey="id"
              paginator
              rows={10}
              stripedRows
              rowHover
              size="small"
              emptyMessage={i18nT("static.1hw0com")}
            >
              <Column field="employee_name" header={i18nT("static.1fak8xt")} />
              <Column
                field="certification_name"
                header={i18nT("static.fkzzr1")}
              />
              <Column
                field="course_name"
                header={i18nT("static.1blbp19")}
                body={(r) => r.course_name || "-"}
              />
              <Column
                field="expiry_date"
                header={i18nT("static.r38mzi")}
                body={(r) => formatDisplayDate(r.expiry_date)}
              />
              <Column
                header={i18nT("static.3pd73")}
                body={(r: EmployeeCertification) => (
                  <Tag value={r.status} severity={severity(r.status)} />
                )}
              />
              {canManage && (
                <Column
                  header={i18nT("static.2wk0tb")}
                  body={(r: EmployeeCertification) => (
                    <div className="flex gap-1">
                      {r.status !== "REVOKED" ? (
                        <Button
                          label={i18nT("static.9gmdzn")}
                          text
                          severity="danger"
                          size="small"
                          disabled={saving}
                          onClick={() =>
                            confirmCertificationAction(r, "REVOKED")
                          }
                        />
                      ) : (
                        <Button
                          label={i18nT("static.ezrmxd")}
                          text
                          size="small"
                          disabled={saving}
                          onClick={() =>
                            confirmCertificationAction(r, "ACTIVE")
                          }
                        />
                      )}
                    </div>
                  )}
                />
              )}
            </DataTable>
          </TabPanel>
        </TabView>
      </div>
      <Dialog
        header={i18nT("static.jhy9ze")}
        visible={dialog === "course"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!course.code.trim() || !course.name.trim()) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.b2cqka"));
            return;
          }
          void save(
            () =>
              createTrainingCourse({
                ...course,
                category: course.category || null,
                description: course.description || null,
              }),
            "Training course created.",
            () =>
              setCourse({
                code: "",
                name: "",
                category: "",
                description: "",
                duration_hours: null,
              }),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.xoaiok")}{" "}
            <InputText
              value={course.code}
              onChange={(e) => setCourse({ ...course, code: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.qdhx6z")}{" "}
            <InputText
              value={course.name}
              onChange={(e) => setCourse({ ...course, name: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1cr1mz5")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              value={course.category}
              onChange={(e) =>
                setCourse({ ...course, category: e.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.e1py7")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputNumber
              value={course.duration_hours}
              min={0}
              onValueChange={(e) =>
                setCourse({ ...course, duration_hours: e.value ?? null })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.sjj37t")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputTextarea
              rows={3}
              autoResize
              value={course.description}
              onChange={(e) =>
                setCourse({ ...course, description: e.target.value })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={i18nT("static.r98ja1")}
        visible={dialog === "session"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (
            !session.training_course_id ||
            !session.code.trim() ||
            !session.start_at ||
            !session.end_at
          ) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.5uiuqm"));
            return;
          }
          void save(
            () =>
              createTrainingSession({
                ...session,
                start_at: new Date(session.start_at).toISOString(),
                end_at: new Date(session.end_at).toISOString(),
                provider_name: session.provider_name || null,
                location: session.location || null,
              }),
            "Training session created as draft.",
            () =>
              setSession({
                training_course_id: 0,
                code: "",
                start_at: "",
                end_at: "",
                provider_name: "",
                location: "",
                capacity: null,
              }),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1yoky9k")}{" "}
            <Dropdown
              value={session.training_course_id || null}
              options={courseOptions}
              filter
              className="w-full"
              placeholder={i18nT("static.sgxxc2")}
              onChange={(e) =>
                setSession({
                  ...session,
                  training_course_id: e.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.18gx204")}{" "}
            <InputText
              value={session.code}
              onChange={(e) => setSession({ ...session, code: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.30xvgf")}{" "}
            <PrimeDatePicker
              value={session.start_at}
              withTime
              onValueChange={(value) =>
                setSession({ ...session, start_at: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1llf32i")}{" "}
            <PrimeDatePicker
              value={session.end_at}
              withTime
              onValueChange={(value) =>
                setSession({ ...session, end_at: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.evz7q4")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              value={session.provider_name}
              onChange={(e) =>
                setSession({ ...session, provider_name: e.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.serueh")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputNumber
              value={session.capacity}
              min={1}
              useGrouping={false}
              onValueChange={(e) =>
                setSession({ ...session, capacity: e.value ?? null })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={i18nT("static.15dora7")}
        visible={dialog === "enroll"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Enroll", () => {
          if (!enrollment.training_session_id || !enrollment.employee_id) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.169m6k1"));
            return;
          }
          void save(
            () => createTrainingEnrollment(enrollment),
            "Employee enrolled.",
            () => setEnrollment({ training_session_id: 0, employee_id: 0 }),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1qqbt91")}{" "}
            <Dropdown
              value={enrollment.training_session_id || null}
              options={sessionOptions}
              filter
              className="w-full"
              placeholder={i18nT("static.1d0dtb5")}
              onChange={(e) =>
                setEnrollment({
                  ...enrollment,
                  training_session_id: e.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1fak8xt")}{" "}
            <Dropdown
              value={enrollment.employee_id || null}
              options={employeeOptions}
              filter
              className="w-full"
              placeholder={i18nT("static.1izgm0n")}
              onChange={(e) =>
                setEnrollment({ ...enrollment, employee_id: e.value as number })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={i18nT("static.1xpxnpu")}
        visible={dialog === "enrollmentStatus"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!selectedEnrollment) return;
          void save(
            () =>
              updateTrainingEnrollmentStatus(
                selectedEnrollment.id,
                selectedEnrollment.row_version,
                {
                  ...enrollmentStatus,
                  completion_date: enrollmentStatus.completion_date || null,
                },
              ),
            "Enrollment updated.",
            () => setSelectedEnrollment(null),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.spdxv")}{" "}
            <Dropdown
              value={enrollmentStatus.status}
              options={
                selectedEnrollment?.status === "ATTENDED"
                  ? ["COMPLETED", "CANCELLED"]
                  : ["ATTENDED", "COMPLETED", "NO_SHOW", "CANCELLED"]
              }
              className="w-full"
              onChange={(e) =>
                setEnrollmentStatus({
                  ...enrollmentStatus,
                  status: e.value as string,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.106z57d")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={enrollmentStatus.completion_date}
              onValueChange={(value) =>
                setEnrollmentStatus({
                  ...enrollmentStatus,
                  completion_date: value,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.x9tsfp")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputNumber
              value={enrollmentStatus.score}
              min={0}
              max={100}
              onValueChange={(e) =>
                setEnrollmentStatus({
                  ...enrollmentStatus,
                  score: e.value ?? null,
                })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header={i18nT("static.zmpi8p")}
        visible={dialog === "certification"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (
            !certification.employee_id ||
            !certification.certification_name.trim()
          ) {
            notify("error", i18nT("static.gy1qqi"), i18nT("static.1j01bp6"));
            return;
          }
          void save(
            () =>
              createEmployeeCertification({
                ...certification,
                training_course_id: certification.training_course_id || null,
                issuing_organization:
                  certification.issuing_organization || null,
                credential_number: certification.credential_number || null,
                issued_date: certification.issued_date || null,
                expiry_date: certification.expiry_date || null,
              }),
            "Certification recorded.",
            () =>
              setCertification({
                employee_id: 0,
                training_course_id: 0,
                certification_name: "",
                issuing_organization: "",
                credential_number: "",
                issued_date: "",
                expiry_date: "",
              }),
          );
        })}
      >
        <div className="grid gap-4 py-2">
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1fak8xt")}{" "}
            <Dropdown
              value={certification.employee_id || null}
              options={employeeOptions}
              filter
              className="w-full"
              placeholder={i18nT("static.1izgm0n")}
              onChange={(e) =>
                setCertification({
                  ...certification,
                  employee_id: e.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1blbp19")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <Dropdown
              value={certification.training_course_id || null}
              options={courseOptions}
              showClear
              filter
              className="w-full"
              placeholder={i18nT("static.sgxxc2")}
              onChange={(e) =>
                setCertification({
                  ...certification,
                  training_course_id: (e.value as number) | 0,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.m0i8zo")}{" "}
            <InputText
              value={certification.certification_name}
              onChange={(e) =>
                setCertification({
                  ...certification,
                  certification_name: e.target.value,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1h4z3km")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <InputText
              value={certification.issuing_organization}
              onChange={(e) =>
                setCertification({
                  ...certification,
                  issuing_organization: e.target.value,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.16dnelc")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={certification.issued_date}
              onValueChange={(value) =>
                setCertification({ ...certification, issued_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            {i18nT("static.1hrwgce")}{" "}
            <span className="font-normal text-slate-400">
              {i18nT("static.6pi6gi")}
            </span>
            <PrimeDatePicker
              value={certification.expiry_date}
              onValueChange={(value) =>
                setCertification({ ...certification, expiry_date: value })
              }
            />
          </label>
        </div>
      </Dialog>
    </Card>
  );
}
