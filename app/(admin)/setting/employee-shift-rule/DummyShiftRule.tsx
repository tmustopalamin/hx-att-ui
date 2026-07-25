// "use client"

// import CardTitle from '@/app/_components/CardTitle'
// import { Button } from 'primereact/button'
// import { Card } from 'primereact/card'
// import { Checkbox } from 'primereact/checkbox'
// import { Column, ColumnEditorOptions } from 'primereact/column'
// import { DataTable } from 'primereact/datatable'
// import { Dropdown, DropdownChangeEvent } from 'primereact/dropdown'
// import { InputText } from 'primereact/inputtext'
// import { PickList } from 'primereact/picklist'
// import React, { useState } from 'react'

// const DummyShiftRule = () => {
//   const [employees, setEmployees] = useState([
//     [
//       { id: 1, name: "Bambang" },
//       { id: 2, name: "Riski" },
//       { id: 3, name: "Ripki" },
//       { id: 4, name: "Sinta" },
//       { id: 5, name: "Dewi" }
//     ],
//   ]);

//   const onChange = (event) => {
//     setEmployees(event.value);
//   };

//   const itemTemplate = (item) => {
//     return <div>{item.name}</div>;
//   };

//   const [selectedCity, setSelectedCity] = useState(null);
//   const cities = [
//     { name: 'Shift 1 (Pagi)', code: 'NY' },
//     { name: 'Shift 2 (Sore)', code: 'RM' },
//     { name: 'Shift 3 (malam)', code: 'LDN' },
//   ];

//   const [rows, setRows] = useState([
//     { sequence: 1, shift: "Pagi", duration: 7 },
//     { sequence: 2, shift: "Sore", duration: 7 },
//     { sequence: 3, shift: "Malam", duration: 7 }
//   ]);

//   const shiftOptions = [
//     { label: "Pagi", value: "Pagi" },
//     { label: "Sore", value: "Sore" },
//     { label: "Malam", value: "Malam" }
//   ];

//   // handler untuk update data setelah edit
//   const onCellEditComplete = (e) => {
//     const { rowData, newValue, field } = e;
//     const updated = [...rows];
//     const index = updated.findIndex((r) => r.sequence === rowData.sequence);
//     updated[index][field] = newValue;
//     setRows(updated);
//   };

//   // editor untuk InputText
//   const textEditor = (options) => {
//     return (
//       <InputText
//         type="number"
//         value={options.value}
//         onChange={(e) => options.editorCallback(e.target.value)}
//       />
//     );
//   };

//   // editor untuk Dropdown
//   const dropdownEditor = (options: ColumnEditorOptions) => {
//     return (
//       <Dropdown
//         value={options.value}
//         options={shiftOptions}
//         onChange={(e: DropdownChangeEvent) => options.editorCallback(e.value)}
//         placeholder="Pilih Shift"
//       />
//     );
//   };

//   return (
//     <>
//       <Card title={<CardTitle title='Assign Employee to Shift & Rotation Rule' url='' />}>

//         <div className="p-3 flex gap-5 flex-col">
//           {/* isi disini */}

//           <div className="flex flex-wrap gap-5">
//             <PickList
//               source={employees[0]}
//               target={employees[1]}
//               itemTemplate={itemTemplate}
//               sourceHeader="Available Employees"
//               targetHeader="Selected Employees"
//               onChange={onChange}
//               filter
//               showSourceControls={true}
//               showTargetControls={true}
//               breakpoint="600px"
//               className="w-full md:w-30rem"
//             />

//             <div className="flex-1 min-w-[200px]">
//               <Dropdown
//                 value={selectedCity}
//                 onChange={(e) => setSelectedCity(e.value)}
//                 options={cities}
//                 optionLabel="name"
//                 placeholder="Select a Base Shift"
//                 className="w-full"
//               />
//             </div>
//           </div>

//           <div className="flex">
//             <div className="flex align-items-center">
//               <Checkbox inputId="ingredient1" name="pizza" value="Cheese" onChange={() => { }} checked={true} />
//               <label htmlFor="ingredient1" className="ml-2">Enable Rotation</label>
//             </div>
//           </div>

//           <div className="flex flex-col pt-5">
//             <h1 className='font-bold'>Rotation Pattern</h1>
//             <h2>Define shift rotation order and duration</h2>

//             <DataTable value={rows} editMode="cell" dataKey="sequence" className='pt-5'>
//               <Column
//                 field="sequence"
//                 header="Sequence"
//                 style={{ width: "15%" }}
//                 editor={(options) => textEditor(options)}
//                 onCellEditComplete={onCellEditComplete}
//               />
//               <Column
//                 field="shift"
//                 header="Shift"
//                 style={{ width: "35%" }}
//                 editor={(options: ColumnEditorOptions) => dropdownEditor(options)}
//                 onCellEditComplete={onCellEditComplete}
//               />
//               <Column
//                 field="duration"
//                 header="Duration (days)"
//                 style={{ width: "25%" }}
//                 editor={(options) => textEditor(options)}
//                 onCellEditComplete={onCellEditComplete}
//               />
//             </DataTable>
//           </div>

//           <Button label="Save Rule" icon="" size="small" className='pt-5' onClick={() => { }} />

//         </div>
//       </Card>
//     </>
//   )
// }

// export default DummyShiftRule
