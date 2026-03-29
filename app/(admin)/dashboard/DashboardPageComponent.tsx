"use client"

import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import dayjs from "dayjs";
import { RootState } from "@/store/store";
import { useSelector } from "react-redux";

const getGreeting = (name: string) => {
  const hour = new Date().getHours();

  if (hour < 12) return `Good morning, ${name}`;
  if (hour < 18) return `Good afternoon, ${name}`;
  if (hour < 21) return `Good evening, ${name}`;
  return `Good night, ${name}`;
}

const getTodayDate = () => {
  return dayjs().format("dddd, DD MMMM YYYY");
}

const DashboardPageComponent = () => {
  const profileState = useSelector((state: RootState) => state.profile);

  // YTD Labels
  const ytdLabels = [
    "Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25",
    "Sep 25", "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26"
  ];

  // Attendance Trend (YTD)
  const attendanceTrendData = {
    labels: ytdLabels,
    datasets: [
      {
        label: "Present",
        data: [88, 90, 92, 91, 89, 93, 94, 92, 90, 88, 91, 93, 95],
        borderColor: "#3B82F6",
        backgroundColor: "#3B82F6",
        tension: 0.4
      },
      {
        label: "Absent",
        data: [6, 5, 4, 5, 6, 3, 3, 4, 5, 6, 5, 4, 3],
        borderColor: "#EF4444",
        backgroundColor: "#EF4444",
        tension: 0.4
      },
    ]
  };

  // Department Pie
  const departmentData = {
    labels: ["HR", "IT", "Finance", "Sales", "Admin"],
    datasets: [
      {
        data: [5, 20, 8, 15, 10]
      }
    ]
  };

  // Leave Trend (YTD)
  const leaveTrendData = {
    labels: ytdLabels,
    datasets: [
      {
        label: "Leave Requests",
        data: [10, 12, 8, 15, 9, 11, 14, 13, 10, 8, 12, 11, 9],
        backgroundColor: "#3B82F6"
      }
    ]
  };

  // Late Trend (YTD)
  const lateTrendData = {
    labels: ytdLabels,
    datasets: [
      {
        label: "Late Employees",
        data: [5, 6, 4, 7, 6, 5, 4, 6, 7, 8, 6, 5, 4],
        backgroundColor: "#F59E0B"
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top"
      }
    },
    scales: {
      x: {
        ticks: {
          maxRotation: 0,
          minRotation: 0
        }
      },
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full">

      {/* Greeting Card */}
      <Card className="w-full p-0" pt={{ content: { className: "p-0" } }}>
        <div className="flex justify-between items-stretch">

          <div className="flex flex-col gap-5 py-2">
            <div>
              <h2 className="text-lg font-bold md:text-xl">
                {getGreeting(profileState.name)}!
              </h2>
              <h5>its {getTodayDate()}</h5>
            </div>

            {/* Today Summary */}
            <div>
              <span className="text-xs underline text-gray-500 font-semibold uppercase">
                Today Summary
              </span>

              <div className="flex gap-6 mt-2">
                <div>
                  <div className="text-xs text-gray-500">Present</div>
                  <div className="text-lg font-semibold">999</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Absent</div>
                  <div className="text-lg font-semibold">999</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Late</div>
                  <div className="text-lg font-semibold">999</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">On Leave</div>
                  <div className="text-lg font-semibold">999</div>
                </div>
              </div>
            </div>

            {/* Today Info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500">Pending Approval</span>
                <div className="text-sm font-semibold">4</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500">Payroll</span>
                <div className="text-sm font-semibold">30 Mar</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500">Contract Ending</span>
                <div className="text-sm font-semibold">1</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500">Holiday</span>
                <div className="text-sm font-semibold">5 Days</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500">Birthday</span>
                <div className="text-sm font-semibold">2</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <span className="text-xs text-gray-500">New Employee</span>
                <div className="text-sm font-semibold">1</div>
              </div>
            </div>

          </div>

          <div className="flex flex-col justify-end">
            <img
              src="/images/welcome-dashboard.png"
              className="w-40 md:w-56 lg:w-64"
            />
          </div>

        </div>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        <Card>
          <div className="flex justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Employees</div>
              <div className="text-2xl font-bold">120</div>
            </div>
            <div className="text-2xl">👥</div>
          </div>
        </Card>

        <Card>
          <div className="flex justify-between">
            <div>
              <div className="text-sm text-gray-500">Departments</div>
              <div className="text-2xl font-bold">8</div>
            </div>
            <div className="text-2xl">🏢</div>
          </div>
        </Card>

        <Card>
          <div>
            <div className="flex justify-between">
              <div>
                <div className="text-sm text-gray-500">Active Contracts</div>
                <div className="text-2xl font-bold">115</div>
              </div>
              <div className="text-2xl">📄</div>
            </div>
            <div className="mt-2 text-sm text-orange-500">
              4 expiring soon
            </div>
          </div>
        </Card>

      </div>

      {/* Chart Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <Card title="Attendance Trend">
          <div className="h-[420px]">
            <Chart
              type="line"
              data={attendanceTrendData}
              options={chartOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>

        <Card title="Employees by Department">
          <div className="h-[420px] flex justify-center items-center">
            <Chart
              type="pie"
              data={departmentData}
              style={{ width: "300px", height: "300px" }}
            />
          </div>
        </Card>

      </div>

      {/* Chart Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <Card title="Leave Trend">
          <div className="h-[420px]">
            <Chart
              type="bar"
              data={leaveTrendData}
              options={chartOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>

        <Card title="Late Trend">
          <div className="h-[420px]">
            <Chart
              type="bar"
              data={lateTrendData}
              options={chartOptions}
              style={{ height: "100%", width: "100%" }}
            />
          </div>
        </Card>

      </div>

    </div>
  );
}

export default DashboardPageComponent;