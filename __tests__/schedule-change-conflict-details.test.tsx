import { render, screen, fireEvent } from "@testing-library/react";
import {
  ScheduleChangeConflictDetails,
  ScheduleChangeConflictDetailsProps,
} from "@/app/(admin)/setting/employee-schedule/_components/ScheduleChangeConflictDetails";
import { EmployeeScheduleChangeConflict } from "@/app/types/employee-schedule-change";

jest.mock("@/app/i18n", () => ({
  useI18n: () => ({
    locale: "id",
    t: (key: string) => key,
    tText: (str: string) => str,
    formatDate: (val: string) => val,
  }),
}));

describe("ScheduleChangeConflictDetails", () => {
  const mockEmployeeMap = new Map([
    [
      1,
      {
        id: 1,
        full_name: "Budi Santoso",
        code: "EMP-001",
        department_name: "Operasional",
        position_name: "Operator",
      },
    ],
    [
      2,
      {
        id: 2,
        full_name: "Siti Rahma",
        code: "EMP-002",
        department_name: "Keuangan",
        position_name: "Akuntan",
      },
    ],
  ]);

  const conflicts: EmployeeScheduleChangeConflict[] = [
    {
      employee_id: 1,
      date: "2026-09-01",
      code: "ATTENDANCE_FINAL",
      message:
        "Attendance summary on 2026-09-01 is final (status: PRESENT). Choose overwrite and reprocess to include it.",
    },
    {
      employee_id: 2,
      date: "2026-09-02",
      code: "SCHEDULE_ASSIGNMENT_PROTECTED",
      message: "Daily Schedule is manual or locked and would need to change.",
    },
  ];

  it("renders conflict cards with detailed employee info, dates, reasons, and solutions", () => {
    render(
      <ScheduleChangeConflictDetails
        conflicts={conflicts}
        employeeById={
          mockEmployeeMap as unknown as ScheduleChangeConflictDetailsProps["employeeById"]
        }
        canOverwrite={true}
        overwrite={false}
      />,
    );

    // Verify header and counts
    expect(screen.getByText("Terdeteksi Konflik Jadwal")).toBeTruthy();
    expect(screen.getByText("2 Konflik")).toBeTruthy();

    // Verify Employee 1 details
    expect(screen.getByText("Budi Santoso")).toBeTruthy();
    expect(screen.getByText("EMP-001")).toBeTruthy();
    expect(screen.getByText("Operasional • Operator")).toBeTruthy();
    expect(screen.getByText("Kehadiran Final")).toBeTruthy();

    // Verify Employee 2 details
    expect(screen.getByText("Siti Rahma")).toBeTruthy();
    expect(screen.getByText("EMP-002")).toBeTruthy();
    expect(screen.getByText("Keuangan • Akuntan")).toBeTruthy();
    expect(screen.getByText("Jadwal Terkunci / Manual")).toBeTruthy();

    // Verify why it conflicted & solution sections
    const whyHeaders = screen.getAllByText("Kenapa Terjadi Konflik?");
    expect(whyHeaders.length).toBe(2);

    const solutionHeaders = screen.getAllByText("Solusi & Rekomendasi:");
    expect(solutionHeaders.length).toBe(2);

    // Verify system message is visible
    expect(
      screen.getByText(/Attendance summary on 2026-09-01 is final/),
    ).toBeTruthy();
  });

  it("displays quick overwrite action when all conflicts are ATTENDANCE_FINAL", () => {
    const attendanceOnlyConflicts: EmployeeScheduleChangeConflict[] = [
      {
        employee_id: 1,
        date: "2026-09-01",
        code: "ATTENDANCE_FINAL",
        message: "Attendance summary is final.",
      },
    ];

    const onEnableOverwrite = jest.fn();

    render(
      <ScheduleChangeConflictDetails
        conflicts={attendanceOnlyConflicts}
        employeeById={
          mockEmployeeMap as unknown as ScheduleChangeConflictDetailsProps["employeeById"]
        }
        canOverwrite={true}
        overwrite={false}
        onEnableOverwrite={onEnableOverwrite}
      />,
    );

    const actionBtn = screen.getByRole("button", {
      name: /Aktifkan Timpa & Proses Ulang/i,
    });
    expect(actionBtn).toBeTruthy();

    fireEvent.click(actionBtn);
    expect(onEnableOverwrite).toHaveBeenCalledTimes(1);
  });

  it("filters conflicts by type when filter pills are clicked", () => {
    const multiConflicts: EmployeeScheduleChangeConflict[] = [
      {
        employee_id: 1,
        date: "2026-09-01",
        code: "ATTENDANCE_FINAL",
        message: "Attendance summary is final.",
      },
      {
        employee_id: 2,
        date: "2026-09-02",
        code: "SCHEDULE_ASSIGNMENT_PROTECTED",
        message: "Schedule protected.",
      },
      {
        employee_id: 2,
        date: "2026-09-03",
        code: "PAYROLL_FINAL",
        message: "Payroll final.",
      },
    ];

    render(
      <ScheduleChangeConflictDetails
        conflicts={multiConflicts}
        employeeById={
          mockEmployeeMap as unknown as ScheduleChangeConflictDetailsProps["employeeById"]
        }
        canOverwrite={true}
        overwrite={false}
      />,
    );

    // Click "Kehadiran Final" filter
    const filterBtn = screen.getByRole("button", {
      name: /Kehadiran Final/i,
    });
    fireEvent.click(filterBtn);

    expect(screen.getByText("Budi Santoso")).toBeTruthy();
    expect(screen.queryByText("Payroll Final")).toBeNull();
  });
});
