"use client";

import React from "react";
import { Card } from "primereact/card";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import CardTitle from "@/app/_components/CardTitle";

// warna per shift
// const getShiftClass = (shift: string) => {
//   switch (shift) {
//     case 'P': return 'bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium';
//     case 'S': return 'bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium';
//     case 'M': return 'bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium';
//     default: return '';
//   }
// };

const AttendanceSchedulerDataTable = () => {
  // contoh data dummy untuk 2 karyawan
  const employees = [
    {
      employee: "E001 - John Doe",
      shifts: {
        1: "P",
        2: "P",
        3: "S",
        4: "S",
        5: "M",
        6: "M",
        7: "P",
        8: "P",
        9: "S",
        10: "S",
        11: "M",
        12: "M",
        13: "P",
        14: "P",
        15: "S",
        16: "S",
        17: "M",
        18: "M",
        19: "P",
        20: "P",
        21: "S",
        22: "S",
        23: "M",
        24: "M",
        25: "P",
        26: "P",
        27: "S",
        28: "S",
        29: "M",
        30: "M",
      },
    },
    {
      employee: "E002 - Jane Smith",
      shifts: {
        1: "S",
        2: "S",
        3: "M",
        4: "M",
        5: "P",
        6: "P",
        7: "S",
        8: "S",
        9: "M",
        10: "M",
        11: "P",
        12: "P",
        13: "S",
        14: "S",
        15: "M",
        16: "M",
        17: "P",
        18: "P",
        19: "S",
        20: "S",
        21: "M",
        22: "M",
        23: "P",
        24: "P",
        25: "S",
        26: "S",
        27: "M",
        28: "M",
        29: "P",
        30: "P",
      },
    },
  ];

  // render cell shift dengan warna
  const shiftBodyTemplate = () => {
    // const shift = rowData.shifts[field];
    // return <span className={getShiftClass(shift)}>{shift}</span>;

    return <></>;
  };

  return (
    <>
      <Card title={<CardTitle title="Attendance Scheduler" url="" />}>
        <div className="p-3 flex flex-col gap-5">
          {/* Filter & Action */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Month
              </label>
              <Calendar
                view="month"
                dateFormat="mm/yy"
                placeholder="Select Month"
                showIcon
                className="w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Employee
              </label>
              <Dropdown
                options={[
                  { label: "All Employees", value: "all" },
                  { label: "E001 - John Doe", value: "E001" },
                  { label: "E002 - Jane Smith", value: "E002" },
                ]}
                placeholder="Select Employee"
                className="w-52"
              />
            </div>
            <div className="ml-auto">
              <Button
                label="Generate Schedule"
                icon="pi pi-refresh"
                className="bg-indigo-600 hover:bg-indigo-700 border-none"
              />
            </div>
          </div>

          {/* Data Table */}
          <DataTable value={employees} scrollable className="text-sm">
            <Column
              field="employee"
              header="Employee"
              frozen
              style={{ minWidth: "200px" }}
            ></Column>
            {[...Array(30)].map((_, i) => {
              const day = i + 1;
              return (
                <Column
                  key={day}
                  field={day.toString()}
                  header={day.toString().padStart(2, "0")}
                  body={shiftBodyTemplate}
                  style={{ minWidth: "60px", textAlign: "center" }}
                />
              );
            })}
          </DataTable>

          {/* Legend */}
          <div className="flex gap-6 text-sm mt-3">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-green-100 border"></span> Pagi (P)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-yellow-100 border"></span> Sore (S)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 bg-blue-100 border"></span> Malam (M)
            </div>
          </div>
        </div>
      </Card>
    </>
  );
};

export default AttendanceSchedulerDataTable;
