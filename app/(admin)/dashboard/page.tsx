import { Card } from "primereact/card";
import { Chart } from "primereact/chart";
import DashboardPageComponent from "./DashboardPageComponent";

export const metadata = {
  title: 'Dasboard - PT. Hexing Technology',
  description: 'HRIS Attendance',
};

const DashboardPage = () => {
  return <>
    <DashboardPageComponent />
  </>
}


// const DashboardPage = () => {
//   // ==== Fake Data ====
//   const total = 100;
//   const present = 80;
//   const late = 10;
//   const absent = 10;

//   const dataAttendanceTrend = {
//     labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
//     datasets: [
//       {
//         label: "Present",
//         data: [80, 82, 78, 85, 83],
//         borderColor: "#42b883",
//         backgroundColor: "#42b883",
//         fill: false,
//       },
//       {
//         label: "Absent",
//         data: [5, 8, 10, 7, 9],
//         borderColor: "#ef5350",
//         backgroundColor: "#ef5350",
//         fill: false,
//       },
//     ],
//   };

//   const dataLateTrend = {
//     labels: ["Mon", "Tue", "Wed", "Thu", "Fri"],
//     datasets: [
//       {
//         label: "Late",
//         data: [2, 5, 3, 7, 4],
//         backgroundColor: "#ff7043",
//       },
//     ],
//   };

//   const dataShift = {
//     labels: ["Morning", "Afternoon", "Night"],
//     datasets: [
//       {
//         label: "Employees",
//         data: [25, 20, 15],
//         backgroundColor: ["#42b883", "#29b6f6", "#ab47bc"],
//       },
//     ],
//   };

//   const dataAbsenteeism = {
//     labels: ["Present", "Absent"],
//     datasets: [
//       {
//         data: [90, 10],
//         backgroundColor: ["#42a5f5", "#ef5350"],
//       },
//     ],
//   };

//   return (
//     <div className="space-y-6">
//       {/* === Row 1: KPI Cards === */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <Card className="flex items-center justify-between p-4">
//           <div>
//             <p className="text-gray-500 text-sm">Total Employees</p>
//             <h2 className="text-2xl font-bold">{total}</h2>
//           </div>
//           <i className="pi pi-users text-3xl text-blue-500"></i>
//         </Card>
//         <Card className="flex items-center justify-between p-4">
//           <div>
//             <p className="text-gray-500 text-sm">Present Today</p>
//             <h2 className="text-2xl font-bold text-green-600">{present}</h2>
//           </div>
//           <i className="pi pi-user text-3xl text-green-500"></i>
//         </Card>
//         <Card className="flex items-center justify-between p-4">
//           <div>
//             <p className="text-gray-500 text-sm">Late Today</p>
//             <h2 className="text-2xl font-bold text-orange-500">{late}</h2>
//           </div>
//           <i className="pi pi-clock text-3xl text-orange-400"></i>
//         </Card>
//         <Card className="flex items-center justify-between p-4">
//           <div>
//             <p className="text-gray-500 text-sm">Absent Today</p>
//             <h2 className="text-2xl font-bold text-red-600">{absent}</h2>
//           </div>
//           <i className="pi pi-user-minus text-3xl text-red-500"></i>
//         </Card>
//       </div>

//       {/* === Row 2: Attendance vs Late Trend === */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <Card>
//           <h2 className="text-lg font-semibold mb-3">Attendance Trend</h2>
//           <div className="h-[220px]">
//             <Chart
//               type="line"
//               data={dataAttendanceTrend}
//               options={{
//                 maintainAspectRatio: false,
//                 plugins: { legend: { position: "bottom" } },
//               }}
//             />
//           </div>
//         </Card>
//         <Card>
//           <h2 className="text-lg font-semibold mb-3">Late Arrival Trend</h2>
//           <div className="h-[220px]">
//             <Chart
//               type="bar"
//               data={dataLateTrend}
//               options={{
//                 maintainAspectRatio: false,
//                 plugins: { legend: { display: false } },
//                 scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
//               }}
//             />
//           </div>
//         </Card>
//       </div>

//       {/* === Row 3: Shift & Absenteeism === */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         <Card>
//           <h2 className="text-lg font-semibold mb-3">Shift Coverage</h2>
//           <div className="h-[220px]">
//             <Chart
//               type="bar"
//               data={dataShift}
//               options={{
//                 maintainAspectRatio: false,
//                 plugins: { legend: { display: false } },
//                 scales: {
//                   y: { beginAtZero: true, ticks: { stepSize: 5 } },
//                 },
//               }}
//             />
//           </div>
//         </Card>
//         <Card>
//           <h2 className="text-lg font-semibold mb-3">Absenteeism Rate</h2>
//           <div className="h-[220px]">
//             <Chart
//               type="doughnut"
//               data={dataAbsenteeism}
//               options={{
//                 maintainAspectRatio: false,
//                 plugins: { legend: { position: "bottom" } },
//                 cutout: "70%", // donut lebih ramping
//               }}
//             />
//           </div>
//         </Card>
//       </div>
//     </div>
//   );
// };

export default DashboardPage;
