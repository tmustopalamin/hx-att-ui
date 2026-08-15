"use client";
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
        .map((c) => ({ label: `${c.code} — ${c.name}`, value: c.id })),
    [courses],
  );
  const sessionOptions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === "OPEN")
        .map((s) => ({ label: `${s.code} — ${s.course_name}`, value: s.id })),
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
        label="Cancel"
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
      notify("success", "Saved", success);
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
        "Unable to save",
        apiError?.message ??
          "Review the data and refresh if it was changed by another user.",
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
        "Updated",
        `Training session is ${status.toLowerCase()}.`,
      );
    } catch {
      notify(
        "error",
        "Unable to update",
        "Session has changed or cannot use that status.",
      );
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
        ? "Complete training session"
        : cancelling
          ? "Cancel training session"
          : "Open training session",
      target: `${row.code} · ${row.course_name}`,
      severity: cancelling ? "danger" : "warning",
      confirmLabel: completing ? "Complete" : cancelling ? "Cancel" : "Open",
      confirmIcon: completing
        ? "pi pi-check"
        : cancelling
          ? "pi pi-times"
          : "pi pi-folder-open",
      description: completing
        ? "Complete this training session?"
        : cancelling
          ? "Cancel this training session?"
          : "Open this training session?",
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
        "Updated",
        `Training course is now ${row.is_active ? "inactive" : "active"}.`,
      );
    } catch {
      notify(
        "error",
        "Unable to update",
        "Course changed or still has an active session.",
      );
    } finally {
      setSaving(false);
    }
  };
  const confirmCourseAction = (row: TrainingCourse) => {
    const nextState = row.is_active ? "deactivate" : "activate";
    requestActionConfirmation({
      action: `${nextState} training course`,
      target: `${row.code} · ${row.name}`,
      severity: row.is_active ? "danger" : "warning",
      confirmLabel: row.is_active ? "Deactivate" : "Activate",
      confirmIcon: row.is_active ? "pi pi-ban" : "pi pi-check",
      description: row.is_active
        ? "Deactivate this training course?"
        : "Activate this training course?",
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
        "Updated",
        `Certification is now ${status.toLowerCase()}.`,
      );
    } catch {
      notify(
        "error",
        "Unable to update",
        "Certification changed or already has that status.",
      );
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
      action: revoking ? "Revoke certification" : "Restore certification",
      target: row.certification_name,
      severity: revoking ? "danger" : "warning",
      confirmLabel: revoking ? "Revoke" : "Restore",
      confirmIcon: revoking ? "pi pi-times" : "pi pi-refresh",
      description: revoking
        ? "Revoke this certification?"
        : "Restore this certification?",
      onAccept: () => certificationAction(row, status),
    });
  };
  return (
    <Card className="border border-slate-200 shadow-sm">
      <div className="flex flex-col gap-5 p-3 sm:p-4 md:p-5">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="m-0 text-xl font-semibold text-slate-800 sm:text-2xl">
              Training & Certification
            </h1>
            <p className="m-0 mt-1 text-sm text-slate-500">
              Maintain learning catalogues, sessions, attendance, completion,
              and employee certifications.
            </p>
          </div>
          <Button
            label="Refresh"
            icon="pi pi-refresh"
            outlined
            severity="secondary"
            size="small"
            loading={isValidating}
            onClick={() => void refresh()}
          />
        </div>
        <TabView>
          <TabPanel header="Courses">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Course"
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
              emptyMessage="No training course found."
            >
              <Column field="code" header="Code" />
              <Column field="name" header="Course" />
              <Column
                field="category"
                header="Category"
                body={(r) => r.category || "-"}
              />
              <Column header="Hours" body={(r) => r.duration_hours ?? "-"} />
              <Column
                header="Active"
                body={(r: TrainingCourse) => (
                  <Tag
                    value={r.is_active ? "Active" : "Inactive"}
                    severity={r.is_active ? "success" : "secondary"}
                  />
                )}
              />
              {canManage && (
                <Column
                  header="Action"
                  body={(r: TrainingCourse) => (
                    <Button
                      label={r.is_active ? "Deactivate" : "Activate"}
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
          <TabPanel header="Sessions">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Session"
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
              emptyMessage="No training session found."
            >
              <Column field="code" header="Code" />
              <Column field="course_name" header="Course" />
              <Column
                header="Start"
                body={(r: TrainingSession) =>
                  new Date(r.start_at).toLocaleString()
                }
              />
              <Column
                field="provider_name"
                header="Provider"
                body={(r) => r.provider_name || "-"}
              />
              <Column
                header="Status"
                body={(r: TrainingSession) => (
                  <Tag value={r.status} severity={severity(r.status)} />
                )}
              />
              {canManage && (
                <Column
                  header="Action"
                  body={(r: TrainingSession) => (
                    <div className="flex gap-1">
                      {r.status === "DRAFT" && (
                        <>
                          <Button
                            label="Open"
                            text
                            size="small"
                            onClick={() => confirmSessionAction(r, "OPEN")}
                          />
                          <Button
                            label="Cancel"
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
                            label="Complete"
                            text
                            size="small"
                            onClick={() => confirmSessionAction(r, "COMPLETED")}
                          />
                          <Button
                            label="Cancel"
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
          <TabPanel header="Enrollments">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="Enroll Employee"
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
              emptyMessage="No training enrollment found."
            >
              <Column field="employee_name" header="Employee" />
              <Column field="session_code" header="Session" />
              <Column field="course_name" header="Course" />
              <Column
                header="Status"
                body={(r: TrainingEnrollment) => (
                  <Tag value={r.status} severity={severity(r.status)} />
                )}
              />
              {canManage && (
                <Column
                  header="Action"
                  body={(r: TrainingEnrollment) =>
                    ["ENROLLED", "ATTENDED"].includes(r.status) ? (
                      <Button
                        label="Record Outcome"
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
          <TabPanel header="Certifications">
            <div className="mb-4 flex justify-end">
              {canManage && (
                <Button
                  label="New Certification"
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
              emptyMessage="No certification found."
            >
              <Column field="employee_name" header="Employee" />
              <Column field="certification_name" header="Certification" />
              <Column
                field="course_name"
                header="Related Course"
                body={(r) => r.course_name || "-"}
              />
              <Column
                field="expiry_date"
                header="Expiry"
                body={(r) => r.expiry_date || "-"}
              />
              <Column
                header="Status"
                body={(r: EmployeeCertification) => (
                  <Tag value={r.status} severity={severity(r.status)} />
                )}
              />
              {canManage && (
                <Column
                  header="Action"
                  body={(r: EmployeeCertification) => (
                    <div className="flex gap-1">
                      {r.status !== "REVOKED" ? (
                        <Button
                          label="Revoke"
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
                          label="Reactivate"
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
        header="New Training Course"
        visible={dialog === "course"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Save", () => {
          if (!course.code.trim() || !course.name.trim()) {
            notify("error", "Validation", "Code and course name are required.");
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
            Code
            <InputText
              value={course.code}
              onChange={(e) => setCourse({ ...course, code: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Course Name
            <InputText
              value={course.name}
              onChange={(e) => setCourse({ ...course, name: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Category{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              value={course.category}
              onChange={(e) =>
                setCourse({ ...course, category: e.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Duration (hours){" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputNumber
              value={course.duration_hours}
              min={0}
              onValueChange={(e) =>
                setCourse({ ...course, duration_hours: e.value ?? null })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Description{" "}
            <span className="font-normal text-slate-400">(optional)</span>
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
        header="New Training Session"
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
            notify(
              "error",
              "Validation",
              "Course, code, start, and end are required.",
            );
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
            Course
            <Dropdown
              value={session.training_course_id || null}
              options={courseOptions}
              filter
              className="w-full"
              placeholder="Select course"
              onChange={(e) =>
                setSession({
                  ...session,
                  training_course_id: e.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Session Code
            <InputText
              value={session.code}
              onChange={(e) => setSession({ ...session, code: e.target.value })}
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Start
            <PrimeDatePicker
              value={session.start_at}
              withTime
              onValueChange={(value) =>
                setSession({ ...session, start_at: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            End
            <PrimeDatePicker
              value={session.end_at}
              withTime
              onValueChange={(value) =>
                setSession({ ...session, end_at: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Provider{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <InputText
              value={session.provider_name}
              onChange={(e) =>
                setSession({ ...session, provider_name: e.target.value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Capacity{" "}
            <span className="font-normal text-slate-400">(optional)</span>
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
        header="Enroll Employee"
        visible={dialog === "enroll"}
        modal
        draggable={false}
        resizable={false}
        style={{ width: "95vw", maxWidth: "34rem" }}
        onHide={close}
        footer={footer("Enroll", () => {
          if (!enrollment.training_session_id || !enrollment.employee_id) {
            notify("error", "Validation", "Session and employee are required.");
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
            Open Session
            <Dropdown
              value={enrollment.training_session_id || null}
              options={sessionOptions}
              filter
              className="w-full"
              placeholder="Select session"
              onChange={(e) =>
                setEnrollment({
                  ...enrollment,
                  training_session_id: e.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Employee
            <Dropdown
              value={enrollment.employee_id || null}
              options={employeeOptions}
              filter
              className="w-full"
              placeholder="Select employee"
              onChange={(e) =>
                setEnrollment({ ...enrollment, employee_id: e.value as number })
              }
            />
          </label>
        </div>
      </Dialog>
      <Dialog
        header="Record Training Outcome"
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
            Outcome
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
            Completion Date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
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
            Score <span className="font-normal text-slate-400">(optional)</span>
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
        header="New Employee Certification"
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
            notify(
              "error",
              "Validation",
              "Employee and certification name are required.",
            );
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
            Employee
            <Dropdown
              value={certification.employee_id || null}
              options={employeeOptions}
              filter
              className="w-full"
              placeholder="Select employee"
              onChange={(e) =>
                setCertification({
                  ...certification,
                  employee_id: e.value as number,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Related Course{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <Dropdown
              value={certification.training_course_id || null}
              options={courseOptions}
              showClear
              filter
              className="w-full"
              placeholder="Select course"
              onChange={(e) =>
                setCertification({
                  ...certification,
                  training_course_id: (e.value as number) | 0,
                })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Certification Name
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
            Issuer{" "}
            <span className="font-normal text-slate-400">(optional)</span>
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
            Issued Date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
            <PrimeDatePicker
              value={certification.issued_date}
              onValueChange={(value) =>
                setCertification({ ...certification, issued_date: value })
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-700">
            Expiry Date{" "}
            <span className="font-normal text-slate-400">(optional)</span>
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
